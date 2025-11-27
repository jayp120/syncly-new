# Notification System - Complete Testing Guide

## 🎯 Quick Start (5-Minute Test)

This will verify your notification system is working correctly.

### **Test Credentials**
- **Manager:** manager.sales@mittaleod.com / manager123
- **Employee:** priya.mehta@mittaleod.com / employee123

---

## ✅ **Test 1: Basic Notification Flow (5 minutes)**

### **Step 1: Create a Meeting (as Manager)**

1. **Sign in:**
   - Email: `manager.sales@mittaleod.com`
   - Password: `manager123`

2. **Navigate to Meetings:**
   - Click "Meetings" in the navigation
   - Click "+ New Meeting" or "+ Schedule Meeting"

3. **Fill Meeting Form:**
   - **Title:** "Test Notification System"
   - **Date/Time:** Tomorrow at 10:00 AM
   - **Attendees:** Select Priya, Rohan (or any 2-3 employees)
   - **Agenda:** "Testing notifications"
   - ✅ **Check:** "Sync with Google Calendar"
   - Click **"Schedule Meeting"**

4. **Verify Meeting Created:**
   - ✅ Should see success message
   - ✅ Meeting appears in meetings list

5. **Sign Out:**
   - Click profile icon → Logout

---

### **Step 2: Check Notification (as Employee)**

1. **Sign in as Employee:**
   - Email: `priya.mehta@mittaleod.com`
   - Password: `employee123`

2. **Check Bell Icon (🔔 top-right):**
   - **Expected:** Red badge showing "1" (or more)
   - **Expected:** Bell icon is colored (not grayscale)

3. **Click Bell Icon:**
   - **Expected:** Dropdown opens with notifications
   - **Expected:** See notification:
     ```
     "Rajesh scheduled you for a meeting: 'Test Notification System' on [Date/Time]"
     ```

4. **Click the Notification:**
   - **Expected:** Navigates to meeting details page
   - **Expected:** Shows meeting info (title, time, attendees, agenda)
   - **Expected:** Notification is marked as read
   - **Expected:** Badge count decreases

---

### **✅ Success Criteria**

If all of the above worked, your notification system is **PRODUCTION READY**! 🎉

| Check | Status |
|-------|--------|
| Bell icon shows badge | ✅ |
| Notification appears in dropdown | ✅ |
| Message is correct and clear | ✅ |
| Clicking notification navigates correctly | ✅ |
| Notification marked as read | ✅ |

---

## 🔔 **Test 2: Desktop Notifications (3 minutes)**

### **Setup Browser Permissions**

1. **Allow Notifications:**
   - When prompted, click **"Allow"**
   - Or enable manually:
     - **Chrome/Edge:** Click 🔒 in address bar → Site settings → Notifications → Allow
     - **Firefox:** Click 🛡️ → Permissions → Notifications → Allow

### **Test Desktop Popup**

1. **Sign in as Employee** (priya.mehta@mittaleod.com)

2. **Minimize or Switch to Another Tab**
   - Keep Syncly tab open but in background

3. **Open Another Browser/Incognito Window:**
   - Sign in as Manager
   - Create another meeting with Priya as attendee

4. **Check for Desktop Notification:**
   - **Expected:** System notification popup appears
   - **Expected:** Shows "Syncly Notification" or "Syncly Reminder"
   - **Expected:** Shows meeting details
   - **Expected:** Click notification → opens Syncly tab

---

## 🔄 **Test 3: Real-Time Updates (3 minutes)**

This verifies notifications appear WITHOUT page refresh.

### **Setup**

1. **Open TWO browser windows side-by-side:**
   - **Window 1:** Sign in as Manager
   - **Window 2:** Sign in as Employee (Priya)

### **Test**

1. **In Window 2 (Employee):**
   - Note the current badge count
   - **DO NOT TOUCH THIS WINDOW**

2. **In Window 1 (Manager):**
   - Create a new meeting
   - Add Priya as attendee
   - Submit the form

3. **Watch Window 2 (Employee):**
   - **Expected:** Bell icon badge appears/updates (within 1-2 seconds)
   - **Expected:** Bell icon animates (bounce or pulse)
   - **Expected:** NO PAGE REFRESH needed

---

## 📋 **Test 4: Notification Management (2 minutes)**

### **Test Mark as Read**

1. **Click bell icon** (should have multiple notifications)

2. **Click checkmark icon** on ONE notification:
   - **Expected:** Notification style changes (dimmed/faded)
   - **Expected:** Badge count decreases by 1

3. **Click "Mark all as Read"** button:
   - **Expected:** All notifications marked as read
   - **Expected:** Badge disappears
   - **Expected:** Bell icon turns grayscale

4. **Reload the page:**
   - **Expected:** Notifications still marked as read
   - **Expected:** Badge still not showing

---

## 🧪 **Test 5: All Notification Types (10 minutes)**

Test different actions that trigger notifications:

