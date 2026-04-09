/**
 * Compress an image File to a target max size (default 2 MB).
 * Returns a new File (or the original if already small enough).
 */
export async function compressImage(file, maxMB = 2, maxDim = 1280) {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if too large
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality 0.8 first, then 0.6 if still too big
      const tryQuality = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
            if (blob.size > maxBytes && quality > 0.4) {
              tryQuality(quality - 0.2);
            } else {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryQuality(0.8);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Validate file size. Returns error string or null.
 */
export function validateFileSize(file, maxMB) {
  if (file.size > maxMB * 1024 * 1024) {
    return `"${file.name}" exceeds ${maxMB} MB limit.`;
  }
  return null;
}

/**
 * Generate a short unique ID.
 */
export function uid() {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }
}
