/**
 * Combined job report modal.
 * Employees can submit notes, photos, and video in one report.
 * Media is uploaded to Cloudinary, mirrored to Drive when configured, and
 * the saved report can be downloaded on mobile or shared to WhatsApp.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  MessageSquare,
  Send,
  Share2,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { firebaseAuth } from "../firebase/auth";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { createRecord, subscribeQuery } from "../utils/firestoreHelpers";
import { compressImage } from "../utils/mediaHelpers";
import { uploadToCloudinary, uploadVideoToCloudinary } from "../utils/cloudinaryUpload";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";
import { formatCurrency, getWhatsAppNumber } from "../utils/format";
import { sendWhatsAppText, shareReportMedia } from "../utils/shareHelpers";

const glass = {
  background: "linear-gradient(180deg, rgba(15,22,16,0.98), rgba(7,12,8,0.98))",
  border: "1px solid rgba(132,204,22,0.26)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
};

const colors = {
  title: "#F8FAFC",
  body: "#DCE7D6",
  muted: "#AAB7A5",
  subtle: "#7F8D7B",
  green: "#86EFAC",
  panel: "rgba(255,255,255,0.075)",
  panelStrong: "rgba(255,255,255,0.11)",
  border: "rgba(255,255,255,0.16)",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

const buildReportMessage = (job, reports) => {
  const date = job.completedAt
    ? new Date(job.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

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
Job ID: ${job.id?.slice(-6).toUpperCase() || "-"}
Service: ${job.treatmentLabel || job.serviceType || "Pest Control"}
Date: ${date}
Amount: ${formatCurrency(job.finalPrice || job.totalAmount || 0)}

Work Report:
${summary}${photoLinks ? `\n\nService Photos:\n${photoLinks}` : ""}${videoLinks ? `\n\nService Videos:\n${videoLinks}` : ""}${audioLinks ? `\n\nService Audio:\n${audioLinks}` : ""}${driveLinks ? `\n\nDrive Files:\n${driveLinks}` : ""}

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

export default function JobVideoReportModal({ job, onClose, onSaved }) {
  const { profile } = useAuth();
  const employeeName = profile?.workerName || profile?.name || "Team";
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const voiceRec = useVoiceRecorder();
  const [audioPreview, setAudioPreview] = useState("");

  useEffect(() => {
    const q = query(collection(firestoreDb, "jobReports"), where("jobId", "==", job.id));
    return subscribeQuery(q, (docs) => {
      const sorted = [...docs].sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() ?? a.timestamp ?? 0;
        const bTime = b.timestamp?.toMillis?.() ?? b.timestamp ?? 0;
        return bTime - aTime;
      });
      setReports(sorted);
    });
  }, [job.id]);

  useEffect(() => {
    if (!voiceRec.blob) return;
    const url = URL.createObjectURL(voiceRec.blob);
    setAudioPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setAudioPreview("");
    };
  }, [voiceRec.blob]);

  useEffect(() => () => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
  }, [photoPreviews, videoPreview, audioPreview]);

  const myReport = reports.find((r) => r.employeeName === employeeName);
  const shareMessage = useMemo(() => buildReportMessage(job, reports), [job, reports]);

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr("");
    try {
      const allowed = files.filter((file) => file.type.startsWith("image/"));
      if (allowed.length !== files.length) setErr("Only image files were added.");
      const room = Math.max(0, 6 - photoFiles.length);
      const selected = allowed.slice(0, room);
      if (!selected.length) return;
      setProgress("Preparing photos...");
      const compressed = [];
      for (const file of selected) compressed.push(await compressImage(file, 2, 1600));
      setPhotoFiles((prev) => [...prev, ...compressed]);
      setPhotoPreviews((prev) => [...prev, ...compressed.map((file) => URL.createObjectURL(file))]);
    } catch (error) {
      setErr(error.message || "Could not prepare photos.");
    } finally {
      setProgress("");
      e.target.value = "";
    }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setErr("Only MP4 or WebM videos are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErr("Video must be under 50 MB.");
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview("");
  };

  const handleSubmit = async () => {
    if (!photoFiles.length && !videoFile && !note.trim()) {
      setErr("Add photos, a video, or notes before submitting.");
      return;
    }
    if (myReport) {
      setErr("You already submitted a report for this job.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      if (!firebaseAuth.currentUser) {
        setProgress("Authenticating...");
        await signInAnonymously(firebaseAuth);
      }

      const photoUrls = [];
      const driveFiles = [];

      for (let i = 0; i < photoFiles.length; i += 1) {
        const file = photoFiles[i];
        setProgress(`Uploading photo ${i + 1}/${photoFiles.length}...`);
        const url = await uploadToCloudinary(file);
        photoUrls.push(url);

        if (isDriveUploadConfigured()) {
          setProgress(`Saving photo ${i + 1} to Drive...`);
          const driveFile = await uploadFileToDrive({
            file,
            fileName: `job-${job.id}-photo-${i + 1}.jpg`,
            mimeType: file.type,
            target: "reports",
            metadata: { jobId: job.id, customerName: job.customerName || "", type: "report-photo" },
          });
          driveFiles.push({ type: "photo", ...driveFile });
        }
      }

      let videoUrl = "";
      if (videoFile) {
        setProgress("Uploading video...");
        videoUrl = await uploadVideoToCloudinary(videoFile, job.id);

        if (isDriveUploadConfigured()) {
          setProgress("Saving video to Drive...");
          const driveFile = await uploadFileToDrive({
            file: videoFile,
            fileName: `job-${job.id}-video.${videoFile.type.includes("webm") ? "webm" : "mp4"}`,
            mimeType: videoFile.type,
            target: "reports",
            metadata: { jobId: job.id, customerName: job.customerName || "", type: "report-video" },
          });
          driveFiles.push({ type: "video", ...driveFile });
        }
      }

      let audioUrl = "";
      if (voiceRec.blob) {
        setProgress("Uploading voice note...");
        const audioFile = new File([voiceRec.blob], `job-${job.id}-voice.${voiceRec.blob.type.split("/")[1] || "webm"}`, { type: voiceRec.blob.type || "audio/webm" });
        audioUrl = await uploadToCloudinary(audioFile);

        if (isDriveUploadConfigured()) {
          setProgress("Saving voice note to Drive...");
          const driveFile = await uploadFileToDrive({
            file: audioFile,
            fileName: `job-${job.id}-voice.${voiceRec.blob.type.split("/")[1] || "webm"}`,
            mimeType: audioFile.type,
            target: "reports",
            metadata: { jobId: job.id, customerName: job.customerName || "", type: "report-audio" },
          });
          driveFiles.push({ type: "audio", ...driveFile });
        }
      }

      setProgress("Saving report...");
      await createRecord("jobReports", {
        jobId: job.id,
        jobCustomer: job.customerName || "",
        jobService: job.treatmentLabel || job.serviceType || "",
        employeeName,
        employeeId: profile?.key || "",
        note: note.trim(),
        photoUrls,
        imageUrls: photoUrls,
        videoUrl,
        audioUrl,
        voiceNote: audioUrl,
        driveFiles,
        savedToDrive: driveFiles.length > 0,
        timestamp: new Date().toISOString(),
        status: "submitted",
      });

      setSubmitted(true);
      setPhotoFiles([]);
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotoPreviews([]);
      clearVideo();
      voiceRec.reset();
      setNote("");
    } catch (error) {
      setErr(error.message || "Report upload failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const handleDownload = () => {
    downloadText(
      `ABPC-job-${job.id?.slice(-6) || Date.now()}-report.txt`,
      buildReportMessage(job, reports.length ? reports : [{
        employeeName,
        note,
        photoUrls: [],
        videoUrl: "",
      }])
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }

    const shared = await shareReportMedia({
      title: "AB Pest Control Service Report",
      text: shareMessage,
      reports,
    }).catch(() => false);

    if (shared) {
      return;
    }

    await navigator.share({
      title: "AB Pest Control Service Report",
      text: shareMessage,
    });
  };

  const handleWhatsApp = async () => {
    const phone = getWhatsAppNumber(job.customerPhone);
    const shared = await shareReportMedia({
      title: "AB Pest Control Service Report",
      text: shareMessage,
      reports,
    }).catch(() => false);

    if (!shared) {
      sendWhatsAppText(phone, shareMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[94vh] overflow-hidden flex flex-col"
        style={{ ...glass, boxShadow: "0 30px 90px rgba(0,0,0,0.78)" }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="min-w-0">
            <p className="text-sm font-black" style={{ color: colors.title }}>Complete Job Report</p>
            <p className="text-xs truncate mt-1" style={{ color: colors.muted }}>
              {job.customerName} - {job.treatmentLabel || job.serviceType || "Pest Control"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: colors.panelStrong, color: "#CBD5E1", border: `1px solid ${colors.border}` }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
          {reports.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.muted }}>Saved Reports ({reports.length})</p>
                <span className="text-[10px] font-black" style={{ color: colors.green }}>{reports.some((r) => r.savedToDrive) ? "Drive saved" : "Cloud saved"}</span>
              </div>
              {reports.map((report) => {
                const photos = report.photoUrls || report.imageUrls || [];
                return (
                  <article key={report.id} className="rounded-2xl overflow-hidden" style={{ background: colors.panel, border: `1px solid ${colors.border}` }}>
                    <div className="flex items-center justify-between gap-3 p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black"
                          style={{ background: "rgba(34,197,94,0.18)", border: "1px solid rgba(134,239,172,0.35)", color: colors.green }}>
                          {report.employeeName?.slice(0, 2).toUpperCase() || "AB"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: colors.title }}>{report.employeeName || "Team"}</p>
                          <p className="text-[10px]" style={{ color: colors.muted }}>
                            {report.timestamp ? new Date(report.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: colors.green }} />
                    </div>

                    {report.note && <p className="p-4 text-sm leading-relaxed" style={{ color: colors.body }}>{report.note}</p>}

                    {photos.length > 0 && (
                      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                        {photos.map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
                            <img src={url} alt={`Report photo ${index + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {report.videoUrl && (
                      <div className="px-4 pb-4">
                        <video src={report.videoUrl} controls playsInline preload="metadata" className="w-full rounded-xl bg-black border border-white/10 max-h-64" />
                      </div>
                    )}

                    {(report.audioUrl || report.voiceNote) && (
                      <div className="px-4 pb-4">
                        <audio controls src={report.audioUrl || report.voiceNote} className="w-full rounded-xl" />
                      </div>
                    )}

                    {report.driveFiles?.length > 0 && (
                      <div className="px-4 pb-4 flex flex-wrap gap-2">
                        {report.driveFiles.filter((file) => file.url).map((file, index) => (
                          <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black bg-blue-500/10 border border-blue-400/20 text-blue-200">
                            <UploadCloud className="w-3 h-3" /> Drive {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {!myReport && !submitted ? (
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.muted }}>Create Report</p>

              <div className="grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="min-h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                  style={{ background: colors.panel, borderColor: "rgba(170,183,165,0.42)", color: colors.body }}>
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-black">Add Photos</span>
                  <span className="text-[10px]" style={{ color: colors.muted }}>Up to 6 photos</span>
                </button>
                <button type="button" onClick={() => videoInputRef.current?.click()}
                  className="min-h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                  style={{ background: colors.panel, borderColor: "rgba(170,183,165,0.42)", color: colors.body }}>
                  <Video className="w-6 h-6" />
                  <span className="text-xs font-black">Add Video</span>
                  <span className="text-[10px]" style={{ color: colors.muted }}>MP4/WebM, max 50 MB</span>
                </button>
              </div>

              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoSelect} />

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviews.map((url, index) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
                      <img src={url} alt={`Selected photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(index)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {videoPreview && (
                <div className="relative rounded-2xl overflow-hidden bg-black border border-green-400/25">
                  <video src={videoPreview} controls playsInline className="w-full max-h-64" />
                  <button onClick={clearVideo} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="rounded-2xl p-4" style={{ background: colors.panelStrong, border: `1px solid ${colors.border}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: colors.title }}>Voice Note</p>
                    <p className="text-xs" style={{ color: colors.muted }}>Record a quick audio note for the admin.</p>
                  </div>
                  <button type="button"
                    onClick={voiceRec.state === "recording" ? voiceRec.stop : voiceRec.start}
                    className={`${buttonBase} ${voiceRec.state === "recording" ? "bg-red-500 text-white" : "bg-green-600 text-white"}`}>
                    {voiceRec.state === "recording" ? "Stop Recording" : "Record Voice Note"}
                  </button>
                </div>
                {voiceRec.state === "recording" && (
                  <p className="mt-3 text-xs" style={{ color: colors.green }}>Recording... {voiceRec.durationFmt}</p>
                )}
                {voiceRec.state === "stopped" && voiceRec.blob && audioPreview && (
                  <div className="mt-3 space-y-2">
                    <audio controls src={audioPreview} className="w-full rounded-xl" />
                    <button type="button" onClick={voiceRec.reset}
                      className={`${buttonBase} bg-white/10 text-slate-100`}>
                      Clear Voice Note
                    </button>
                  </div>
                )}
                {voiceRec.state === "error" && (
                  <p className="mt-3 text-xs text-rose-300">{voiceRec.errorMsg}</p>
                )}
              </div>

              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
                placeholder="Work notes, chemicals used, rooms covered, customer remarks..."
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                style={{
                  background: colors.panelStrong,
                  border: `1px solid ${colors.border}`,
                  color: colors.title,
                  caretColor: colors.green,
                }} />

              <div className="rounded-2xl p-3 flex items-start gap-3" style={{ background: colors.panel, border: `1px solid ${colors.border}` }}>
                <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.green }} />
                <p className="text-xs leading-relaxed" style={{ color: colors.body }}>
                  Report media is saved to the cloud. Google Drive copy is added automatically when Drive upload is configured.
                </p>
              </div>

              {err && <p className="text-xs font-semibold" style={{ color: "#FCA5A5" }}>{err}</p>}
              {progress && <p className="text-xs font-semibold" style={{ color: colors.green }}>{progress}</p>}

              <button onClick={handleSubmit} disabled={busy}
                className={`${buttonBase} w-full text-white`}
                style={{ background: busy ? "rgba(76,122,45,0.45)" : "linear-gradient(135deg,#2F4F2F,#4C7A2D)", boxShadow: "0 0 24px rgba(76,122,45,0.28)" }}>
                {busy ? progress || "Saving..." : <><Check className="w-4 h-4" /> Save Complete Report</>}
              </button>
            </section>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: colors.green }} />
              <p className="font-bold" style={{ color: colors.title }}>Report saved successfully</p>
              <p className="text-xs mt-1" style={{ color: colors.muted }}>You can save it on mobile or share it to WhatsApp below.</p>
            </div>
          )}

          <section className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(20,83,45,0.28)", border: "1px solid rgba(134,239,172,0.28)" }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: colors.green }} />
              <p className="text-sm font-black" style={{ color: colors.green }}>Share and Save</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={handleDownload} className={buttonBase} style={{ background: colors.panelStrong, border: `1px solid ${colors.border}`, color: colors.body }}>
                <Download className="w-3.5 h-3.5" /> Mobile
              </button>
              <button onClick={handleNativeShare} className={buttonBase} style={{ background: colors.panelStrong, border: `1px solid ${colors.border}`, color: colors.body }}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <button onClick={handleCopy} className={buttonBase} style={{ background: colors.panelStrong, border: `1px solid ${colors.border}`, color: colors.body }}>
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: colors.green }} /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handleWhatsApp} className={`${buttonBase} text-white`}
                style={{ background: "linear-gradient(135deg,#075E54,#128C7E,#25D366)" }}>
                <Send className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
