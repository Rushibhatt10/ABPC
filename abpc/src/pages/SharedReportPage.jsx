import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { subscribeQuery } from "../utils/firestoreHelpers";
import {
  ShieldAlert,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Image as ImageIcon,
  Mic,
  Video,
  ExternalLink,
  ChevronRight,
  User,
  Activity,
  Award,
  X,
} from "lucide-react";

export default function SharedReportPage() {
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [expired, setExpired] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!shareToken) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestoreDb, "serviceVisitReports"),
      where("shareSettings.shareToken", "==", shareToken)
    );

    const unsub = subscribeQuery(q, (docs) => {
      if (docs.length === 0) {
        setReport(null);
        setLoading(false);
        return;
      }

      const rep = docs[0];
      const isShared = rep.shareSettings?.isShared;
      const expiresAt = rep.shareSettings?.expiresAt;
      const isApproved = rep.reportStatus === "approved" || rep.status === "approved";

      const now = new Date();
      const hasExpired = expiresAt ? now > new Date(expiresAt) : false;

      if (!isShared || !isApproved || hasExpired) {
        setExpired(true);
      } else {
        setReport(rep);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-green-400 animate-spin mb-3" />
        <p className="text-xs text-neutral-400">Loading secure report details...</p>
      </div>
    );
  }

  if (expired || !report) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-lg font-black tracking-tight mb-2">Access Expired or Invalid</h1>
        <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
          The link you followed has either expired, been revoked, or is incorrect. Please contact AB Pest Control if you believe this is an error.
        </p>
      </div>
    );
  }

  const { shareSettings, jobSnapshot, newlyCompletedActivities, previouslyReportedActivities } = report;
  const allowPhotos = shareSettings?.allowPhotos ?? true;
  const allowVideos = shareSettings?.allowVideos ?? true;
  const allowVoiceNotes = shareSettings?.allowVoiceNotes ?? true;
  const allowDownload = shareSettings?.allowDownload ?? false;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col selection:bg-green-400 selection:text-black">
      
      {/* Navbar / Branding */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-black font-black text-sm">
            AB
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-white block">AB PEST CONTROL</span>
            <span className="text-[9px] text-green-400 tracking-widest font-black uppercase">Service Visit Report</span>
          </div>
        </div>
        
        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> Approved
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-6">

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-green-950/20 to-transparent border border-green-500/15 rounded-3xl p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Service Overview</span>
            <h2 className="text-xl font-black text-slate-100">{jobSnapshot?.treatmentLabel || jobSnapshot?.serviceType || "Pest Control Treatment"}</h2>
            {jobSnapshot?.pestType && (
              <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                Target Pest: {jobSnapshot.pestType}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs text-neutral-400">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider block text-neutral-500">Service Date</span>
              <span className="font-semibold text-neutral-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 
                {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider block text-neutral-500">Service ID</span>
              <span className="font-semibold text-neutral-200">#{report.jobId?.slice(-6).toUpperCase() || "-"}</span>
            </div>
          </div>
        </section>

        {/* Completion Progress Checklists */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" /> Completed Treatment Activities
          </h3>

          <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 space-y-4">
            
            {/* Progress bar */}
            {report.progressSnapshot && (
              <div className="space-y-2 pb-2 border-b border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Treatment Milestones Completed</span>
                  <span className="font-black text-green-400">{report.progressSnapshot.percentage}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-green-400 transition-all duration-300" style={{ width: `${report.progressSnapshot.percentage}%` }} />
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-3">
              {newlyCompletedActivities?.map((act) => (
                <div key={act.subJobId} className="flex items-start gap-2.5 text-xs text-neutral-200">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>{act.title}</span>
                </div>
              ))}
              {previouslyReportedActivities?.map((act) => (
                <div key={act.subJobId} className="flex items-start gap-2.5 text-xs text-neutral-400 opacity-75">
                  <CheckCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                  <span>{act.title} <span className="text-[10px] text-neutral-600">(completed in previous visits)</span></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Employee Remarks (if shared and provided) */}
        {report.employeeRemarks && (
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Treatment Summary Notes</h3>
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 text-xs text-neutral-300 leading-relaxed italic">
              "{report.employeeRemarks}"
            </div>
          </section>
        )}

        {/* Media Attachments Gallery */}
        <section className="space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Service Work Proof</h3>

          {/* Photos Gallery */}
          {allowPhotos && report.photos?.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Photos ({report.photos.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.photos.map((photo, pIdx) => (
                  <div key={photo.mediaId || pIdx} className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
                    <img src={photo.url} alt="Work Proof" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setLightbox(photo)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-1"
                    >
                      Preview <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {allowDownload && (
                      <a
                        href={photo.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2.5 right-2.5 p-2 bg-neutral-950/80 hover:bg-neutral-950 rounded-xl text-white/80 border border-white/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos List */}
          {allowVideos && report.videos?.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> Videos ({report.videos.length})
              </span>
              <div className="space-y-4">
                {report.videos.map((vid, vIdx) => (
                  <div key={vid.mediaId || vIdx} className="rounded-3xl overflow-hidden bg-neutral-900/30 border border-neutral-900 p-3 space-y-3">
                    <video src={vid.url} controls className="w-full rounded-2xl max-h-[300px] bg-black" preload="metadata" />
                    <div className="px-2 flex justify-between items-center">
                      <div className="text-[10px] text-neutral-400">
                        {vid.caption ? <p className="italic text-neutral-200">"{vid.caption}"</p> : <p>Attachment video</p>}
                        <p className="mt-0.5">Duration: {Math.round(vid.duration || 0)}s</p>
                      </div>
                      {allowDownload && (
                        <a
                          href={vid.url}
                          download
                          className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-white/80 hover:bg-neutral-800"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Notes List */}
          {allowVoiceNotes && report.voiceNotes?.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Voice notes & audio ({report.voiceNotes.length})
              </span>
              <div className="space-y-3">
                {report.voiceNotes.map((vn, vnIdx) => (
                  <div key={vn.mediaId || vnIdx} className="p-4 rounded-2xl bg-neutral-900/30 border border-neutral-900 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                        <Mic className="w-3.5 h-3.5 text-green-400" />
                        <span>Voice Recording • {Math.round(vn.duration || 0)}s</span>
                      </div>
                      <audio src={vn.url} controls className="w-full" />
                      {vn.caption && <p className="text-[10px] italic text-neutral-300">"{vn.caption}"</p>}
                    </div>
                    {allowDownload && (
                      <a
                        href={vn.url}
                        download
                        className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-white/80 hover:bg-neutral-800 shrink-0 self-center"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Lightbox fullscreen preview */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {allowDownload && (
              <a
                href={lightbox.url}
                download
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-neutral-900 rounded-xl border border-neutral-800 text-white hover:bg-neutral-850"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="p-2 bg-neutral-900 rounded-xl border border-neutral-800 text-white hover:bg-neutral-850"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-3xl max-h-[80vh] w-full flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.url} alt="Fullscreen Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-neutral-800" />
          </div>

          {lightbox.caption && (
            <div
              className="max-w-xl text-center mt-4 bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded-2xl p-4 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/90 leading-relaxed font-semibold">"{lightbox.caption}"</p>
            </div>
          )}
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-14 border-t border-neutral-900 py-8 px-6 text-center text-[10px] text-neutral-500 space-y-1 bg-black/30">
        <p>© {new Date().getFullYear()} AB Pest Control. All rights reserved.</p>
        <p className="tracking-wide">SERVICE VISIT REPORT • SECURED TRANSMISSION</p>
      </footer>
    </div>
  );
}

// Inline fallback loader helper icon
function RefreshCw(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
