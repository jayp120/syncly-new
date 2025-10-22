# 🧹 Delete Orphaned Users - Step-by-Step Guide

## ⚠️ CLI Method Not Available
The Firebase CLI doesn't support user deletion via command line in this environment. 
**Solution**: Use Firebase Console (web interface) - takes 30 seconds!

---

## ✅ How to Delete via Firebase Console (EASIEST)

### Step 1: Open Firebase Authentication
Click this link: 
**https://console.firebase.google.com/project/syncly-473404/authentication/users**

### Step 2: Delete First Orphaned User (rushi@syncly.com)
1. In the search box at the top, type: `rushi@syncly.com`
2. Click on the user row to select it
3. Click the **3-dot menu (⋮)** on the right
4. Select **"Delete account"**
5. Confirm deletion

### Step 3: Delete Second Orphaned User (jay@syncly.com)
1. In the search box, type: `jay@syncly.com`
2. Click on the user row to select it
3. Click the **3-dot menu (⋮)** on the right
4. Select **"Delete account"**
5. Confirm deletion

### Step 4: Verify Deletion
1. Refresh the authentication users page
2. Search for `rushi@syncly.com` - should show "No users found"
3. Search for `jay@syncly.com` - should show "No users found"

---

## ✅ After Deletion

You can now:
1. Create users with emails `rushi@syncly.com` and `jay@syncly.com` again
2. The full flow will work (Auth + Firestore)
3. Users will appear in your app immediately (cache fix applied)

---

## 🎯 Quick Summary

**Orphaned Users to Delete**:
- ✅ rushi@syncly.com (UID: E3HO408qkDO6KuPfJBhvDN44vJT2)
- ✅ jay@syncly.com (UID: Y6N6MnfpRKZWHMqBpEa9Litl3N53)

**Time Required**: 30 seconds
**Method**: Firebase Console (web UI)
**Link**: https://console.firebase.google.com/project/syncly-473404/authentication/users

---

## 📸 Visual Guide

When you open the link, you'll see:
```
┌─────────────────────────────────────────────────┐
│ Authentication > Users                          │
│                                                 │
│ [Search users...               ]  [+ Add user]  │
│                                                 │
│ Email                    │ UID          │ ⋮     │
│ rushi@syncly.com        │ E3HO...      │ ⋮  ← Click this
│ jay@syncly.com          │ Y6N6...      │ ⋮  ← Click this
└─────────────────────────────────────────────────┘
```

Click the ⋮ menu → Delete account → Confirm

Done! ✅
