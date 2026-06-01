/**
 * Admin view for combined employee reports.
 * Shows notes, photos, videos, Drive links, and customer sharing tools.
 */
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Send,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { subscribeQuery } from "../utils/firestoreHelpers";
import { formatCurrency, getWhatsAppNumber } from "../utils/format";

const G = {
  modal: { background: "rgba(10,12,10,0.96)", border: "1px solid rgba(76,122,45,0.18)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" },
  cardHi: { background: "rgba(76,122,45,0.06)", border: "1px solid rgba(76,122,45,0.2)" },
  wa: { background: "rgba(18,140,126,0.08)", border: "1px solid rgba(37,211,102,0.2)" },
};

const Btn = ({ children, onClick, variant = "ghost", className = "", style = {}, ...p }) => {
  const base = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-200 active:scale-95 select-none cursor-pointer";
  const variants = {
    ghost: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" },
    wa: { background: "linear-gradient(135deg,#075E54,#128C7E,#25D366)", border: "none", color: "#fff", boxShadow: "0 0 24px rgba(37,211,102,0.3)" },
  };
  return (
    <button onClick={onClick} className={`${base} ${className}`} style={{ ...variants[variant], ...style }} {...p}>
      {children}
    </button>
  );
};

const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const buildMessage = (job, reports) => {
  const date = job.completedAt
    ? new Date(job.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const workSummary = reports.length
    ? reports.map((r, i) => {
        const photos = r.photoUrls || r.imageUrls || [];
        const parts = [`${i + 1}. ${r.employeeName || "Team"}: ${r.note || "Work completed."}`];
        if (photos.length) parts.push(`Photos: ${photos.length}`);
        if (r.videoUrl) parts.push(`Video: ${r.videoUrl}`);
        if (r.audioUrl || r.voiceNote) parts.push(`Audio: ${r.audioUrl || r.voiceNote}`);
        return parts.join("\n   ");
      }).join("\n")
    : "Service completed as per schedule.";

  const photoLinks = reports.flatMap((r) => r.photoUrls || r.imageUrls || []).map((url, i) => `Photo ${i + 1}: ${url}`).join("\n");
  const videoLinks = reports.filter((r) => r.videoUrl).map((r, i) => `Video ${i + 1}: ${r.videoUrl}`).join("\n");
  const audioLinks = reports.filter((r) => r.audioUrl || r.voiceNote).map((r, i) => `Audio ${i + 1}: ${r.audioUrl || r.voiceNote}`).join("\n");
  const driveLinks = reports.flatMap((r) => r.driveFiles || []).filter((file) => file.url).map((file, i) => `Drive ${i + 1}: ${file.url}`).join("\n");

  return `Hello ${job.customerName || "Customer"},

Your service has been completed successfully.

Job Details:
Job ID: ${job.id?.slice(-6).toUpperCase() || "-"}
Service: ${job.treatmentLabel || job.serviceType || "Pest Control"}
Date: ${date}
Amount: ${formatCurrency(job.finalPrice || job.totalAmount || 0)}

Work Summary:
${workSummary}${photoLinks ? `\n\nService Photos:\n${photoLinks}` : ""}${videoLinks ? `\n\nService Videos:\n${videoLinks}` : ""}${audioLinks ? `\n\nService Audio:\n${audioLinks}` : ""}${driveLinks ? `\n\nDrive Files:\n${driveLinks}` : ""}

If you have any questions, feel free to contact us.

Thank you for choosing AB Pest Control.

AB Pest Control
+91 93744 88004`;
};

const downloadText = (fileName, text) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function JobReportsAdminView({ job, onClose }) {
  const [reports, setReports] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const q = query(collection(firestoreDb, "jobReports"), where("jobId", "==", job.id));
    return subscribeQuery(q, (docs) => {
      const sorted = [...docs].sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() ?? a.timestamp ?? 0;
        const bTime = b.timestamp?.toMillis?.() ?? b.timestamp ?? 0;
        return aTime - bTime;
      });
      setReports(sorted);
    });
  }, [job.id]);

  const message = buildMessage(job, reports);

  const handleSendWhatsApp = () => {
    const phone = getWhatsAppNumber(job.customerPhone);
    if (!phone) {
      alert("No phone number for this customer.");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadText(`ABPC-job-${job.id?.slice(-6) || Date.now()}-report.txt`, message);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(76,122,45,0.08) 0%, transparent 70%)"
      }} />

      <div className="relative w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ ...G.modal, boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(76,122,45,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(76,122,45,0.6), transparent)" }} />

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-black text-sm" style={{ background: "linear-gradient(135deg,#6DBF4A,#4C7A2D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Complete Reports
              </p>
              {reports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.35)" }}>
                  {reports.length} submitted
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" style={{ boxShadow: "0 0 6px #4ade80" }} />
                Live
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
              {job.customerName} - {job.treatmentLabel || job.serviceType}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 transition-all bg-white/6 border border-white/10 text-white/50">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>
          {reports.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center relative bg-white/5 border border-white/10">
                <Video className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Waiting for reports...</p>
              <p className="text-xs leading-relaxed text-white/30">
                Reports will appear here in real-time as employees submit them.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ color: "rgba(76,122,45,0.5)" }} />
                <span className="text-[10px]" style={{ color: "rgba(76,122,45,0.5)" }}>Listening for updates...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, index) => {
                const photos = report.photoUrls || report.imageUrls || [];
                return (
                  <article key={report.id} className="rounded-2xl overflow-hidden transition-all"
                    style={{ ...G.cardHi, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-green-400/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,rgba(76,122,45,0.3),rgba(76,122,45,0.15))", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }}>
                          {report.employeeName?.slice(0, 2).toUpperCase() || "AB"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{report.employeeName || "Team"}</p>
                          <p className="text-[10px] text-white/30">
                            {report.timestamp ? new Date(report.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }}>
                        Report {index + 1}
                      </span>
                    </div>

                    {report.note && (
                      <div className="px-4 py-3 border-b border-green-400/10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(76,122,45,0.6)" }}>Notes</p>
                        <p className="text-sm leading-relaxed text-white/75">{report.note}</p>
                      </div>
                    )}

                    {photos.length > 0 && (
                      <div className="p-3 border-b border-green-400/10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5" style={{ color: "rgba(76,122,45,0.6)" }}>
                          <ImageIcon className="w-3 h-3" /> Service Photos ({photos.length})
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((url, photoIndex) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer"
                              className="aspect-square rounded-xl overflow-hidden bg-black"
                              style={{ border: "1px solid rgba(76,122,45,0.2)" }}>
                              <img src={url} alt={`Service photo ${photoIndex + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.videoUrl && (
                      <div className="p-3 border-b border-green-400/10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(76,122,45,0.6)" }}>Service Video</p>
                        <video src={report.videoUrl} controls className="w-full rounded-xl"
                          style={{ maxHeight: 260, background: "#000", border: "1px solid rgba(76,122,45,0.2)" }}
                          preload="metadata" />
                      </div>
                    )}

                    {(report.audioUrl || report.voiceNote) && (
                      <div className="p-3 border-b border-green-400/10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(76,122,45,0.6)" }}>Voice Note</p>
                        <audio controls src={report.audioUrl || report.voiceNote} className="w-full rounded-xl" />
                      </div>
                    )}

                    {report.driveFiles?.length > 0 && (
                      <div className="px-3 py-3 flex flex-wrap gap-2">
                        {report.driveFiles.filter((file) => file.url).map((file, driveIndex) => (
                          <a key={`${file.url}-${driveIndex}`} href={file.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black"
                            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "#93C5FD" }}>
                            <UploadCloud className="w-3 h-3" /> Drive {driveIndex + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {!report.note && !report.videoUrl && photos.length === 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs italic text-white/25">No notes, photos, or video attached.</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-3 relative overflow-hidden" style={{ ...G.wa, boxShadow: "0 0 40px rgba(37,211,102,0.06)" }}>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(37,211,102,0.12) 0%, transparent 70%)" }} />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.25)" }}>
                <MessageSquare className="w-3.5 h-3.5" style={{ color: "#25D366" }} />
              </div>
              <p className="text-sm font-black" style={{ color: "#25D366" }}>Share with Customer</p>
            </div>

            <p className="text-xs text-white/30">{job.customerName} - {job.customerPhone || "no phone saved"}</p>

            {showPreview && (
              <div className="rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed"
                style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.6)", maxHeight: 180, overflowY: "auto", border: "1px solid rgba(255,255,255,0.06)" }}>
                {message}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Btn onClick={() => setShowPreview((p) => !p)} variant="ghost">
                {showPreview ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
              </Btn>
              <Btn onClick={handleCopy} variant="ghost">
                {copied
                  ? <><Check className="w-3.5 h-3.5" style={{ color: "#6DBF4A" }} /><span style={{ color: "#6DBF4A" }}>Copied</span></>
                  : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Btn>
              <Btn onClick={handleDownload} variant="ghost">
                <Download className="w-3.5 h-3.5" /> Save
              </Btn>
              <Btn onClick={handleSendWhatsApp} variant="wa">
                <WaIcon /> Send
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
