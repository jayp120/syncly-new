# Notification System Test Plan

## ✅ Prerequisites - COMPLETED

- [x] Firestore indexes deployed successfully
- [x] All 20 composite indexes active
- [x] Frontend workflow restarted

---

## 🧪 Test 1: Meeting Notification (In-App Bell Icon)

### **Objective:** Verify employees receive in-app notifications when scheduled for meetings

### **Steps:**

1. **Sign in as Manager**
   - Email: `manager.sales@mittaleod.com`
   - Password: `manager123`

2. **Create a New Meeting**
   - Navigate to "Meetings" section
   - Click "+ New Meeting" or "+ Schedule Meeting"
   - Fill in details:
     - **Title:** "Test Notification System"
     - **Date/Time:** Tomorrow at 10:00 AM
     - **Attendees:** Select 2-3 employees (e.g., Priya, Rohan, Neha)
     - **Agenda:** "Testing if notifications work correctly"
     - ✅ **Check:** "Sync with Google Calendar"
   - Click **"Schedule Meeting"**

3. **Sign Out**
   - Click profile icon → Logout

4. **Sign in as Employee** (one of the selected attendees)
   - Email: `priya.mehta@mittaleod.com`
   - Password: `employee123`

5. **Check Bell Icon** (🔔 top-right corner)
   - **Expected:** Red badge showing "1" notification
   - **Expected:** Bell icon is colored (not grayscale)
   - Click the bell icon

6. **Verify Notification Content**
   - **Expected Message:** "Rajesh scheduled you for a meeting: 'Test Notification System' on [Date/Time]"
   - **Expected:** Notification is marked as "crucial" (has different styling)
   - Click the notification

7. **Verify Navigation**
   - **Expected:** Opens the meeting details page
   - **Expected:** Shows meeting title, agenda, attendees

### **✅ Pass Criteria:**
- [ ] Bell icon shows badge with count
- [ ] Notification appears in dropdown
- [ ] Notification message is correct
- [ ] Clicking notification navigates to meeting
- [ ] Notification can be marked as read

---

## 🧪 Test 2: Desktop/Push Notification

### **Objective:** Verify desktop notifications appear outside the app

### **Steps:**

1. **Enable Browser Notifications** (if not already)
   - When prompted by the browser, click **"Allow"**
   - Or manually enable:
     - **Chrome/Edge:** Click 🔒 in address bar → Site settings → Notifications → Allow
     - **Firefox:** Click 🛡️ → Permissions → Notifications → Allow

2. **Keep Syncly tab in BACKGROUND** (minimize or switch to another tab)

3. **Create Another Meeting** (as Manager from another browser/incognito)
   - OR ask a colleague to create a meeting with you as attendee

4. **Check for Desktop Notification**
   - **Expected:** System notification popup appears
   - **Expected:** Shows "Syncly Notification" title
   - **Expected:** Shows meeting details in body
   - **Expected:** Click notification → opens Syncly tab

### **✅ Pass Criteria:**
- [ ] Desktop notification popup appears
- [ ] Notification shows correct message
- [ ] Clicking notification opens Syncly
- [ ] Badge on browser tab shows unread count

---

## 🧪 Test 3: Notification Types Coverage

### **Test Different Notification Types:**

| Action | Expected Notification | Assigned To |
|--------|----------------------|-------------|
| Create meeting | "Manager scheduled you for a meeting" | Attendees |
| Assign task | "Manager assigned you a new task" | Assignees |
| Comment on task | "User commented on task" | Task assignees |
| Acknowledge EOD | "Manager acknowledged your EOD report" | Report submitter |
| Submit EOD | "Employee submitted EOD report" | Manager |
| Meeting reminder (10 min) | "Meeting starting in 10 mins" | All attendees |
| Meeting reminder (5 min) | "Meeting starting in 5 mins" | All attendees |

### **Steps:**
1. Perform each action as appropriate user
2. Check bell icon for notification
3. Verify message content

### **✅ Pass Criteria:**
- [ ] All notification types appear correctly
- [ ] Timing is accurate (for reminders)
- [ ] Messages are clear and actionable

---

## 🧪 Test 4: Real-Time Updates

