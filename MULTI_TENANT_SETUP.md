# 🏢 Multi-Tenant SaaS Setup Guide

## Overview

This guide configures Syncly as a **world-class multi-tenant SaaS application** where multiple companies/organizations can use the app with **complete data isolation**.

---

## 🔐 **Multi-Tenant Security Rules**

### Apply These Rules to Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database** → **Rules**
3. Copy and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if user is authenticated with verified email
    function isAuthenticated() {
      return request.auth != null && 
             request.auth.token.email_verified == true;
    }
    
    // Helper: Get current user's tenant ID
    function getUserTenantId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Helper: Check if resource belongs to user's tenant
    function belongsToUserTenant(resourceData) {
      return isAuthenticated() && 
             resourceData.tenantId == getUserTenantId();
    }
    
    // Tenants collection - only super admins can manage
    match /tenants/{tenantId} {
      allow read: if isAuthenticated() && getUserTenantId() == tenantId;
      allow write: if false; // Only via backend/admin SDK
    }
    
    // Users collection - tenant isolation
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     belongsToUserTenant(resource.data);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId == getUserTenantId();
      allow update: if isAuthenticated() && 
                       belongsToUserTenant(resource.data);
      allow delete: if false; // Only via backend
    }
    
    // All other collections - strict tenant isolation
    match /{collection}/{docId} {
      allow read: if isAuthenticated() && 
                     belongsToUserTenant(resource.data);
      
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId == getUserTenantId();
      
      allow update: if isAuthenticated() && 
                       belongsToUserTenant(resource.data) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      
      allow delete: if isAuthenticated() && 
                       belongsToUserTenant(resource.data);
    }
  }
}
```

4. Click **Publish**

---

## 🏗️ **Architecture Overview**

### How Multi-Tenancy Works:

```
Organization A          Organization B          Organization C
   (tenantId: abc)        (tenantId: xyz)        (tenantId: def)
   ├── Users              ├── Users              ├── Users
   ├── Reports            ├── Reports            ├── Reports
   ├── Tasks              ├── Tasks              ├── Tasks
   └── Meetings           └── Meetings           └── Meetings
```

**Key Principles:**
- Every document has a `tenantId` field
- Users can only access data from their own tenant
- Firestore rules enforce isolation at the database level
- No code changes needed to add new tenants

---

## 👥 **Setting Up New Tenants (Companies)**

### Step 1: Create Tenant Record

In Firebase Console → Firestore Database, create a new document:

**Collection:** `tenants`  
**Document ID:** `tenant_[company-name]` (e.g., `tenant_acme`)

**Fields:**
```javascript
{
  id: "tenant_acme",
  name: "Acme Corporation",
  domain: "acme.com",
  plan: "enterprise", // or "starter", "professional"
  status: "active",
  createdAt: [current timestamp],
  settings: {
    maxUsers: 100,
    features: ["eod", "tasks", "meetings", "ai"]
  }
}
```

### Step 2: Create Super Admin User

In Firebase Console → Authentication → Users, create admin:

**Email:** `admin@acme.com`  
**Password:** [secure password]  
**Email Verified:** ✅ TRUE

### Step 3: Create User Profile in Firestore

**Collection:** `users`  
**Document ID:** [Firebase UID from step 2]

**Fields:**
```javascript
{
  id: "user_001",
  tenantId: "tenant_acme", // ← CRITICAL: Links to tenant
  email: "admin@acme.com",
  name: "Admin User",
  roleId: "role_admin",
  status: "active",
  businessUnitId: "bu_executive",
  // ... other user fields
}
```

### Step 4: Create Default Data for Tenant

For each new tenant, create:

1. **Roles** (with tenantId: "tenant_acme")
   - Admin, Manager, Employee roles

2. **Business Units** (with tenantId: "tenant_acme")
   - Sales, Technology, Operations, HR

3. **Initial Users** (with tenantId: "tenant_acme")
   - Manager and employee accounts

---

## 🔄 **Automated Tenant Provisioning (Recommended)**

### Option A: Admin Panel (Build This)

Create an admin interface at `/super-admin` that allows you to:

1. **Create New Tenant**
   - Input: Company name, domain, plan
   - Auto-generates: tenantId, default roles, business units

2. **Invite First Admin**
   - Sends email with signup link
   - Auto-assigns tenantId on registration

3. **Manage Tenants**
   - View all tenants
   - Activate/deactivate
   - Change plans

### Option B: Backend Script (Quick Setup)

Create a Node.js script to automate tenant creation:

```javascript
// create-tenant.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createTenant(companyName, adminEmail, adminPassword) {
  const tenantId = `tenant_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
  
  // 1. Create tenant document
  await db.collection('tenants').doc(tenantId).set({
    id: tenantId,
    name: companyName,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    plan: 'professional'
  });
  
  // 2. Create admin user in Firebase Auth
  const userRecord = await auth.createUser({
    email: adminEmail,
    password: adminPassword,
    emailVerified: true
  });
  
  // 3. Create user profile in Firestore
  await db.collection('users').doc(userRecord.uid).set({
    id: `user_${Date.now()}`,
    tenantId: tenantId,
    email: adminEmail,
    name: 'Admin User',
    roleId: 'role_admin',
    status: 'active'
  });
  
  // 4. Create default roles
  const roles = [
    { id: 'role_admin', name: 'Admin', tenantId },
    { id: 'role_manager', name: 'Manager', tenantId },
    { id: 'role_employee', name: 'Employee', tenantId }
  ];
  
  for (const role of roles) {
    await db.collection('roles').add(role);
  }
  
  console.log(`✅ Tenant ${companyName} created successfully!`);
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   Admin Email: ${adminEmail}`);
}

