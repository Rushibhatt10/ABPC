# Cloudinary Setup Guide

This application uses Cloudinary for image and voice note uploads in the Reports system.

## Configuration Steps

### 1. Create Cloudinary Account
- Go to [cloudinary.com](https://cloudinary.com)
- Sign up for a free account
- Navigate to your Dashboard

### 2. Get Your Cloud Name
- On the Dashboard, find your **Cloud name**
- Copy this value

### 3. Create Upload Preset
- Go to **Settings** → **Upload**
- Scroll to **Upload presets**
- Click **Add upload preset**
- Configure:
  - **Signing Mode**: Unsigned
  - **Folder**: `reports` (optional, for organization)
  - **Upload preset name**: Choose a name (e.g., `abpc_reports`)
- Click **Save**

### 4. Configure Environment Variables
Add these to your `.env` file:

```env
VITE_CLOUDINARY_CLOUD_NAME="your-cloud-name"
VITE_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
```

Replace:
- `your-cloud-name` with your Cloud name from step 2
- `your-upload-preset` with the preset name from step 3

### 5. Restart Development Server
```bash
npm run dev
```

## Features

### Image Upload
- Max size: 1MB per image
- Automatic compression before upload
- Multiple images supported
- Instant preview

### Voice Note Upload
- Max size: 1MB
- Format: WebM (browser-recorded audio)
- In-browser recording using MediaRecorder API

### Admin Visibility
- Real-time updates via Firestore
- Images display as thumbnails with click-to-view
- Audio playback directly in browser

## File Structure

```
abpc/src/
├── utils/
│   ├── cloudinaryUpload.js    # Cloudinary upload function
│   └── mediaHelpers.js         # Compression & validation
├── pages/
│   └── ReportsPage.jsx         # Reports UI with upload
└── hooks/
    └── useVoiceRecorder.js     # Voice recording hook
```

## Upload Flow

1. **Worker selects file** → Validates size (max 1MB)
2. **Image compression** → Reduces file size if needed
3. **Upload to Cloudinary** → Uses unsigned upload API
4. **Get secure URL** → Cloudinary returns `secure_url`
5. **Save to Firestore** → URL stored in `reports` collection
6. **Admin sees instantly** → Real-time updates via `onSnapshot`

## Troubleshooting

### "Cloudinary cloud_name not configured"
- Check your `.env` file has `VITE_CLOUDINARY_CLOUD_NAME`
- Restart dev server after adding env vars

### "Upload failed with status 400"
- Verify upload preset is set to **Unsigned** mode
- Check preset name matches exactly

### "File exceeds 1MB limit"
- Images are auto-compressed, but very large files may still exceed limit
- Try reducing image resolution before upload
- For voice notes, keep recordings under 2 minutes

### Images not showing for admin
- Check browser console for errors
- Verify Firestore rules allow read access
- Ensure real-time listener is active

## Security Notes

- Upload preset must be **unsigned** for client-side uploads
- Consider adding upload restrictions in Cloudinary settings:
  - Max file size
  - Allowed formats (image/*, audio/*)
  - Rate limiting
- URLs are public but unguessable (long random strings)
- Firestore rules control who can read/write report records

## Migration from Firebase Storage

This app previously used Firebase Storage. The migration:
- ✅ Removed Firebase Storage imports
- ✅ Replaced upload logic with Cloudinary
- ✅ Kept Firestore structure unchanged
- ✅ Kept UI unchanged
- ✅ Maintained real-time admin visibility

Old uploads in Firebase Storage remain accessible via their URLs stored in Firestore.
