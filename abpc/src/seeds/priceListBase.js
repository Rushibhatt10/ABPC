export const PRICE_CATEGORIES = [
  "Anti-Termite Treatment",
  "Drill Treatment",
  "Garden / Ply / Tube Treatment",
  "Cockroach AMC",
  "Ant Control AMC",
  "Bed Bugs",
  "Mosquito & Fly",
  "Rodent Control",
  "General Pest Control AMC",
  "Wood Borer Treatment",
];

export const PRICE_LIST_BASE = PRICE_CATEGORIES.map((category) => ({
  category,
  serviceName: category,
  unitPrices: { unit: null, sqft: null, sqmt: null },
}));
