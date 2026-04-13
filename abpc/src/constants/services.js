// Category → Subcategory service structure
// Pricing is always entered manually — no fixed prices stored here
// defaultUnit is just a UI hint; admin can override

export const UNITS = [
  { value: "sqft", label: "SqFt" },
  { value: "sqmt", label: "SqMt" },
  { value: "unit", label: "Unit" },
  { value: "piece", label: "Per Piece" },
  { value: "rft", label: "RFt" },
];

export const SERVICE_CATEGORIES = [
  {
    category: "Termite",
    subcategories: [
      { name: "Foundation Treatment", defaultUnit: "sqft" },
      { name: "Plinth Level Treatment", defaultUnit: "sqft" },
      { name: "Before Flooring Treatment", defaultUnit: "sqft" },
      { name: "Piping Tube Before Flooring", defaultUnit: "rft" },
      { name: "Post (Drilling Treatment)", defaultUnit: "sqft" },
    ],
  },
  {
    category: "Wood / Ply",
    subcategories: [
      { name: "Wood / Ply Treatment", defaultUnit: "piece" },
    ],
  },
  {
    category: "Garden",
    subcategories: [
      { name: "Garden Treatment", defaultUnit: "sqft" },
    ],
  },
  {
    category: "Cockroach",
    subcategories: [
      { name: "Spray Treatment", defaultUnit: "unit" },
      { name: "Gel Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Ant",
    subcategories: [
      { name: "Ant Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Bed Bugs",
    subcategories: [
      { name: "Bed Bug Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Mosquito",
    subcategories: [
      { name: "IRS Treatment", defaultUnit: "unit" },
      { name: "ULV Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Rodent",
    subcategories: [
      { name: "Rodent Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Wood Borer",
    subcategories: [
      { name: "Wood Borer Treatment", defaultUnit: "unit" },
    ],
  },
];

// Flat list of all service names for search/display
export const ALL_SERVICE_NAMES = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.subcategories.map((sub) => `${cat.category} — ${sub.name}`)
);

// Legacy export required by firestoreHelpers.js (ensureDefaultServices)
export const DEFAULT_SERVICES = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.subcategories.map((sub) => ({
    name: `${cat.category} — ${sub.name}`,
    serviceName: `${cat.category} — ${sub.name}`,
    unitOptions: [sub.defaultUnit || "unit"],
    unitPrices: { [sub.defaultUnit || "unit"]: 0 },
    pricingType: sub.defaultUnit === "unit" ? "fixed" : "per_sq_ft",
    description: `Professional ${sub.name} for ${cat.category} control.`
  }))
);

// Legacy export kept for any remaining imports
export const SERVICE_PRICING_MENU = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.subcategories.map((sub) => ({
    serviceName: `${cat.category} — ${sub.name}`,
    unitOptions: [sub.defaultUnit || "unit"],
    unitPrices: { [sub.defaultUnit || "unit"]: 0 },
  }))
);
