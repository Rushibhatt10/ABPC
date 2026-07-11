/**
 * Admin view for reports.
 * Allows reviewing checklist reports (Service Visit Reports) and video uploads.
 * Includes status updates (Approve/Reject/Changes Requested) and secure public sharing links.
 */
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
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
  FileText,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Mic,
  Calendar,
  Lock,
  Share2,
} from "lucide-react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { subscribeQuery, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, getWhatsAppNumber } from "../utils/format";
import { sendWhatsAppText, shareReportMedia } from "../utils/shareHelpers";
import { uid } from "../utils/mediaHelpers";
import { confirmIncompleteSubJobs, getPendingSubJobs } from "../utils/jobHelpers";
import {
  buildEmailShareMessage,
  buildServiceVisitReportWhatsApp,
  buildSharedReportUrl,
  buildWhatsAppShareMessage,
} from "../utils/shareMessages";

const G = {
  modal: { background: "rgba(10,12,10,0.96)", border: "1px solid rgba(76,122,45,0.18)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" },
  cardHi: { background: "rgba(76,122,45,0.06)", border: "1px solid rgba(76,122,45,0.2)" },
  wa: { background: "rgba(18,140,126,0.08)", border: "1px solid rgba(37,211,102,0.2)" },
};

const colors = {
  title: "#F8FAFC",
  body: "#DCE7D6",
  muted: "#AAB7A5",
  subtle: "#7F8D7B",
  green: "#86EFAC",
  border: "rgba(255,255,255,0.16)",
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

const buildReportMessage = (job, reports) => {
  const summary = reports.length
    ? reports
        .map((r, i) => {
          const photoCount = (r.photoUrls || r.imageUrls || []).length;
          const parts = [`${i + 1}. ${r.employeeName || "Team"}: ${r.note || "Work completed."}`];
          if (photoCount) parts.push(`Photos: ${photoCount}`);
          if (r.videoUrl) parts.push(`Video: ${r.videoUrl}`);
          if (r.audioUrl || r.voiceNote) parts.push(`Audio: ${r.audioUrl || r.voiceNote}`);
          return parts.join("\n   ");
        })
        .join("\n")
    : "Service completed as per schedule.";

  const photoLinks = reports
    .flatMap((r) => r.photoUrls || r.imageUrls || [])
    .map((url, i) => `Photo ${i + 1}: ${url}`)
    .join("\n");

  const videoLinks = reports
    .filter((r) => r.videoUrl)
    .map((r, i) => `Video ${i + 1}: ${r.videoUrl}`)
    .join("\n");

  const audioLinks = reports
    .filter((r) => r.audioUrl || r.voiceNote)
    .map((r, i) => `Audio ${i + 1}: ${r.audioUrl || r.voiceNote}`)
    .join("\n");

  const driveLinks = reports
    .flatMap((r) => r.driveFiles || [])
    .filter((file) => file.url)
    .map((file, i) => `Drive ${i + 1}: ${file.url}`)
    .join("\n");

  return `Hello ${job.customerName || "Customer"},

Your pest control service has been completed successfully.

Job Details:
Service: ${job.treatmentLabel || job.serviceType || "Pest Control"}
Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}

Work Summary:
${summary}

Attachments:
${[photoLinks, videoLinks, audioLinks, driveLinks].filter(Boolean).join("\n\n")}

Thank you for choosing AB PEST CONTROL INSECTISIDE SERVICES.

AB PEST CONTROL INSECTISIDE SERVICES
+91 93744 88004 · abpestcontrol.in`.trim();
};

export default function JobReportsAdminView({ job, onClose }) {
  const { profile } = useAuth();
  const adminName = profile?.name || profile?.workerName || "Admin";
  const adminId = profile?.key || "AdminID";

  const [activeTab, setActiveTab] = useState("visit_reports"); // visit_reports | job_reports
  const [jobReports, setJobReports] = useState([]);
  const [visitReports, setVisitReports] = useState([]);
  const [subJobs, setSubJobs] = useState([]);

  // States for reviews
  const [adminNotes, setAdminNotes] = useState({});

  // Full Screen Lightbox Preview
  const [lightbox, setLightbox] = useState(null); // { url, caption, employeeName, time }

  // Secure Sharing States
  const [sharingReport, setSharingReport] = useState(null); // Report object selected for sharing config
  const [sharingConfig, setSharingConfig] = useState({
    allowPhotos: true,
    allowVideos: true,
    allowVoiceNotes: true,
    allowDownload: false,
    expiryDays: "7",
  });
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Subscribe to Legacy Job Video Reports
  useEffect(() => {
    const q = query(collection(firestoreDb, "jobReports"), where("jobId", "==", job.id));
    return subscribeQuery(q, (docs) => {
      const sorted = [...docs].sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() ?? a.timestamp ?? 0;
        const bTime = b.timestamp?.toMillis?.() ?? b.timestamp ?? 0;
        return aTime - bTime;
      });
      setJobReports(sorted);
    });
  }, [job.id]);

  // Subscribe to new Service Visit Reports
  useEffect(() => {
    const q = query(collection(firestoreDb, "serviceVisitReports"), where("jobId", "==", job.id));
    return subscribeQuery(q, (docs) => {
      const sorted = [...docs].sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime; // Show newest reports on top
      });
      setVisitReports(sorted);
    });
  }, [job.id]);

  useEffect(() => {
    const q = query(collection(firestoreDb, "subJobs"), where("jobId", "==", job.id));
    return subscribeQuery(q, setSubJobs);
  }, [job.id]);

  const handleUpdateStatus = async (reportId, status) => {
    const note = (adminNotes[reportId] || "").trim();

    if (status === "rejected" && !note) {
      alert("Admin remarks are required to Reject a report.");
      return;
    }

    if (status === "approved") {
      const pending = getPendingSubJobs(subJobs, job.id);
      if (!confirmIncompleteSubJobs(pending, "approve this report and mark the job as completed")) {
        return;
      }
    }

    try {
      await updateRecord("serviceVisitReports", reportId, {
        reportStatus: status,
        adminRemarks: note,
        reviewedAt: new Date().toISOString(),
        reviewedByAdminId: adminId,
        reviewedByAdminName: adminName,
      });

      if (status === "approved" && job.status !== "completed") {
        const pending = getPendingSubJobs(subJobs, job.id);
        await updateRecord("jobs", job.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          completedBy: adminName,
          completedWithPendingSubJobs: pending.length > 0,
        });
      }

      alert(`Report status updated to "${status.toUpperCase().replace("_", " ")}".`);
    } catch (e) {
      alert("Failed to update status: " + e.message);
    }
  };

  // Secure Share Generator
  const handleConfigureShare = (report) => {
    setSharingReport(report);
    // Load existing settings if previously configured
    if (report.shareSettings?.isShared) {
      setSharingConfig({
        allowPhotos: report.shareSettings.allowPhotos ?? true,
        allowVideos: report.shareSettings.allowVideos ?? true,
        allowVoiceNotes: report.shareSettings.allowVoiceNotes ?? true,
        allowDownload: report.shareSettings.allowDownload ?? false,
        expiryDays: report.shareSettings.expiresAt 
          ? Math.max(1, Math.round((new Date(report.shareSettings.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))).toString() 
          : "7",
      });
    } else {
      setSharingConfig({
        allowPhotos: true,
        allowVideos: true,
        allowVoiceNotes: true,
        allowDownload: false,
        expiryDays: "7",
      });
    }
  };

  const handleCreateShareLink = async () => {
    if (!sharingReport) return;
    
    const token = sharingReport.shareSettings?.shareToken || uid();
    const publicUrl = buildSharedReportUrl(token);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(sharingConfig.expiryDays || 7));

    try {
      await updateRecord("serviceVisitReports", sharingReport.id, {
        shareSettings: {
          isShared: true,
          shareToken: token,
          shareUrl: publicUrl,
          expiresAt: expiry.toISOString(),
          allowPhotos: sharingConfig.allowPhotos,
          allowVideos: sharingConfig.allowVideos,
          allowVoiceNotes: sharingConfig.allowVoiceNotes,
          allowDownload: sharingConfig.allowDownload,
          sharedByAdminId: adminId,
          sharedByAdminName: adminName,
          sharedAt: new Date().toISOString(),
          revokedAt: null,
        }
      });
      alert("Secure share link created successfully.");
      setSharingReport(null);
    } catch (e) {
      alert("Failed to create share link: " + e.message);
    }
  };

  const handleRevokeShareLink = async (reportId) => {
    if (!window.confirm("Are you sure you want to revoke this share link? It will stop working immediately.")) return;
    
    try {
      await updateRecord("serviceVisitReports", reportId, {
        "shareSettings.isShared": false,
        "shareSettings.revokedAt": new Date().toISOString(),
      });
      alert("Share link revoked successfully.");
    } catch (e) {
      alert("Failed to revoke link: " + e.message);
    }
  };

  const handleCopyShareLink = async (url) => {
    await navigator.clipboard.writeText(url);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  const handleWhatsAppShare = (url, customerName, report) => {
    const msg = buildWhatsAppShareMessage(customerName, job.treatmentLabel || job.serviceType, url, report, job);
    const phone = getWhatsAppNumber(job.customerPhone);
    sendWhatsAppText(phone, msg);
  };

  const handleEmailShare = (url, customerName, report) => {
    const msg = buildEmailShareMessage(customerName, job.treatmentLabel || job.serviceType, url, job, report);
    const mailto = `mailto:${job.customerEmail || ""}?subject=Service%20Visit%20Report&body=${encodeURIComponent(msg)}`;
    window.open(mailto, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(76,122,45,0.08) 0%, transparent 70%)"
      }} />

      <div className="relative w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ ...G.modal, boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(76,122,45,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(76,122,45,0.6), transparent)" }} />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-black text-sm" style={{ background: "linear-gradient(135deg,#6DBF4A,#4C7A2D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Job Reports Dashboard
              </p>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 p-2 gap-2 bg-black/40">
          <button
            onClick={() => setActiveTab("visit_reports")}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
            style={{
              background: activeTab === "visit_reports" ? "rgba(110,191,74,0.15)" : "transparent",
              color: activeTab === "visit_reports" ? colors.green : "rgba(255,255,255,0.4)",
              border: activeTab === "visit_reports" ? "1px solid rgba(110,191,74,0.3)" : "1px solid transparent",
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            Service Visit Reports ({visitReports.length})
          </button>
          
          <button
            onClick={() => setActiveTab("job_reports")}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
            style={{
              background: activeTab === "job_reports" ? "rgba(110,191,74,0.15)" : "transparent",
              color: activeTab === "job_reports" ? colors.green : "rgba(255,255,255,0.4)",
              border: activeTab === "job_reports" ? "1px solid rgba(110,191,74,0.3)" : "1px solid transparent",
            }}
          >
            <Video className="w-3.5 h-3.5" />
            Job Video Reports ({jobReports.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>
          
          {/* Service Visit Reports tab */}
          {activeTab === "visit_reports" && (
            visitReports.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center relative bg-white/5 border border-white/10">
                  <FileText className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-sm font-bold text-white mb-1">No visit reports submitted yet</p>
                <p className="text-xs leading-relaxed text-white/30">
                  Detailed checklist reports submitted by technicians will display here.
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ color: "rgba(76,122,45,0.5)" }} />
                  <span className="text-[10px]" style={{ color: "rgba(76,122,45,0.5)" }}>Listening for updates...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visitReports.map((report) => {
                  const statusColors = {
                    submitted: { bg: "rgba(234,179,8,0.15)", text: "#FACC15", border: "rgba(234,179,8,0.3)" },
                    approved: { bg: "rgba(34,197,94,0.15)", text: "#4ADE80", border: "rgba(34,197,94,0.3)" },
                    rejected: { bg: "rgba(239,68,68,0.15)", text: "#FCA5A5", border: "rgba(239,68,68,0.3)" },
                    changes_requested: { bg: "rgba(249,115,22,0.15)", text: "#FDBA74", border: "rgba(249,115,22,0.3)" },
                  };
                  const currentStatus = report.reportStatus || report.status || "submitted";
                  const st = statusColors[currentStatus] || statusColors.submitted;

                  return (
                    <article key={report.id} className="rounded-2xl overflow-hidden transition-all bg-white/5 border border-white/10"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                      
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 bg-green-500/10 border border-green-500/20 text-green-400">
                            {report.employeeName?.slice(0, 2).toUpperCase() || "AB"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{report.employeeName || "Team"}</p>
                            <p className="text-[10px] text-white/30">
                              {report.submittedAt ? new Date(report.submittedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                            {currentStatus.toUpperCase().replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            Report #{report.reportNumber}
                          </span>
                        </div>
                      </div>

                      {/* Summary Completion details */}
                      {report.progressSnapshot && (
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex justify-between items-center text-xs text-white/50">
                          <span>Activities Progress:</span>
                          <span className="font-bold text-green-400">
                            {report.progressSnapshot.percentage || 0}% ({report.progressSnapshot.completedActivities}/{report.progressSnapshot.totalActivities})
                          </span>
                        </div>
                      )}

                      {/* Activities checklist details */}
                      <div className="px-4 py-3 border-b border-white/5 space-y-3.5">
                        {/* Newly Completed */}
                        {report.newlyCompletedActivities?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-green-400">Newly Completed Activities</p>
                            <div className="space-y-1">
                              {report.newlyCompletedActivities.map((act) => (
                                <div key={act.subJobId} className="flex items-center gap-1.5 text-xs text-white/80">
                                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                  <span>{act.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Previously Completed */}
                        {report.previouslyReportedActivities?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-white/40">Previously Completed Activities</p>
                            <div className="space-y-1 opacity-60">
                              {report.previouslyReportedActivities.map((act) => (
                                <div key={act.subJobId} className="flex items-center gap-1.5 text-xs text-white/60">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{act.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending */}
                        {report.pendingActivities?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-white/30">Pending Activities</p>
                            <div className="space-y-1 opacity-50">
                              {report.pendingActivities.map((act) => (
                                <div key={act.subJobId} className="flex items-center gap-1.5 text-xs text-white/50">
                                  <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                                  <span>{act.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Employee Remarks */}
                      {report.employeeRemarks && (
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/40">Employee Remarks</p>
                          <p className="text-xs leading-relaxed text-white/80">{report.employeeRemarks}</p>
                        </div>
                      )}

                      {/* Photos View */}
                      {report.photos?.length > 0 && (
                        <div className="p-4 border-b border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-3">
                            <ImageIcon className="w-3.5 h-3.5" /> Service Photos ({report.photos.length})
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {report.photos.map((photo, pIdx) => (
                              <button
                                key={photo.mediaId || pIdx}
                                onClick={() => setLightbox({
                                  url: photo.url,
                                  caption: photo.caption,
                                  employeeName: report.employeeName,
                                  time: photo.uploadedAt,
                                })}
                                className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10 text-left hover:opacity-85 transition-opacity"
                              >
                                <img src={photo.url} alt="Work Proof" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Videos View */}
                      {report.videos?.length > 0 && (
                        <div className="p-4 border-b border-white/5 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" /> Service Videos ({report.videos.length})
                          </p>
                          <div className="space-y-3">
                            {report.videos.map((vid, vIdx) => (
                              <div key={vid.mediaId || vIdx} className="rounded-2xl overflow-hidden bg-black/40 border border-white/10 p-2 space-y-2">
                                <video src={vid.url} controls className="w-full rounded-xl max-h-[220px] bg-black" preload="metadata" />
                                <div className="px-2 pb-1 text-[10px] text-white/50 space-y-0.5">
                                  <p className="font-bold truncate text-white">{vid.fileName}</p>
                                  <p>Size: {(vid.fileSize / (1024 * 1024)).toFixed(2)} MB • Duration: {Math.round(vid.duration || 0)}s</p>
                                  {vid.caption && <p className="italic text-white/70 mt-1">"{vid.caption}"</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Voice Note View */}
                      {report.voiceNotes?.length > 0 && (
                        <div className="p-4 border-b border-white/5 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5" /> Voice Notes & Audio ({report.voiceNotes.length})
                          </p>
                          <div className="space-y-2">
                            {report.voiceNotes.map((vn, vnIdx) => (
                              <div key={vn.mediaId || vnIdx} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-white/40">
                                  <span className="truncate max-w-[200px] text-white/70">{vn.fileName}</span>
                                  <span>{Math.round(vn.duration || 0)}s • {(vn.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                                <audio controls src={vn.url} className="w-full" />
                                {vn.caption && <p className="text-[10px] italic text-white/70">"{vn.caption}"</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Internal Admin Remarks */}
                      {(report.adminRemarks || report.adminNote) && (
                        <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">
                            Admin Remarks (Reviewed by {report.reviewedByAdminName || report.reviewedBy || "Admin"})
                          </p>
                          <p className="text-xs text-white/80">{report.adminRemarks || report.adminNote}</p>
                        </div>
                      )}

                      {/* Admin Actions Section */}
                      <div className="p-4 bg-black/40 space-y-3">
                        <textarea
                          placeholder="Add admin remarks (required to reject)..."
                          value={adminNotes[report.id] || ""}
                          onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                          className="w-full h-16 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
                        />

                        {currentStatus !== "approved" && currentStatus !== "rejected" && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, "approved")}
                              className="flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-green-500 text-black hover:bg-green-600 transition-colors"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, "changes_requested")}
                              className="flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, "rejected")}
                              className="flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}

                        {/* Secure Share Trigger Button */}
                        {currentStatus === "approved" && (
                          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                            {report.shareSettings?.isShared ? (
                              <div className="flex-1 space-y-2">
                                <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/25 flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-green-400 flex items-center gap-1">
                                      <Lock className="w-3 h-3" /> Secure Link Active
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeShareLink(report.id)}
                                      className="text-[9px] font-black text-red-400 hover:underline"
                                    >
                                      Revoke Link
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={report.shareSettings.shareUrl}
                                    className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none"
                                  />
                                  <div className="flex gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => handleCopyShareLink(report.shareSettings.shareUrl)}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-white flex items-center gap-1 border border-white/10"
                                    >
                                      {shareLinkCopied ? "Copied ✓" : "Copy Link"}
                                    </button>
                                    <button
                                      onClick={() => handleWhatsAppShare(report.shareSettings.shareUrl, report.jobSnapshot?.customerName, report)}
                                      className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-[9px] font-bold text-white flex items-center gap-1"
                                    >
                                      WhatsApp
                                    </button>
                                    <button
                                      onClick={() => handleEmailShare(report.shareSettings.shareUrl, report.jobSnapshot?.customerName, report)}
                                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-[9px] font-bold text-white flex items-center gap-1"
                                    >
                                      Email
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfigureShare(report)}
                                className="w-full mt-1.5 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-green-500 text-black hover:bg-green-600 transition-colors"
                              >
                                <Share2 className="w-4 h-4" /> Share Approved Report
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const msg = buildServiceVisitReportWhatsApp(job, report);
                            const phone = getWhatsAppNumber(job.customerPhone);
                            sendWhatsAppText(phone, msg);
                          }}
                          className="w-full mt-2 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors shadow-lg"
                        >
                          <Send className="w-4 h-4" /> Share Text via WhatsApp
                        </button>
                      </div>

                    </article>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: Original Job Video Reports */}
          {activeTab === "job_reports" && (
            jobReports.length === 0 ? (
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
                {jobReports.map((report, index) => {
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
                            <ImageIcon className="w-3.5 h-3.5" /> Service Photos ({photos.length})
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((url, photoIndex) => (
                              <button
                                key={url}
                                onClick={() => setLightbox({
                                  url,
                                  caption: report.note,
                                  employeeName: report.employeeName,
                                  time: report.timestamp,
                                })}
                                className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10 hover:opacity-80 transition-opacity"
                              >
                                <img src={url} alt={`Service photo ${photoIndex + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.videoUrl && (
                        <div className="p-3 border-b border-green-400/10">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(76,122,45,0.6)" }}>Service Video</p>
                          <video src={report.videoUrl} controls className="w-full rounded-xl animate-fade-in"
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
                    </article>
                  );
                })}
                
                {jobReports.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl" style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}>
                    <p className="text-sm font-black mb-3 text-green-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Share Original Reports
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = buildReportMessage(job, jobReports);
                        const phone = getWhatsAppNumber(job.customerPhone);
                        sendWhatsAppText(phone, msg);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors shadow-lg"
                    >
                      <Send className="w-4 h-4" /> Share via WhatsApp
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Share Link Generation Modal (nested configuration panel) */}
      {sharingReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-green-400" /> Share Configurations
              </span>
              <button
                type="button"
                onClick={() => setSharingReport(null)}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-white/40">Customize access rules before generating the unguessable public token.</p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80 font-bold">Include Photo Attachments</span>
                <input
                  type="checkbox"
                  checked={sharingConfig.allowPhotos}
                  onChange={(e) => setSharingConfig({ ...sharingConfig, allowPhotos: e.target.checked })}
                  className="w-4 h-4 accent-green-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80 font-bold">Include Video Attachments</span>
                <input
                  type="checkbox"
                  checked={sharingConfig.allowVideos}
                  onChange={(e) => setSharingConfig({ ...sharingConfig, allowVideos: e.target.checked })}
                  className="w-4 h-4 accent-green-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80 font-bold">Include Voice Notes & Audio</span>
                <input
                  type="checkbox"
                  checked={sharingConfig.allowVoiceNotes}
                  onChange={(e) => setSharingConfig({ ...sharingConfig, allowVoiceNotes: e.target.checked })}
                  className="w-4 h-4 accent-green-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80 font-bold">Allow Media Downloads</span>
                <input
                  type="checkbox"
                  checked={sharingConfig.allowDownload}
                  onChange={(e) => setSharingConfig({ ...sharingConfig, allowDownload: e.target.checked })}
                  className="w-4 h-4 accent-green-400"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-white/80 font-bold block">Link Validity Period (Days)</span>
                <select
                  value={sharingConfig.expiryDays}
                  onChange={(e) => setSharingConfig({ ...sharingConfig, expiryDays: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateShareLink}
              className="w-full py-2.5 px-4 rounded-xl bg-green-400 hover:bg-green-500 text-black text-xs font-black transition-colors"
            >
              Generate Public Secure Link
            </button>
          </div>
        </div>
      )}

      {/* Responsive Lightbox Full-screen Overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {lightbox.url && (
              <a
                href={lightbox.url}
                download
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-zinc-900 rounded-xl border border-white/10 text-white/80 hover:bg-zinc-800"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="p-2 bg-zinc-900 rounded-xl border border-white/10 text-white/80 hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-3xl max-h-[80vh] w-full flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.url} alt="Fullscreen Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10" />
          </div>

          {lightbox.caption && (
            <div
              className="max-w-xl text-center mt-4 bg-zinc-950/80 backdrop-blur border border-white/10 rounded-2xl p-4 text-xs space-y-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/90 leading-relaxed font-semibold">"{lightbox.caption}"</p>
              <p className="text-[10px] text-white/40">Uploaded by {lightbox.employeeName} • {new Date(lightbox.time).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
