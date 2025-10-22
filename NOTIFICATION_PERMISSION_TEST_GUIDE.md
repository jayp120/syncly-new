# Desktop Notification Permission Test Guide

**Last Updated:** October 21, 2025  
**Purpose:** Verify desktop notifications are working correctly after adding `isCrucial: true` flags

---

## 🔍 Step 1: Check Browser Notification Permission

### Option A: Using Browser DevTools Console

1. Open your browser DevTools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Type this command and press Enter:

```javascript
console.log('Notification permission:', Notification.permission);
```

**Expected Results:**
- ✅ **"granted"** - Desktop notifications WILL work
- ❌ **"denied"** - Desktop notifications BLOCKED (need to reset in browser settings)
- ⚠️ **"default"** - Permission not requested yet (should auto-request on login)

### Option B: Check Browser Settings

**Chrome/Edge:**
1. Click the lock icon 🔒 in the address bar
2. Look for "Notifications" permission
3. Should show: "Allow" ✅

**Firefox:**
1. Click the lock icon 🔒 in the address bar
2. Click "Connection secure" → "More information"
3. Go to "Permissions" tab
4. Check "Receive Notifications" - should be "Allowed" ✅

---

## 🧪 Step 2: Test Desktop Notifications

### Test A: Manual Browser Notification Test

**In Browser Console:**
```javascript
new Notification('🔔 Test Notification', {
  body: 'If you see this, desktop notifications are working!',
  icon: '/logo.png',
  requireInteraction: true
});
```

**Expected:** You should see a desktop notification popup appear on your screen.

### Test B: Task Assignment Test (REAL TEST)

**Setup:**
- Tab 1: Login as **Manager**
- Tab 2: Login as **Employee** (same browser, different tab/window)

**Steps:**
1. In **Employee tab**: Keep the tab INACTIVE (switch to another tab or minimize)
2. In **Manager tab**: 
   - Go to "Team Tasks" or "Task Management"
   - Create a new task
   - Assign it to the Employee
   - Click "Create Task"
3. **Expected Result:** Desktop notification should popup immediately:
   - Title: "🔔 New Notification"
   - Body: "[Manager Name] assigned you a new task: [Task Title]"

**If notification doesn't appear:**
- Check browser console for errors
- Verify permission is "granted" (Step 1)
- Check if Employee tab has the bell icon updated (in-app notification should still work)

### Test C: EOD Report Submission Test

**Setup:**
- Tab 1: Login as **Manager**
- Tab 2: Login as **Employee**

**Steps:**
1. In **Manager tab**: Keep the tab INACTIVE
2. In **Employee tab**: Submit an EOD report
3. **Expected Result:** Manager should get desktop notification:
   - "[Employee Name] submitted a new report."

---

## 🔔 All Notification Types That Should Trigger Desktop Push

### For Employees (14 types):
1. ✅ Task assigned to you
2. ✅ Task reassigned to you
3. ✅ Task due date changed
4. ✅ Task due tomorrow (7 AM reminder)
5. ✅ Task due today (9 AM reminder)
6. ✅ Task overdue alert
7. ✅ EOD reminder (6:45 PM daily)
8. ✅ Missed EOD nudge (7:30 PM)
9. ✅ Manager commented on your report
10. ✅ Meeting starting soon (5/10 min before)
11. ✅ Meeting cancelled
12. ✅ Mentioned in task comment
13. ✅ Task blocked status change
14. ✅ Admin updated your profile

### For Managers (6 types):
1. ✅ Employee submitted EOD report
2. ✅ Task due tomorrow for team
3. ✅ Task due today for team
4. ✅ Task overdue for team
5. ✅ Meeting starting soon
6. ✅ Meeting cancelled

---

## 🐛 Troubleshooting

### Problem: Permission is "denied"

**Solution:**
1. **Chrome/Edge:**
   - Go to: `chrome://settings/content/notifications`
   - Find your site URL
   - Change to "Allow"
   - Refresh the page

2. **Firefox:**
   - Go to: `about:preferences#privacy`
   - Scroll to "Permissions" → "Notifications" → "Settings"
   - Find your site, change to "Allow"
   - Refresh the page

### Problem: Permission is "default" (not requested)

**Solution:**
1. Clear localStorage to reset permission tracking:
   ```javascript
   localStorage.removeItem('notification_permission_requested');
   ```
2. Refresh the page
3. Login again - permission should be requested

### Problem: Notification appears but doesn't show on desktop

**Possible Causes:**
1. **Browser is in focus:** Some browsers only show desktop notifications when the tab is inactive/minimized
2. **System notifications disabled:** Check your OS notification settings
   - **Windows:** Settings → System → Notifications → Check browser is enabled
   - **Mac:** System Preferences → Notifications → Check browser is enabled
3. **Do Not Disturb mode:** Check if DND/Focus mode is enabled on your OS

### Problem: Bell icon updates but no desktop notification

**Check:**
1. Verify `isCrucial: true` is in the notification:
   ```javascript
   // In browser console, check recent notifications
   const user = /* your current user */;
   // Check Firestore notifications collection
   ```
2. Check `useRealTimeNotifications.ts` hook is running:
   ```javascript
   console.log('Notification.permission:', Notification.permission);
   ```

---

## ✅ Success Criteria

Desktop notifications are working correctly when:
1. ✅ Browser permission is "granted"
2. ✅ Task assignments trigger desktop popup
3. ✅ EOD submissions trigger desktop popup for managers
4. ✅ Bell icon ALSO updates (dual channel notification)
5. ✅ Clicking notification navigates to correct page
6. ✅ Notifications show when app is in background/minimized

---

## 📊 Expected Notification Flow

```
User Action → Notification Created → Firestore Write
                                           ↓
                                  Real-time Listener (useRealTimeNotifications)
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                       ↓
                Bell Icon Update                    Desktop Push Notification
                (Always works)                      (Only if isCrucial: true)
                                                    (Only if permission granted)
                                                    (Only if app in background)
```

---

## 🔧 Developer Testing Commands

### Check notification permission:
```javascript
console.log(Notification.permission);
```

### Request permission manually:
```javascript
Notification.requestPermission().then(p => console.log('Permission:', p));
```

### Check if notifications are supported:
```javascript
console.log('Notifications supported:', 'Notification' in window);
```

### Clear permission tracking:
```javascript
localStorage.removeItem('notification_permission_requested');
```

### Test notification manually:
```javascript
if (Notification.permission === 'granted') {
  new Notification('Test', {
    body: 'Desktop notifications are working!',
    icon: '/logo.png',
    requireInteraction: true
  });
} else {
  console.log('Permission not granted:', Notification.permission);
}
```

---

## 📝 Testing Checklist

- [ ] Browser notification permission is "granted"
- [ ] Task assignment creates desktop notification
- [ ] EOD submission creates desktop notification for manager
- [ ] Bell icon updates simultaneously
- [ ] Notification appears when app is in background
- [ ] Clicking notification navigates to correct page
- [ ] Multiple notifications don't spam (deduplication works)
- [ ] Notifications work in Chrome/Edge
- [ ] Notifications work in Firefox
- [ ] System notification settings allow browser notifications

---

**Status:** Ready for comprehensive testing after adding `isCrucial: true` to 14 notification types.
