import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
const db = getFirestore(app);

async function deleteTenantAdmin() {
  try {
    console.log('🗑️  Finding and deleting tenant admin users...\n');

    // Find all non-platform admin users
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isPlatformAdmin', '!=', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('ℹ️  No tenant admin users found.');
      return;
    }

    console.log(`Found ${snapshot.size} tenant user(s):\n`);

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      console.log(`📋 User: ${userData.email}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   UID: ${userDoc.id}`);
      console.log(`   TenantId: ${userData.tenantId}`);
      console.log(`   Role: ${userData.roleName}`);
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userDoc.id));
      console.log(`   ✅ Deleted from Firestore`);
      
      // Note: We cannot delete from Firebase Auth from client SDK
      // The user will need to be deleted from Firebase Console or via Admin SDK
      console.log(`   ⚠️  Firebase Auth account still exists - delete manually from Firebase Console`);
      console.log(`   🔗 https://console.firebase.google.com/project/syncly-473404/authentication/users\n`);
    }

    console.log('✅ All tenant users deleted from Firestore!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to Firebase Console Authentication');
    console.log('2. Delete the Firebase Auth accounts manually');
    console.log('3. Create new tenant admin using your dashboard\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteTenantAdmin();
