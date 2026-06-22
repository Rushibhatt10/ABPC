const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const normalizeText = (value) => String(value || "").trim().toLowerCase();

export function matchesCustomerRecord(record, activeCustomerId, activeCustomer) {
  if (!record) return false;

  const recordCustomerId = normalizeText(record.customerId);
  const sessionCustomerId = normalizeText(activeCustomerId);
  if (recordCustomerId && sessionCustomerId && recordCustomerId === sessionCustomerId) {
    return true;
  }

  const recordPhone = digitsOnly(record.customerPhone || record.phone);
  const customerPhone = digitsOnly(activeCustomer?.phone);
  if (recordPhone && customerPhone && recordPhone.slice(-10) === customerPhone.slice(-10)) {
    return true;
  }

  const recordName = normalizeText(record.customerName || record.name);
  const customerName = normalizeText(activeCustomer?.name);
  return !!recordName && !!customerName && recordName === customerName;
}
