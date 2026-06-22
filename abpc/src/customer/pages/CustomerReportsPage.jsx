import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatDateDisplay } from "../../utils/format";
import {
  ShieldCheck, MessageSquare, Image as ImageIcon,
  Volume2, Video, CheckCircle2, Clock, Activity,
  Mic, ChevronDown, ChevronUp
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function statusLabel(status) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "approved") return { text: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (s === "in_progress" || s === "pending_review" || s === "pending")
    return { text: "Intermediate", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" };
  return null;
}

// ── component ──────────────────────────────────────────────────────────────

export default function CustomerReportsPage() {
  const { activeCustomerId } = useCustomerAuth();

  const [jobs, setJobs] = useState(null);
  const [legacyReports, setLegacyReports] = useState([]);
  const [visitReports, setVisitReports] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Subscribe to customer jobs
  useEffect(() => {
    if (!activeCustomerId) return;
    return subscribeQuery(
      query(collection(firestoreDb, "jobs"), where("customerId", "==", activeCustomerId)),
      setJobs
    );
  }, [activeCustomerId]);

  // Subscribe to legacy jobReports
  useEffect(() => {
    if (!jobs?.length) { setLegacyReports([]); return; }
    const jobIds = jobs.map(j => j.id).slice(0, 30);
    return subscribeQuery(
      query(collection(firestoreDb, "jobReports"), where("jobId", "in", jobIds)),
      (docs) => setLegacyReports([...docs].sort((a, b) =>
        (b.timestamp ? new Date(b.timestamp).getTime() : 0) -
        (a.timestamp ? new Date(a.timestamp).getTime() : 0)
      ))
    );
  }, [jobs]);

  // Subscribe to new serviceVisitReports — approved OR pending_review (intermediate)
  useEffect(() => {
    if (!jobs?.length) { setVisitReports([]); return; }
    const jobIds = jobs.map(j => j.id).slice(0, 30);
    return subscribeQuery(
      query(collection(firestoreDb, "serviceVisitReports"), where("jobId", "in", jobIds)),
      (docs) => {
        // Show approved + intermediate (pending_review), hide rejected
        const visible = docs.filter(r => {
          const s = (r.reportStatus || "").toLowerCase();
          return s === "approved" || s === "pending_review" || s === "in_progress";
        });
        setVisitReports([...visible].sort((a, b) =>
          new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        ));
      }
    );
  }, [jobs]);

  // Merge with job info
  const jobMap = useMemo(() => {
    if (!jobs) return {};
    return Object.fromEntries(jobs.map(j => [j.id, j]));
  }, [jobs]);

  const allReports = useMemo(() => {
    // visitReports first, then legacy
    const visit = visitReports.map(r => ({
      ...r,
      _type: "visit",
      _job: jobMap[r.jobId] || {},
      _date: r.submittedAt || "",
    }));
    const legacy = legacyReports.map(r => ({
      ...r,
      _type: "legacy",
      _job: jobMap[r.jobId] || {},
      _date: r.timestamp || "",
    }));
    return [...visit, ...legacy];
  }, [visitReports, legacyReports, jobMap]);

  const loading = jobs === null;

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Service Reports</h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          Approved treatment reports and in-progress updates from your service visits
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading reports...</p>
        </div>
      ) : allReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No Reports Yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Reports will appear here after each technician visit is reviewed by admin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allReports.map((rep) => {
            const job = rep._job;
            const serviceType = job.treatmentLabel || job.serviceType || job.serviceName || rep.jobService || "Pest Treatment";
            const techName = rep.employeeName || rep.EmployeeName || "Field Technician";
            const isVisit = rep._type === "visit";
            const badge = isVisit ? statusLabel(rep.reportStatus) : null;
            const isIntermediate = badge?.text === "Intermediate";
            const isOpen = expanded[rep.id];

            // date display
            const dateStr = rep._date
              ? new Date(rep._date).toLocaleDateString("en-IN", { dateStyle: "medium" })
              : formatDateDisplay(job.scheduledDate || "");

            // media
            const photos = isVisit ? (rep.photos || []) : (rep.photoUrls || rep.imageUrls || []);
            const videos = isVisit ? (rep.videos || []) : (rep.videoUrl ? [{ url: rep.videoUrl }] : []);
            const voiceNotes = isVisit ? (rep.voiceNotes || []) : [];
            const noteText = rep.employeeRemarks || rep.note || rep.notes || "";
            const activities = [...(rep.newlyCompletedActivities || []), ...(rep.previouslyReportedActivities || [])];
            const progress = rep.progressSnapshot;

            return (
              <div key={rep.id}
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${
                  isIntermediate ? "border-amber-200" : "border-slate-200"
                }`}>

                {/* Card header */}
                <button
                  onClick={() => toggleExpand(rep.id)}
                  className="w-full text-left p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {badge ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.text}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Completed
                        </span>
                      )}
                      {isVisit && rep.reportNumber > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Report #{rep.reportNumber}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{serviceType}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{dateStr} · {techName}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Media count badges */}
                    {photos.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <ImageIcon className="w-3 h-3" /> {photos.length}
                      </span>
                    )}
                    {videos.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Video className="w-3 h-3" /> {videos.length}
                      </span>
                    )}
                    {voiceNotes.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Mic className="w-3 h-3" /> {voiceNotes.length}
                      </span>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Intermediate notice banner */}
                {isIntermediate && (
                  <div className="mx-5 mb-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs font-semibold text-amber-700">
                      This is an intermediate progress report — work is still in progress.
                    </p>
                  </div>
                )}

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

                    {/* Progress bar + activities (visit reports only) */}
                    {isVisit && progress && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" /> Treatment Progress
                          </span>
                          <span className="font-black text-emerald-600">{progress.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
                        </div>
                        {activities.length > 0 && (
                          <div className="pt-1 space-y-1.5">
                            {activities.map((act, i) => (
                              <div key={act.subJobId || i} className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{act.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Technician remarks */}
                    {noteText && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3" /> Technician Notes
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed italic">"{noteText}"</p>
                      </div>
                    )}

                    {/* Photos */}
                    {photos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3" /> Photos ({photos.length})
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {photos.map((item, i) => {
                            const url = typeof item === "string" ? item : item.url;
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity">
                                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {videos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Video className="w-3 h-3" /> Videos ({videos.length})
                        </p>
                        <div className="space-y-3">
                          {videos.map((item, i) => {
                            const url = typeof item === "string" ? item : item.url;
                            return (
                              <video key={i} src={url} controls playsInline preload="metadata"
                                className="w-full max-h-72 rounded-2xl bg-black border border-slate-200" />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Voice Notes */}
                    {voiceNotes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Mic className="w-3 h-3" /> Voice Notes ({voiceNotes.length})
                        </p>
                        <div className="space-y-2">
                          {voiceNotes.map((vn, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <Mic className="w-4 h-4 text-purple-500 shrink-0" />
                              <audio src={vn.url} controls className="flex-1 h-8" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No media fallback */}
                    {!noteText && photos.length === 0 && videos.length === 0 && voiceNotes.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No media attached to this report.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
