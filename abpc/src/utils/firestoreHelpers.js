import { DEFAULT_SERVICES } from "../constants/services";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  onSnapshot,
} from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";

const withTimestamps = (payload, { includeCreatedAt = false } = {}) => ({
  ...payload,
  ...(includeCreatedAt ? { createdAt: serverTimestamp() } : null),
  updatedAt: serverTimestamp(),
});

export const createRecord = async (collectionName, payload) => {
  const ref = await addDoc(collection(firestoreDb, collectionName), withTimestamps(payload, { includeCreatedAt: true }));
  return ref.id;
};

export const updateRecord = async (collectionName, id, patch) => {
  const ref = doc(firestoreDb, collectionName, id);
  await updateDoc(ref, withTimestamps(patch));
};

export const deleteRecord = async (collectionName, id) => {
  await deleteDoc(doc(firestoreDb, collectionName, id));
};

export const getRecord = async (collectionName, id) => {
  const snap = await getDoc(doc(firestoreDb, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const listRecords = async (collectionName, { orderByField = "createdAt", direction = "asc", pageSize = 500 } = {}) => {
  const base = collection(firestoreDb, collectionName);
  const q = query(base, orderBy(orderByField, direction), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeCollection = (collectionName, onData, { orderByField = "createdAt", direction = "asc", pageSize = 500 } = {}) => {
  const base = collection(firestoreDb, collectionName);
  const q = query(base, orderBy(orderByField, direction), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.warn(`[Firestore] Subscription error on ${collectionName}:`, error.message);
      onData([]); // Fallback to empty array safely if permissions denied
    }
  );
};

export const subscribeDoc = (collectionName, id, onData) =>
  onSnapshot(doc(firestoreDb, collectionName, id), (snap) => {
    onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });

export const subscribeQuery = (queryRef, onData, onError) =>
  onSnapshot(queryRef, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error("Firestore subscribeQuery error:", err.code, err.message);
    if (onError) onError(err);
  });

export const deleteRecordsByField = async (collectionName, fieldName, operator, value) => {
  if (operator !== "==") {
    throw new Error(`Only '==' is supported (got ${operator}).`);
  }
  const q = query(collection(firestoreDb, collectionName), where(fieldName, "==", value));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
};

export const deleteAllCollectionRecords = async (collectionName) => {
  const q = query(collection(firestoreDb, collectionName), limit(1000));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
};

export const deleteAllBusinessData = async () => {
  // NOTE: "reports" and "mediaUploads" are intentionally excluded — they must be deleted individually
  const collections = ["amc", "customers", "invoices", "jobs", "quotations", "services", "counters", "users", "messages", "subJobs", "priceList"];
  const results = {};
  for (const name of collections) {
    results[name] = await deleteAllCollectionRecords(name);
  }
  return results;
};

export const nextDocumentNumber = async (prefix) => {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const counterId = `${prefix}_${datePart}`;
  const counterRef = doc(firestoreDb, "counters", counterId);

  const nextValue = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data()?.value || 0) : 0;
    const value = current + 1;
    if (snap.exists()) {
      tx.update(counterRef, { value, updatedAt: serverTimestamp() });
    } else {
      tx.set(counterRef, { id: counterId, value, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    return value;
  });

  return `${prefix}-${datePart}-${String(nextValue).padStart(4, "0")}`;
};

export const upsertUserDoc = async (uid, payload) => {
  await setDoc(doc(firestoreDb, "users", uid), withTimestamps({ uid, ...payload }, { includeCreatedAt: true }), { merge: true });
};

export const ensureDefaultServices = async () => {
  const snap = await getDocs(query(collection(firestoreDb, "services"), limit(1)));
  if (!snap.empty) return;
  await Promise.all(DEFAULT_SERVICES.map((service) => createRecord("services", service)));
};

export const cleanupPastVisits = async (todayISO) => {
  const q = query(collection(firestoreDb, "jobs"), where("scheduledDate", "<", todayISO));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
};
