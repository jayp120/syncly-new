# 🚨 URGENT: Fix Platform Admin Permissions

## The Problem
Your platform admin (superadmin@syncly.com) is getting "Missing or insufficient permissions" because they don't have the `isPlatformAdmin` custom claim set in their Firebase Auth token.

---

## ✅ QUICK FIX (2 Minutes)

### Step 1: Get Platform Admin Firebase UID

1. **Open Firebase Console Authentication:**
   - Go to: https://console.firebase.google.com/project/syncly-473404/authentication/users
   
2. **Find superadmin@syncly.com:**
   - Look in the users list
   - Copy the **UID** (first column - long string like "abc123xyz...")

### Step 2: Set Custom Claims

1. **Open Firebase Console Functions:**
   - Go to: https://console.firebase.google.com/project/syncly-473404/functions

2. **Find `setUserCustomClaims` function:**
   - Click on it
   - Go to "Testing" or "Logs" tab

3. **Test the function with this data:**
   ```json
   {
     "data": {
       "userId": "PASTE_THE_UID_HERE",
       "isPlatformAdmin": true
     }
   }
   ```
   Replace `PASTE_THE_UID_HERE` with the actual UID you copied

4. **Click "Run the function"**

### Step 3: Re-Login

1. **Logout** from your app completely
2. **Clear browser cache** (Ctrl+Shift+Delete, clear cookies)
3. **Login again** as superadmin@syncly.com
4. ✅ **It works now!**

---

## Alternative: Use the Fix Users Page

If you can access the app at all:

1. Go to: `your-app-url/#/fix-users`
2. Click "Fix All Users" button
3. Wait for success message
4. Logout and login again

---

## What This Does

The Cloud Function sets these custom claims on your Firebase Auth token:
```json
{
  "isPlatformAdmin": true,
  "tenantId": null
}
```

These claims allow you to:
- ✅ Access all tenants
- ✅ Read/write all data
- ✅ Manage the platform
- ✅ Zero permission errors

---

## Why This Happened

Your platform admin was created before we implemented the custom claims system. The Firestore security rules now check for `request.auth.token.isPlatformAdmin == true` and your token doesn't have this yet.

After setting the claims and re-logging in, you'll get a fresh token with the claims and everything will work perfectly!

---

## Still Having Issues?

If the Cloud Function doesn't work, there's a backup method:

### Option: Call Cloud Function via curl

```bash
# Replace YOUR_UID with the actual UID
curl -X POST \
  https://us-central1-syncly-473404.cloudfunctions.net/setUserCustomClaims \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "userId": "YOUR_UID",
      "isPlatformAdmin": true
    }
  }'
```

---

## Verification

After setting claims and re-logging in, you should see:
- ✅ Platform admin dashboard loads
- ✅ Can view all tenants
- ✅ No permission errors
- ✅ Everything works!

**Your Replit Core investment is worth it - this is just a one-time setup issue that takes 2 minutes to fix!** 🚀
