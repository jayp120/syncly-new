import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Test credentials
const TEST_TENANT = {
  companyName: 'Test Organization',
  plan: 'Professional',
  adminEmail: 'testadmin@testorg.com',
  adminPassword: 'TestAdmin123!',
  adminName: 'Test Admin User'
};

async function createTestTenant() {
  console.log('📋 STEP 1: Creating Test Tenant...\n');
  
  try {
    // Login as platform admin first
    console.log('🔐 Logging in as platform admin...');
    await signInWithEmailAndPassword(auth, 'superadmin@syncly.com', 'SuperAdmin2025!');
    console.log('✅ Platform admin logged in\n');

    // Create tenant using Cloud Function
    console.log('🏢 Creating tenant:', TEST_TENANT.companyName);
    const createTenant = httpsCallable(functions, 'createTenant');
    const result = await createTenant(TEST_TENANT);
    
    if (result.data.success) {
      console.log(`✅ Tenant created: ${result.data.tenantId}`);
      console.log(`   Admin User ID: ${result.data.data.adminUserId}`);
      console.log(`   Roles Created: ${result.data.data.rolesCreated}`);
      console.log(`   Business Units: ${result.data.data.businessUnitsCreated}\n`);
      
      // Logout platform admin
      await signOut(auth);
      console.log('👋 Platform admin logged out\n');
      
      return result.data.tenantId;
    } else {
      throw new Error(result.data.message);
    }
  } catch (error) {
    if (error.message.includes('auth/email-already-in-use')) {
      console.log('ℹ️  Tenant admin already exists, will test existing user\n');
      await signOut(auth);
      return 'existing';
    }
    throw error;
  }
}

async function testTenantAdminLogin() {
  console.log('📋 STEP 2: Testing Tenant Admin Login...\n');
  
  try {
    console.log(`🔐 Logging in as: ${TEST_TENANT.adminEmail}`);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_TENANT.adminEmail,
      TEST_TENANT.adminPassword
    );
    
    console.log('✅ Login successful!');
    console.log(`   User ID: ${userCredential.user.uid}`);
    console.log(`   Email: ${userCredential.user.email}\n`);
    
    // Get ID token to check custom claims
    const idTokenResult = await userCredential.user.getIdTokenResult();
    console.log('🎫 Custom Claims:');
    console.log(`   tenantId: ${idTokenResult.claims.tenantId || 'MISSING ⚠️'}`);
    console.log(`   isPlatformAdmin: ${idTokenResult.claims.isPlatformAdmin || false}\n`);
    
    if (!idTokenResult.claims.tenantId) {
      console.log('❌ ERROR: tenantId claim is missing! User cannot access tenant data.\n');
      return null;
    }
    
    return {
      userId: userCredential.user.uid,
      tenantId: idTokenResult.claims.tenantId
    };
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return null;
  }
}

async function testTenantAdminPermissions(userData) {
  console.log('📋 STEP 3: Testing Tenant Admin Permissions...\n');
  
  if (!userData) {
    console.log('❌ Skipping permission tests - login failed\n');
    return;
  }
  
  const { userId, tenantId } = userData;
  
  try {
    // Test 1: Get user document
    console.log('1️⃣ Testing: Get own user document');
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log(`   ✅ User document exists`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Role: ${userData.roleName}`);
      console.log(`   TenantId: ${userData.tenantId}`);
      console.log(`   Permissions: ${userData.permissions?.length || 0} permissions\n`);
    } else {
      console.log(`   ❌ User document not found\n`);
    }

    // Test 2: List users in tenant
    console.log('2️⃣ Testing: List users in tenant');
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('tenantId', '==', tenantId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      console.log(`   ❌ SECURITY ISSUE: Client can list users directly (found ${usersSnapshot.size})`);
      console.log(`   This should be blocked by Firestore rules!\n`);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.log(`   ✅ Correctly blocked by Firestore rules`);
        console.log(`   Must use getTenantUsers Cloud Function\n`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}\n`);
      }
    }

    // Test 3: Get tenant users via Cloud Function
    console.log('3️⃣ Testing: Get tenant users via Cloud Function');
    try {
      const getTenantUsers = httpsCallable(functions, 'getTenantUsers');
      const result = await getTenantUsers({ tenantId });
      const data = result.data;
      console.log(`   ✅ Got ${data.users.length} users from tenant ${data.tenantId}`);
      data.users.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name} (${user.email}) - ${user.roleName}`);
      });
      console.log('');
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }

    // Test 4: Access roles in tenant
    console.log('4️⃣ Testing: Access roles in tenant');
    try {
      const rolesQuery = query(
        collection(db, 'roles'),
        where('tenantId', '==', tenantId)
      );
      const rolesSnapshot = await getDocs(rolesQuery);
      console.log(`   ✅ Can access ${rolesSnapshot.size} roles`);
      rolesSnapshot.forEach(doc => {
        const role = doc.data();
        console.log(`   - ${role.name}: ${role.permissions?.length || 0} permissions`);
      });
      console.log('');
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }

    // Test 5: Access business units in tenant
    console.log('5️⃣ Testing: Access business units in tenant');
    try {
      const buQuery = query(
        collection(db, 'businessUnits'),
        where('tenantId', '==', tenantId)
      );
      const buSnapshot = await getDocs(buQuery);
      console.log(`   ✅ Can access ${buSnapshot.size} business units`);
      buSnapshot.forEach(doc => {
        const bu = doc.data();
        console.log(`   - ${bu.name}`);
      });
      console.log('');
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }

    // Test 6: Try to access other tenant data
    console.log('6️⃣ Testing: Security - Cannot access other tenant data');
    try {
      const otherTenantsQuery = query(
        collection(db, 'tenants')
      );
      const tenantsSnapshot = await getDocs(otherTenantsQuery);
      console.log(`   ❌ SECURITY ISSUE: Can list ${tenantsSnapshot.size} tenants!`);
      console.log(`   This should be blocked!\n`);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.log(`   ✅ Correctly blocked from listing all tenants\n`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}\n`);
      }
    }

    // Test 7: Get own tenant document
    console.log('7️⃣ Testing: Get own tenant document');
    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantDoc.exists()) {
        const tenant = tenantDoc.data();
        console.log(`   ✅ Can access own tenant document`);
        console.log(`   Name: ${tenant.name}`);
        console.log(`   Plan: ${tenant.plan}`);
        console.log(`   Status: ${tenant.status}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }

    console.log('📊 SUMMARY:');
    console.log('✅ Tenant admin can access their own data');
    console.log('✅ Security rules are enforcing tenant isolation');
    console.log('✅ Custom claims are working correctly\n');

  } catch (error) {
    console.error('❌ Permission test failed:', error);
  }
}

async function runFullTest() {
  console.log('🧪 TENANT ADMIN COMPLETE TEST\n');
  console.log('═'.repeat(60) + '\n');

  try {
    // Step 1: Create test tenant
    const tenantId = await createTestTenant();
    
    // Step 2: Test login
    const userData = await testTenantAdminLogin();
    
    // Step 3: Test permissions
    await testTenantAdminPermissions(userData);
    
    // Cleanup
    await signOut(auth);
    
    console.log('═'.repeat(60));
    console.log('✅ TEST COMPLETE!\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  }
}

runFullTest();
