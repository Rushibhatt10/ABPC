const CODE_MESSAGES = {
  "permission-denied": "Permission denied. Update Firestore rules to allow this action.",
  "unauthenticated": "Firebase session not active. Enable Anonymous Auth in Firebase Console.",
  unavailable: "Firebase service is temporarily unavailable. Check internet and retry.",
  "failed-precondition": "Firestore is not fully configured (rules/index missing).",
  "not-found": "Requested record was not found.",
};

const normalizeCode = (rawCode) => String(rawCode || "").replace("auth/", "").replace("firestore/", "");

export const getFirebaseErrorMessage = (error, fallback = "Firebase operation failed.") => {
  if (!error) return fallback;
  const normalizedCode = normalizeCode(error.code);
  return CODE_MESSAGES[normalizedCode] || error.message || fallback;
};
