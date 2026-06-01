const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** Upload any file (image/audio) to Cloudinary */
export async function uploadToCloudinary(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Upload failed (${res.status})`); }
  return (await res.json()).secure_url;
}

/**
 * Upload a video to Cloudinary with auto-optimization.
 * - resource_type: video
 * - folder: job_reports/videos
 * - eager: quality auto:low, mp4, 720p max
 * Returns the optimized secure_url.
 */
export async function uploadVideoToCloudinary(file, jobId = "") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured.");

  const allowed = ["video/mp4", "video/webm"];
  if (!allowed.includes(file.type)) throw new Error("Only MP4 and WebM videos are allowed.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Video must be under 50 MB.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "job_reports/videos");
  if (jobId) fd.append("public_id", `job_${jobId}_${Date.now()}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Video upload failed (${res.status})`); }
  const data = await res.json();
  return data.secure_url;
}