| Action | Expected Notification | Test Steps |
|--------|----------------------|------------|
| **Meeting Created** | "Manager scheduled you for a meeting..." | Create meeting as manager |
| **Task Assigned** | "Manager assigned you a new task..." | Create task as manager, assign to employee |
| **EOD Submitted** | "Employee submitted EOD report" | Submit EOD as employee |
| **EOD Acknowledged** | "Manager acknowledged your EOD" | Acknowledge EOD as manager |
| **Task Comment** | "User commented on task" | Add comment to task |
| **Meeting Reminder (10 min)** | "Meeting starting in 10 minutes" | Wait for scheduled meeting |
| **Meeting Reminder (5 min)** | "Meeting starting in 5 minutes" | Wait for scheduled meeting |

### **Quick Test (Tasks)**

1. **Sign in as Manager**
2. **Navigate to Tasks → + New Task**
3. **Fill form:**
   - Title: "Test Task Notification"
   - Assignees: Select Priya
   - Priority: High
   - Due Date: Tomorrow
   - Submit

4. **Sign in as Priya**
5. **Check bell icon:**
   - **Expected:** New notification about task assignment

---

## 🐛 **Troubleshooting**

### **❌ Problem: No notifications appear**

**Check #1: Firestore Indexes**
```bash
# Run in terminal:
firebase firestore:indexes --project syncly-473404

# All indexes should show "ENABLED"
# If "Building", wait 2-5 minutes and check again
```

**Check #2: Browser Console**
1. Press **F12** → **Console** tab
2. Look for red errors
3. Check for:
   - ❌ "Missing index" → Indexes not deployed
   - ❌ "Permission denied" → User not signed in correctly
   - ❌ "tenantId undefined" → Multi-tenant context issue

**Check #3: Verify Firebase Console**
- Visit: https://console.firebase.google.com/project/syncly-473404/firestore/indexes
- All 20 indexes should show "Enabled" (green)

---

### **❌ Problem: Desktop notifications don't appear**

**Check #1: Browser Permission**
- **Chrome:** chrome://settings/content/notifications
- **Firefox:** about:preferences#privacy → Permissions → Notifications
- **Safari:** Preferences → Websites → Notifications
- Ensure Syncly is "Allowed"

**Check #2: System Settings**
- **Windows:** Settings → Notifications → Focus Assist (turn OFF)
- **Mac:** System Preferences → Notifications (ensure not "Do Not Disturb")

**Check #3: Browser Support**
- Desktop notifications require HTTPS (or localhost)
- Not supported in incognito mode (some browsers)
- iOS Safari: Limited support

---

### **❌ Problem: Notifications delayed**

**Possible Causes:**
1. **Slow internet connection** → Real-time listener lag
2. **Firestore index building** → Wait 2-5 minutes
3. **Browser tab inactive** → Some browsers throttle background tabs

**Solution:**
- Check network speed
- Wait a few seconds
- Refresh the page

---

## ✅ **Complete Testing Checklist**

Run all 5 tests before going to production:

- [ ] **Test 1: Basic Flow** (5 min) → Meeting notification works
- [ ] **Test 2: Desktop Notifications** (3 min) → Popup appears
- [ ] **Test 3: Real-Time Updates** (3 min) → No refresh needed
- [ ] **Test 4: Management** (2 min) → Mark as read works
- [ ] **Test 5: All Types** (10 min) → All notification types work

**Total Testing Time:** ~25 minutes

---

## 📊 **Test Results Template**

```
Date: _______________
Tester: _______________

✅ Test 1: Basic Notification Flow
   - Bell icon shows badge: [ ] YES / [ ] NO
   - Notification appears in dropdown: [ ] YES / [ ] NO
   - Clicking navigates correctly: [ ] YES / [ ] NO
   - Marked as read: [ ] YES / [ ] NO

✅ Test 2: Desktop Notifications
   - Desktop popup appeared: [ ] YES / [ ] NO
   - Click opened Syncly tab: [ ] YES / [ ] NO

✅ Test 3: Real-Time Updates
   - Updated without refresh: [ ] YES / [ ] NO
   - Bell animated on new notification: [ ] YES / [ ] NO

✅ Test 4: Notification Management
   - Mark as read works: [ ] YES / [ ] NO
   - Mark all works: [ ] YES / [ ] NO
   - Persists after reload: [ ] YES / [ ] NO

✅ Test 5: All Types
   - Meeting notifications: [ ] YES / [ ] NO
   - Task notifications: [ ] YES / [ ] NO
   - EOD notifications: [ ] YES / [ ] NO

Overall Result: [ ] ALL PASS / [ ] NEEDS FIXES

Issues Found:
______________________________________
______________________________________
______________________________________
```

---

## 🎯 **Production Sign-Off**

**Notification system is PRODUCTION READY if:**

✅ All 5 tests pass  
✅ No console errors  
✅ Desktop notifications work  
✅ Real-time delivery < 2 seconds  
✅ All notification types tested  

**Sign-Off:**
- Tested By: _______________
- Date: _______________
- Status: [ ] APPROVED FOR PRODUCTION

---

## 📞 **Support**

**If you encounter issues:**

- **Email:** support@syncly.one
- **Phone:** +91 92702 79703

**Documentation:**
- `NOTIFICATION_PRODUCTION_STATUS.md` - Production status report
- `FIRESTORE_INDEXES_DEPLOYMENT.md` - Index deployment guide
- `PRODUCTION_READINESS_CHECKLIST.md` - Complete checklist

---

**Created:** October 23, 2025  
**Project:** Syncly (syncly-473404)  
**Status:** Ready for Testing
