# 🔍 Debug User List Issue

## Quick Test Steps

### Step 1: Check if you're actually logged in as tenant admin
1. Open browser console (F12)
2. Run this command:
```javascript
firebase.auth().currentUser.getIdTokenResult().then(token => {
  console.log('Current User Claims:', {
    uid: token.claims.sub,
    email: token.claims.email,
    tenantId: token.claims.tenantId,
    isTenantAdmin: token.claims.isTenantAdmin,
    isPlatformAdmin: token.claims.isPlatformAdmin
  });
});
```

**Expected Result:**
```javascript
{
  uid: "some-uid",
  email: "testadmin@testorg.com",
  tenantId: "tenant-xxx",
  isTenantAdmin: true,
  isPlatformAdmin: false
}
```

### Step 2: Check what users are in Firestore
1. In console, run:
```javascript
firebase.firestore().collection('users')
  .where('tenantId', '==', 'YOUR_TENANT_ID_HERE')  // Replace with your tenantId from Step 1
  .get()
  .then(snapshot => {
    console.log('Users in Firestore:', snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      role: doc.data().roleName
    })));
  });
```

### Step 3: Check what the Cloud Function returns
1. In console, run:
```javascript
const getTenantUsers = firebase.functions().httpsCallable('getTenantUsers');
getTenantUsers({}).then(result => {
  console.log('Cloud Function Result:', result.data);
});
```

### Step 4: Check cache state
1. In console, run:
```javascript
// This will show if cache is the issue
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

---

## Common Issues & Solutions

### Issue 1: tenantId is null or undefined
**Solution**: Logout and login again to refresh token

### Issue 2: isTenantAdmin is false
**Solution**: Your user doesn't have tenant admin permissions. Check Firebase Console → Authentication → Users → Custom Claims

### Issue 3: Cloud Function returns empty array
**Solution**: Check Firestore directly - users might not exist

### Issue 4: Cache not clearing
**Solution**: Hard refresh browser (Ctrl+Shift+R) and clear all storage
