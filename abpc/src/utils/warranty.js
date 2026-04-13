import { toDateObject } from "./format";

const WARRANTY_NONE_VALUES = new Set(["", "none", "no warranty"]);

export function parseWarrantyDays(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (WARRANTY_NONE_VALUES.has(normalized)) return null;

  const match = normalized.match(/(\d+)\s*(year|years|month|months|day|days)\b/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2];
  if (unit.startsWith("year")) return amount * 365;
  if (unit.startsWith("month")) return amount * 30;
  if (unit.startsWith("day")) return amount;
  return null;
}

export function getWarrantyType(job) {
  const explicitType = typeof job?.warrantyType === "string" ? job.warrantyType.trim().toLowerCase() : "";
  if (explicitType === "none" || explicitType === "limited" || explicitType === "full") {
    return explicitType;
  }

  const warrantyLabel = typeof job?.warranty === "string" ? job.warranty.trim() : "";
  if (!warrantyLabel || WARRANTY_NONE_VALUES.has(warrantyLabel.toLowerCase())) {
    return "none";
  }

  return parseWarrantyDays(warrantyLabel) ? "limited" : "none";
}

export function getWarrantyDays(job) {
  const explicitDays = Number(job?.warrantyDays);
  if (Number.isFinite(explicitDays) && explicitDays > 0) {
    return explicitDays;
  }

  return parseWarrantyDays(job?.warranty) ?? 0;
}

export function getWarrantyLabel(job) {
  const warrantyLabel = typeof job?.warranty === "string" ? job.warranty.trim() : "";
  if (warrantyLabel && !WARRANTY_NONE_VALUES.has(warrantyLabel.toLowerCase())) {
    return warrantyLabel;
  }

  const days = getWarrantyDays(job);
  return days > 0 ? `${days} Days` : "";
}

export function isUnderWarranty(job) {
  if (getWarrantyType(job) === "none") return false;

  const warrantyStartDate = job?.completedAt || job?.warrantyStartDate;
  const startDate = toDateObject(warrantyStartDate);
  const warrantyDays = getWarrantyDays(job);

  if (!startDate || !warrantyDays) return false;

  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + warrantyDays);

  return new Date() <= expiryDate;
}

export function warrantyStatus(job) {
  if (getWarrantyType(job) === "none") return "none";

  const warrantyStartDate = job?.completedAt || job?.warrantyStartDate;
  if (!toDateObject(warrantyStartDate)) return "pending";

  return isUnderWarranty(job) ? "active" : "expired";
}
