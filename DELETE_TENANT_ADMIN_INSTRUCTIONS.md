# 🗑️ Delete Existing Tenant Admin - Simple Instructions

## Quick Steps (2 Minutes)

### Step 1: Open Firebase Authentication
**Go to:** https://console.firebase.google.com/project/syncly-473404/authentication/users

### Step 2: Find Tenant Admin Users
Look for any users that are **NOT** `superadmin@syncly.com`

These are your tenant admin users that need to be deleted.

### Step 3: Delete Each Tenant Admin
For each tenant admin user:
1. Click the **3 dots** (⋮) on the right side of the user row
2. Click **"Delete account"**
3. Confirm deletion

### Step 4: Verify Deletion
After deleting from Firebase Auth, also check Firestore:

**Go to:** https://console.firebase.google.com/project/syncly-473404/firestore/data/users

Delete any user documents that are NOT the platform admin.

---

## After Deletion

Once you've deleted the old tenant admin:

1. ✅ **Refresh your Syncly app**
2. ✅ **Login as platform admin** (superadmin@syncly.com)
3. ✅ **Create a new tenant** from your dashboard
4. ✅ **The new tenant admin will have proper custom claims** automatically!

---

## Why This is Better

Creating a fresh tenant admin ensures:
- ✅ Proper Firebase Auth account from the start
- ✅ Custom claims set automatically
- ✅ No permission errors
- ✅ Clean setup with password

---

## Alternative: Use Platform Admin Dashboard

If you can login as platform admin now:

1. Go to your **Platform Admin Dashboard**
2. Find tenant admin user(s) in the users list
3. Click **Delete** button
4. Create new tenant admin with proper password

Your production-ready app is ready to create fresh users with zero errors! 🚀
