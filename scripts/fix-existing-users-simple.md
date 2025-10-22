# 🔧 Fix Existing Users - Set Custom Claims

## The Problem
Your existing users (Platform Admin and Tenant Admin) were created before we implemented custom claims, so they can't login.

## The Solution
We need to set custom claims for each existing user using the `setUserCustomClaims` Cloud Function.

---

## Option 1: Use Firebase Console (EASIEST)

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/project/syncly-473404/functions
2. Find the function: `setUserCustomClaims`
3. Click on it

### Step 2: Test the Function
Click the "Test" tab and run these commands:

#### For Platform Admin (superadmin@syncly.com):
```json
{
  "userId": "PASTE_FIREBASE_UID_HERE",
  "tenantId": null,
  "isPlatformAdmin": true
}
```

**To get the Firebase UID:**
1. Go to Firebase Console → Authentication → Users
2. Find superadmin@syncly.com
3. Copy the UID column value

#### For Tenant Admin Users:
First, check what users you have in Firestore:
1. Go to Firebase Console → Firestore → users collection
2. For each non-platform admin user, call the function:

```json
{
  "userId": "FIRESTORE_DOCUMENT_ID",
  "tenantId": "THEIR_TENANT_ID",
  "isPlatformAdmin": false
}
```

### Step 3: Ask Users to Re-login
After setting claims, users must:
1. Logout completely (clear browser data if needed)
2. Login again
3. ✅ It will work now!

---

## Option 2: Use Firebase CLI

Run these commands from your terminal:

```bash
# For Platform Admin
firebase functions:call setUserCustomClaims \
  --data='{"userId":"PLATFORM_ADMIN_UID","isPlatformAdmin":true}' \
  --token="${FIREBASE_TOKEN}"

# For Tenant Admin
firebase functions:call setUserCustomClaims \
  --data='{"userId":"TENANT_ADMIN_UID","tenantId":"tenant_xyz","isPlatformAdmin":false}' \
  --token="${FIREBASE_TOKEN}"
```

---

## Option 3: Manual Check (What Users Exist?)

### Check Firebase Auth Users:
```bash
# This won't work without service account, so use Firebase Console instead
# Go to: https://console.firebase.google.com/project/syncly-473404/authentication/users
```

### Check Firestore Users:
```bash
# Go to: https://console.firebase.google.com/project/syncly-473404/firestore/data/users
```

Look for:
- `superadmin@syncly.com` (Platform Admin)
- Any users with `roleName: "Admin"` (Tenant Admins)

---

## After Setting Claims

Users MUST do this:
1. **Logout** from the app completely
2. **Clear browser cache** (optional but recommended)
3. **Login again** with their credentials
4. ✅ **Custom claims are now in their token!**

---

## Important Notes

⚠️ **If a user doesn't have a Firebase Auth account:**
- The Cloud Function will fail with "user not found"
- Solution: Recreate the user using the dashboard's "Add User" feature
- Make sure to include a password when creating

✅ **If claims are set successfully:**
- User can login immediately (after re-login)
- Activity logs will work
- Tenant isolation is enforced

---

## Quick Reference: What Each User Needs

| User Type | userId | tenantId | isPlatformAdmin |
|-----------|--------|----------|-----------------|
| Platform Admin | Their Firebase UID | `null` | `true` |
| Tenant Admin | Their Firebase UID | Their tenant ID | `false` |
| Manager | Their Firebase UID | Their tenant ID | `false` |
| Employee | Their Firebase UID | Their tenant ID | `false` |

---

## Troubleshooting

### "User not found" error
**Cause:** User doesn't have Firebase Auth account  
**Fix:** Recreate user from dashboard with password

### "Still can't login after setting claims"
**Cause:** Browser cached old token  
**Fix:** 
1. Logout
2. Clear browser cookies for your app
3. Login again

### "How do I know if claims are set?"
**Check in Firebase Console:**
1. Go to Authentication → Users
2. Click on the user
3. Look for "Custom claims" section
4. Should show: `{"tenantId":"...", "isPlatformAdmin":false}`
