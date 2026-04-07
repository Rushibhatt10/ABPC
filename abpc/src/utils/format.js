export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const pad = (value) => String(value).padStart(2, "0");

export const toLocalISODate = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getTodayISO = () => toLocalISODate(new Date());

export const formatDateDisplay = (value) => {
  if (!value) return "-";
  const date = toDateObject(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
};

export const toDateObject = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const startOfDay = (value) => {
  const date = toDateObject(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const endOfDay = (value) => {
  const date = startOfDay(value);
  if (!date) return null;
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const daysBetween = (fromValue, toValue) => {
  const from = startOfDay(fromValue);
  const to = startOfDay(toValue);
  if (!from || !to) return null;
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

export const getWhatsAppNumber = (value) => {
  const phone = cleanPhone(value);
  if (!phone) return "";
  if (phone.startsWith("91") && phone.length >= 12) return phone;
  if (phone.length === 10) return `91${phone}`;
  return phone;
};

export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
