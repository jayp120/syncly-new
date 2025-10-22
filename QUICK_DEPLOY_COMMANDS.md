# ⚡ Quick Deploy Commands

## 🚀 One-Command Deploy

```bash
# Step 1: Authenticate (do this once)
firebase login --no-localhost

# Step 2: Deploy everything
./deploy.sh
```

That's it! ✅

---

## 📝 Manual Commands (if needed)

```bash
# Authenticate
firebase login --no-localhost

# Build functions
cd functions && npm run build && cd ..

# Deploy everything
firebase deploy --only functions,firestore:rules,firestore:indexes

# Verify
firebase functions:list
```

---

## 🔍 Verify Deployment

```bash
# List deployed functions
firebase functions:list

# View Firestore rules
firebase firestore:rules

# Check logs
firebase functions:log

# Test in console
# https://console.firebase.google.com/project/syncly-473404/functions
```

---

## 🧪 Test createTenant Function

Go to: https://console.firebase.google.com/project/syncly-473404/functions/logs

Test with:
```json
{
  "companyName": "Test Corp",
  "plan": "Starter",
  "adminEmail": "admin@test.com",
  "adminPassword": "SecurePass123!",
  "adminName": "Test Admin"
}
```

Expected: ✅ Tenant created successfully

---

## 📊 Monitor

```bash
# Real-time logs
firebase functions:log --follow

# Specific function
firebase functions:log --only createTenant
```

---

## ✅ Status

- [x] Firebase CLI installed
- [x] Project configured (syncly-473404)
- [x] Functions built
- [x] Rules ready
- [ ] **Authenticate**: `firebase login --no-localhost`
- [ ] **Deploy**: `./deploy.sh`
- [ ] **Test**: Create tenant via Cloud Function

**You're one command away from deployment!** 🎉
