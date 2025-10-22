import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const functions = getFunctions(app);

async function deleteAllTenantAdmins() {
  try {
    console.log('🔐 Logging in as platform admin...');
    
    // Login as platform admin
    await signInWithEmailAndPassword(auth, 'superadmin@syncly.com', 'SuperAdmin2025!');
    console.log('✅ Logged in successfully\n');

    console.log('🗑️  Calling deleteTenantAdmins Cloud Function...');
    const deleteTenantAdmins = httpsCallable(functions, 'deleteTenantAdmins');
    
    const result = await deleteTenantAdmins({});
    
    console.log('\n✅ SUCCESS!');
    console.log(`   ${result.data.message}`);
    
    if (result.data.deletedUsers && result.data.deletedUsers.length > 0) {
      console.log('\n📋 Deleted users:');
      result.data.deletedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name})`);
        console.log(`      TenantId: ${user.tenantId}`);
      });
    }

    console.log('\n✅ All tenant admin users have been deleted!');
    console.log('You can now create a new tenant admin from your dashboard.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  }
}

deleteAllTenantAdmins();
