import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function testActivityLogs() {
  try {
    console.log('🧪 Testing Activity Logs for Tenant Admin...\n');

    // Find tenant admin user
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'testadmin@testorg.com')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ Tenant admin not found: testadmin@testorg.com');
      return;
    }

    const tenantAdmin = usersSnapshot.docs[0].data();
    const tenantId = tenantAdmin.tenantId;
    console.log(`✅ Found tenant admin: ${tenantAdmin.name}`);
    console.log(`   Tenant ID: ${tenantId}\n`);

    // Check existing activity logs
    const activityLogsSnapshot = await db.collection('activityLogs')
      .where('tenantId', '==', tenantId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    console.log(`📊 Activity Logs for Tenant (${activityLogsSnapshot.size} recent):`);
    console.log('─'.repeat(80));

    if (activityLogsSnapshot.empty) {
      console.log('⚠️  No activity logs found for this tenant yet');
    } else {
      activityLogsSnapshot.forEach((doc, index) => {
        const log = doc.data();
        const date = new Date(log.timestamp).toLocaleString();
        console.log(`${index + 1}. [${log.type}] ${log.actorName} ${log.description} ${log.targetName || ''}`);
        console.log(`   Time: ${date}`);
        console.log(`   ID: ${doc.id}`);
        console.log('');
      });
    }

    // Check business units
    const businessUnitsSnapshot = await db.collection('businessUnits')
      .where('tenantId', '==', tenantId)
      .get();

    console.log('\n📋 Business Units for Tenant:');
    console.log('─'.repeat(80));

    if (businessUnitsSnapshot.empty) {
      console.log('⚠️  No business units found');
    } else {
      businessUnitsSnapshot.forEach((doc, index) => {
        const bu = doc.data();
        console.log(`${index + 1}. ${bu.name} (${bu.status})`);
        console.log(`   ID: ${doc.id}`);
      });
    }

    // Check roles
    const rolesSnapshot = await db.collection('roles')
      .where('tenantId', '==', tenantId)
      .get();

    console.log('\n👥 Roles for Tenant:');
    console.log('─'.repeat(80));

    if (rolesSnapshot.empty) {
      console.log('⚠️  No roles found');
    } else {
      rolesSnapshot.forEach((doc, index) => {
        const role = doc.data();
        console.log(`${index + 1}. ${role.name}`);
        console.log(`   ID: ${doc.id}`);
      });
    }

    console.log('\n✅ Test complete!');
    console.log('\n📝 Instructions:');
    console.log('1. Login as testadmin@testorg.com');
    console.log('2. Create a business unit');
    console.log('3. Run this script again to verify activity log was created');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testActivityLogs().then(() => process.exit(0));
