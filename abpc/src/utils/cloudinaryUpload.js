/**
 * Upload a file to Cloudinary using unsigned upload preset.
 * Returns the secure_url string.
 *
 * Setup:
 *  1. Go to cloudinary.com → Dashboard → copy your Cloud Name
 *  2. Go to Settings → Upload → Add upload preset → set Signing Mode = Unsigned → Save
 *  3. Add to abpc/.env:
 *       VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *       VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */
export async function uploadToCloudinary(file) {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Cloudinary upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.secure_url;
}
