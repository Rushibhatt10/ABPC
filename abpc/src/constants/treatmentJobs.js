/**
 * Treatment Job Templates
 * Every treatment automatically starts with Inspection + Preparation.
 * getJobsByTreatment(key) returns the full ordered job list.
 */

const ALWAYS_FIRST = ["Inspection", "Preparation"];

export const TREATMENT_TEMPLATES = {
  // ── TERMITE ──────────────────────────────────────────────
  // ── TERMITE ──────────────────────────────────────────────
  "termite_foundation": {
    label: "Termite — Foundation Treatment",
    category: "Termite",
    jobs: ["Cubic Spray Treatment"],
  },
  "termite_plinth": {
    label: "Termite — Plinth Level Treatment",
    category: "Termite",
    jobs: [
      "Steel Centering Treatment",
      "Without Steel Centering Treatment",
      "Plinth Spray Treatment",
    ],
  },
  "termite_before_flooring": {
    label: "Termite — Before Flooring Treatment",
    category: "Termite",
    jobs: ["Flooring Spray"],
  },
  "termite_piping_tube": {
    label: "Termite — Piping Tube Before Flooring",
    category: "Termite",
    jobs: [
      "Surface Preparation",
      "Pipe Installation",
      "Junction Installation",
      "Pipe Testing",
      "Chemical Pouring",
    ],
  },
  "termite_drilling": {
    label: "Termite — Post (Drilling Treatment)",
    category: "Termite",
    jobs: [
      "Infestation Spray",
      "Cleaning",
      "Drilling",
      "Hole Cleaning",
      "Chemical Injecting / Pouring",
      "Hole Covering",
    ],
  },

  // ── WOOD / PLY ───────────────────────────────────────────
  "wood_ply": {
    label: "Wood / Ply — Wood / Ply Treatment",
    category: "Wood / Ply",
    jobs: ["All Side Chemical Spray on Ply"],
  },

  // ── GARDEN ───────────────────────────────────────────────
  "garden": {
    label: "Garden — Garden Treatment",
    category: "Garden",
    jobs: ["Spray", "Chemical Pour"],
  },

  // ── COCKROACH ────────────────────────────────────────────
  "cockroach_spray": {
    label: "Cockroach — Spray Treatment",
    category: "Cockroach",
    jobs: [
      "Kitchen Area Spray",
      "Bathroom Spray",
      "Store Room Spray",
      "Washing Area Spray",
      "Sink Spray",
      "Drainage Spray",
      "Skirting (Full Perimeter)",
    ],
  },
  "cockroach_gel": {
    label: "Cockroach — Gel Treatment",
    category: "Cockroach",
    jobs: [
      "Kitchen Area",
      "Store Room",
      "Dining Area",
      "Puja Area",
      "Wash Area",
      "Bedroom",
      "Cupboards",
      "Wardrobe",
      "Living Area",
      "TV Unit",
      "Bathroom",
    ],
  },

  // ── ANT ──────────────────────────────────────────────────
  "ant": {
    label: "Ant — Ant Treatment",
    category: "Ant",
    jobs: [
      "Kitchen Area",
      "Store Room",
      "Dining Area",
      "Puja Area",
      "Wash Area",
      "Bedroom",
      "Cupboards",
      "Wardrobe",
      "Living Area",
      "TV Unit",
      "Bathroom",
    ],
  },

  // ── BED BUGS ─────────────────────────────────────────────
  "bedbug": {
    label: "Bed Bugs — Bed Bug Treatment",
    category: "Bed Bugs",
    jobs: [
      "Bed Treatment",
      "Mattress Treatment",
      "Pillow Treatment",
      "Hinges Treatment",
      "Switchboard Treatment",
      "Cracks & Crevices Treatment",
      "Photo Units Treatment",
      "Drawers Treatment",
      "Living Area Treatment",
      "Sofa Treatment",
    ],
  },

  // ── MOSQUITO ─────────────────────────────────────────────
  "mosquito_irs": {
    label: "Mosquito — IRS Treatment",
    category: "Mosquito",
    jobs: [
      "Walls Spray",
      "Curtains Spray",
      "Sofa Spray",
      "Bedroom Spray",
      "Balcony Spray",
      "Garden Spray",
      "Plantation Spray",
      "Outside Wall Spray",
    ],
  },
  "mosquito_ulv": {
    label: "Mosquito — ULV Treatment",
    category: "Mosquito",
    jobs: [
      "Plantation Fogging",
      "Air Flow Fogging",
      "Dark Area Fogging",
    ],
  },

  // ── RODENT ───────────────────────────────────────────────
  "rodent": {
    label: "Rodent — Rodent Treatment",
    category: "Rodent",
    jobs: [
      "Rodent Trap Installation",
      "Box Installation",
      "Cake Deployment",
      "Poison Deployment",
      "Repellent Spray",
    ],
  },

  // ── WOOD BORER ───────────────────────────────────────────
  "wood_borer": {
    label: "Wood Borer — Wood Borer Treatment",
    category: "Wood Borer",
    jobs: [
      "Spray",
      "Injection (Chemical Pores)",
      "Brushing",
    ],
  },
};

/**
 * Returns ordered job titles for a given treatment key.
 * Always starts with Inspection + Preparation.
 *
 * @param {string} treatmentKey - key from TREATMENT_TEMPLATES
 * @returns {string[]} ordered list of job titles
 */
export function getJobsByTreatment(treatmentKey) {
  const template = TREATMENT_TEMPLATES[treatmentKey];
  if (!template) return [...ALWAYS_FIRST];
  return [...ALWAYS_FIRST, ...template.jobs];
}

/**
 * Returns subJob objects ready to save to Firestore.
 * @param {string} jobId
 * @param {string} treatmentKey
 * @returns {{ jobId, title, status, order, completedBy, completedAt, note }[]}
 */
export function buildSubJobs(jobId, treatmentKey) {
  return getJobsByTreatment(treatmentKey).map((title, i) => ({
    jobId,
    title,
    status: "pending",
    order: i,
    completedBy: "",
    completedAt: null,
    note: "",
  }));
}

// Grouped for UI display
export const TREATMENT_GROUPS = [
  {
    group: "Termite",
    items: [
      "termite_foundation",
      "termite_plinth",
      "termite_before_flooring",
      "termite_piping_tube",
      "termite_drilling",
    ],
  },
  {
    group: "Wood / Ply",
    items: ["wood_ply"],
  },
  {
    group: "Garden",
    items: ["garden"],
  },
  {
    group: "Cockroach",
    items: ["cockroach_spray", "cockroach_gel"],
  },
  {
    group: "Ant",
    items: ["ant"],
  },
  {
    group: "Bed Bugs",
    items: ["bedbug"],
  },
  {
    group: "Mosquito",
    items: ["mosquito_irs", "mosquito_ulv"],
  },
  {
    group: "Rodent",
    items: ["rodent"],
  },
  {
    group: "Wood Borer",
    items: ["wood_borer"],
  },
];
