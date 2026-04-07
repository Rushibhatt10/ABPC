import { DEFAULT_SERVICES } from "../constants/services";
import {
  cleanupPastVisits,
  createRecord,
  deleteAllBusinessData,
  deleteAllCollectionRecords,
  deleteRecord,
  deleteRecordsByField,
  listRecords,
  nextDocumentNumber,
  updateRecord,
} from "./localDb";

export {
  cleanupPastVisits,
  createRecord,
  deleteAllBusinessData,
  deleteAllCollectionRecords,
  deleteRecord,
  deleteRecordsByField,
  nextDocumentNumber,
  updateRecord,
};

export const upsertUserDoc = async (uid, payload) => {
  const existing = listRecords("users").find((u) => u.id === uid) || null;
  if (existing) {
    await updateRecord("users", uid, payload);
    return;
  }
  await createRecord("users", { ...payload, id: uid });
};

export const ensureDefaultServices = async () => {
  const services = listRecords("services");
  if (services.length) return;
  await Promise.all(DEFAULT_SERVICES.map((service) => createRecord("services", service)));
};
