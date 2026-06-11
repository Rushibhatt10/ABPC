/**
 * Google Drive upload — disabled.
 *
 * Drive upload via Google Apps Script is blocked by browser CORS policy
 * and cannot be called directly from a frontend app in production.
 * All media is saved to Cloudinary instead, which works reliably.
 *
 * isDriveUploadConfigured() returns false so all Drive upload branches
 * in JobVideoReportModal are silently skipped.
 */

export function isDriveUploadConfigured() {
  return false;
}

// eslint-disable-next-line no-unused-vars
export async function uploadFileToDrive(_options) {
  throw new Error("Drive upload is not available.");
}
