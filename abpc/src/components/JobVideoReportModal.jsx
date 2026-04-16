/**
 * JobVideoReportModal — Per-employee video report submission.
 * Each employee submits independently. Reports stored in "jobReports" collection.
 * Admin sees all reports combined.
 */
import { useEffect, useRef, useState } from "react";
import { X, Video, FileText, Save, Play, CheckCircle2, Clock, User, Send } from "lucide-react";
import { uploadVideoToCloudinary } from "../utils/cloudinaryUpload";
import { createRecord, subscribeQuery } from "../utils/firestoreHelpers";
import { collection, query, where, orderBy } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { firebaseAuth } from "../firebase/auth";
import { signInAnonymously } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { formatDateDisplay } from "../utils/format";

const glass = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" };

export default function JobVideoReportModal({ job, onClose }) {
  const { profile } = useAuth();
  const employeeName = profile?.workerName || profile?.name || "";
  const videoInputRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Real-time reports for this job
  useEffect(() => {
    const q = query(
      collection(firestoreDb, "jobReports"),
      where("jobId", "==", job.id),
      orderBy("timestamp", "desc")
    );
    return subscribeQuery(q, setReports);
  }, [job.id]);

  const myReport = reports.find(r => r.employeeName === employeeName);

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (!["video/mp4", "video/webm"].includes(file.type)) { setErr("Only MP4 or WebM allowed."); return; }
    if (file.size > 20 * 1024 * 1024) { setErr("Video must be under 20MB."); return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!videoFile && !note.trim()) { setErr("Add a video or note before submitting."); return; }
    if (myReport) { setErr("You already submitted a report for this job."); return; }
    setBusy(true); setErr("");
    try {
      // Ensure Firebase auth session exists (employees use anonymous auth)
      if (!firebaseAuth.currentUser) {
        setProgress("Authenticating…");
        await signInAnonymously(firebaseAuth);
      }

      let videoUrl = "";
      if (videoFile) {
        setProgress("Uploading video…");
        videoUrl = await uploadVideoToCloudinary(videoFile, job.id);
      }
      setProgress("Saving report…");
      await createRecord("jobReports", {
        jobId: job.id,
        jobCustomer: job.customerName || "",
        jobService: job.treatmentLabel || job.serviceType || "",
        employeeName,
        employeeId: profile?.key || "",
        note: note.trim(),
        videoUrl,
        timestamp: new Date().toISOString(),
        status: "submitted",
      });
      setSubmitted(true);
      setVideoFile(null);
      setVideoPreview("");
      setNote("");
    } catch (e) {
      setErr(e.message || "Upload failed.");
    } finally {
      setBusy(false); setProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        style={{ ...glass, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="font-black text-white text-sm">Job Report</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{job.customerName} · {job.treatmentLabel || job.serviceType}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">

          {/* Submitted reports from all employees */}
          {reports.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                Reports ({reports.length})
              </p>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A" }}>
                          {r.employeeName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{r.employeeName}</p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A" }}>
                        ✓ Submitted
                      </span>
                    </div>
                    {r.note && <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{r.note}</p>}
                    {r.videoUrl && (
                      <video src={r.videoUrl} controls className="w-full rounded-xl" style={{ maxHeight: 180 }} preload="metadata" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit form — only if not already submitted */}
          {!myReport && !submitted ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                Your Report
              </p>

              {/* Video upload */}
              <div>
                {videoPreview ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(76,122,45,0.3)" }}>
                    <video src={videoPreview} controls className="w-full" style={{ maxHeight: 200 }} />
                    <button onClick={() => { setVideoFile(null); setVideoPreview(""); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.8)" }}>
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => videoInputRef.current?.click()}
                    className="w-full py-8 rounded-xl flex flex-col items-center gap-2 transition-all"
                    style={{ border: "2px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(76,122,45,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                    <Video className="w-6 h-6" />
                    <span className="text-xs font-semibold">Upload Video (MP4/WebM, max 20MB)</span>
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoSelect} />
              </div>

              {/* Notes */}
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Add work notes, observations…"
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />

              {err && <p className="text-xs font-semibold" style={{ color: "#F87171" }}>{err}</p>}
              {progress && <p className="text-xs font-semibold" style={{ color: "#6DBF4A" }}>{progress}</p>}

              <button onClick={handleSubmit} disabled={busy}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white transition-all"
                style={{ background: busy ? "rgba(76,122,45,0.4)" : "linear-gradient(135deg,#2F4F2F,#4C7A2D)", boxShadow: busy ? "none" : "0 0 20px rgba(76,122,45,0.3)" }}>
                {busy ? progress || "Submitting…" : "Submit Report"}
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#6DBF4A" }} />
              <p className="font-bold text-white">Report Submitted!</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Your report has been saved successfully.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