// Usage
createTenant('Acme Corporation', 'admin@acme.com', 'SecurePassword123!');
```

Run: `node create-tenant.js`

---

## 🔒 **Security Checklist**

### ✅ Data Isolation Verified
- [ ] Every collection has `tenantId` field
- [ ] Firestore rules enforce tenant boundaries
- [ ] Users can only see their tenant's data
- [ ] Cross-tenant queries are blocked

### ✅ User Management
- [ ] New users automatically assigned to tenant
- [ ] Email verification required
- [ ] Tenant admins can only manage their users

### ✅ Billing & Plans
- [ ] Each tenant has a `plan` field
- [ ] Feature flags based on plan
- [ ] Usage tracking per tenant

---

## 📊 **Monitoring Multi-Tenant Usage**

### Query Tenants in Firestore Console

**Get all active tenants:**
```
Collection: tenants
Filter: status == active
```

**Get users for specific tenant:**
```
Collection: users
Filter: tenantId == tenant_acme
```

**Get tenant usage stats:**
```javascript
// Count reports per tenant
db.collection('reports')
  .where('tenantId', '==', 'tenant_acme')
  .count()
```

---

## 🚀 **Deployment for Multi-Tenant**

### Environment Variables (Add These)

```bash
# Super Admin Config
SUPER_ADMIN_EMAIL=superadmin@yourdomain.com
SUPER_ADMIN_PASSWORD=YourSecurePassword

# Default Tenant (for testing)
DEFAULT_TENANT_ID=tenant_default
```

### Custom Domain Setup (Optional)

**Option 1: Subdomain per Tenant**
- `acme.syncly.com` → tenantId: `tenant_acme`
- `techcorp.syncly.com` → tenantId: `tenant_techcorp`

**Option 2: Custom Domains**
- `app.acme.com` → tenantId: `tenant_acme`
- `sync.techcorp.com` → tenantId: `tenant_techcorp`

---

## 💡 **Best Practices**

1. **Always Include TenantId**
   - Every document MUST have `tenantId`
   - Set it automatically on creation

2. **Validate Tenant Access**
   - Always check user's tenantId matches resource tenantId
   - Use Firestore rules as the primary security layer

3. **Backup Strategy**
   - Backup each tenant's data separately
   - Allows per-tenant restore if needed

4. **Scaling**
   - Monitor Firestore reads/writes per tenant
   - Consider sharding for large tenants (>10k users)

---

## 📋 **Quick Setup Checklist**

- [ ] Apply multi-tenant Firestore security rules
- [ ] Add `tenantId` field to all TypeScript types
- [ ] Update data creation to include `tenantId`
- [ ] Create first tenant manually or via script
- [ ] Test: User A cannot see User B's data (different tenants)
- [ ] Test: User can see all data from their own tenant
- [ ] Set up tenant provisioning automation
- [ ] Configure billing/plan enforcement

---

## 🆘 **Support**

**Common Issues:**

**Q: User can't see any data after login**  
A: Check that user's `tenantId` matches the data they're trying to access

**Q: How to migrate existing data to multi-tenant?**  
A: Run a migration script to add `tenantId` to all existing documents

**Q: Can a user belong to multiple tenants?**  
A: Yes, create separate user documents with different emails per tenant

---

Your app is now configured as a **world-class multi-tenant SaaS platform**! 🎉
