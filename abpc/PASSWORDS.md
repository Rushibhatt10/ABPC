# 🔐 Login Passwords

## Password-Only Authentication

Each user has a unique password. No username or name required.

---

## 👨‍💼 Admin Passwords

| User | Password | Dashboard |
|------|----------|-----------|
| Ankit Bhatt | `ankit123` | Admin Dashboard |
| Akanksha Bhatt | `akanksha123` | Admin Dashboard |

**Admin Access:**
- Full system access
- View all reports
- Export Excel
- Print reports
- Manage customers, jobs, invoices
- View analytics

---

## 👷 Worker Passwords

| User | Password | Dashboard |
|------|----------|-----------|
| Nakul | `nakul123` | Worker Dashboard |
| Divyesh | `divyesh123` | Worker Dashboard |
| Sagar | `sagar123` | Worker Dashboard |

**Worker Access:**
- View assigned jobs only
- Update job checklists
- Submit reports with media
- Upload images and voice notes
- Limited to own work

---

## 🔒 Security Notes

1. **Passwords are stored locally** in the code (`src/pages/LoginPage.jsx`)
2. **To change passwords**, edit the `PASSWORD_MAP` object:
   ```javascript
   const PASSWORD_MAP = {
     "ankit123": { key: "ankit", name: "Ankit Bhatt", role: "admin" },
     // Change "ankit123" to your desired password
   };
   ```
3. **Each password maps to a specific user** and dashboard
4. **Invalid password** shows: "Invalid password. Please try again."

---

## 📝 How to Login

1. Open the app
2. Enter your password in the password field
3. Click "Sign In"
4. System automatically:
   - Identifies who you are
   - Loads your dashboard
   - Applies your permissions

---

## 🔄 Changing Passwords

To change a password:

1. Open `src/pages/LoginPage.jsx`
2. Find the `PASSWORD_MAP` object
3. Change the password (key) while keeping the user data (value)
4. Save and rebuild the app

Example:
```javascript
// Before
"ankit123": { key: "ankit", name: "Ankit Bhatt", role: "admin" },

// After (new password: "newpass456")
"newpass456": { key: "ankit", name: "Ankit Bhatt", role: "admin" },
```

---

## ➕ Adding New Users

To add a new user:

1. Open `src/pages/LoginPage.jsx`
2. Add a new entry to `PASSWORD_MAP`:
   ```javascript
   "newuser123": { 
     key: "newuser", 
     name: "New User Name", 
     role: "worker" // or "admin"
   },
   ```
3. Update `src/constants/authProfiles.js` with the new user profile
4. Save and rebuild

---

## ⚠️ Important

- **Keep this file secure** - it contains all passwords
- **Don't commit passwords to public repositories**
- **Change default passwords** before production deployment
- **Use strong passwords** for production

---

## 🎯 Quick Reference

**Admin Login:**
- Password: `ankit123` or `akanksha123`
- Access: Full system

**Worker Login:**
- Password: `nakul123`, `divyesh123`, or `sagar123`
- Access: Limited to assigned jobs

---

## 📞 Support

If you forget your password or need to reset it, contact the system administrator.
