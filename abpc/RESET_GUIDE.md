# 🔥 ABPC Full Data Reset Guide

This script **permanently deletes ALL data** from Firestore and Cloudinary. Use only when you want a completely fresh start.

---

## ⚠️ What Gets Deleted

### Firestore (ALL collections)
- `users`, `customers`, `jobs`, `subJobs`
- `invoices`, `quotations`, `amc`
- `reports`, `jobReports`, `attendance`
- `complaints`, `messages`, `services`, `priceList`, `counters`, `mediaUploads`

### Cloudinary (ALL assets)
- All images
- All videos
- All folders
- All derived/cached versions

---

## 📋 Prerequisites

### 1. Install required packages
```bash
cd abpc
npm install firebase-admin cloudinary --save-dev
```

### 2. Get Firebase Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/project/abpc-90690/settings/serviceaccounts/adminsdk)
2. Click **"Generate new private key"**
3. Save the downloaded JSON file as `abpc/serviceAccountKey.json`
4. **NEVER commit this file to git** (already in `.gitignore`)

### 3. Get Cloudinary API Credentials
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings → API Keys**
3. Copy your **API Key** and **API Secret**

### 4. Configure `.env.reset`
Edit `abpc/.env.reset` and fill in:
```env
FIREBASE_PROJECT_ID=abpc-90690
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
CLOUDINARY_CLOUD_NAME=dbjjjmefs
CLOUDINARY_API_KEY=your_actual_api_key_here
CLOUDINARY_API_SECRET=your_actual_api_secret_here
```

---

## 🚀 Run the Reset

```bash
cd abpc
node reset.cjs
```

You'll be prompted to type `CONFIRM_RESET` — this is your last chance to abort.

---

## ✅ After Reset

1. **Restart dev server** (if running):
   ```bash
   npm run dev
   ```

2. **Log in as admin** — use one of the allowed Google accounts:
   - `ankbhatt8004@gmail.com`
   - `abpestcontrol8@gmail.com`
   - `bhattakanksha029@gmail.com`

3. **The app will auto-initialize** — no manual setup needed

4. **Add your first customer** → create a job → verify everything works

---

## 🛡️ Safety Features

- ✅ Requires typing `CONFIRM_RESET` before execution
- ✅ Logs every deletion step to console
- ✅ Idempotent — safe to run multiple times
- ✅ Handles errors gracefully (continues even if some collections are empty)
- ✅ Service account key never committed to git

---

## 🔧 Troubleshooting

**"Missing packages" error**
```bash
npm install firebase-admin cloudinary --save-dev
```

**"Service account file not found"**
- Download it from Firebase Console → Service Accounts
- Save as `abpc/serviceAccountKey.json`

**"Permission denied" on Firestore**
- Your service account needs **Cloud Datastore Owner** role
- Go to [IAM Console](https://console.cloud.google.com/iam-admin/iam?project=abpc-90690)
- Find your service account → Edit → Add role

**"Invalid Cloudinary credentials"**
- Double-check API Key and Secret in `.env.reset`
- Make sure there are no extra quotes or spaces

---

## 📝 What Happens During Reset

```
1. Confirmation prompt (type CONFIRM_RESET)
2. Firestore deletion:
   ├─ users (X docs)
   ├─ customers (X docs)
   ├─ jobs (X docs)
   ├─ ... (all collections)
   └─ Total: X documents deleted
3. Cloudinary deletion:
   ├─ images (X assets)
   ├─ videos (X assets)
   ├─ folders (X folders)
   └─ Total: X assets deleted
4. Done ✅
```

---

## 🚨 Important Notes

- **This is irreversible** — there's no undo
- **Backup first** if you need to preserve any data
- **Don't run in production** — this is for dev/testing only
- **Service account key is sensitive** — never share or commit it

---

## 🔄 Alternative: Partial Reset

If you only want to delete specific collections, edit `reset.cjs` and modify the `FIRESTORE_COLLECTIONS` array.

Example (only delete jobs and reports):
```js
const FIRESTORE_COLLECTIONS = ["jobs", "subJobs", "reports", "jobReports"];
```

Then run `node reset.cjs` as usual.
