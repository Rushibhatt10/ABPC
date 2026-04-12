const DRIVE_UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL;

const DRIVE_FOLDERS = {
  jobs: import.meta.env.VITE_DRIVE_JOBS_FOLDER_ID || "",
  reports: import.meta.env.VITE_DRIVE_REPORTS_FOLDER_ID || "",
  general: import.meta.env.VITE_DRIVE_GENERAL_FOLDER_ID || "",
};

export function isDriveUploadConfigured() {
  return Boolean(DRIVE_UPLOAD_URL);
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function uploadFileToDrive({
  file,
  fileName,
  mimeType,
  target = "general",
  metadata = {},
}) {
  if (!DRIVE_UPLOAD_URL) {
    throw new Error(
      "Google Drive upload is not configured. Add VITE_DRIVE_UPLOAD_URL to your .env file."
    );
  }

  if (!file) {
    throw new Error("No file provided for Drive upload.");
  }

  const uploadFileName = fileName || file.name || `upload-${Date.now()}`;
  const uploadMimeType = mimeType || file.type || "application/octet-stream";
  const folderId = DRIVE_FOLDERS[target] || DRIVE_FOLDERS.general;
  const fileBase64 = await fileToBase64(file);

  const payload = {
    fileName: uploadFileName,
    mimeType: uploadMimeType,
    target,
    folderId,
    metadata,
    fileBase64,
  };

  // POST through Vite proxy (/drive-proxy) — avoids CORS entirely
  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => "");
    throw new Error(`Drive upload failed — unexpected response: ${text.slice(0, 200)}`);
  }

  if (!data || data?.ok === false) {
    throw new Error(
      data?.error || data?.message || `Google Drive upload failed (${response.status}).`
    );
  }

  return {
    id: data?.id || data?.fileId || "",
    name: data?.name || uploadFileName,
    url: data?.url || data?.fileUrl || data?.webViewLink || data?.webContentLink || "",
    raw: data,
  };
}
