export const SERVICE_PRICING_MENU = [
  {
    serviceName: "Anti-Termite Treatment",
    unitOptions: ["sqft", "sqmt", "bhk"],
    unitPrices: { sqft: 7, sqmt: 75, bhk: 3000 },
  },
  {
    serviceName: "Drill Treatment",
    unitOptions: ["bhk", "sqft", "sqmt"],
    unitPrices: { bhk: 3000, sqft: 12, sqmt: 130 },
  },
  {
    serviceName: "Garden / Ply / Tube Treatment",
    unitOptions: ["sqft", "sqmt", "unit"],
    unitPrices: { sqft: 15, sqmt: 160, unit: 450 },
  },
  {
    serviceName: "Cockroach AMC",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 1800, unit: 1800 },
  },
  {
    serviceName: "Ant Control AMC",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 1500, unit: 1500 },
  },
  {
    serviceName: "Bed Bugs",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 3000, unit: 3000 },
  },
  {
    serviceName: "Mosquito & Fly",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 2200, unit: 2200 },
  },
  {
    serviceName: "Rodent Control",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 2500, unit: 2500 },
  },
  {
    serviceName: "General Pest Control AMC",
    unitOptions: ["bhk", "unit"],
    unitPrices: { bhk: 2000, unit: 2000 },
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
