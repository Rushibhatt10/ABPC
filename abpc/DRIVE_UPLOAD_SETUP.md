## Google Drive Upload Setup

The app now supports direct Excel uploads for:

- `Jobs` exports
- `Reports` exports

It expects a webhook-style endpoint in `VITE_DRIVE_UPLOAD_URL`.

### Required env vars

Add these to `.env`:

```env
VITE_DRIVE_UPLOAD_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
VITE_DRIVE_JOBS_FOLDER_ID="your-jobs-folder-id"
VITE_DRIVE_REPORTS_FOLDER_ID="your-reports-folder-id"
VITE_DRIVE_GENERAL_FOLDER_ID="your-general-folder-id"
```

### Expected request format

The frontend sends JSON like:

```json
{
  "fileName": "Jobs_Export_123.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "target": "jobs",
  "folderId": "google-drive-folder-id",
  "metadata": {
    "module": "jobs"
  },
  "fileBase64": "BASE64_FILE_CONTENT"
}
```

### Expected JSON response

Your endpoint should return JSON like:

```json
{
  "ok": true,
  "id": "drive-file-id",
  "name": "Jobs_Export_123.xlsx",
  "url": "https://drive.google.com/file/d/drive-file-id/view"
}
```

If `url` is returned, the app opens it automatically after upload.

### Notes

- If Drive is not configured, the app falls back to local Excel download.
- Reports media uploads are still using Cloudinary. This Drive setup currently covers the Excel exports for Jobs and Reports.

### Google Apps Script example

Create a web app in Apps Script and use code like this:

```javascript
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var folder = body.folderId
      ? DriveApp.getFolderById(body.folderId)
      : DriveApp.getRootFolder();

    var bytes = Utilities.base64Decode(body.fileBase64);
    var blob = Utilities.newBlob(bytes, body.mimeType, body.fileName);
    var file = folder.createFile(blob);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
