# Firebase Connection Guide

## ✅ Connection Status: FULLY CONNECTED

Your Firebase account is now fully configured and ready for deployments and updates.

---

## 📋 Current Configuration

### Project Details
- **Project Name:** SYNCLY
- **Project ID:** `syncly-473404`
- **Project Number:** `790117665889`
- **Firebase CLI Version:** 14.20.0

### Authentication
- ✅ Firebase Token configured (`FIREBASE_TOKEN`)
- ✅ Project selected and active
- ✅ CLI authenticated and ready

### Components Installed & Ready
- ✅ Firebase CLI tools
- ✅ Cloud Functions dependencies (Node.js)
- ✅ Functions built and compiled
- ✅ Firestore configuration
- ✅ Frontend Firebase SDK integrated

---

## 🚀 Making Changes in the Future

### 1. Updating Firestore Rules
To deploy changes to `firestore.rules`:

```bash
firebase deploy --only firestore:rules --token "$FIREBASE_TOKEN"
```

### 2. Updating Firestore Indexes
To deploy changes to `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes --token "$FIREBASE_TOKEN"
```

### 3. Deploying Cloud Functions
To deploy changes to `functions/src/index.ts`:

```bash
# Build and deploy functions
cd functions
npm run build
cd ..
firebase deploy --only functions --token "$FIREBASE_TOKEN"
```

### 4. Full Firebase Deployment
To deploy everything (rules, indexes, functions):

```bash
firebase deploy --token "$FIREBASE_TOKEN"
```

### 5. Deploy Specific Function
To deploy only one function:

```bash
firebase deploy --only functions:createTenant --token "$FIREBASE_TOKEN"
```

---

## 📁 Key Files

### Firebase Configuration
- `firebase.json` - Main Firebase configuration
- `.firebaserc` - Project aliases and settings
- `firestore.rules` - Security rules for Firestore
- `firestore.indexes.json` - Database indexes

### Cloud Functions
- `functions/src/index.ts` - Main functions file
- `functions/package.json` - Functions dependencies
- `functions/tsconfig.json` - TypeScript configuration

### Frontend Firebase
- `services/firebase.ts` - Firebase initialization
- `services/firestoreService.ts` - Firestore operations
- `vite.config.ts` - Environment variable injection

---

## 🔐 Environment Variables

Your Firebase secrets are configured in Replit Secrets:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
FIREBASE_TOKEN (for deployments)
```

These are automatically injected into your app via `vite.config.ts`.

---

## 🛠️ Common Operations

### View Current Rules
```bash
firebase firestore:rules:list --token "$FIREBASE_TOKEN"
```

### Test Functions Locally
```bash
cd functions
npm run serve
```

### View Functions Logs
```bash
firebase functions:log --token "$FIREBASE_TOKEN"
```

### View Deployed Functions
```bash
firebase functions:list --token "$FIREBASE_TOKEN"
```

---

## 📊 Your Current Firebase Services

### Active Collections (19 Total)
1. `tenants` - Multi-tenant organization data
2. `users` - User profiles and authentication
3. `roles` - Custom role definitions
4. `businessUnits` - Department/team structure
5. `reports` - EOD reports with versioning
6. `tasks` - Task management system
7. `taskComments` - Task discussions
8. `leaveRecords` - Leave tracking
9. `meetings` - Meeting scheduling
10. `meetingInstances` - Recurring meeting occurrences
11. `meetingUpdates` - Meeting discussions
12. `notifications` - Real-time notifications
13. `activityLogs` - Comprehensive audit trail
14. `triggerLogs` - Automated system events
15. `systemLogs` - Application monitoring
16. `securityEvents` - Security audit trail
17. `performanceMetrics` - Performance tracking
18. `tenantOperationsLog` - Platform admin operations
19. `userBadges` - Gamification badges

### Active Cloud Functions (6+)
1. `createTenant` - Tenant provisioning
2. `updateTenantStatus` - Status management
3. `updateTenantPlan` - Plan updates
4. `getTenantOperationsLog` - Audit logs
5. `getTenantUsers` - Secure user queries
6. `backfillTenantAdminInfo` - Migrations

---

## ⚠️ Important Notes

1. **Always test locally first** before deploying to production
2. **Use `--token "$FIREBASE_TOKEN"`** for all deployment commands in Replit
3. **Functions take 1-2 minutes** to deploy and become active
4. **Firestore rules deploy instantly** but may take a minute to propagate
5. **Backup important data** before major structural changes

---

## 🎯 Quick Reference

### Deploy Everything
```bash
firebase deploy --token "$FIREBASE_TOKEN"
```

### Deploy Only Rules
```bash
firebase deploy --only firestore:rules --token "$FIREBASE_TOKEN"
```

### Deploy Only Functions
```bash
cd functions && npm run build && cd .. && firebase deploy --only functions --token "$FIREBASE_TOKEN"
```

### Check Deployment Status
```bash
firebase projects:list --token "$FIREBASE_TOKEN"
```

---

## ✨ You're All Set!

Your Firebase connection is fully configured and ready. Any changes you make to:
- Firestore rules
- Firestore indexes  
- Cloud Functions
- Firebase hosting

Can now be deployed using the commands above. Happy building! 🚀
