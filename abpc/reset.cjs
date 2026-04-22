/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           ABPC — FULL DATA RESET SCRIPT                     ║
 * ║  Deletes ALL Firestore data + ALL Cloudinary assets          ║
 * ║  Requires: firebase-admin, cloudinary, readline packages     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * SETUP (run once):
 *   npm install firebase-admin cloudinary readline --save-dev
 *
 * REQUIRED ENV VARS — create abpc/.env.reset with:
 *   FIREBASE_PROJECT_ID=abpc-90690
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *   CLOUDINARY_CLOUD_NAME=dbjjjmefs
 *   CLOUDINARY_API_KEY=your_api_key
 *   CLOUDINARY_API_SECRET=your_api_secret
 *
 * RUN:
 *   node reset.cjs
 *
 * HOW TO GET CREDENTIALS:
 *   Firebase: console.firebase.google.com → Project Settings → Service Accounts → Generate new private key
 *   Cloudinary: cloudinary.com/console → Settings → API Keys
 */

"use strict";

const readline = require("readline");
const path = require("path");
const fs = require("fs");

// ── Load .env.reset ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, ".env.reset");
if (!fs.existsSync(envPath)) {
  console.error("\n❌  .env.reset not found. Create it with the required variables (see script header).\n");
  process.exit(1);
}
const envLines = fs.readFileSync(envPath, "utf8").split("\n");
envLines.forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
});

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_PATH,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

// ── Validate env ─────────────────────────────────────────────────────────────
const missing = [];
if (!FIREBASE_PROJECT_ID)          missing.push("FIREBASE_PROJECT_ID");
if (!FIREBASE_SERVICE_ACCOUNT_PATH) missing.push("FIREBASE_SERVICE_ACCOUNT_PATH");
if (!CLOUDINARY_CLOUD_NAME)        missing.push("CLOUDINARY_CLOUD_NAME");
if (!CLOUDINARY_API_KEY)           missing.push("CLOUDINARY_API_KEY");
if (!CLOUDINARY_API_SECRET)        missing.push("CLOUDINARY_API_SECRET");

if (missing.length) {
  console.error(`\n❌  Missing env vars in .env.reset:\n   ${missing.join("\n   ")}\n`);
  process.exit(1);
}

const serviceAccountPath = path.resolve(__dirname, FIREBASE_SERVICE_ACCOUNT_PATH);
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`\n❌  Service account file not found: ${serviceAccountPath}\n`);
  process.exit(1);
}

// ── Lazy-load heavy deps (only after confirmation) ───────────────────────────
let admin, cloudinary;

// ── Collections to wipe ──────────────────────────────────────────────────────
const FIRESTORE_COLLECTIONS = [
  "users",
  "customers",
  "jobs",
  "subJobs",
  "invoices",
  "quotations",
  "amc",
  "reports",
  "jobReports",
  "attendance",
  "complaints",
  "messages",
  "services",
  "priceList",
  "counters",
  "mediaUploads",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)    { console.log(`  ✔  ${msg}`); }
function warn(msg)   { console.warn(`  ⚠  ${msg}`); }
function section(msg){ console.log(`\n${"─".repeat(60)}\n  ${msg}\n${"─".repeat(60)}`); }

/** Delete all docs in a collection, including subcollections, in batches */
async function deleteCollection(db, collectionPath, batchSize = 400) {
  const colRef = db.collection(collectionPath);
  let deleted = 0;

  while (true) {
    const snapshot = await colRef.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      // Recursively delete subcollections first
      const subcols = await doc.ref.listCollections();
      for (const sub of subcols) {
        await deleteCollection(db, sub.path, batchSize);
      }
      batch.delete(doc.ref);
      deleted++;
    }
    await batch.commit();
    process.stdout.write(`\r     Deleted ${deleted} docs from ${collectionPath}...`);
  }

  if (deleted > 0) process.stdout.write("\n");
  return deleted;
}

/** Delete all Cloudinary resources of a given resource_type */
async function deleteCloudinaryByType(type) {
  let deleted = 0;
  let nextCursor = undefined;

  do {
    const params = { resource_type: type, max_results: 500 };
    if (nextCursor) params.next_cursor = nextCursor;

    const result = await cloudinary.api.resources(params);
    const publicIds = result.resources.map((r) => r.public_id);

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds, { resource_type: type });
      deleted += publicIds.length;
      process.stdout.write(`\r     Deleted ${deleted} ${type} assets...`);
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  if (deleted > 0) process.stdout.write("\n");
  return deleted;
}

