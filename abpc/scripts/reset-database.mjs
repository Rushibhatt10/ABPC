/**
 * ============================================================
 * ABPC – Full Database Reset Script
 * ============================================================
 * Deletes ALL Firestore collections (including subcollections)
 * and ALL Cloudinary assets.
 *
 * Usage:
 *   node scripts/reset-database.mjs
 *
 * Environment Variables (set in .env.reset or export manually):
 *   FIREBASE_PROJECT_ID=your-project-id
 *   FIREBASE_CLIENT_EMAIL=your-service-account-email
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *   CLOUDINARY_CLOUD_NAME=your-cloud-name
 *   CLOUDINARY_API_KEY=your-api-key
 *   CLOUDINARY_API_SECRET=your-api-secret
 * ============================================================
 */

import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.reset if it exists ─────────────────────────────────────────────
const envFile = resolve(__dirname, "../.env.reset");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
    }
  }
  console.log("✅  Loaded .env.reset");
}

// ── Validate env vars ─────────────────────────────────────────────────────────
const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("\n❌  Missing environment variables:", missing.join(", "));
  console.error(
    "    Create a .env.reset file in the project root with these values.\n"
  );
  process.exit(1);
}

// ── Safety Confirmation ───────────────────────────────────────────────────────
async function confirm() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║       ⚠️   DATABASE RESET WARNING ⚠️                 ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log("║  This will permanently delete:                       ║");
    console.log("║    • ALL Firestore documents and collections         ║");
    console.log("║    • ALL Cloudinary assets (images, videos, folders) ║");
    console.log("║                                                      ║");
    console.log(`║  Project: ${process.env.FIREBASE_PROJECT_ID.padEnd(41)} ║`);
    console.log(`║  Cloud:   ${process.env.CLOUDINARY_CLOUD_NAME.padEnd(41)} ║`);
    console.log("╚══════════════════════════════════════════════════════╝\n");
    rl.question('  Type "CONFIRM_RESET" to proceed: ', (answer) => {
      rl.close();
      resolve(answer.trim() === "CONFIRM_RESET");
    });
  });
}

// ── Firestore Delete Helpers ──────────────────────────────────────────────────
async function deleteCollection(db, colRef, batchSize = 100) {
  const query = colRef.limit(batchSize);
  let deleted = 0;

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      // Recurse into subcollections first
      const subCols = await doc.ref.listCollections();
      for (const sub of subCols) {
        await deleteCollection(db, sub, batchSize);
      }
      batch.delete(doc.ref);
      deleted++;
    }
    await batch.commit();
    console.log(`  🗑️   Deleted ${deleted} documents from ${colRef.path}`);
  }
}

async function deleteAllFirestore(db) {
  console.log("\n📂  Scanning Firestore root collections...");
  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log("  ℹ️   Firestore is already empty.");
    return;
  }

  for (const col of collections) {
    console.log(`\n  📁  Deleting collection: ${col.id}`);
    await deleteCollection(db, col);
  }
  console.log("\n✅  Firestore cleared.");
}

// ── Cloudinary Delete Helpers ─────────────────────────────────────────────────
async function cloudinaryRequest(url, auth, params = {}) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${auth.key}:${auth.secret}`).toString("base64")}`,
    },
    body,
  });
  return res.json();
}

async function cloudinaryGet(url, auth) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.key}:${auth.secret}`).toString("base64")}`,
    },
  });
  return res.json();
}

async function deleteAllCloudinary(cloud, key, secret) {
  const base = `https://api.cloudinary.com/v1_1/${cloud}`;
  const auth = { key, secret };

  console.log("\n☁️   Scanning Cloudinary resources...");

  // Delete all images
  console.log("  🗑️   Deleting all images...");
  let result = await cloudinaryRequest(`${base}/resources/image/upload`, auth, {
    all: true,
    invalidate: true,
  });
  console.log(`  ✅  Images: ${result.deleted_counts?.original ?? result.message ?? JSON.stringify(result)}`);

  // Delete all videos
  console.log("  🗑️   Deleting all videos...");
  result = await cloudinaryRequest(`${base}/resources/video/upload`, auth, {
    all: true,
    invalidate: true,
  });
  console.log(`  ✅  Videos: ${result.deleted_counts?.original ?? result.message ?? JSON.stringify(result)}`);

  // Delete all raw files
  console.log("  🗑️   Deleting all raw files...");
  result = await cloudinaryRequest(`${base}/resources/raw/upload`, auth, {
    all: true,
    invalidate: true,
  });
  console.log(`  ✅  Raw: ${result.deleted_counts?.original ?? result.message ?? JSON.stringify(result)}`);

  // Delete all folders (top-level)
  console.log("  📁  Deleting top-level folders...");
  const foldersData = await cloudinaryGet(`${base}/folders`, auth);
  const folders = foldersData.folders || [];
  if (folders.length === 0) {
    console.log("  ℹ️   No folders found.");
  }
  for (const folder of folders) {
    const delRes = await fetch(`${base}/folders/${folder.path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
    });
    const delJson = await delRes.json();
    console.log(`  🗑️   Folder "${folder.path}": ${delJson.deleted ?? JSON.stringify(delJson)}`);
  }

  console.log("\n✅  Cloudinary cleared.");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const ok = await confirm();
  if (!ok) {
    console.log("\n  ❌  Reset cancelled. No changes were made.\n");
    process.exit(0);
  }

  console.log("\n🚀  Starting reset...\n");

  // Dynamically import firebase-admin to avoid ESM issues
  let admin;
  try {
    const mod = await import("firebase-admin");
    admin = mod.default;
  } catch {
    console.error("❌  firebase-admin not found. Run: npm install firebase-admin");
    process.exit(1);
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  // 1. Delete Firestore
  try {
    await deleteAllFirestore(db);
  } catch (err) {
    console.error("❌  Firestore deletion failed:", err.message);
    process.exit(1);
  }

  // 2. Delete Cloudinary
  try {
    await deleteAllCloudinary(
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_API_KEY,
      process.env.CLOUDINARY_API_SECRET
    );
  } catch (err) {
    console.error("❌  Cloudinary deletion failed:", err.message);
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  ✅  RESET COMPLETE                          ║");
  console.log("║  • Firestore: all collections deleted        ║");
  console.log("║  • Cloudinary: all assets deleted            ║");
  console.log("║  • No users, records, or images remain       ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Unexpected error:", err);
  process.exit(1);
});
