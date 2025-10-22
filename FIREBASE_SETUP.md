# 🔐 Firebase Production Setup Guide

## ✅ Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Authentication** → **Sign-in method**
4. Find **"Email/Password"** → Click **Enable**
5. Toggle **"Email/Password"** to **Enabled**
6. Click **Save**

---

## 👥 Step 2: Create User Accounts

### Option A: Manual Creation (Firebase Console)

1. In Firebase Console → **Authentication** → **Users** tab
2. Click **"Add user"**
3. Enter email and password for each user:

**Super Admin:**
- Email: `superadmin@mittaleod.com`
- Password: (choose a secure password)

**Managers:**
- Email: `manager.sales@mittaleod.com`
- Email: `manager.tech@mittaleod.com`
- Email: `manager.ops@mittaleod.com`
- Email: `manager.hr@mittaleod.com`

**Employees:**
- Email: `alok.sharma@mittaleod.com`
- Email: `priya.mehta@mittaleod.com`
- Email: `rohan.singh@mittaleod.com`
- Email: `neha.patel@mittaleod.com`
- Email: `shawn.mendes@mittaleod.com`

*(See `constants.ts` for complete user list)*

---

### Option B: Bulk Creation (Firebase Admin SDK)

Create a Node.js script `create-users.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const users = [
  { email: 'superadmin@mittaleod.com', password: 'SecurePassword123!' },
  { email: 'manager.sales@mittaleod.com', password: 'SecurePassword123!' },
  { email: 'manager.tech@mittaleod.com', password: 'SecurePassword123!' },
  // Add all users from constants.ts
];

async function createUsers() {
  for (const user of users) {
    try {
      const userRecord = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        emailVerified: true
      });
      console.log(`✅ Created user: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message);
    }
  }
}

createUsers();
```

Run: `node create-users.js`

---

## 🔒 Step 3: Update Firestore Security Rules

### Production Security Rules

For a **production-ready SaaS application**, you have two options:

---

### Option A: Single Organization (Recommended for Current Setup)

**Use this if:** All users belong to the same organization

1. In Firebase Console → **Firestore Database** → **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Require email verification for all operations
    function isVerifiedUser() {
      return request.auth != null && 
             request.auth.token.email_verified == true;
    }
    
    // Allow verified users to access all data
    // App-level role permissions control what users can do
    match /{document=**} {
      allow read, write: if isVerifiedUser();
    }
  }
}
```

**Security Features:**
- ✅ Requires email verification
- ✅ All data access controlled by app-layer permissions
- ✅ Suitable for single-organization apps
- ✅ Simple and performant

---

### Option B: Multi-Tenant with User Isolation (Advanced)

**Use this if:** Multiple organizations will use the app

1. First, add a `tenantId` or `organizationId` field to all documents
2. Then use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null && 
             request.auth.token.email_verified == true;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function belongsToSameTenant(tenantId) {
      return isAuthenticated() && getUserData().tenantId == tenantId;
    }
    
    // Users collection - can only read their own tenant's users
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     belongsToSameTenant(resource.data.tenantId);
      allow write: if false; // Only admins via backend
    }
    
    // All other collections - tenant isolation
    match /{collection}/{docId} {
      allow read: if isAuthenticated() && 
                     belongsToSameTenant(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       belongsToSameTenant(request.resource.data.tenantId);
      allow update, delete: if isAuthenticated() && 
                              belongsToSameTenant(resource.data.tenantId);
    }
  }
}
```

**Security Features:**
- ✅ Complete tenant data isolation
- ✅ Email verification required
- ✅ No cross-tenant data access
- ✅ Production-grade multi-tenant security

---

### Recommendation

**For your current app:** Use **Option A** (Single Organization rules)

**Why:**
- Your app is designed for one organization with multiple business units
- Role-based permissions are handled in the app layer
- Simpler, faster, and sufficient for your use case

**If you need multi-tenant in the future:** Migrate to Option B and add `tenantId` fields

**⚠️ These rules allow any authenticated user full access!**

This is appropriate for:
- Internal company tools where all employees are trusted
- Apps with application-level authorization (like Syncly)
- Prototypes and MVPs

**For stricter security**, implement custom claims or more granular rules after you've tested the basic setup.

3. Click **"Publish"** to activate the rules

---

## 🎯 Step 4: Link Firebase UIDs to App User IDs

After creating Firebase accounts, you need to link them to your app's user profiles in Firestore.

### Manual Approach:
1. In Firebase Console → **Authentication** → Copy each user's UID
2. In **Firestore Database** → Find the corresponding user document
3. Add a field `firebaseUid: "<the-uid>"` to each user document

### Automated Approach:
Create a script that:
1. Fetches all users from Firestore
2. Looks up their Firebase Auth UID by email
3. Updates Firestore user documents with the UID

---

## 🧪 Step 5: Test Login

1. Restart your app
2. Try logging in with: `superadmin@mittaleod.com` and your chosen password
3. Verify you can access the admin dashboard
4. Test with manager and employee accounts

---

## ⚠️ Important Notes

1. **Password Security**: Use strong passwords in production (12+ characters, mixed case, numbers, symbols)
2. **Email Verification**: Enable email verification in production for added security
3. **Password Reset**: Firebase provides built-in password reset functionality
4. **Rate Limiting**: Firebase automatically rate-limits login attempts to prevent brute force attacks
5. **Security Rules**: These rules assume user profiles exist in Firestore - ensure default data is seeded

---

## 🔄 Reverting to Demo Mode

If you want to go back to "any password works" demo mode:

1. Re-enable **Anonymous Authentication** in Firebase Console
2. Revert the code changes in `AuthContext.tsx` to use `signInAnonymously`
3. Use the simplified Firestore rules: `allow read, write: if request.auth != null;`

---

## 📞 Need Help?

- Firebase Auth Docs: https://firebase.google.com/docs/auth
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Common Auth Errors: https://firebase.google.com/docs/reference/js/auth#autherrorcodes
