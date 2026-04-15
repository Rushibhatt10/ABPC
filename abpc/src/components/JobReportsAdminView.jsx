/**
 * JobReportsAdminView — Admin sees all employee reports for a job in real-time.
 * Reports appear instantly as employees submit them.
 */
import { useEffect, useState } from "react";
import { X, MessageSquare, Copy, Check, Video, RefreshCw } from "lucide-react";
import { subscribeQuery } from "../utils/firestoreHelpers";
import { collection, query, where, orderBy } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { formatCurrency, getWhatsAppNumber } from "../utils/format";

const glass = { background: "rgba(18,18,18,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" };

export default function JobReportsAdminView({ job, onClose }) {
  const [reports, setReports] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(firestoreDb, "jobReports"),
      where("jobId", "==", job.id),
      orderBy("timestamp", "asc")
    );
    return subscribeQuery(q, (data) => {
      setReports(data);
      // Track new reports arriving
      setNewCount(c => {
        if (data.length > prevCount) setPrevCount(data.length);
        return data.length;
      });
    });
  }, [job.id]);

  const buildMessage = () => {
    const date = job.completedAt
      ? new Date(job.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const workSummary = reports.length > 0
      ? reports.map((r, i) => `${i + 1}. ${r.employeeName}: ${r.note || "Work completed."}`).join("\n")
      : "Service completed as per schedule.";

    const videoLinks = reports.filter(r => r.videoUrl).map((r, i) => `Video ${i + 1}: ${r.videoUrl}`).join("\n");

    return `Hello ${job.customerName} 👋,\n\nYour service has been successfully completed ✅\n\n📋 *Job Details:*\n• Job ID: ${job.id?.slice(-6).toUpperCase()}\n• Service: ${job.treatmentLabel || job.serviceType || "Pest Control"}\n• Date: ${date}\n• Amount: ${formatCurrency(job.finalPrice || job.totalAmount || 0)}\n\n🧾 *Work Summary:*\n${workSummary}${videoLinks ? `\n\n🎥 *Service Videos:*\n${videoLinks}` : ""}\n\nIf you have any questions, feel free to contact us.\n\nThank you for choosing AB Pest Control 🙏\n\n— AB Pest Control\n📞 +91 98251 88413`;
  };

  const handleSendWhatsApp = () => {
    const phone = getWhatsAppNumber(job.customerPhone);
    if (!phone) { alert("No phone number for this customer."); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage())}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col"
        style={{ ...glass, boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>

        {/* Header — sticky */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-black text-white text-sm">Employee Reports</p>
              {reports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: "rgba(76,122,45,0.25)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }}>
                  {reports.length} submitted
                </span>
              )}
              {/* Live indicator */}
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {job.customerName} · {job.treatmentLabel || job.serviceType}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Video className="w-6 h-6" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
              <p className="text-sm font-semibold text-white">Waiting for reports…</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Reports will appear here in real-time as employees submit them.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ color: "rgba(76,122,45,0.6)" }} />
                <span className="text-[10px]" style={{ color: "rgba(76,122,45,0.6)" }}>Listening for updates…</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r, i) => (
                <div key={r.id} className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

                  {/* Report header */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: r.note || r.videoUrl ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black"
                        style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A" }}>
                        {r.employeeName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{r.employeeName}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {r.timestamp
                            ? new Date(r.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(76,122,45,0.15)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.25)" }}>
                      ✓ Report {i + 1}
                    </span>
                  </div>

                  {/* Notes */}
                  {r.note && (
                    <div className="px-4 py-3" style={{ borderBottom: r.videoUrl ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Notes</p>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{r.note}</p>
                    </div>
                  )}

                  {/* Video */}
                  {r.videoUrl && (
                    <div className="p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        🎥 Service Video
                      </p>
                      <video
                        src={r.videoUrl}
                        controls
                        className="w-full rounded-xl"
                        style={{ maxHeight: 220, background: "#000" }}
                        preload="metadata"
                      />
                    </div>
                  )}

                  {!r.note && !r.videoUrl && (
                    <div className="px-4 py-3">
                      <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.3)" }}>No notes or video attached.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* WhatsApp sharing */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.2)" }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: "#25D366" }} />
              <p className="text-sm font-bold" style={{ color: "#25D366" }}>Share with Customer</p>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {job.customerName} · {job.customerPhone || "no phone saved"}
            </p>

            {showPreview && (
              <div className="rounded-xl p-3 text-xs whitespace-pre-wrap"
                style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.65)", maxHeight: 180, overflowY: "auto", lineHeight: 1.6 }}>
                {buildMessage()}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowPreview(p => !p)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                {showPreview ? "Hide" : "Preview"}
              </button>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                {copied ? <><Check className="w-3 h-3" style={{ color: "#6DBF4A" }} /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
              <button onClick={handleSendWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg,#128C7E,#25D366)", boxShadow: "0 0 16px rgba(37,211,102,0.25)" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 24px rgba(37,211,102,0.5)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 16px rgba(37,211,102,0.25)"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
