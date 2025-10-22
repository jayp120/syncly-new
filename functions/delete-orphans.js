const admin = require('firebase-admin');

// Initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const orphanedUsers = [
  { email: 'rushi@syncly.com', uid: 'E3HO408qkDO6KuPfJBhvDN44vJT2' },
  { email: 'jay@syncly.com', uid: 'Y6N6MnfpRKZWHMqBpEa9Litl3N53' }
];

async function deleteOrphanedUsers() {
  console.log('🧹 Deleting orphaned Firebase Auth users...\n');
  
  const auth = admin.auth();
  
  for (const user of orphanedUsers) {
    try {
      await auth.deleteUser(user.uid);
      console.log(`✅ DELETED: ${user.email} (UID: ${user.uid})`);
    } catch (error) {
      console.error(`❌ Failed to delete ${user.email}:`, error.message);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('You can now create users with these emails again.');
}

deleteOrphanedUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
