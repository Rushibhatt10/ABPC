import { getPublicAppOrigin } from "../utils/appUrl";

export const CUSTOMER_PORTAL_FEATURES = [
  "Service progress and current status",
  "Inspection and treatment report",
  "Before & after photos",
  "Technician details",
  "Invoice and payment information",
  "Warranty status",
  "Service history and recommendations",
];

export function buildCustomerPortalLoginPath(customerId = "", phone = "") {
  const params = new URLSearchParams();
  if (customerId) params.set("cid", customerId);
  if (phone) params.set("phone", phone);
  const qs = params.toString();
  return qs ? `/customer/login?${qs}` : "/customer/login";
}

export function buildCustomerPortalLoginUrl(origin = "", customerId = "", phone = "") {
  const base = `${origin || getPublicAppOrigin()}/customer/login`;
  const params = new URLSearchParams();
  if (customerId) params.set("cid", customerId);
  if (phone) params.set("phone", phone);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** WhatsApp collapses single line-breaks — use blank lines between bullets */
function formatFeatureList(forWhatsApp = false) {
  const bullet = forWhatsApp ? "▪️" : "•";
  return CUSTOMER_PORTAL_FEATURES.map((f) => `${bullet} ${f}`).join(forWhatsApp ? "\n\n" : "\n");
}

export function buildCustomerPortalInviteText(loginUrl) {
  return [
    "Check the Status of the Work Done by AB Pest Control Insecticide Service",
    "",
    "Dear Customer,",
    "",
    "Thank you for choosing AB Pest Control Insecticide Service.",
    "",
    "You can securely log in using the link below to view the complete status of your service, including:",
    "",
    formatFeatureList(false),
    "",
    "Click below to access your Customer Portal and track your service anytime.",
    "",
    "Login to Your Customer Portal",
    loginUrl,
  ].join("\n");
}

export function buildCustomerPortalInviteTextWhatsApp(loginUrl) {
  return [
    "*Check the Status of the Work Done by AB Pest Control Insecticide Service*",
    "",
    "Dear Customer,",
    "",
    "Thank you for choosing *AB Pest Control Insecticide Service*.",
    "",
    "You can securely log in using the link below to view the complete status of your service, including:",
    "",
    formatFeatureList(true),
    "",
    "Click below to access your Customer Portal and track your service anytime.",
    "",
    "*Login to Your Customer Portal*",
    loginUrl,
  ].join("\n");
}
