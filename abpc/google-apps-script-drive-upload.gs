function doPost(e) {
  try {
    // Apps Script receives the body as e.postData.contents regardless of Content-Type
    var raw = e.postData ? e.postData.contents : "";
    if (!raw) throw new Error("Empty request body.");

    var body = JSON.parse(raw);

    if (!body.fileBase64 || !body.fileName) {
      throw new Error("fileBase64 and fileName are required.");
    }

    var folder = body.folderId
      ? DriveApp.getFolderById(body.folderId)
      : DriveApp.getRootFolder();

    var bytes = Utilities.base64Decode(body.fileBase64);
    var blob = Utilities.newBlob(
      bytes,
      body.mimeType || "application/octet-stream",
      body.fileName
    );
    var file = folder.createFile(blob);

    // Make the file accessible to anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(error),
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: test via GET to confirm the script is live
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "Drive upload script is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}
