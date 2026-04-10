export const SERVICE_PRICING_MENU = [
  {
    serviceName: "Anti-Termite Treatment",
    unitOptions: ["sqft"],
    unitPrices: { sqft: 7 },
  },
  {
    serviceName: "Drill Treatment",
    unitOptions: ["bhk", "sqft"],
    unitPrices: { bhk: 3000, sqft: 12 },
  },
  {
    serviceName: "Garden / Ply / Tube Treatment",
    unitOptions: ["sqft", "unit"],
    unitPrices: { sqft: 15, unit: 450 },
  },
  {
    serviceName: "Cockroach AMC",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 1800 },
  },
  {
    serviceName: "Ant Control AMC",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 1500 },
  },
  {
    serviceName: "Bed Bugs",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 3000 },
  },
  {
    serviceName: "Mosquito & Fly",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 2200 },
  },
  {
    serviceName: "Rodent Control",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 2500 },
  },
  {
    serviceName: "General Pest Control AMC",
    unitOptions: ["bhk"],
    unitPrices: { bhk: 2000 },
  },
  {
    serviceName: "Wood Borer Treatment",
    unitOptions: ["unit"],
    unitPrices: { unit: 600 },
  },
];

export const DEFAULT_SERVICES = SERVICE_PRICING_MENU.map((service) => ({
  name: service.serviceName,
  serviceName: service.serviceName,
  unitOptions: service.unitOptions,
  unitPrices: service.unitPrices,
}));
