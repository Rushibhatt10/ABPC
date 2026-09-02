import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Trash2,
  UploadCloud,
  Video,
  X,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Plus,
  RefreshCw,
} from "lucide-react";
import { collection, doc, query, where, writeBatch } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { subscribeQuery } from "../utils/firestoreHelpers";
import { compressImage, validateFileSize, uid } from "../utils/mediaHelpers";
import { confirmIncompleteSubJobs } from "../utils/jobHelpers";

const glass = {
  background: "linear-gradient(180deg, rgba(18,26,18,0.98), rgba(12,18,12,0.98))",
  border: "1px solid rgba(132,204,22,0.26)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
};

const colors = {
  title: "#F8FAFC",
  body: "#DCE7D6",
  muted: "#C8D9C0",
  subtle: "#A8BDA0",
  green: "#86EFAC",
  panel: "rgba(255,255,255,0.12)",
  panelStrong: "rgba(255,255,255,0.25)",
  border: "rgba(255,255,255,0.25)",
};

// Client-side helper to fetch media duration (video/audio)
function getMediaDuration(file) {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    el.preload = "metadata";
    el.src = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(el.duration || 0);
    };
    el.onerror = () => {
      resolve(0);
    };
  });
}

// XHR upload to Cloudinary supporting real-time progress indicators
function uploadWithProgress(file, resourceType, onProgress) {
  return new Promise((resolve, reject) => {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary not configured."));
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    if (resourceType === "video") {
      fd.append("folder", "job_reports/videos");
    }

    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    xhr.open("POST", endpoint, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res.secure_url);
        } catch (e) {
          reject(new Error("Invalid response from server."));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res?.error?.message || `Upload failed (${xhr.status})`));
        } catch (e) {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network connection error."));
    xhr.send(fd);
  });
}

