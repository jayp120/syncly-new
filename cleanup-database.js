import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Initialize Firebase (using your existing config)
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

async function cleanupDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  const collections = [
    'users',
    'tenants', 
    'roles',
    'businessUnits',
    'tasks',
    'reports',
    'notifications',
    'activityLogs',
    'triggerLogs',
    'meetings',
    'badges',
    'userBadges',
    'leaveRecords',
    'tenantOperationLogs'
  ];

  for (const collectionName of collections) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const count = querySnapshot.size;
      
      if (count > 0) {
        console.log(`📦 Deleting ${count} documents from ${collectionName}...`);
        
        const deletePromises = querySnapshot.docs.map(document => 
          deleteDoc(doc(db, collectionName, document.id))
        );
        
        await Promise.all(deletePromises);
        console.log(`✅ ${collectionName} cleared`);
      } else {
        console.log(`⚪ ${collectionName} is already empty`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning ${collectionName}:`, error.message);
    }
  }

  console.log('\n🎉 Database cleanup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Go to /super-admin in your app');
  console.log('2. Create a new tenant with your company details');
  console.log('3. The system will create a user with document ID = Firebase Auth UID');
  console.log('4. Login with the credentials you created\n');
}

cleanupDatabase().catch(console.error);
