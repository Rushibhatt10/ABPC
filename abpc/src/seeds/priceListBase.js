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

// Base prices must be populated from your uploaded image.
// Once initialized in Firestore, base prices become locked.
export const PRICE_LIST_BASE = PRICE_CATEGORIES.map((category) => ({
  category,
  serviceName: category,
  bhkPrices: {
    "1": { base: null },
    "2": { base: null },
    "3": { base: null },
    "4": { base: null },
    bunglow: { base: null },
  },
}));