export default function ServiceVisitReportModal({ job, onClose, onSaved }) {
  const { profile } = useAuth();
  const employeeName = profile?.workerName || profile?.name || "Team";
  const employeeId = profile?.key || "";

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const [subJobs, setSubJobs] = useState([]);
  const [reports, setReports] = useState([]);
  
  const [mediaQueue, setMediaQueue] = useState([]);
  const [employeeRemarks, setEmployeeRemarks] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Live Voice Recording States
  const [recordingState, setRecordingState] = useState("inactive"); // inactive | recording | paused
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  // Subscriptions for subJobs and serviceVisitReports
  useEffect(() => {
    const qSub = query(collection(firestoreDb, "subJobs"), where("jobId", "==", job.id));
    const unsubSub = subscribeQuery(qSub, (docs) => {
      setSubJobs(docs);
    });

    const qRep = query(collection(firestoreDb, "serviceVisitReports"), where("jobId", "==", job.id));
    const unsubRep = subscribeQuery(qRep, (docs) => {
      setReports(docs);
    });

    return () => {
      unsubSub();
      unsubRep();
    };
  }, [job.id]);

  // Clean up Object URLs when components unmount
  useEffect(() => {
    return () => {
      mediaQueue.forEach((m) => {
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      clearInterval(recordingTimerRef.current);
    };
  }, [mediaQueue, recordedUrl]);

  // Compute activities categorized
  const {
    newlyCompletedActivities,
    previouslyReportedActivities,
    pendingActivities,
    reportNumber,
    hasChangesRequested,
    isRejected,
    rejectionReason,
  } = useMemo(() => {
    const nextNum = reports.length + 1;
    const sortedReports = [...reports].sort((a, b) => (b.reportNumber || 0) - (a.reportNumber || 0));
    const latestReport = sortedReports[0];
    const latestStatus = (latestReport?.reportStatus || latestReport?.status || "").toLowerCase();
    const changesReq = latestStatus === "changes_requested";
    const rejected = latestStatus === "rejected";
    const reason = rejected ? (latestReport?.adminRemarks || "No reason provided.") : "";

    const reportedIds = new Set();
    reports.forEach((rep) => {
      (rep.newlyCompletedActivities || []).forEach((act) => {
        if (act.subJobId) reportedIds.add(act.subJobId);
      });
    });

    const newly = [];
    const previously = [];
    const pending = [];

    subJobs.forEach((sj) => {
      const act = {
        subJobId: sj.id,
        title: sj.title || "",
        completedBy: sj.completedBy || "",
        completedAt: sj.completedAt || "",
      };

      if (sj.status === "done") {
        if (reportedIds.has(sj.id)) {
          previously.push(act);
        } else {
          newly.push(act);
        }
      } else {
        pending.push({ subJobId: sj.id, title: sj.title || "" });
      }
    });

    return {
      newlyCompletedActivities: newly,
      previouslyReportedActivities: previously,
      pendingActivities: pending,
      reportNumber: nextNum,
      hasChangesRequested: changesReq,
      isRejected: rejected,
      rejectionReason: reason,
    };
  }, [subJobs, reports]);

  const uploadFileInQueue = async (item) => {
    setMediaQueue(prev => prev.map(m => m.id === item.id ? { ...m, status: 'uploading', progress: 0, errorMsg: '' } : m));
    
    try {
      const resourceType = item.type === 'photo' ? 'image' : 'video'; // Cloudinary video endpoint processes video & audio
      const url = await uploadWithProgress(item.file, resourceType, (percent) => {
        setMediaQueue(prev => prev.map(m => m.id === item.id ? { ...m, progress: percent } : m));
      });
      setMediaQueue(prev => prev.map(m => m.id === item.id ? { ...m, status: 'success', progress: 100, url } : m));
    } catch (e) {
      setMediaQueue(prev => prev.map(m => m.id === item.id ? { ...m, status: 'error', errorMsg: e.message || 'Upload failed.' } : m));
    }
  };

  const handleRetryUpload = (id) => {
    const item = mediaQueue.find(m => m.id === id);
    if (item) {
      uploadFileInQueue(item);
    }
  };

  // Media Selection Handlers
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr("");
    
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setErr("Only image files are allowed in this section.");
        continue;
      }
      const sizeErr = validateFileSize(file, 10); // max 10MB
      if (sizeErr) {
        setErr(sizeErr);
        continue;
      }
      if (mediaQueue.some(m => m.fileName === file.name && m.fileSize === file.size)) {
        continue;
      }

      let compressed = file;
      try {
        compressed = await compressImage(file, 2, 1600);
      } catch (err) {
        console.warn("Image compression failed, using original:", err);
      }

      const id = uid();
      const previewUrl = URL.createObjectURL(compressed);

      const newItem = {
        id,
        file: compressed,
        type: "photo",
        fileName: file.name,
        fileSize: compressed.size,
        duration: 0,
        caption: "",
        previewUrl,
        status: "pending",
        progress: 0,
        url: "",
        errorMsg: "",
      };

      setMediaQueue((prev) => [...prev, newItem]);
      uploadFileInQueue(newItem);
    }
    e.target.value = "";
  };

  const handleVideoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr("");

    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        setErr("Only video files are allowed in this section.");
        continue;
      }
      const sizeErr = validateFileSize(file, 100); // max 100MB
      if (sizeErr) {
        setErr(sizeErr);
        continue;
      }
      if (mediaQueue.some(m => m.fileName === file.name && m.fileSize === file.size)) {
        continue;
      }

      const duration = await getMediaDuration(file);
      const id = uid();
      const previewUrl = URL.createObjectURL(file);

      const newItem = {
        id,
        file,
        type: "video",
        fileName: file.name,
        fileSize: file.size,
        duration,
        caption: "",
        previewUrl,
        status: "pending",
        progress: 0,
        url: "",
        errorMsg: "",
      };

      setMediaQueue((prev) => [...prev, newItem]);
      uploadFileInQueue(newItem);
    }
    e.target.value = "";
  };

  const handleAudioUploadSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr("");

    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        setErr("Only audio files are allowed in this section.");
        continue;
      }
      const sizeErr = validateFileSize(file, 25); // max 25MB
      if (sizeErr) {
        setErr(sizeErr);
        continue;
      }
      if (mediaQueue.some(m => m.fileName === file.name && m.fileSize === file.size)) {
        continue;
      }

      const duration = await getMediaDuration(file);
      const id = uid();
      const previewUrl = URL.createObjectURL(file);

      const newItem = {
        id,
        file,
        type: "voice",
        fileName: file.name,
        fileSize: file.size,
        duration,
        caption: "",
        previewUrl,
        status: "pending",
        progress: 0,
        url: "",
        errorMsg: "",
      };

      setMediaQueue((prev) => [...prev, newItem]);
      uploadFileInQueue(newItem);
    }
    e.target.value = "";
  };

  // Recording Actions
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
        .find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mime || "audio/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setRecordingState("recording");
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (e) {
      setErr("Microphone access denied: " + e.message);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      clearInterval(recordingTimerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecordingState("inactive");
      clearInterval(recordingTimerRef.current);
    }
  };

  const resetRecording = () => {
    clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordingState("inactive");
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingDuration(0);
  };

  const saveRecordedVoice = async () => {
    if (!recordedBlob) return;
    setErr("");
    
    if (recordedBlob.size > 25 * 1024 * 1024) {
      setErr("Recorded voice exceeds 25MB limit.");
      return;
    }

    const file = new File(
      [recordedBlob],
      `voice_${Date.now()}.webm`,
      { type: recordedBlob.type || "audio/webm" }
    );

    const duration = recordingDuration;
    const id = uid();
    const previewUrl = recordedUrl; // Re-use the existing preview object URL

    const newItem = {
      id,
      file,
      type: "voice",
      fileName: file.name,
      fileSize: file.size,
      duration,
      caption: "",
      previewUrl,
      status: "pending",
      progress: 0,
      url: "",
      errorMsg: "",
    };

    setMediaQueue((prev) => [...prev, newItem]);
    uploadFileInQueue(newItem);

    // Clear record state without revoking the preview URL that is now transferred
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingDuration(0);
  };

  const handleRemoveMedia = (id) => {
    setMediaQueue((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleCaptionChange = (id, text) => {
    setMediaQueue((prev) =>
      prev.map((m) => (m.id === id ? { ...m, caption: text } : m))
    );
  };

  const handleSubmit = async () => {
    const isUploading = mediaQueue.some((m) => m.status === "uploading" || m.status === "pending");
    const hasErrors = mediaQueue.some((m) => m.status === "error");

    if (isUploading) {
      setErr("Please wait for all media files to complete uploading.");
      return;
    }

    if (hasErrors) {
      setErr("Please retry or remove failed media uploads before submitting.");
      return;
    }

    const hasCompleted = newlyCompletedActivities.length > 0;
    if (!hasCompleted && !hasChangesRequested && mediaQueue.length === 0 && !employeeRemarks.trim()) {
      setErr("Please complete at least one task, add media, or write remarks before submitting.");
      return;
    }

    if (pendingActivities.length > 0) {
      const pendingAsSubJobs = pendingActivities.map((act) => ({ title: act.title }));
      if (!confirmIncompleteSubJobs(pendingAsSubJobs, "submit this report without completing all sub-tasks")) {
        return;
      }
    }

    setBusy(true);
    setErr("");

    try {
      const photos = [];
      const videos = [];
      const voiceNotes = [];

      mediaQueue.forEach((m) => {
        const metadata = {
          mediaId: m.id,
          url: m.url,
          fileName: m.fileName,
          fileSize: m.fileSize,
          caption: m.caption.trim(),
          uploadedAt: new Date().toISOString(),
          uploadedByEmployeeId: employeeId,
          uploadedByEmployeeName: employeeName,
        };

        if (m.type === "photo") {
          photos.push(metadata);
        } else if (m.type === "video") {
          videos.push({ ...metadata, duration: m.duration });
        } else if (m.type === "voice") {
          voiceNotes.push({ ...metadata, duration: m.duration });
        }
      });

      const totalCount = subJobs.length;
      const completedCount = subJobs.filter((sj) => sj.status === "done").length;
      const percent = Math.round((completedCount / (totalCount || 1)) * 100);

      const generatedId = uid();

      const reportData = {
        reportId: generatedId,
        jobId: job.id,
        reportNumber,
        employeeId,
        employeeName,
        newlyCompletedActivities,
        previouslyReportedActivities,
        pendingActivities,
        progressSnapshot: {
          completedActivities: completedCount,
          totalActivities: totalCount,
          percentage: percent,
        },
        employeeRemarks: employeeRemarks.trim(),
        photos,
        videos,
        voiceNotes,
        submittedAt: new Date().toISOString(),
        reportStatus: "PENDING_REVIEW",
        adminRemarks: "",
        reviewedByAdminId: "",
        reviewedByAdminName: "",
        reviewedAt: null,
        shareSettings: {
          isShared: false,
          shareToken: "",
          shareUrl: "",
          expiresAt: null,
          allowPhotos: true,
          allowVideos: true,
          allowVoiceNotes: true,
          allowDownload: false,
        },
        jobSnapshot: {
          customerName: job.customerName || "",
          customerId: job.customerId || "",
          customerPhone: job.customerPhone || "",
          treatmentLabel: job.treatmentLabel || "",
          serviceType: job.serviceType || job.serviceName || "",
          pestType: job.pestType || "",
          address: job.address || job.customerAddress || "",
        },
      };

      const batch = writeBatch(firestoreDb);
      
      const newReportRef = doc(collection(firestoreDb, "serviceVisitReports"), generatedId);
      batch.set(newReportRef, reportData);

      const jobRef = doc(firestoreDb, "jobs", job.id);
      batch.update(jobRef, {
        latestReportNumber: reportNumber,
        updatedAt: new Date(),
      });

      await batch.commit();

      setMediaQueue([]);
      setEmployeeRemarks("");
      onSaved();
    } catch (e) {
      setErr(e.message || "Failed to submit report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const totalCompleted = newlyCompletedActivities.length + previouslyReportedActivities.length;
  const progressPercent = Math.round((totalCompleted / (subJobs.length || 1)) * 100);
  const pendingUploads = mediaQueue.some((m) => m.status === "pending" || m.status === "uploading");
  const hasUploadErrors = mediaQueue.some((m) => m.status === "error");
  // Allow submit: at least one newly completed activity OR media attached OR remarks written
  const canSubmit = (
    newlyCompletedActivities.length > 0 ||
    hasChangesRequested ||
    isRejected ||
    mediaQueue.length > 0 ||
    employeeRemarks.trim().length > 0
  ) && !hasUploadErrors;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <div
        className="w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[94vh] overflow-hidden flex flex-col"
        style={{ ...glass, boxShadow: "0 30px 90px rgba(0,0,0,0.78)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: colors.border }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(134,239,172,0.15)", color: colors.green }}>
                Report #{reportNumber}
              </span>
              <p className="text-sm font-black" style={{ color: colors.title }}>Submit Service Visit Report</p>
            </div>
            <p className="text-xs truncate mt-1" style={{ color: colors.muted }}>
              {job.customerName} - {job.treatmentLabel || job.serviceType || "Pest Control"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/5 hover:bg-white/10"
            style={{ color: "#CBD5E1", border: `1px solid ${colors.border}` }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ scrollbarWidth: "none" }}>

          {/* ── Rejection Alert ── */}
          {isRejected && (
            <div className="p-4 rounded-2xl border border-red-500/40"
              style={{ background: "rgba(239,68,68,0.1)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#F87171" }}>
                ⚠ Report Rejected by Admin
              </p>
              <p className="text-xs mb-2" style={{ color: "#FCA5A5" }}>
                Your previous report was rejected. Please review the reason below, fix the issues, and resubmit.
              </p>
              {rejectionReason && (
                <div className="px-3 py-2 rounded-xl bg-black/20 border border-red-500/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#F87171" }}>Admin Reason:</p>
                  <p className="text-xs italic" style={{ color: "#FECACA" }}>"{rejectionReason}"</p>
                </div>
              )}
            </div>
          )}

          {/* ── Changes Requested Alert ── */}
          {hasChangesRequested && !isRejected && (
            <div className="p-4 rounded-2xl border border-amber-500/40"
              style={{ background: "rgba(245,158,11,0.1)" }}>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#FCD34D" }}>
                ✎ Admin Requested Changes
              </p>
              <p className="text-xs" style={{ color: "#FDE68A" }}>
                Please address admin's feedback and resubmit your report.
              </p>
            </div>
          )}

          {/* Progress Section */}
          <div className="p-4 rounded-2xl bg-white/5 border" style={{ borderColor: colors.border }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold" style={{ color: colors.muted }}>Job Completion Progress</span>
              <span className="text-xs font-black" style={{ color: colors.green }}>{progressPercent}% ({totalCompleted}/{subJobs.length})</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: colors.green }} />
            </div>
          </div>

          {/* Activities Lists */}
          <div className="space-y-4">
            {/* Newly Completed */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: colors.green }}>
                Newly Completed Activities ({newlyCompletedActivities.length})
              </p>
              {newlyCompletedActivities.length === 0 ? (
                <p className="text-xs italic p-3 rounded-xl bg-white/5" style={{ color: colors.subtle }}>No new activities completed since last report.</p>
              ) : (
                <div className="space-y-2">
                  {newlyCompletedActivities.map((act) => (
                    <div key={act.subJobId} className="flex items-center gap-2.5 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-xs font-semibold" style={{ color: colors.body }}>{act.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Previously Reported */}
            {previouslyReportedActivities.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: colors.muted }}>
                  Previously Reported Activities ({previouslyReportedActivities.length})
                </p>
                <div className="space-y-2">
                  {previouslyReportedActivities.map((act) => (
                    <div key={act.subJobId} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 opacity-60">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold" style={{ color: colors.body }}>{act.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Activities */}
            {pendingActivities.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: colors.subtle }}>
                  Pending Activities ({pendingActivities.length})
                </p>
                <div className="space-y-2">
                  {pendingActivities.map((act) => (
                    <div key={act.subJobId} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                      <span className="text-xs font-semibold" style={{ color: colors.muted }}>{act.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Media Attachments Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.muted }}>
              Attach Media Proof (Photos max 10MB, Videos max 100MB, Audio max 25MB)
            </p>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/5 border hover:bg-white/10 transition-colors text-center"
                style={{ borderColor: colors.border }}
              >
                <Camera className="w-5 h-5" style={{ color: colors.green }} />
                <span className="text-[9px] font-bold text-white leading-tight">Add Photo</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/5 border hover:bg-white/10 transition-colors text-center"
                style={{ borderColor: colors.border }}
              >
                <Video className="w-5 h-5 text-sky-400" />
                <span className="text-[9px] font-bold text-white leading-tight">Add Video</span>
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleVideoSelect}
              />

              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/5 border hover:bg-white/10 transition-colors text-center"
                style={{ borderColor: colors.border }}
              >
                <UploadCloud className="w-5 h-5 text-amber-400" />
                <span className="text-[9px] font-bold text-white leading-tight">Upload Audio</span>
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={handleAudioUploadSelect}
              />

              {/* Voice Note Recording Controls */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-2xl bg-white/5 border" style={{ borderColor: colors.border }}>
                {recordingState === "recording" ? (
                  <div className="flex items-center gap-1.5 justify-center w-full h-full">
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-bold text-red-400 animate-pulse">{recordingDuration}s</span>
                  </div>
                ) : recordingState === "paused" ? (
                  <div className="flex items-center gap-1.5 justify-center w-full h-full">
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-bold text-orange-400">Paused</span>
                  </div>
                ) : recordedUrl ? (
                  <div className="flex items-center gap-1 justify-center w-full h-full flex-wrap">
                    <button
                      type="button"
                      onClick={saveRecordedVoice}
                      className="px-1.5 py-1 rounded bg-green-500 hover:bg-green-600 text-black text-[8px] font-black"
                    >
                      <Plus className="w-2.5 h-2.5 inline mr-0.5" />Save
                    </button>
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex flex-col items-center justify-center gap-1 w-full h-full text-purple-400 hover:bg-white/5 rounded-xl"
                  >
                    <Mic className="w-5 h-5 text-purple-400" />
                    <span className="text-[9px] font-bold text-white leading-tight">Record Voice</span>
                  </button>
                )}
              </div>
            </div>

            {/* If recorded sound exists, allow employee to preview it here before saving to queue */}
            {recordedUrl && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-purple-400">Recorded Audio Preview ({recordingDuration}s)</span>
                <audio src={recordedUrl} controls className="w-full max-h-8" />
              </div>
            )}

            {/* Media Upload Queue / Previews */}
            {mediaQueue.length > 0 && (
              <div className="space-y-3 pt-2">
                {mediaQueue.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border"
                    style={{ borderColor: colors.border }}
                  >
                    {m.type === "photo" && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img src={m.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {m.type === "video" && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 flex items-center justify-center relative">
                        <video src={m.previewUrl} className="w-full h-full object-cover" />
                        <Video className="w-4 h-4 absolute text-white/80 animate-pulse" />
                      </div>
                    )}
                    {m.type === "voice" && (
                      <div className="w-16 h-16 rounded-xl bg-purple-500/10 shrink-0 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Mic className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase text-white/50 truncate max-w-[150px]">
                          {m.fileName} ({(m.fileSize / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.status === "error" && (
                            <button
                              type="button"
                              onClick={() => handleRetryUpload(m.id)}
                              className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/35 flex items-center gap-0.5"
                            >
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(m.id)}
                            className="text-red-400 hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(m.status === "uploading" || m.status === "pending") && (
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden my-2">
                          <div className="h-full bg-blue-400 transition-all duration-200" style={{ width: `${m.progress}%` }} />
                        </div>
                      )}

                      {m.status === "error" && (
                        <p className="text-[9px] text-red-400 font-bold mb-1 leading-tight">{m.errorMsg}</p>
                      )}

                      {m.type === "voice" && (
                        <audio src={m.previewUrl} controls className="w-full max-h-8 mb-2" />
                      )}

                      <input
                        type="text"
                        placeholder="Add caption (optional)..."
                        value={m.caption}
                        onChange={(e) => handleCaptionChange(m.id, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks Section */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.muted }}>Employee Remarks (Optional)</p>
            <textarea
              placeholder="Provide any comments or notes about the service..."
              value={employeeRemarks}
              onChange={(e) => setEmployeeRemarks(e.target.value)}
              className="w-full h-24 bg-white/5 border rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
              style={{ borderColor: colors.border }}
            />
          </div>

          {/* Error Message */}
          {err && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
              {err}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: colors.border, background: "rgba(0,0,0,0.2)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-xs font-black transition-all bg-white/5 hover:bg-white/10 active:scale-95 text-white disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || pendingUploads || !canSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ backgroundColor: canSubmit && !pendingUploads ? colors.green : "rgba(255,255,255,0.1)", color: canSubmit && !pendingUploads ? "#000" : colors.muted }}
          >
            {busy ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
