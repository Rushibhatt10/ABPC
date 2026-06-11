import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatDateDisplay } from "../../utils/format";
import {
  ShieldCheck, MessageSquare, Image as ImageIcon,
  Volume2, Video, CheckCircle2
} from "lucide-react";

export default function CustomerReportsPage() {
  const { activeCustomerId, activeCustomer } = useCustomerAuth();

  const [jobs, setJobs] = useState(null);
  const [reports, setReports] = useState(null);

  // 1. Subscribe to ALL customer jobs (not just completed — reports may exist for any)
  useEffect(() => {
    if (!activeCustomerId) return;
    const q = query(
      collection(firestoreDb, "jobs"),
      where("customerId", "==", activeCustomerId)
    );
    return subscribeQuery(q, setJobs);
  }, [activeCustomerId]);

  // 2. Subscribe to jobReports (correct collection) matching this customer's job IDs
  //    Also do a secondary query by jobCustomer name as a fallback for older records.
  useEffect(() => {
    if (!jobs) return;

    if (jobs.length === 0) {
      setReports([]);
      return;
    }

    // Firestore "in" supports up to 30 items — chunk if needed
    const jobIds = jobs.map((j) => j.id).slice(0, 30);

    const q = query(
      collection(firestoreDb, "jobReports"),
      where("jobId", "in", jobIds)
    );

    return subscribeQuery(q, (docs) => {
      // Sort newest first
      const sorted = [...docs].sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });
      setReports(sorted);
    });
  }, [jobs]);

  // Merge report with its parent job for service label and date
  const reportsWithJobs = useMemo(() => {
    if (!jobs?.length || !reports) return [];
    return reports.map((rep) => {
      const parentJob = jobs.find((j) => j.id === rep.jobId) || {};
      return {
        ...rep,
        serviceType:
          parentJob.treatmentLabel ||
          parentJob.serviceType ||
          parentJob.serviceName ||
          rep.jobService ||
          "Pest Treatment",
        scheduledDate: parentJob.scheduledDate || "",
        completedAt: parentJob.completedAt || rep.timestamp || "",
      };
    });
  }, [reports, jobs]);

  const loading = jobs === null || (jobs.length > 0 && reports === null);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Service Reports</h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          Notes, photos, and video summaries submitted by technicians after each visit
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading service reports...</p>
        </div>
      ) : reportsWithJobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No Reports Yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Technician reports will appear here after each completed service visit.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reportsWithJobs.map((rep) => {
            const reportDate = rep.timestamp
              ? new Date(rep.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" })
              : rep.completedAt
              ? new Date(rep.completedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
              : formatDateDisplay(rep.scheduledDate);

            // Support both field name casings
            const techName = rep.employeeName || rep.EmployeeName || "Field Technician";
            const noteText = rep.note || rep.notes || "";
            const photos = rep.photoUrls || rep.imageUrls || [];
            const audio = rep.audioUrl || rep.voiceNote || "";
            const video = rep.videoUrl || "";

            return (
              <div
                key={rep.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
              >
                {/* Header row */}
                <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <h3 className="font-black text-slate-900 text-base">{rep.serviceType}</h3>
                    </div>
                    <p className="text-xs text-slate-400">Completed on: {reportDate}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 text-[11px] font-black">
                      {techName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 leading-tight">{techName}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Technician</p>
                    </div>
                  </div>
                </div>

                {/* Technician notes */}
                {noteText ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Technician Summary
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{noteText}"</p>
                  </div>
                ) : null}

                {/* Photos */}
                {photos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3" /> Treatment Photos ({photos.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photos.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {video && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Video className="w-3 h-3" /> Video Report
                    </p>
                    <video
                      src={video}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-80 rounded-2xl bg-black border border-slate-200"
                    />
                  </div>
                )}

                {/* If report has nothing media-wise, show a clean status */}
                {!noteText && photos.length === 0 && !video && !audio && (
                  <p className="text-xs text-slate-400 italic">Service completed — no media attached.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
