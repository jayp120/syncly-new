#!/usr/bin/env node

/**
 * PRODUCTION FIRESTORE INITIALIZATION
 * This script sets up Firestore with initial data for production use
 * NO localStorage - Direct Firestore initialization
 */

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'syncly-473404';

console.log('🚀 PRODUCTION FIRESTORE INITIALIZATION');
console.log('═══════════════════════════════════════════\n');

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseToken = process.env.FIREBASE_TOKEN;

if (!serviceAccountJson && !firebaseToken) {
  console.error('❌ Error: No Firebase credentials found');
  console.error('   Add FIREBASE_SERVICE_ACCOUNT or FIREBASE_TOKEN to Replit Secrets');
  process.exit(1);
}

let app;
if (serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
} else {
  // Use default credentials (works with FIREBASE_TOKEN in CI/CD)
  app = admin.initializeApp({ projectId: projectId });
}

const db = getFirestore(app);
const auth = getAuth(app);

// Default tenant configuration
const DEFAULT_TENANT = {
  companyName: 'Demo Corporation',
  domain: 'demo.syncly.com',
  plan: 'Professional',
  status: 'active',
  adminEmail: 'admin@demo.syncly.com',
  adminPassword: 'Admin@2025',
  adminName: 'Demo Admin'
};

// Default roles for tenant
const DEFAULT_ROLES = [
  { id: 'role_super_admin', name: 'Super Admin', permissions: ['all'], tenantId: null },
  { id: 'role_manager', name: 'Manager', permissions: ['manage_team', 'view_reports'], tenantId: null },
  { id: 'role_employee', name: 'Employee', permissions: ['submit_reports', 'view_own'], tenantId: null }
];

// Default business units for tenant
const DEFAULT_BUSINESS_UNITS = [
  { id: 'bu_executive', name: 'Executive', tenantId: null },
  { id: 'bu_engineering', name: 'Engineering', tenantId: null },
  { id: 'bu_sales', name: 'Sales', tenantId: null },
  { id: 'bu_marketing', name: 'Marketing', tenantId: null },
  { id: 'bu_operations', name: 'Operations', tenantId: null }
];

async function createDefaultTenant() {
  console.log('📦 Creating default tenant...');
  
  const tenantId = `tenant_${Date.now()}`;
  const { companyName, domain, plan, status, adminEmail, adminPassword, adminName } = DEFAULT_TENANT;
  
  // 1. Create Firebase Auth user for admin
  console.log(`   Creating admin user in Firebase Auth: ${adminEmail}`);
  let adminFirebaseUid;
  
  try {
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
      disabled: false
    });
    adminFirebaseUid = userRecord.uid;
    console.log(`   ✅ Firebase Auth user created: ${adminFirebaseUid}`);
    
    // Set custom claims for tenant isolation
    await auth.setCustomUserClaims(adminFirebaseUid, {
      tenantId: tenantId,
      isPlatformAdmin: false,
      role: 'Admin'
    });
    console.log(`   ✅ Custom claims set for admin user`);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      const existingUser = await auth.getUserByEmail(adminEmail);
      adminFirebaseUid = existingUser.uid;
      console.log(`   ℹ️  User already exists: ${adminFirebaseUid}`);
    } else {
      throw error;
    }
  }
  
  // 2. Create tenant document
  console.log(`   Creating tenant document: ${tenantId}`);
  await db.collection('tenants').doc(tenantId).set({
    id: tenantId,
    organizationName: companyName,
    domain: domain,
    plan: plan,
    status: status,
    createdAt: Date.now(),
    adminEmail: adminEmail,
    adminUid: adminFirebaseUid,
    adminName: adminName
  });
  console.log(`   ✅ Tenant created: ${tenantId}`);
  
  // 3. Create roles for this tenant
  console.log(`   Creating ${DEFAULT_ROLES.length} roles...`);
  const roleIds = {};
  for (const role of DEFAULT_ROLES) {
    const roleId = `${role.id}_${tenantId}`;
    await db.collection('roles').doc(roleId).set({
      ...role,
      id: roleId,
      tenantId: tenantId
    });
    roleIds[role.name] = roleId;
  }
  console.log(`   ✅ Roles created`);
  
  // 4. Create business units for this tenant
  console.log(`   Creating ${DEFAULT_BUSINESS_UNITS.length} business units...`);
  const businessUnitIds = {};
  for (const bu of DEFAULT_BUSINESS_UNITS) {
    const buId = `${bu.id}_${tenantId}`;
    await db.collection('businessUnits').doc(buId).set({
      ...bu,
      id: buId,
      tenantId: tenantId
    });
    businessUnitIds[bu.name] = buId;
  }
  console.log(`   ✅ Business units created`);
  
  // 5. Create admin user document in Firestore (use Firebase Auth UID as document ID)
  console.log(`   Creating admin user document...`);
  await db.collection('users').doc(adminFirebaseUid).set({
    id: adminFirebaseUid,
    tenantId: tenantId,
    email: adminEmail,
    notificationEmail: adminEmail,
    name: adminName,
    roleId: roleIds['Super Admin'],
    roleName: 'Super Admin',
    status: 'active',
    designation: 'Administrator',
    businessUnitId: businessUnitIds['Executive'],
    businessUnitName: 'Executive',
    isSuspended: false,
    isPlatformAdmin: false
  });
  console.log(`   ✅ Admin user created in Firestore`);
  
  console.log('\n✅ DEFAULT TENANT SETUP COMPLETE!\n');
  console.log('═══════════════════════════════════════════');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('═══════════════════════════════════════════\n');
  
  return { tenantId, adminFirebaseUid };
}

async function main() {
  try {
    console.log(`📦 Project: ${projectId}\n`);
    
    // Check if already initialized
    const tenantsSnapshot = await db.collection('tenants').limit(1).get();
    
    if (!tenantsSnapshot.empty) {
      console.log('ℹ️  Firestore already has data.');
      console.log('   To reinitialize, manually delete collections in Firebase Console.\n');
      
      // Show existing tenants
      const allTenants = await db.collection('tenants').get();
      console.log(`📊 Existing Tenants (${allTenants.size}):`);
      allTenants.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${data.organizationName} (${data.adminEmail})`);
      });
      
      process.exit(0);
    }
    
    // Initialize with default tenant
    await createDefaultTenant();
    
    console.log('🎉 PRODUCTION FIRESTORE READY!');
    console.log('   Your app can now run with zero errors.');
    console.log('   All data is in Firestore - no localStorage needed.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
