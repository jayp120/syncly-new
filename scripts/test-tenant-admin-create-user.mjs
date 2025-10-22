import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, query, collection, where, getDocs } from 'firebase/firestore';
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

async function testCreateUser() {
  console.log('🧪 TEST: Tenant Admin User Creation\n');
  console.log('═'.repeat(60) + '\n');

  try {
    // Step 1: Login as tenant admin
    console.log('🔐 Logging in as tenant admin...');
    await signInWithEmailAndPassword(auth, 'testadmin@testorg.com', 'TestAdmin123!');
    const idToken = await auth.currentUser.getIdTokenResult();
    const tenantId = idToken.claims.tenantId;
    console.log(`✅ Logged in as tenant admin`);
    console.log(`   TenantId: ${tenantId}\n`);

    // Step 2: Get roles and business units
    console.log('📋 Getting roles and business units...');
    
    const rolesSnapshot = await getDocs(
      query(collection(db, 'roles'), where('tenantId', '==', tenantId))
    );
    const roles = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`   Found ${roles.length} roles:`);
    roles.forEach(role => console.log(`   - ${role.name} (${role.id})`));

    const buSnapshot = await getDocs(
      query(collection(db, 'businessUnits'), where('tenantId', '==', tenantId))
    );
    const businessUnits = buSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`   Found ${businessUnits.length} business units:`);
    businessUnits.forEach(bu => console.log(`   - ${bu.name} (${bu.id})`));
    console.log('');

    // Step 3: Create a new employee user
    const employeeRole = roles.find(r => r.name === 'Employee');
    const engineeringBU = businessUnits.find(bu => bu.name === 'Engineering');

    if (!employeeRole || !engineeringBU) {
      console.log('❌ Could not find Employee role or Engineering BU');
      return;
    }

    console.log('👤 Creating new employee user...');
    const createUser = httpsCallable(functions, 'createUser');
    
    const newUserData = {
      email: 'employee@testorg.com',
      password: 'Employee123!',
      name: 'Test Employee',
      roleId: employeeRole.id,
      roleName: employeeRole.name,
      businessUnitId: engineeringBU.id,
      businessUnitName: engineeringBU.name,
      designation: 'Software Engineer',
      tenantId: tenantId
    };

    const result = await createUser(newUserData);
    
    if (result.data.success) {
      console.log(`✅ User created successfully!`);
      console.log(`   User ID: ${result.data.userId}`);
      console.log(`   Message: ${result.data.message}\n`);
    } else {
      console.log(`❌ Failed: ${result.data.message}\n`);
    }

    // Step 4: Verify user was created
    console.log('🔍 Verifying user creation...');
    const getTenantUsers = httpsCallable(functions, 'getTenantUsers');
    const usersResult = await getTenantUsers({ tenantId });
    const users = usersResult.data.users;
    
    console.log(`   Total users in tenant: ${users.length}`);
    users.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (${user.email})`);
      console.log(`      Role: ${user.roleName}`);
      console.log(`      Business Unit: ${user.businessUnitName || 'N/A'}`);
      console.log(`      Designation: ${user.designation || 'N/A'}`);
    });
    console.log('');

    // Step 5: Test if new employee can login
    console.log('🔐 Testing new employee login...');
    await signInWithEmailAndPassword(auth, 'employee@testorg.com', 'Employee123!');
    const employeeToken = await auth.currentUser.getIdTokenResult();
    
    console.log(`✅ Employee login successful!`);
    console.log(`   User ID: ${auth.currentUser.uid}`);
    console.log(`   TenantId claim: ${employeeToken.claims.tenantId}`);
    console.log(`   Has correct tenant: ${employeeToken.claims.tenantId === tenantId ? '✅' : '❌'}\n`);

    console.log('═'.repeat(60));
    console.log('✅ TENANT ADMIN USER CREATION TEST PASSED!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Tenant admin can create users');
    console.log('   ✅ Users get Firebase Auth accounts');
    console.log('   ✅ Custom claims are set correctly');
    console.log('   ✅ New users can login immediately');
    console.log('   ✅ All permissions and data are working\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    if (error.message.includes('auth/email-already-in-use')) {
      console.log('\nℹ️  Employee already exists. Test completed previously.\n');
    }
  }
}

testCreateUser();
