export const SERVICE_PRICING_MENU = [
  {
    serviceName: "Anti-Termite Treatment",
    unitOptions: ["sqft", "sqmt"],
    unitPrices: { sqft: 7, sqmt: 75 },
  },
  {
    serviceName: "Drill Treatment",
    unitOptions: ["sqft", "sqmt"],
    unitPrices: { sqft: 12, sqmt: 130 },
  },
  {
    serviceName: "Garden / Ply / Tube Treatment",
    unitOptions: ["sqft", "sqmt", "unit"],
    unitPrices: { sqft: 15, sqmt: 160, unit: 450 },
  },
  {
    serviceName: "Cockroach AMC",
    unitOptions: ["unit"],
    unitPrices: { unit: 1800 },
  },
  {
    serviceName: "Ant Control AMC",
    unitOptions: ["unit"],
    unitPrices: { unit: 1500 },
  },
  {
    serviceName: "Bed Bugs",
    unitOptions: ["unit"],
    unitPrices: { unit: 3000 },
  },
  {
    serviceName: "Mosquito & Fly",
    unitOptions: ["unit"],
    unitPrices: { unit: 2200 },
  },
  {
    serviceName: "Rodent Control",
    unitOptions: ["unit"],
    unitPrices: { unit: 2500 },
  },
  {
    serviceName: "General Pest Control AMC",
    unitOptions: ["unit"],
    unitPrices: { unit: 2000 },
  },
  {
    serviceName: "Wood Borer Treatment",
    unitOptions: ["unit", "sqft"],
    unitPrices: { unit: 600, sqft: 25 },
  },
];

export const DEFAULT_SERVICES = SERVICE_PRICING_MENU.map((service) => ({
  name: service.serviceName,
  serviceName: service.serviceName,
  unitOptions: service.unitOptions,
  unitPrices: service.unitPrices,
}));
