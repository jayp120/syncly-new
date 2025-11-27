# Firestore Indexes Deployment Guide

## 📋 Overview

This document explains how to deploy Firestore composite indexes for Syncly. These indexes are **CRITICAL** for notifications and other features to work properly.

---

## ✅ Indexes Included

The `firestore.indexes.json` file includes **20 composite indexes** for:

### **Critical Indexes** (Must deploy first):
1. ✅ **Notifications** - For real-time in-app and desktop notifications
2. ✅ **Users** - For user queries with multi-tenant isolation
3. ✅ **Tasks** - For task assignment queries
4. ✅ **Meetings** - For meeting attendee queries

### **Performance Indexes**:
5. ✅ Reports (3 indexes)
6. ✅ Task Comments
7. ✅ Leave Records
8. ✅ Meeting Instances
9. ✅ Meeting Updates
10. ✅ User Badges
11. ✅ Activity Logs (2 indexes)
12. ✅ System Logs
13. ✅ Security Events
14. ✅ Performance Metrics
15. ✅ Trigger Logs

---

## 🚀 Deployment Methods

Choose **ONE** of these methods:

---

### **Method 1: Firebase Console (EASIEST)** ⭐

#### **Step 1: Wait for Auto-Generated Link**
1. Open your Syncly app in the browser
2. Sign in as any user
3. Open **Developer Console** (F12) → **Console** tab
4. Look for Firestore errors like:
   ```
   The query requires an index. You can create it here: 
   https://console.firebase.google.com/...
   ```
5. **Click the link** - Firebase will auto-create that specific index!

#### **Step 2: Create Remaining Indexes Manually**
Since the error link only creates ONE index at a time, you need to manually create the others:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **syncly-19**
3. Navigate to: **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. For the **Notifications** index:
   - **Collection ID:** `notifications`
   - **Fields:**
     - `tenantId` → Ascending
     - `userId` → Ascending
     - `timestamp` → Descending
   - **Query scope:** Collection
6. Click **Create**
7. Repeat for other critical indexes (see list above)

**⏱️ Index Build Time:** 2-10 minutes per index

---

### **Method 2: Firebase CLI (FASTEST)** 🚀

This deploys **ALL indexes at once**!

#### **Step 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

#### **Step 2: Login to Firebase**
```bash
firebase login
```

#### **Step 3: Initialize Firebase (if not already)**
```bash
firebase init firestore
```
- Select: **Use an existing project**
- Choose: **syncly-19**
- Firestore rules file: Press Enter (default)
- Firestore indexes file: **firestore.indexes.json** (this file!)

#### **Step 4: Deploy Indexes**
```bash
firebase deploy --only firestore:indexes
```

**Output:**
```
✔ Deploy complete!
Indexes are being created...
```

**⏱️ Index Build Time:** 5-15 minutes for all indexes

#### **Step 5: Check Status**
```bash
firebase firestore:indexes
```

---

### **Method 3: Manual Entry (SLOWEST)** ⚠️

If you can't use CLI, manually create each index in Firebase Console using the definitions in `firestore.indexes.json`.

---

## 🧪 Testing After Deployment

### **1. Check Index Status**

**Firebase Console:**
1. Go to **Firestore Database** → **Indexes**
2. Look for status:
   - 🟢 **Building...** - Wait 5-10 minutes
   - 🟢 **Enabled** - Ready to use! ✅
   - 🔴 **Error** - Check configuration

**Firebase CLI:**
```bash
firebase firestore:indexes
```

### **2. Test Notifications**

1. **Sign in as Manager**
2. Create a new meeting with 2-3 employee attendees
3. Click "Schedule Meeting"
4. **Sign in as Employee** (one of the attendees)
5. Check the **bell icon** - should show notification badge
6. Click bell - should display: "Manager scheduled you for a meeting..."

### **3. Check Browser Console**

1. Open **Developer Console** (F12)
2. Go to **Console** tab
3. Look for:
   - ✅ **NO Firestore index errors** - Good!
   - ❌ **"requires an index"** - Index not ready yet, wait 5 more minutes

---

## 🔧 Troubleshooting

### **Problem: "Index already exists" error**

**Solution:** This is fine! It means the index was created before. Skip it.

### **Problem: Index stuck in "Building" status**

**Solution:** 
- Wait 15 minutes
- Check your Firebase billing plan (free tier has limits)
- For large databases, indexing takes longer

### **Problem: CLI deployment fails**

**Solution:**
```bash
# Ensure you're in the project root directory
cd /path/to/syncly

# Re-authenticate
firebase login --reauth

# Try again
firebase deploy --only firestore:indexes
```

### **Problem: Notifications still not showing**

**Checklist:**
1. ✅ Index status is "Enabled" (not "Building")
2. ✅ Browser notifications permission granted
3. ✅ Clear browser cache and refresh
4. ✅ Check browser console for errors

---

## 📊 Index Deployment Checklist

Use this to track your progress:

```
Priority 1 - Critical Indexes:
[ ] notifications (tenantId, userId, timestamp)
[ ] users (tenantId, isDeleted, createdAt)
[ ] tasks (tenantId, assignedTo)
[ ] meetings (tenantId, attendeeIds)

Priority 2 - Performance Indexes:
[ ] reports (tenantId, date) - 2 variants
[ ] reports (tenantId, employeeId, date)
[ ] taskComments (tenantId, taskId, createdOn)
[ ] leaveRecords (tenantId, employeeId)
[ ] meetingInstances (tenantId, seriesId)
[ ] meetingUpdates (tenantId, meetingId, createdOn)
[ ] userBadges (tenantId, userId)
[ ] activityLogs (tenantId, timestamp)
[ ] activityLogs (tenantId, actorId, timestamp)
[ ] triggerLogs (tenantId, timestamp)
[ ] systemLogs (tenantId, timestamp)
[ ] securityEvents (tenantId, timestamp)
[ ] performanceMetrics (tenantId, timestamp)
[ ] users (tenantId, roleName)
[ ] users (tenantId, createdAt)
```

---

## 🎯 Next Steps

After deploying indexes:

1. ✅ Wait for all indexes to show "Enabled" status
2. ✅ Test notifications (see Testing section above)
3. ✅ Test all major features (tasks, meetings, reports)
4. ✅ Monitor browser console for any remaining index errors

---

## 📞 Need Help?

If you encounter issues:

1. Check Firebase Console → **Firestore** → **Indexes** for error messages
2. Look in browser console for specific error details
3. Verify your Firebase project ID is correct: **syncly-19**
4. Ensure you have **Editor** or **Owner** role in Firebase project

---

**Created:** October 23, 2025  
**Project:** Syncly (syncly-19)  
**Contact:** support@syncly.one
