import {
  buildCustomerPortalInviteText,
  buildCustomerPortalInviteTextWhatsApp,
  buildCustomerPortalLoginUrl,
} from "../constants/customerPortal";
import { getPublicAppOrigin, buildAppUrl, normalizePublicUrl } from "./appUrl";

const FOOTER_WHATSAPP = [
  "Thank you for choosing *AB PEST CONTROL INSECTISIDE SERVICES*.",
  "",
  "📞 +91 93744 88004",
  "🌐 abpestcontrol.in",
].join("\n");

const FOOTER_EMAIL = [
  "Thank you,",
  "AB PEST CONTROL INSECTISIDE SERVICES",
  "+91 93744 88004 · abpestcontrol.in",
].join("\n");

function portalLoginUrl(job, report) {
  return buildCustomerPortalLoginUrl(
    getPublicAppOrigin(),
    job?.customerId || report?.jobSnapshot?.customerId,
    job?.customerPhone || report?.jobSnapshot?.customerPhone
  );
}

function formatMediaLinks(report) {
  const blocks = [];
  const photos = report?.photos?.map((p, i) => `📷 Photo ${i + 1}: ${p.url}`) || [];
  const videos = report?.videos?.map((v, i) => `🎥 Video ${i + 1}: ${v.url}`) || [];
  const audio = report?.voiceNotes?.map((v, i) => `🎙️ Audio ${i + 1}: ${v.url}`) || [];
  if (photos.length) blocks.push(photos.join("\n"));
  if (videos.length) blocks.push(videos.join("\n"));
  if (audio.length) blocks.push(audio.join("\n"));
  return blocks.join("\n\n");
}

function formatTasksList(activities, fallback = "Service completed as per schedule.") {
  if (!activities?.length) return fallback;
  return activities.map((a) => `✅ ${a.title || a}`).join("\n");
}

export function buildSharedReportUrl(shareToken) {
  return buildAppUrl(`/shared-report/${shareToken}`);
}

export function buildServiceVisitReportWhatsApp(job, report) {
  const customerName = job?.customerName || report?.jobSnapshot?.customerName || "Customer";
  const serviceType = job?.treatmentLabel || job?.serviceType || "Pest Control";
  const reportDate = report?.submittedAt
    ? new Date(report.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const tasks = formatTasksList(report?.newlyCompletedActivities);
  const media = formatMediaLinks(report);
  const shareUrl = normalizePublicUrl(
    report?.shareSettings?.shareUrl
      || (report?.shareSettings?.shareToken ? buildSharedReportUrl(report.shareSettings.shareToken) : "")
  );
  const loginUrl = portalLoginUrl(job, report);
  const portalText = buildCustomerPortalInviteTextWhatsApp(loginUrl);

  const sections = [
    `Hello *${customerName}*,`,
    "",
    "Your pest control service has been completed successfully. ✅",
    "",
    "*Job Details*",
    `• Service: ${serviceType}`,
    `• Date: ${reportDate}`,
    `• Technician: ${report?.employeeName || "Team"}`,
    "",
    "*Tasks Completed*",
    tasks,
  ];

  if (report?.employeeRemarks?.trim()) {
    sections.push("", "*Technician Remarks*", report.employeeRemarks.trim());
  }

  if (shareUrl) {
    sections.push("", "*Secure Service Report*", shareUrl);
  }

  if (media) {
    sections.push("", "*Work Proof & Attachments*", media);
  }

  sections.push(
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    portalText,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    FOOTER_WHATSAPP
  );

  return sections.join("\n");
}

export function buildWhatsAppShareMessage(customerName, serviceType, shareUrl, report, job) {
  const publicShareUrl = normalizePublicUrl(shareUrl);
  const media = formatMediaLinks(report);
  const loginUrl = portalLoginUrl(job, report);
  const portalText = buildCustomerPortalInviteTextWhatsApp(loginUrl);

  const sections = [
    `Hello *${customerName || "Customer"}*,`,
    "",
    "Here is your *Service Visit Report* and work proof for your treatment.",
    "",
    "*Service*",
    serviceType || "Pest Control",
    "",
    "*Secure Report Link*",
    publicShareUrl,
  ];

  if (media) {
    sections.push("", "*Attachments*", media);
  }

  sections.push(
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    portalText,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    FOOTER_WHATSAPP
  );

  return sections.join("\n");
}

export function buildEmailShareMessage(customerName, serviceType, shareUrl, job, report) {
  const publicShareUrl = normalizePublicUrl(shareUrl);
  const loginUrl = portalLoginUrl(job, report);
  const portalText = buildCustomerPortalInviteText(loginUrl);

  return [
    "Subject: Service Visit Report - AB PEST CONTROL INSECTISIDE SERVICES",
    "",
    `Hello ${customerName || "Customer"},`,
    "",
    "Please find your service completion visit report and media attachments at the link below:",
    "",
    publicShareUrl,
    "",
    "────────────────────────────────────────",
    "",
    portalText,
    "",
    "────────────────────────────────────────",
    "",
    FOOTER_EMAIL,
  ].join("\n");
}
