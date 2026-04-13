/**
 * Per-service Methodology, Warranty, Payment Terms, and Terms & Conditions
 * Keyed by category name (matches SERVICE_CATEGORIES in services.js)
 */

export const SERVICE_TERMS = {
  "Termite": {
    methodology: "Anti-termite treatment is carried out using approved chemicals injected through drilled holes at regular intervals along the foundation, plinth, and flooring. All entry points are sealed after treatment.",
    warranty: "5 Years warranty against subterranean termite infestation from the date of treatment, subject to annual inspection and site conditions.",
    paymentTerms: "50% advance before work commencement. Remaining 50% on completion of treatment.",
    terms: "1. Warranty is void if structural modifications are made without prior intimation.\n2. Annual inspection is mandatory to keep warranty valid.\n3. Taxes extra as applicable.\n4. Quotation valid for 15 days.",
  },

  "General Pest Control": {
    methodology: "Treatment is carried out using gel bait application and/or residual spray in kitchen, bathroom, drainage, and all infestation-prone areas. Safe for humans and pets after drying.",
    warranty: "3 Months warranty from date of treatment. Free re-treatment if infestation recurs within warranty period.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Keep treated areas dry for 4–6 hours after treatment.\n2. Do not clean treated surfaces for 48 hours.\n3. Warranty covers re-infestation only, not new pest entry.\n4. Taxes extra as applicable.",
  },

  "Bed Bugs": {
    methodology: "Comprehensive spray treatment applied to mattresses, bed frames, headboards, hinges, switchboards, cracks, crevices, and all harbourage areas using approved insecticides.",
    warranty: "1 Month warranty from date of treatment. Free re-treatment if bed bugs are found within warranty period.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Wash all bedding and clothing before treatment.\n2. Vacate the treated room for at least 4 hours.\n3. Do not vacuum treated surfaces for 72 hours.\n4. Taxes extra as applicable.",
  },

  "Mosquitos": {
    methodology: "IRS (Indoor Residual Spray) applied to walls, curtains, and resting surfaces. ULV Cold Fogging used for outdoor areas, plantation, and dark corners to eliminate adult mosquitoes.",
    warranty: "15 Days warranty from date of treatment.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Vacate premises for 2–3 hours after fogging.\n2. Cover food and water before treatment.\n3. Results depend on environmental conditions and re-infestation from outside.\n4. Taxes extra as applicable.",
  },

  "Rodent": {
    methodology: "Rodent control carried out using bait stations, rodenticide cake deployment, repellent spray, and mechanical traps placed at strategic locations. Follow-up inspection included.",
    warranty: "1 Month warranty from date of treatment. Bait replenishment included during warranty period.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Keep children and pets away from bait stations.\n2. Do not disturb or relocate bait boxes.\n3. Dead rodents must be disposed of safely.\n4. Taxes extra as applicable.",
  },

  "Wood Borer": {
    methodology: "Wood borer treatment carried out by brushing, spraying, and injecting approved insecticide into bore holes and affected wooden surfaces. All holes are sealed after chemical injection.",
    warranty: "1 Year warranty from date of treatment against active wood borer infestation.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Treated wood should not be painted or varnished for 7 days.\n2. Warranty covers active infestation only.\n3. Structural damage caused by wood borer is not covered.\n4. Taxes extra as applicable.",
  },

  "Ant Treatment": {
    methodology: "Ant control carried out using gel bait and residual spray treatment in kitchen, bathroom, living areas, and all ant trails and entry points.",
    warranty: "1 Month warranty from date of treatment.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Do not clean treated surfaces for 48 hours.\n2. Keep food sealed and stored properly.\n3. Warranty covers re-infestation from same species only.\n4. Taxes extra as applicable.",
  },

  "No Chemical Treatment": {
    methodology: "Installation of physical pest barriers including mosquito nets, bird nets, bird spikes, and invisible grills as per site requirements and measurements.",
    warranty: "1 Year warranty on installation workmanship. Material warranty as per manufacturer terms.",
    paymentTerms: "50% advance before material procurement. Remaining 50% on installation completion.",
    terms: "1. Warranty covers installation defects only, not physical damage.\n2. Material colour/design subject to availability.\n3. Site must be accessible and ready before installation date.\n4. Taxes extra as applicable.",
  },

  "General Pest Service": {
    methodology: "Comprehensive pest control service covering multiple pest types including cockroaches, ants, mosquitoes, rodents, and bed bugs using appropriate treatment methods for each.",
    warranty: "3 Months warranty from date of treatment. Free re-treatment for covered pests within warranty period.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Keep treated areas dry for 4–6 hours after treatment.\n2. Do not clean treated surfaces for 48 hours.\n3. Warranty covers listed pests only.\n4. Taxes extra as applicable.",
  },
};

/**
 * Get terms for a given category. Falls back to generic terms.
 */
export function getTermsForCategory(category) {
  return SERVICE_TERMS[category] || {
    methodology: "Treatment carried out using approved methods and chemicals as per industry standards.",
    warranty: "Warranty as per treatment type, subject to site conditions.",
    paymentTerms: "Full payment on completion of service.",
    terms: "1. Payment due on completion.\n2. Taxes extra if applicable.\n3. Quotation valid for 15 days.",
  };
}

/**
 * Get combined terms for multiple categories (for multi-service quotations).
 * Merges unique warranty and terms entries.
 */
export function getTermsForCategories(categories) {
  if (!categories || categories.length === 0) return getTermsForCategory(null);
  if (categories.length === 1) return getTermsForCategory(categories[0]);

  const termsList = categories.map(c => SERVICE_TERMS[c]).filter(Boolean);
  if (termsList.length === 0) return getTermsForCategory(null);

  return {
    methodology: termsList.map((t, i) => `${categories[i]}: ${t.methodology}`).join("\n\n"),
    warranty: [...new Set(termsList.map(t => t.warranty))].join("\n"),
    paymentTerms: termsList[0].paymentTerms,
    terms: termsList[0].terms,
  };
}
