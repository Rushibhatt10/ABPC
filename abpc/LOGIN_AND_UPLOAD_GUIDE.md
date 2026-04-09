# Login & Upload System Guide

## 🔐 NAME-BASED LOGIN

### How It Works
1. Open the app
2. Enter your full name in the input field
3. Click "Continue"
4. System validates and logs you in

### Authorized Users
**Admins:**
- Ankit Bhatt
- Akanksha Bhatt

**Workers:**
- Nakul
- Divyesh
- Sagar

### Quick Select
- Use the quick select buttons below the input field
- Click any name to auto-fill the input
- Then click "Continue"

### Error Handling
- If name not found: "Name not found. Please enter a valid name."
- Names are case-insensitive (e.g., "nakul" = "Nakul")

---

## 📤 CORRECT UPLOAD FLOW

### The Problem (Before)
❌ Saving URLs to Firestore BEFORE upload completes
❌ Race conditions causing missing images
❌ No proper error handling

### The Solution (Now)
✅ Proper async/await sequence
✅ Wait for upload to complete
✅ Then get download URL
✅ Only then save to Firestore

### Upload Sequence

```javascript
// Step 1: Create report document
const reportId = await createRecord("reports", {
  jobId: "...",
  workerName: "Nakul",
  notes: "Work completed",
  imageUrls: [],      // Empty initially
  audioUrl: null,     // Empty initially
  timestamp: new Date().toISOString()
});

// Step 2: Upload file to Firebase Storage
const storageRef = ref(firebaseStorage, "reports/images/123456_abc.jpg");
await uploadBytes(storageRef, file);  // WAIT for upload

// Step 3: Get download URL
const url = await getDownloadURL(storageRef);  // WAIT for URL

// Step 4: Save URL to Firestore
await updateRecord("reports", reportId, {
  imageUrls: [url]
});
```

### Storage Structure
```
Firebase Storage:
reports/
  ├── images/
  │   ├── 1704123456789_abc123.jpg
  │   ├── 1704123457890_def456.jpg
  │   └── ...
  └── audio/
      ├── 1704123458901_ghi789.webm
      └── ...
```

### Firestore Structure
```javascript
Collection: reports
{
  id: "report123",
  jobId: "job456",
  workerName: "Nakul",
  uploaderUid: "user789",
  notes: "Inspection completed successfully",
  imageUrls: [
    "https://firebasestorage.googleapis.com/.../image1.jpg",
    "https://firebasestorage.googleapis.com/.../image2.jpg"
  ],
  audioUrl: "https://firebasestorage.googleapis.com/.../voice.webm",
  checklist: null,
  timestamp: "2024-01-01T10:30:00.000Z",
  createdAt: "2024-01-01T10:30:00.000Z"
}
```

---

## ⚡ REAL-TIME ADMIN VISIBILITY

### How It Works
- Admin dashboard uses Firestore `onSnapshot`
- Updates appear instantly without refresh
- No polling or manual refresh needed

### What Admins See (Real-Time)
✅ New reports appear immediately
✅ Images load as thumbnails
✅ Audio player ready to play
✅ Worker name and timestamp
✅ Job details
✅ Checklist status

### Implementation
```javascript
// Real-time subscription
const reportsQ = query(
  collection(firestoreDb, "reports"), 
  orderBy("timestamp", "desc")
);

subscribeQuery(reportsQ, setReports);  // Auto-updates
```

---

## 🎨 LOADING STATES & UX

### During Upload
- **Text**: "Uploading image 1/3..." → "Uploading image 2/3..." → "Uploading voice note..."
- **Spinner**: Rotating border animation
- **Buttons**: Submit disabled, Cancel disabled
- **Form**: All inputs disabled

### After Success
- **Message**: "Report submitted successfully!" (green)
- **Action**: Form resets, modal closes
- **Cleanup**: Preview URLs revoked

### On Error
- **Message**: "Upload failed. Please try again." (red)
- **Action**: Form stays open, user can retry
- **Console**: Error logged for debugging

---

## ⚠️ ERROR HANDLING

### File Size Validation
```javascript
// Before upload
if (file.size > 2 * 1024 * 1024) {
  showMsg("error", "File too large. Max 2MB for images.");
  return;
}
```

### Upload Error Handling
```javascript
try {
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  // Save URL...
} catch (err) {
  console.error("Upload error:", err);
  showMsg("error", "Upload failed. Please try again.");
}
```

### Network Errors
- Automatic retry available
- User-friendly error messages
- Console logs for debugging

---

## 📋 WORKER WORKFLOW

### Step-by-Step
1. **Login**: Enter name (e.g., "Nakul")
2. **View Jobs**: See "Today's Jobs" section
3. **Complete Checklist**:
   - ☐ Inspection done
   - ☐ Chemical applied
   - ☐ Area covered
   - ☐ Customer satisfied
4. **Add Notes**: Describe work done
5. **Mark Complete**: Button activates when all checked
6. **Submit Report**: Go to Reports page
7. **Upload Media**:
   - Select job
   - Add notes
   - Upload images (max 2MB each)
   - Record voice note (max 1MB)
8. **Wait**: See "Uploading..." with progress
9. **Success**: See "Report submitted successfully!"

---

## 👨‍💼 ADMIN WORKFLOW

### Step-by-Step
1. **Login**: Enter name (e.g., "Ankit Bhatt")
2. **View Reports**: See all reports in real-time
3. **Filter**: By job or worker
4. **View Media**:
   - Click images to preview
   - Play voice notes inline
5. **Export**: Click "Export Excel" for data
6. **Print**: Click "Print" for printable view

---

## 🔍 DEBUGGING

### Check Console
```javascript
// Upload errors logged here
console.error("Upload error:", err);
```

### Check Firestore
- Open Firebase Console
- Go to Firestore Database
- Check `reports` collection
- Verify `imageUrls` and `audioUrl` fields

### Check Storage
- Open Firebase Console
- Go to Storage
- Check `reports/images/` folder
- Check `reports/audio/` folder

---

## ✅ VALIDATION CHECKLIST

Before submitting a report:
- [ ] Job selected
- [ ] At least one action (image, audio, or notes)
- [ ] Images under 2MB each
- [ ] Audio under 1MB
- [ ] Network connection active

---

## 🚀 PRODUCTION READY

✅ Name-based login (no password)
✅ Proper async/await upload flow
✅ Real-time admin updates
✅ Error handling with retry
✅ Loading states with spinners
✅ File size validation
✅ Console logging for debugging
✅ User-friendly error messages
✅ Clean UI/UX
✅ Build successful

---

## 📞 SUPPORT

If you encounter issues:
1. Check console for errors
2. Verify Firebase connection
3. Check file sizes
4. Try again with retry option
5. Contact system administrator
