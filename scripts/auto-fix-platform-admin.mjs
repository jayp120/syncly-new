import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
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
const functions = getFunctions(app);

async function fixPlatformAdmin() {
  try {
    console.log('🔧 Auto-fixing platform admin custom claims...\n');

    // Find platform admin user in Firestore
    console.log('Step 1: Finding platform admin user...');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isPlatformAdmin', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Try finding by email
      const q2 = query(usersRef, where('email', '==', 'superadmin@syncly.com'));
      const snapshot2 = await getDocs(q2);
      
      if (snapshot2.empty) {
        console.log('❌ Platform admin user not found in Firestore');
        console.log('Please create the platform admin first using: node scripts/create-platform-admin.js');
        process.exit(1);
      }
      
      const adminDoc = snapshot2.docs[0];
      const adminData = adminDoc.data();
      const adminUid = adminDoc.id;
      
      console.log(`✅ Found platform admin: ${adminData.email}`);
      console.log(`   UID: ${adminUid}`);
      console.log(`   Name: ${adminData.name}\n`);

      // Set custom claims
      console.log('Step 2: Setting custom claims...');
      const setCustomClaims = httpsCallable(functions, 'setUserCustomClaims');
      
      const result = await setCustomClaims({
        userId: adminUid,
        isPlatformAdmin: true,
        tenantId: undefined
      });

      console.log('✅ Custom claims set successfully!');
      console.log(`   Response: ${JSON.stringify(result.data)}\n`);

      console.log('🎉 SUCCESS! Platform admin is now fixed!\n');
      console.log('Next steps:');
      console.log('1. Logout from the app completely');
      console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('3. Login again as superadmin@syncly.com');
      console.log('4. Everything should work now!\n');

    } else {
      const adminDoc = snapshot.docs[0];
      const adminData = adminDoc.data();
      const adminUid = adminDoc.id;
      
      console.log(`✅ Found platform admin: ${adminData.email}`);
      console.log(`   UID: ${adminUid}`);
      console.log(`   Name: ${adminData.name}\n`);

      // Set custom claims
      console.log('Step 2: Setting custom claims...');
      const setCustomClaims = httpsCallable(functions, 'setUserCustomClaims');
      
      const result = await setCustomClaims({
        userId: adminUid,
        isPlatformAdmin: true,
        tenantId: undefined
      });

      console.log('✅ Custom claims set successfully!');
      console.log(`   Response: ${JSON.stringify(result.data)}\n`);

      console.log('🎉 SUCCESS! Platform admin is now fixed!\n');
      console.log('Next steps:');
      console.log('1. Logout from the app completely');
      console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('3. Login again as superadmin@syncly.com');
      console.log('4. Everything should work now!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixPlatformAdmin();
