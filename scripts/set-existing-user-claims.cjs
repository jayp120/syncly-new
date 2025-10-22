const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setClaimsForExistingUsers() {
  try {
    console.log('🔧 Setting custom claims for existing users...\n');

    // 1. Set claims for Platform Admin (superadmin@syncly.com)
    console.log('1️⃣ Setting claims for Platform Admin...');
    try {
      const platformAdminUser = await auth.getUserByEmail('superadmin@syncly.com');
      await auth.setCustomUserClaims(platformAdminUser.uid, {
        isPlatformAdmin: true,
        tenantId: null
      });
      console.log(`✅ Platform Admin claims set (${platformAdminUser.uid})`);
      console.log('   - isPlatformAdmin: true');
      console.log('   - tenantId: null\n');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️  Platform Admin not found, skipping...\n');
      } else {
        throw error;
      }
    }

    // 2. Find all tenant admin users and set claims
    console.log('2️⃣ Finding all tenant admin users...');
    const usersSnapshot = await db.collection('users').get();
    
    let tenantAdminCount = 0;
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Skip platform admin
      if (userData.isPlatformAdmin) {
        continue;
      }
      
      // Check if user is a tenant admin (has tenantId and admin role)
      if (userData.tenantId && (userData.roleName === 'Admin' || userData.roleId)) {
        console.log(`\n   Setting claims for: ${userData.email}`);
        console.log(`   - Name: ${userData.name}`);
        console.log(`   - TenantId: ${userData.tenantId}`);
        console.log(`   - Role: ${userData.roleName}`);
        
        try {
          // Get Firebase Auth user by email
          const authUser = await auth.getUserByEmail(userData.email);
          
          // Set custom claims (including isTenantAdmin for Admin role)
          const isTenantAdmin = userData.roleName === 'Admin';
          await auth.setCustomUserClaims(authUser.uid, {
            tenantId: userData.tenantId,
            isPlatformAdmin: false,
            isTenantAdmin: isTenantAdmin
          });
          
          // Update Firestore to mark claims as set
          await db.collection('users').doc(doc.id).update({
            customClaimsSet: true,
            updatedAt: Date.now()
          });
          
          console.log(`   ✅ Claims set for ${userData.email}`);
          console.log(`      - tenantId: ${userData.tenantId}`);
          console.log(`      - isPlatformAdmin: false`);
          console.log(`      - isTenantAdmin: ${isTenantAdmin}`);
          tenantAdminCount++;
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`   ⚠️  Firebase Auth account not found for ${userData.email}`);
            console.log(`   ℹ️  This user was created in Firestore only, not in Firebase Auth`);
            console.log(`   ℹ️  They need to be recreated using the createUser Cloud Function`);
          } else {
            console.error(`   ❌ Error setting claims for ${userData.email}:`, authError.message);
          }
        }
      }
    }
    
    console.log(`\n✅ Complete! Set claims for ${tenantAdminCount} tenant admin user(s)`);
    console.log('\n📝 Next Steps:');
    console.log('1. Ask existing users to logout completely');
    console.log('2. Have them login again to get fresh tokens with custom claims');
    console.log('3. If any user shows "Firebase Auth account not found", recreate them using:');
    console.log('   - Go to Users → Add User in the dashboard');
    console.log('   - Fill in their details with a NEW password');
    console.log('   - They can then login with the new credentials\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

setClaimsForExistingUsers();
