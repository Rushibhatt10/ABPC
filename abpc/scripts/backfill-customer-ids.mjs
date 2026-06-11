import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(scriptDir, "../.env.reset");

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    process.env[key.trim()] = valueParts.join("=").trim().replace(/^"|"$/g, "");
  }
}

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing Firebase credentials: ${missing.join(", ")}`);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const customers = await db.collection("customers").get();
let assignedIds = 0;
let repairedMappings = 0;

for (const customerDoc of customers.docs) {
  const data = customerDoc.data();
  const customerId = customerDoc.id;
  const phone = String(data.phone || "").replace(/\D/g, "");

  if (data.customerId !== customerId) {
    await customerDoc.ref.set({
      customerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    assignedIds += 1;
  }

  if (phone) {
    const mappingRef = db.collection("phoneMappings").doc(phone);
    const mapping = await mappingRef.get();
    const customerIds = mapping.exists ? mapping.data().customerIds || [] : [];

    if (!customerIds.includes(customerId)) {
      await mappingRef.set({
        customerIds: [...customerIds, customerId],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      repairedMappings += 1;
    }
  }
}

console.log(`Customers scanned: ${customers.size}`);
console.log(`Customer IDs assigned: ${assignedIds}`);
console.log(`Phone mappings repaired: ${repairedMappings}`);
