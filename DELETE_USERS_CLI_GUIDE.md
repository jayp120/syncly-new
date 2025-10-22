# 🔧 Delete Orphaned Users - CLI Method

## ⚠️ Important Security Note
For security reasons, authentication credentials should NOT be shared or stored in code repositories.

---

## ✅ Recommended Method: Firebase Console (No Auth Needed)

This is the **safest and fastest** method:

1. **Open**: https://console.firebase.google.com/project/syncly-473404/authentication/users
2. **Search** for each user: `rushi@syncly.com` and `jay@syncly.com`
3. **Click** the 3-dot menu (⋮) → Delete account
4. **Done** in 30 seconds!

---

## 🔧 Alternative: Manual CLI Method (If You Insist)

If you absolutely need to use CLI on your local machine:

### Step 1: On Your Local Machine
```bash
# Login to Firebase
firebase login

# Delete users
firebase projects:list  # Verify you're on syncly-473404
# Note: firebase auth:delete is not available in current CLI version
```

### Step 2: Alternative - Using Firebase Admin SDK Script
Create a file `delete-users.js` on your local machine:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const orphanedUsers = [
  'E3HO408qkDO6KuPfJBhvDN44vJT2', // rushi@syncly.com
  'Y6N6MnfpRKZWHMqBpEa9Litl3N53'  // jay@syncly.com
];

async function deleteUsers() {
  for (const uid of orphanedUsers) {
    try {
      await admin.auth().deleteUser(uid);
      console.log(`✅ Deleted user: ${uid}`);
    } catch (error) {
      console.error(`❌ Error deleting ${uid}:`, error.message);
    }
  }
}

deleteUsers().then(() => process.exit(0));
```

Then run:
```bash
npm install firebase-admin
node delete-users.js
```

---

## 🎯 Why Firebase Console is Better

1. **No authentication setup needed** - Already logged in
2. **Visual confirmation** - You can see what you're deleting
3. **Safer** - No risk of credentials exposure
4. **Faster** - 30 seconds vs 5+ minutes setup

---

## ✅ Final Recommendation

**Just use the Firebase Console method** - it's the same result, but:
- ✅ Faster
- ✅ Safer  
- ✅ No authentication setup needed
- ✅ Visual confirmation

**Link**: https://console.firebase.google.com/project/syncly-473404/authentication/users

Trust me, clicking 6 buttons in the console is easier than setting up CLI authentication! 😊
