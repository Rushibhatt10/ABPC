const getFileNameFromUrl = (url, fallback) => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const candidate = pathname.split("/").pop() || fallback;
    return candidate.includes(".") ? candidate : `${candidate || fallback}.jpg`;
  } catch {
    return fallback;
  }
};

const fetchRemoteFile = async (url, fallbackName) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch media from ${url}`);
  }
  const blob = await response.blob();
  const name = getFileNameFromUrl(url, fallbackName);
  return new File([blob], name, { type: blob.type || "application/octet-stream" });
};

const collectReportMediaFiles = async (reports, maxFiles = 4) => {
  const candidates = [];

  for (const report of reports) {
    const photos = report.photoUrls || report.imageUrls || [];
    for (const url of photos) {
      candidates.push({ url, fallback: "report-photo.jpg" });
      if (candidates.length >= maxFiles) break;
    }
    if (candidates.length >= maxFiles) break;

    if (report.videoUrl) {
      candidates.push({ url: report.videoUrl, fallback: "report-video.mp4" });
    }
    if (candidates.length >= maxFiles) break;

    const audioUrl = report.audioUrl || report.voiceNote;
    if (audioUrl) {
      candidates.push({ url: audioUrl, fallback: "report-audio.webm" });
    }
    if (candidates.length >= maxFiles) break;
  }

  const files = [];
  for (const item of candidates.slice(0, maxFiles)) {
    try {
      files.push(await fetchRemoteFile(item.url, item.fallback));
    } catch {
      // Skip files that cannot be fetched or shared.
    }
  }
  return files;
};

export const sendWhatsAppText = (phone, text) => {
  const target = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  window.open(`${target}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
};

export const shareReportMedia = async ({ title, text, reports }) => {
  if (!navigator.share) return false;

  const files = await collectReportMediaFiles(reports);
  if (!files.length) return false;

  if (navigator.canShare && !navigator.canShare({ files })) {
    return false;
  }

  await navigator.share({ title, text, files });
  return true;
};
