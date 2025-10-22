# Firebase Service Account Setup for Automated Deployment

## Quick Setup (5 minutes)

To enable automated Firestore rules deployment from Replit, you need a Firebase service account key.

### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **syncly-473404**
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **+ CREATE SERVICE ACCOUNT**

### Step 2: Configure Service Account

**Service account details:**
- **Name**: `replit-deployment`
- **Description**: `Service account for deploying Firestore rules from Replit`
- Click **CREATE AND CONTINUE**

**Grant permissions:**
- Add role: **Firebase Admin**
- Add role: **Cloud Datastore User**
- Click **CONTINUE** then **DONE**

### Step 3: Create JSON Key

1. Find your new service account in the list
2. Click the **three dots (⋮)** → **Manage keys**
3. Click **ADD KEY** → **Create new key**
4. Choose **JSON** format
5. Click **CREATE** (downloads a JSON file)

### Step 4: Add to Replit Secrets

1. Open the downloaded JSON file
2. Copy the ENTIRE contents
3. In Replit, open the **Secrets** tab (Tools → Secrets)
4. Click **+ New Secret**
5. Name: `FIREBASE_SERVICE_ACCOUNT`
6. Value: Paste the entire JSON content
7. Click **Add Secret**

### Step 5: Deploy!

Once the secret is added, run:
```bash
node scripts/deploy-with-service-account.js
```

This will automatically deploy your Firestore rules and indexes!

---

## Alternative: Use CI Token (Simpler)

If you have Firebase CLI installed locally:

1. Run on your local machine:
   ```bash
   firebase login:ci
   ```

2. Copy the token that appears

3. Add to Replit Secrets:
   - Name: `FIREBASE_TOKEN`
   - Value: `1//0xxxxx...` (the token)

4. Run deployment:
   ```bash
   node scripts/deploy-firestore-rules.js
   ```

---

## Manual Deployment (Backup Method)

If automated deployment doesn't work:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **syncly-473404**
3. Click **Firestore Database** → **Rules**
4. Copy content from `firestore.rules` in Replit
5. Paste and click **Publish**
6. Click **Indexes** tab
7. Import `firestore.indexes.json` if prompted

---

**Current Status**: ⏳ Waiting for service account key or CI token to enable automated deployment
