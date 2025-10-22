#!/usr/bin/env node

/**
 * Quick Test User Setup
 * Creates a simple test user for immediate login
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: "syncly-473404",
  // Add your service account credentials here
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "syncly-473404"
});

const db = admin.firestore();
const auth = admin.auth();

async function setupTestUser() {
  console.log('🚀 Setting up test user...\n');

  const testUser = {
    email: 'test@syncly.com',
    password: 'Test@123',
    name: 'Test User',
    roleName: 'Admin'
  };

  try {
    // Step 1: Create Firebase Auth account
    console.log(`1. Creating Firebase Auth account for ${testUser.email}...`);
    let authUser;
    try {
      authUser = await auth.createUser({
        email: testUser.email,
        password: testUser.password,
        emailVerified: true,
        displayName: testUser.name
      });
      console.log(`✅ Firebase Auth user created: ${authUser.uid}\n`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠️  User already exists in Firebase Auth`);
        authUser = await auth.getUserByEmail(testUser.email);
        console.log(`✅ Using existing user: ${authUser.uid}\n`);
      } else {
        throw error;
      }
    }

    // Step 2: Create tenant
    console.log('2. Creating test tenant...');
    const tenantId = 'tenant_test_' + Date.now();
    const tenant = {
      id: tenantId,
      companyName: 'Test Company',
      domain: 'syncly.com',
      plan: 'Professional',
      status: 'Active',
      createdAt: Date.now(),
      userLimit: 50,
      currentUsers: 1
    };

    await db.collection('tenants').doc(tenantId).set(tenant);
    console.log(`✅ Tenant created: ${tenantId}\n`);

    // Step 3: Create Admin role
    console.log('3. Creating Admin role...');
    const roleId = 'role_admin_' + Date.now();
    const role = {
      id: roleId,
      tenantId: tenantId,
      name: 'Admin',
      description: 'Full system access',
      permissions: [
        'CAN_MANAGE_USERS',
        'CAN_VIEW_ALL_REPORTS',
        'CAN_MANAGE_TEAM_REPORTS',
        'CAN_ACKNOWLEDGE_REPORTS',
        'CAN_SUBMIT_OWN_EOD',
        'CAN_VIEW_OWN_REPORTS',
        'CAN_MANAGE_ALL_TASKS',
        'CAN_MANAGE_TEAM_TASKS',
        'CAN_CREATE_PERSONAL_TASKS',
        'CAN_MANAGE_ALL_LEAVES',
        'CAN_SUBMIT_OWN_LEAVE',
        'CAN_MANAGE_ALL_MEETINGS',
        'CAN_MANAGE_TEAM_MEETINGS',
        'CAN_VIEW_OWN_MEETINGS',
        'CAN_VIEW_LEADERBOARD',
        'CAN_VIEW_TEAM_CALENDAR',
        'CAN_VIEW_OWN_CALENDAR',
        'CAN_USE_PERFORMANCE_HUB'
      ]
    };

    await db.collection('roles').doc(roleId).set(role);
    console.log(`✅ Admin role created: ${roleId}\n`);

    // Step 4: Create Business Unit
    console.log('4. Creating default business unit...');
    const buId = 'bu_default_' + Date.now();
    const businessUnit = {
      id: buId,
      tenantId: tenantId,
      name: 'General',
      status: 'active'
    };

    await db.collection('businessUnits').doc(buId).set(businessUnit);
    console.log(`✅ Business unit created: ${buId}\n`);

    // Step 5: Create Firestore user profile
    console.log('5. Creating user profile in Firestore...');
    const userId = 'user_' + Date.now();
    const userProfile = {
      id: userId,
      tenantId: tenantId,
      firebaseUid: authUser.uid,
      email: testUser.email,
      name: testUser.name,
      roleName: testUser.roleName,
      roleId: roleId,
      businessUnit: 'General',
      businessUnitId: buId,
      status: 'Active',
      notificationEmail: testUser.email,
      createdAt: Date.now(),
      loginCount: 0
    };

    await db.collection('users').doc(authUser.uid).set(userProfile);
    console.log(`✅ User profile created: ${userId}\n`);

    // Success!
    console.log('🎉 SUCCESS! Test user setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL:    ' + testUser.email);
    console.log('🔑 PASSWORD: ' + testUser.password);
    console.log('🏢 COMPANY:  Test Company');
    console.log('👤 ROLE:     Admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: http://localhost:5000\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestUser();
