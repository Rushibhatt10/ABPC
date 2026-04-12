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
      { name: "Foundation Treatment (DOGLA)", defaultUnit: "sqft" },
      { name: "Plinth Level Treatment", defaultUnit: "sqft" },
      { name: "Before Flooring Treatment", defaultUnit: "sqft" },
      { name: "Tube/Piping Installation Before Flooring", defaultUnit: "rft" },
      { name: "Drilling Treatment", defaultUnit: "sqft" },
      { name: "Wooden Ply Treatment", defaultUnit: "piece" },
      { name: "Garden Treatment", defaultUnit: "sqft" },
      { name: "AB TERMITE CORE-TECH (Package)", defaultUnit: "unit" },
    ],
  },
  {
    category: "General Pest Control",
    subcategories: [
      { name: "Cockroach Gel", defaultUnit: "unit" },
      { name: "Cockroach Spray", defaultUnit: "unit" },
      { name: "Dual Action Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Bed Bugs",
    subcategories: [
      { name: "Spray Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "Mosquitos",
    subcategories: [
      { name: "IRS Spray Treatment", defaultUnit: "unit" },
      { name: "ULV Cold Fogging", defaultUnit: "unit" },
    ],
  },
  {
    category: "Rodent",
    subcategories: [
      { name: "Roda Cake Treatment", defaultUnit: "unit" },
      { name: "Roda Repellent Spray Treatment", defaultUnit: "unit" },
      { name: "Rodent Car Treatment", defaultUnit: "unit" },
      { name: "Roda Trap", defaultUnit: "piece" },
      { name: "AB RODENT CORE-TECH (Package)", defaultUnit: "unit" },
    ],
  },
  {
    category: "Wood Borer",
    subcategories: [
      { name: "Brushing", defaultUnit: "sqft" },
      { name: "Spray", defaultUnit: "sqft" },
      { name: "Injection", defaultUnit: "unit" },
    ],
  },
  {
    category: "Ant Treatment",
    subcategories: [
      { name: "Ant Spray Treatment", defaultUnit: "unit" },
      { name: "Dual Action Treatment", defaultUnit: "unit" },
    ],
  },
  {
    category: "No Chemical Treatment",
    subcategories: [
      { name: "Collapsible Mosquito Net", defaultUnit: "piece" },
      { name: "Bird Net", defaultUnit: "sqft" },
      { name: "Bird Spike", defaultUnit: "piece" },
      { name: "Invisible Grill", defaultUnit: "piece" },
    ],
  },
  {
    category: "General Pest Service",
    isMultiSelect: true,
    subcategories: [
      { name: "Cockroach Gel", defaultUnit: "unit" },
      { name: "Cockroach Spray", defaultUnit: "unit" },
      { name: "Ant Spray", defaultUnit: "unit" },
      { name: "Mosquito Spray", defaultUnit: "unit" },
      { name: "Rodent Control", defaultUnit: "unit" },
      { name: "Bed Bug Spray", defaultUnit: "unit" },
    ],
  },
];

// Flat list of all service names for search/display
export const ALL_SERVICE_NAMES = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.subcategories.map((sub) => `${cat.category} — ${sub.name}`)
);

// Legacy export required by firestoreHelpers.js (ensureDefaultServices)
// Kept as empty array since pricing is now manual — no defaults to seed
export const DEFAULT_SERVICES = [];

// Legacy export kept for any remaining imports
export const SERVICE_PRICING_MENU = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.subcategories.map((sub) => ({
    serviceName: `${cat.category} — ${sub.name}`,
    unitOptions: [sub.defaultUnit || "unit"],
    unitPrices: { [sub.defaultUnit || "unit"]: 0 },
  }))
);