/** Delete all Cloudinary folders recursively */
async function deleteCloudinaryFolders() {
  try {
    const result = await cloudinary.api.root_folders();
    for (const folder of result.folders || []) {
      try {
        await cloudinary.api.delete_folder(folder.path);
        log(`Deleted folder: ${folder.path}`);
      } catch (e) {
        warn(`Could not delete folder ${folder.path}: ${e.message}`);
      }
    }
  } catch (e) {
    warn(`Folder deletion skipped: ${e.message}`);
  }
}

// ── Confirmation prompt ───────────────────────────────────────────────────────
function confirm() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("\n" + "═".repeat(60));
    console.log("  ⚠️   WARNING: IRREVERSIBLE DATA DELETION");
    console.log("═".repeat(60));
    console.log(`
  This script will permanently delete:
    • ALL Firestore documents in project: ${FIREBASE_PROJECT_ID}
    • ALL Cloudinary assets in account:   ${CLOUDINARY_CLOUD_NAME}

  This CANNOT be undone.
`);
    rl.question('  Type  CONFIRM_RESET  to proceed: ', (answer) => {
      rl.close();
      resolve(answer.trim() === "CONFIRM_RESET");
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const confirmed = await confirm();
  if (!confirmed) {
    console.log("\n  Aborted. No data was deleted.\n");
    process.exit(0);
  }

  console.log("\n  Starting reset...\n");

  // ── Load deps ──────────────────────────────────────────────────────────────
  try {
    admin = require("firebase-admin");
    cloudinary = require("cloudinary").v2;
  } catch (e) {
    console.error(`\n❌  Missing packages. Run:\n   npm install firebase-admin cloudinary --save-dev\n`);
    process.exit(1);
  }

  // ── Init Firebase Admin ────────────────────────────────────────────────────
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID,
    });
  }
  const db = admin.firestore();

  // ── Init Cloudinary ────────────────────────────────────────────────────────
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  // ══════════════════════════════════════════════════════════════
  //  STEP 1 — FIRESTORE
  // ══════════════════════════════════════════════════════════════
  section("STEP 1 — Deleting Firestore data");

  let totalFirestoreDocs = 0;
  for (const col of FIRESTORE_COLLECTIONS) {
    process.stdout.write(`  Wiping collection: ${col}...\n`);
    try {
      const count = await deleteCollection(db, col);
      if (count > 0) log(`${col}: ${count} documents deleted`);
      else log(`${col}: already empty`);
      totalFirestoreDocs += count;
    } catch (e) {
      warn(`${col}: ${e.message}`);
    }
  }

  log(`Firestore total: ${totalFirestoreDocs} documents deleted`);

  // ══════════════════════════════════════════════════════════════
  //  STEP 2 — CLOUDINARY
  // ══════════════════════════════════════════════════════════════
  section("STEP 2 — Deleting Cloudinary assets");

  let totalCloudinary = 0;
  for (const type of ["image", "video", "raw"]) {
    process.stdout.write(`  Deleting ${type} assets...\n`);
    try {
      const count = await deleteCloudinaryByType(type);
      if (count > 0) log(`${type}: ${count} assets deleted`);
      else log(`${type}: no assets found`);
      totalCloudinary += count;
    } catch (e) {
      warn(`${type}: ${e.message}`);
    }
  }

  process.stdout.write("  Deleting Cloudinary folders...\n");
  await deleteCloudinaryFolders();

  log(`Cloudinary total: ${totalCloudinary} assets deleted`);

  // ══════════════════════════════════════════════════════════════
  //  STEP 3 — DONE
  // ══════════════════════════════════════════════════════════════
  section("RESET COMPLETE");
  console.log(`
  ✅  Firestore: ${totalFirestoreDocs} documents deleted
  ✅  Cloudinary: ${totalCloudinary} assets deleted
  ✅  Database is now clean and ready for fresh data

  Next steps:
    1. Restart your dev server:  npm run dev
    2. Log in as admin — the app will auto-initialize on first use
    3. Add your first customer and job to verify everything works
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Unexpected error:", err.message || err);
  process.exit(1);
});
