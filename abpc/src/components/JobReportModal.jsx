/**
 * JobReportModal — Add or View a single report attached to a job.
 * Data stored directly on the job document: reportImage, reportAudio, reportNote, reportAddedAt
 *
 * Props:
 *   job        : job object
 *   onClose()  : close the modal
 *   onSaved()  : called after report is saved (to refresh job in parent)
 */
import { useRef, useState } from "react";
import { X, Camera, Mic, Square, FileText, Save, Trash2, Play } from "lucide-react";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { compressImage } from "../utils/mediaHelpers";
import { updateRecord } from "../utils/firestoreHelpers";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";

export default function JobReportModal({ job, onClose, onSaved }) {
  const isView = !!(job.reportImage || job.reportAudio || job.reportNote);

  const [mode, setMode] = useState(isView ? "view" : "edit");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(job.reportImage || "");
  const [note, setNote] = useState(job.reportNote || "");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(job.reportAudio || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [uploadAudioFile, setUploadAudioFile] = useState(null);

  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const voiceRec = useVoiceRecorder();

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 1);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioBlob(null);
    voiceRec.reset();
  };

  const handleStopRecording = () => {
    voiceRec.stop();
    setUploadAudioFile(null);
  };

  // When voice recorder finishes, capture blob
  const finalAudioBlob = voiceRec.blob || audioBlob;
  const finalAudioPreview = voiceRec.blob
    ? URL.createObjectURL(voiceRec.blob)
    : audioUrl;

  const handleSave = async () => {
    setBusy(true);
    setErr("");
    try {
      let imgUrl = job.reportImage || "";
      let audUrl = job.reportAudio || "";

      if (imageFile) {
        imgUrl = await uploadToCloudinary(imageFile);
      }

      const audioToUpload = voiceRec.blob || uploadAudioFile;
      if (audioToUpload) {
        audUrl = await uploadToCloudinary(audioToUpload);
      }

      await updateRecord("jobs", job.id, {
        reportImage: imgUrl,
        reportAudio: audUrl,
        reportNote: note.trim(),
        reportAddedAt: new Date().toISOString(),
        status: "completed",
      });

      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message || "Upload failed. Check Cloudinary config.");
    } finally {
      setBusy(false);
    }
  };

  const handleClearReport = async () => {
    if (!window.confirm("Clear this report?")) return;
    setBusy(true);
    try {
      await updateRecord("jobs", job.id, {
        reportImage: "",
        reportAudio: "",
        reportNote: "",
        reportAddedAt: null,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              {mode === "view" ? "View Report" : "Add Report"}
            </h2>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{job.customerName} · {job.serviceType}
            {job.warranty && <span className="ml-1 text-emerald-600 font-semibold">· {job.warranty} warranty</span>}
          </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === "view" && (
              <button
                onClick={() => setMode("edit")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* IMAGE */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Photo
            </p>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Report"
                  className="w-full rounded-xl border border-slate-200 object-cover max-h-56"
                />
                {mode === "edit" && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : mode === "edit" ? (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors flex flex-col items-center gap-2"
              >
                <Camera className="w-6 h-6" />
                Tap to upload photo
              </button>
            ) : (
              <p className="text-sm text-slate-400 italic">No photo attached</p>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          {/* AUDIO */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Voice Note
            </p>

            {/* Playback if exists */}
            {finalAudioPreview && (
              <audio controls src={finalAudioPreview} className="w-full rounded-xl mb-2" />
            )}

            {mode === "edit" && (
              <div className="space-y-2">
                {/* Record */}
                {voiceRec.state === "idle" && !finalAudioPreview && (
                  <button
                    type="button"
                    onClick={voiceRec.start}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-colors"
                  >
                    <Mic className="w-4 h-4" /> Record Voice Note
                  </button>
                )}
                {voiceRec.state === "recording" && (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-sm font-black text-slate-900">{voiceRec.durationFmt}</span>
                    </div>
                    <button type="button" onClick={handleStopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold">
                      <Square className="w-3 h-3" /> Stop
                    </button>
                  </div>
                )}
                {finalAudioPreview && (
                  <button
                    type="button"
                    onClick={() => { voiceRec.reset(); setAudioUrl(""); setUploadAudioFile(null); setAudioBlob(null); }}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Remove audio
                  </button>
                )}
                {/* Upload option */}
                {!finalAudioPreview && voiceRec.state === "idle" && (
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:border-[var(--brand)] transition-colors"
                  >
                    Or upload audio file
                  </button>
                )}
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </div>
            )}

            {mode === "view" && !finalAudioPreview && (
              <p className="text-sm text-slate-400 italic">No voice note attached</p>
            )}
          </div>

          {/* NOTE */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Note
            </p>
            {mode === "edit" ? (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Short note about the job..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
              />
            ) : note ? (
              <p className="text-sm text-slate-700 px-3.5 py-2.5 bg-slate-50 rounded-xl">{note}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No note added</p>
            )}
          </div>

          {err && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-xl">{err}</p>
          )}

          {/* Actions */}
          {mode === "edit" && (
            <div className="flex gap-3 pt-1">
              {isView && (
                <button
                  type="button"
                  onClick={handleClearReport}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition-colors disabled:opacity-60"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60 transition-colors"
              >
                <Save className="w-4 h-4" />
                {busy ? "Saving..." : "Save Report"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
