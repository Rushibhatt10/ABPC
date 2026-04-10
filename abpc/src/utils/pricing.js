// ✅ UNIT TYPES
export const UNIT_TYPES = [
  { value: "sqft", label: "SqFt" },
  { value: "sqmt", label: "SqMt" },
  { value: "bhk", label: "BHK" },
  { value: "unit", label: "Unit" },
];

// ✅ NORMALIZERS
export const normalizeUnitValue = (unitType = "") =>
  String(unitType || "").trim().toLowerCase();

export const normalizeServiceName = (serviceName = "") =>
  String(serviceName || "").trim().toLowerCase();

// ✅ CONVERT SERVICE → UNIT PRICE MAP
const toUnitPrices = (service = {}) => {
  // If already structured
  if (service.unitPrices && typeof service.unitPrices === "object") {
    return Object.fromEntries(
      Object.entries(service.unitPrices).map(([unit, price]) => [
        normalizeUnitValue(unit),
        Number(price || 0),
      ])
    );
  }

  // Fallback (old data support)
  const fallbackUnit = normalizeUnitValue(
    service.unitType || service.calculationType || "sqft"
  );

  const fallbackPrice = Number(
    service.price ?? service.basePrice ?? service.unitPrice ?? 0
  );

  return { [fallbackUnit]: fallbackPrice };
};

// ✅ NORMALIZE FULL SERVICE
export const normalizeServicePricing = (service = {}) => {
  const unitPrices = toUnitPrices(service);

  const explicitOptions = Array.isArray(service.unitOptions)
    ? service.unitOptions.map((unit) => normalizeUnitValue(unit))
    : Object.keys(unitPrices);

  const unitOptions = explicitOptions.length ? explicitOptions : ["sqft"];

  const unitType = unitOptions[0];

  return {
    serviceName: service.serviceName || service.name || "",
    unitOptions,
    unitPrices,
    unitType,
    price: Number(unitPrices[unitType] || 0),
  };
};

// ✅ AUTO FILL (DEFAULT)
export const getServiceAutoFill = (service = {}) => {
  const normalized = normalizeServicePricing(service);

  return {
    serviceName: normalized.serviceName,
    unitType: normalized.unitType,
    unitOptions: normalized.unitOptions,
    price: normalized.price,
  };
};

// ✅ GET PRICE FOR SELECTED UNIT
export const getServicePriceForUnit = (service = {}, unitType) => {
  const normalized = normalizeServicePricing(service);

  const normalizedUnit = normalizeUnitValue(unitType);

  const selectedUnit =
    normalizedUnit && normalized.unitOptions.includes(normalizedUnit)
      ? normalizedUnit
      : normalized.unitType;

  return {
    serviceName: normalized.serviceName,
    unitType: selectedUnit,
    unitOptions: normalized.unitOptions,
    price: Number(normalized.unitPrices[selectedUnit] || 0),
  };
};

// ✅ GET UNIT LABEL (FIXED 🔥)
export const getUnitLabel = (unitType) => {
  const found = UNIT_TYPES.find(
    (item) => item.value === normalizeUnitValue(unitType)
  );
  return found ? found.label : "Unit";
};