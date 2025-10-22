# 🔧 Fix Login Issue - User Document ID Mismatch

## Problem Identified ✅

Your Firestore user document ID doesn't match the Firebase Auth UID.

**Current Setup (Wrong):**
- Firestore Document ID: `user_1760374936525_pjnami5ma`
- Firebase Auth UID (in 'id' field): `ZaM3MLq6yWXVxnXmLhEI58Pox5f2`

**What Should Be:**
- Firestore Document ID: `ZaM3MLq6yWXVxnXmLhEI58Pox5f2` (same as Firebase Auth UID)

---

## Solution: Create Correct User Document

### Step 1: Find Your Firebase Auth UID

1. Go to: https://console.firebase.google.com/project/syncly-473404/authentication/users
2. Find the user: `admin@syncly.com`
3. Copy the **UID** (looks like: `ZaM3MLq6yWXVxnXmLhEI58Pox5f2`)

### Step 2: Create New Firestore Document with Correct ID

1. Go to: https://console.firebase.google.com/project/syncly-473404/firestore/data/users

2. Click **"Add document"**

3. **Document ID:** Paste the Firebase Auth UID (e.g., `ZaM3MLq6yWXVxnXmLhEI58Pox5f2`)

4. **Add these fields:**

| Field | Type | Value |
|-------|------|-------|
| id | string | (same as document ID) |
| tenantId | string | `tenant_syncly_001` |
| firebaseUid | string | (same as document ID) |
| email | string | `admin@syncly.com` |
| name | string | `Raj Chauhan` |
| roleName | string | `Admin` |
| roleId | string | `role_admin_001` |
| businessUnit | string | `General` |
| businessUnitId | string | `bu_general_001` |
| status | string | `Active` |
| notificationEmail | string | `admin@syncly.com` |
| createdAt | number | `1760436000000` |
| loginCount | number | `0` |

5. Click **"Save"**

6. **Delete the old document** (`user_1760374936525_pjnami5ma`)

### Step 3: Login

1. Go to: http://localhost:5000
2. Email: `admin@syncly.com`
3. Password: (whatever you set in Firebase Auth)
4. Click Login
5. ✅ **Success!**

---

## Why This Matters

The authentication flow works like this:

1. User enters email/password → Firebase Auth validates
2. Firebase Auth returns **UID** (e.g., `ZaM3MLq6yWXVxnXmLhEI58Pox5f2`)
3. App looks for Firestore document at: `users/{UID}`
4. If document exists → Login successful
5. If document NOT found → Login fails

**Your Issue:** Document was at `users/user_1760374936525_pjnami5ma` instead of `users/ZaM3MLq6yWXVxnXmLhEI58Pox5f2`

---

## Alternative: Use Super Admin Panel (Easier!)

Instead of manually creating users, use the built-in Super Admin panel:

### Step 1: Create First Super Admin Manually

1. **Firebase Auth:**
   - Email: `superadmin@syncly.com`
   - Password: `Admin@123`

2. **Firestore Document ID:** (Use Firebase Auth UID)
   ```
   Document ID: <Firebase_Auth_UID>
   Fields:
   - id: <same as document ID>
   - email: superadmin@syncly.com
   - name: Super Admin
   - roleName: Super Admin
   - status: Active
   - (add other fields as shown above)
   ```

### Step 2: Login as Super Admin

1. Login at: http://localhost:5000
2. Go to: `/super-admin`
3. Use the "Create New Tenant" button
4. This will automatically create users with correct structure!

---

## Quick Reference: Correct Document Structure

```javascript
// Firestore Document
Collection: users
Document ID: <Firebase_Auth_UID>  ← MUST match Firebase Auth UID!

// Fields:
{
  id: "<Firebase_Auth_UID>",         // Same as document ID
  tenantId: "tenant_xxx",            // Your company/tenant ID
  firebaseUid: "<Firebase_Auth_UID>", // Same as document ID
  email: "user@example.com",
  name: "User Name",
  roleName: "Admin", // or "Manager", "Employee"
  roleId: "role_xxx",
  businessUnit: "General",
  businessUnitId: "bu_xxx",
  status: "Active",
  notificationEmail: "user@example.com",
  createdAt: 1760436000000,
  loginCount: 0
}
```

---

## Checklist ✅

Before login works, make sure:

- [ ] User exists in **Firebase Authentication**
- [ ] User profile exists in **Firestore** → `users` collection
- [ ] Firestore **document ID = Firebase Auth UID** (CRITICAL!)
- [ ] Document has `firebaseUid` field = Firebase Auth UID
- [ ] Document has `status: "Active"`
- [ ] Document has `tenantId` field
- [ ] Document has valid `roleId` and `roleName`

---

## Still Not Working?

1. **Check browser console (F12)** for errors
2. **Try these credentials** (if you create them correctly):
   - Email: `admin@syncly.com`
   - Password: (your Firebase Auth password)

3. **Verify in Firebase Console:**
   - Auth user exists: https://console.firebase.google.com/project/syncly-473404/authentication/users
   - Firestore doc exists with Auth UID: https://console.firebase.google.com/project/syncly-473404/firestore/data/users

---

## Need Help?

Let me know and I can:
- Create an automated script to fix document IDs
- Set up your first admin user properly
- Debug any login errors
