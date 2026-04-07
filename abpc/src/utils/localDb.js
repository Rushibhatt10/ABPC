const STORAGE_PREFIX = "abpc_db_v1:";

const dbKey = (collectionName) => `${STORAGE_PREFIX}${collectionName}`;

const safeParse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const readCollection = (collectionName) => {
  const raw = localStorage.getItem(dbKey(collectionName));
  const parsed = raw ? safeParse(raw, []) : [];
  return Array.isArray(parsed) ? parsed : [];
};

const writeCollection = (collectionName, records) => {
  localStorage.setItem(dbKey(collectionName), JSON.stringify(records));
  window.dispatchEvent(new CustomEvent("abpc_db_change", { detail: { collectionName } }));
};

const createId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const subscribeDb = (callback) => {
  const handler = () => callback();
  window.addEventListener("abpc_db_change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("abpc_db_change", handler);
    window.removeEventListener("storage", handler);
  };
};

export const listRecords = (collectionName) => readCollection(collectionName);

export const getRecord = (collectionName, id) => {
  const all = readCollection(collectionName);
  return all.find((item) => item.id === id) || null;
};

export const createRecord = async (collectionName, payload) => {
  const nowIso = new Date().toISOString();
  const all = readCollection(collectionName);
  const id = createId();
  const record = {
    id,
    ...payload,
    createdAt: payload?.createdAt ?? nowIso,
    updatedAt: payload?.updatedAt ?? nowIso,
  };
  writeCollection(collectionName, [...all, record]);
  return id;
};

export const updateRecord = async (collectionName, id, patch) => {
  const nowIso = new Date().toISOString();
  const all = readCollection(collectionName);
  const next = all.map((item) =>
    item.id === id ? { ...item, ...patch, id: item.id, updatedAt: patch?.updatedAt ?? nowIso } : item,
  );
  writeCollection(collectionName, next);
};

export const deleteRecord = async (collectionName, id) => {
  const all = readCollection(collectionName);
  writeCollection(
    collectionName,
    all.filter((item) => item.id !== id),
  );
};

export const deleteRecordsByField = async (collectionName, fieldName, operator, value) => {
  if (operator !== "==") {
    throw new Error(`Only '==' is supported in local mode (got ${operator}).`);
  }
  const all = readCollection(collectionName);
  const before = all.length;
  const after = all.filter((item) => item?.[fieldName] !== value);
  writeCollection(collectionName, after);
  return before - after.length;
};

export const deleteAllCollectionRecords = async (collectionName) => {
  const before = readCollection(collectionName).length;
  writeCollection(collectionName, []);
  return before;
};

export const cleanupPastVisits = async (todayISO) => {
  const all = readCollection("jobs");
  const before = all.length;
  const after = all.filter((job) => !(job?.scheduledDate && String(job.scheduledDate) < String(todayISO)));
  writeCollection("jobs", after);
  return before - after.length;
};

export const deleteAllBusinessData = async () => {
  const collections = ["amc", "customers", "invoices", "jobs", "quotations", "services", "counters", "users", "messages"];
  const results = {};
  for (const name of collections) {
    results[name] = await deleteAllCollectionRecords(name);
  }
  return results;
};

export const nextDocumentNumber = async (prefix) => {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const counterKey = `${prefix}_${datePart}`;
  const all = readCollection("counters");
  const existing = all.find((c) => c.id === counterKey) || null;
  const nextValue = Number(existing?.value || 0) + 1;
  const nowIso = new Date().toISOString();
  const updatedCounters = [
    ...all.filter((c) => c.id !== counterKey),
    { id: counterKey, value: nextValue, updatedAt: nowIso, createdAt: existing?.createdAt ?? nowIso },
  ];
  writeCollection("counters", updatedCounters);
  return `${prefix}-${datePart}-${String(nextValue).padStart(4, "0")}`;
};

