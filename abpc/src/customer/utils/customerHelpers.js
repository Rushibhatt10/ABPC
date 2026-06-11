import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";

/**
 * Sanitizes phone number by removing non-digits.
 */
export function sanitizePhone(phone) {
  if (!phone) return "";
  return phone.trim().replace(/\D/g, "");
}

/**
 * Updates the phone-to-customer ID mapping in Firestore.
 * Handles adding to new mapping, and removing from old mapping if phone changed.
 */
export async function updatePhoneMapping(customerId, newPhone, oldPhone = null) {
  try {
    const newClean = sanitizePhone(newPhone);
    const oldClean = oldPhone ? sanitizePhone(oldPhone) : null;

    if (!newClean) return;

    // 1. If phone number changed, remove customerId from old phone mapping
    if (oldClean && oldClean !== newClean) {
      await removePhoneMapping(customerId, oldClean);
    }

    // 2. Add customerId to new phone mapping
    const mappingRef = doc(firestoreDb, "phoneMappings", newClean);
    const mappingSnap = await getDoc(mappingRef);

    let customerIds = [];
    if (mappingSnap.exists()) {
      customerIds = mappingSnap.data().customerIds || [];
    }

    if (!customerIds.includes(customerId)) {
      customerIds.push(customerId);
      await setDoc(mappingRef, {
        customerIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.error("[phoneMappings] Error updating mapping:", err.message);
  }
}

/**
 * Removes a customerId from a phone mapping.
 */
export async function removePhoneMapping(customerId, phone) {
  try {
    const cleanPhone = sanitizePhone(phone);
    if (!cleanPhone) return;

    const mappingRef = doc(firestoreDb, "phoneMappings", cleanPhone);
    const mappingSnap = await getDoc(mappingRef);

    if (mappingSnap.exists()) {
      let customerIds = mappingSnap.data().customerIds || [];
      customerIds = customerIds.filter(id => id !== customerId);

      if (customerIds.length === 0) {
        // No more customers associated with this phone, mapping can be removed
        // However, to avoid rule violations, we can write an empty array or delete it
        await setDoc(mappingRef, {
          customerIds: [],
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await setDoc(mappingRef, {
          customerIds,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.error("[phoneMappings] Error removing mapping:", err.message);
  }
}
