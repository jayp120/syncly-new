/**
 * Cleanup Script: Remove Orphaned Firebase Auth Users
 * 
 * This script finds and removes Firebase Auth users that don't have 
 * corresponding Firestore documents. This happens when user creation
 * fails after Auth account is created but before Firestore write.
 * 
 * Usage: node scripts/cleanup-orphaned-users.js
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function cleanupOrphanedUsers() {
  console.log('🔍 Scanning for orphaned Firebase Auth users...\n');
  
  const auth = admin.auth();
  const firestore = admin.firestore();
  
  let orphanedCount = 0;
  let processedCount = 0;
  
  try {
    // List all Firebase Auth users
    const listUsersResult = await auth.listUsers();
    
    console.log(`📊 Total Firebase Auth users: ${listUsersResult.users.length}\n`);
    
    for (const userRecord of listUsersResult.users) {
      processedCount++;
      
      // Skip platform admin (no Firestore document expected)
      if (userRecord.customClaims?.isPlatformAdmin === true) {
        console.log(`⏭️  Skipping platform admin: ${userRecord.email}`);
        continue;
      }
      
      // Check if Firestore document exists
      const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
      
      if (!userDoc.exists) {
        console.log(`❌ ORPHANED USER FOUND:`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Created: ${new Date(userRecord.metadata.creationTime).toLocaleString()}`);
        
        // Uncomment the line below to actually delete (currently in dry-run mode)
        // await auth.deleteUser(userRecord.uid);
        // console.log(`   ✅ DELETED\n`);
        
        console.log(`   ⚠️  DRY RUN - Not deleted (uncomment code to delete)\n`);
        orphanedCount++;
      }
    }
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Total users processed: ${processedCount}`);
    console.log(`   Orphaned users found: ${orphanedCount}`);
    
    if (orphanedCount > 0) {
      console.log('\n⚠️  To delete orphaned users, edit this script and uncomment the deleteUser line.');
    } else {
      console.log('\n✅ No orphaned users found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupOrphanedUsers();
