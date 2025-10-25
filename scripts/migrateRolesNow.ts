/**
 * One-Time Role Migration Script
 * 
 * Directly updates all system roles in Firestore to have the latest permissions.
 * Run this script once to permanently fix the permission issues.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { DEFAULT_ROLES, SYSTEM_ROLE_IDS } from '../constants';

// Firebase config from your production app
const firebaseConfig = {
  apiKey: "AIzaSyDqVLkeeHgvpkBJ4A5l5h18fqFJO8t1frs",
  authDomain: "syncly-473404.firebaseapp.com",
  projectId: "syncly-473404",
  storageBucket: "syncly-473404.firebasestorage.app",
  messagingSenderId: "1047734667746",
  appId: "1:1047734667746:web:58c50f8354d83fc2db16ba",
  measurementId: "G-1X81VT25D9"
};

async function migrateRoles() {
  console.log('🚀 Starting automatic role migration...');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    const rolesRef = collection(db, 'roles');
    const snapshot = await getDocs(rolesRef);
    
    console.log(`📊 Found ${snapshot.size} role documents in Firestore`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const roleDoc of snapshot.docs) {
      const existingRole = roleDoc.data();
      const roleId = existingRole.id;
      
      // Only migrate system roles
      if (!SYSTEM_ROLE_IDS.includes(roleId)) {
        console.log(`⏭️  Skipping custom role: ${roleId}`);
        skipped++;
        continue;
      }
      
      // Find the template for this role
      const template = DEFAULT_ROLES.find(r => r.id === roleId);
      
      if (!template) {
        console.warn(`⚠️  No template found for system role: ${roleId}`);
        skipped++;
        continue;
      }
      
      // Check if role needs updating
      const currentPermissions = new Set(existingRole.permissions || []);
      const missingPermissions = template.permissions.filter(p => !currentPermissions.has(p));
      
      if (missingPermissions.length === 0) {
        console.log(`✅ Role "${existingRole.name}" (${roleId}) is already up-to-date`);
        skipped++;
        continue;
      }
      
      console.log(`🔧 Updating role "${existingRole.name}" (${roleId})`);
      console.log(`   Current: ${currentPermissions.size} permissions`);
      console.log(`   New: ${template.permissions.length} permissions`);
      console.log(`   Adding: ${missingPermissions.length} missing permissions`);
      
      // Update the role document in Firestore
      const roleDocRef = doc(db, 'roles', roleDoc.id);
      await updateDoc(roleDocRef, {
        permissions: template.permissions,
        description: template.description,
      });
      
      updated++;
      console.log(`✅ Successfully updated role: ${existingRole.name}`);
    }
    
    console.log('\n=================================');
    console.log('✅ MIGRATION COMPLETE!');
    console.log(`   Updated: ${updated} roles`);
    console.log(`   Skipped: ${skipped} roles`);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateRoles()
  .then(() => {
    console.log('✅ All done! Your role permissions are now updated.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
