/**
 * Script to add Director role to existing tenants
 * Run this script to add the Director role if it's missing
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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

async function addDirectorRole() {
  try {
    console.log('🚀 Adding Director role to existing tenants...\n');

    // Get all tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    console.log(`Found ${tenantsSnapshot.size} tenant(s)\n`);

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      console.log(`Processing tenant: ${tenantData.name} (${tenantId})`);

      // Check if Director role already exists
      const rolesQuery = query(
        collection(db, 'roles'),
        where('tenantId', '==', tenantId),
        where('name', '==', 'Director')
      );
      const existingDirectorRoles = await getDocs(rolesQuery);

      if (existingDirectorRoles.size > 0) {
        console.log(`  ✅ Director role already exists for tenant ${tenantData.name}\n`);
        continue;
      }

      // Create Director role
      const directorRole = {
        tenantId: tenantId,
        name: 'Director',
        description: 'Company owner with full visibility across all business units (cannot submit reports)',
        permissions: [
          'CAN_VIEW_ALL_REPORTS',
          'CAN_MANAGE_TEAM_REPORTS',
          'CAN_ACKNOWLEDGE_REPORTS',
          'CAN_VIEW_OWN_REPORTS',
          'CAN_MANAGE_TEAM_TASKS',
          'CAN_CREATE_PERSONAL_TASKS',
          'CAN_EDIT_ANY_TASK_STATUS',
          'CAN_MANAGE_ALL_LEAVES',
          'CAN_SUBMIT_OWN_LEAVE',
          'CAN_MANAGE_TEAM_MEETINGS',
          'CAN_VIEW_OWN_MEETINGS',
          'CAN_VIEW_LEADERBOARD',
          'CAN_VIEW_TEAM_CALENDAR',
          'CAN_VIEW_OWN_CALENDAR',
          'CAN_USE_PERFORMANCE_HUB',
          'CAN_VIEW_TRIGGER_LOG'
        ]
      };

      await addDoc(collection(db, 'roles'), directorRole);
      console.log(`  ✅ Director role created for tenant ${tenantData.name}\n`);
    }

    console.log('✅ Director role addition complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Log in as Super Admin');
    console.log('2. Go to Admin Dashboard → Roles & Permissions');
    console.log('3. You should now see the Director role');
    console.log('4. Assign Director role to users in Users page\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Director role:', error);
    process.exit(1);
  }
}

addDirectorRole();