### **Objective:** Verify notifications appear instantly without page refresh

### **Steps:**

1. **Open Syncly in two browser windows/tabs:**
   - **Tab 1:** Signed in as Manager
   - **Tab 2:** Signed in as Employee

2. **In Tab 1 (Manager):**
   - Create a new meeting with the employee as attendee

3. **In Tab 2 (Employee):**
   - **DO NOT REFRESH** the page
   - **Watch the bell icon**

4. **Expected Behavior:**
   - **Within 1-2 seconds:** Bell icon badge appears/updates
   - Bell icon animates (bounce or pulse)
   - Notification count increases

### **✅ Pass Criteria:**
- [ ] Notification appears without page refresh
- [ ] Bell icon animates when new notification arrives
- [ ] Notification count updates in real-time

---

## 🧪 Test 5: Notification Actions

### **Objective:** Test notification management features

### **Steps:**

1. **Generate Multiple Notifications** (create 3-4 meetings/tasks)

2. **Open Notification Dropdown**

3. **Test Actions:**
   - **Mark Single as Read:** Click checkmark icon on one notification
     - **Expected:** Notification styling changes (becomes dimmed)
     - **Expected:** Badge count decreases
   
   - **Mark All as Read:** Click "Mark all as Read" button
     - **Expected:** All notifications marked as read
     - **Expected:** Badge disappears
   
   - **Clear Read Notifications:** (if available)
     - **Expected:** Read notifications removed from list

4. **Reload Page**
   - **Expected:** Read notifications stay read
   - **Expected:** Unread notifications still visible

### **✅ Pass Criteria:**
- [ ] Can mark individual notifications as read
- [ ] Can mark all notifications as read
- [ ] Badge count updates correctly
- [ ] Read state persists across page reloads

---

## 🐛 Troubleshooting

### **Problem: No notifications appear**

**Check:**
1. **Firestore indexes built?**
   - Go to: https://console.firebase.google.com/project/syncly-473404/firestore/indexes
   - Verify all indexes show "Enabled" (not "Building")

2. **Browser console errors?**
   - Press F12 → Console tab
   - Look for Firestore or notification errors

3. **User signed in correctly?**
   - Verify you're signed in as the expected user
   - Check top-right corner for user name

### **Problem: Desktop notifications don't appear**

**Check:**
1. **Browser permission granted?**
   - Chrome: chrome://settings/content/notifications
   - Check if Syncly site is allowed

2. **System notifications enabled?**
   - Windows: Settings → Notifications
   - Mac: System Preferences → Notifications

3. **Focus Assist / Do Not Disturb disabled?**
   - Windows: Check taskbar for Focus Assist icon
   - Mac: Check for Do Not Disturb mode

### **Problem: Notifications delayed**

**Check:**
1. **Internet connection stable?**
2. **Firestore real-time listener connected?**
   - Check browser console for connection errors

---

## 📊 Test Results Template

```
Date: [Insert Date]
Tester: [Your Name]

Test 1: Meeting Notification (Bell Icon)
Status: [ ] PASS / [ ] FAIL
Notes: ________________________________

Test 2: Desktop Notification
Status: [ ] PASS / [ ] FAIL
Notes: ________________________________

Test 3: Notification Types
Status: [ ] PASS / [ ] FAIL
Notes: ________________________________

Test 4: Real-Time Updates
Status: [ ] PASS / [ ] FAIL
Notes: ________________________________

Test 5: Notification Actions
Status: [ ] PASS / [ ] FAIL
Notes: ________________________________

Overall Result: [ ] ALL PASS / [ ] NEEDS FIXES
```

---

## ✅ Success Criteria

**Notifications system is working if:**
- ✅ Bell icon shows badge for unread notifications
- ✅ Notifications appear in real-time without refresh
- ✅ Desktop notifications work (when tab is in background)
- ✅ Clicking notifications navigates to correct page
- ✅ All notification types work (meeting, task, EOD, etc.)
- ✅ Mark as read functionality works
- ✅ No console errors related to Firestore indexes

---

**Created:** October 23, 2025  
**Last Updated:** October 23, 2025  
**Project:** Syncly  
**Firebase Project:** syncly-473404
