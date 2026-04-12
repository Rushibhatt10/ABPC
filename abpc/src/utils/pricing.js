// Unit types — BHK removed
export const UNIT_TYPES = [
  { value: "sqft", label: "SqFt" },
  { value: "sqmt", label: "SqMt" },
  { value: "unit", label: "Unit" },
];

export const normalizeUnitValue = (unitType = "") =>
  String(unitType || "").trim().toLowerCase();

export const normalizeServiceName = (serviceName = "") =>
  String(serviceName || "").trim().toLowerCase();

const toUnitPrices = (service = {}) => {
  if (service.unitPrices && typeof service.unitPrices === "object") {
    return Object.fromEntries(
      Object.entries(service.unitPrices)
        .filter(([unit]) => unit !== "bhk") // strip legacy bhk
        .map(([unit, price]) => [normalizeUnitValue(unit), Number(price || 0)])
    );
  }
  const fallbackUnit = normalizeUnitValue(
    service.unitType || service.calculationType || "unit"
  );
  const fallbackPrice = Number(service.price ?? service.basePrice ?? service.unitPrice ?? 0);
  return { [fallbackUnit]: fallbackPrice };
};

export const normalizeServicePricing = (service = {}) => {
  const unitPrices = toUnitPrices(service);
  const explicitOptions = Array.isArray(service.unitOptions)
    ? service.unitOptions.map(normalizeUnitValue).filter((u) => u !== "bhk")
    : Object.keys(unitPrices);
  const unitOptions = explicitOptions.length ? explicitOptions : ["unit"];
  const unitType = unitOptions[0];
  return {
    serviceName: service.serviceName || service.name || "",
    unitOptions,
    unitPrices,
    unitType,
    price: Number(unitPrices[unitType] || 0),
  };
};

export const getServiceAutoFill = (service = {}) => {
  const normalized = normalizeServicePricing(service);
  return {
    serviceName: normalized.serviceName,
    unitType: normalized.unitType,
    unitOptions: normalized.unitOptions,
    price: normalized.price,
  };
};

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

export const getUnitLabel = (unitType) => {
  const found = UNIT_TYPES.find((item) => item.value === normalizeUnitValue(unitType));
  return found ? found.label : "Unit";
};
