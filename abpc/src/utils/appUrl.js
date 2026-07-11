import { COMPANY_WEBSITE_URL } from "../constants/company";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/**
 * Production/public site origin for links sent to customers (WhatsApp, email, SMS).
 * Uses VITE_APP_URL when set, otherwise the live domain — never localhost.
 */
export function getPublicAppOrigin() {
  const configured = String(import.meta.env.VITE_APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (!LOCAL_HOSTS.has(hostname)) return origin;
  }

  return COMPANY_WEBSITE_URL;
}

export function buildAppUrl(path = "") {
  const base = getPublicAppOrigin();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Rewrites localhost dev URLs to the public production domain */
export function normalizePublicUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, getPublicAppOrigin());
    if (LOCAL_HOSTS.has(parsed.hostname)) {
      return `${getPublicAppOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return url;
  }
}
