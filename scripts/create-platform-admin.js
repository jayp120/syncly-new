#!/usr/bin/env node

/**
 * ONE-TIME SCRIPT: Create Syncly Platform Super Admin
 * 
 * This script creates the platform admin account that manages all tenants.
 * Run this ONCE when setting up your Syncly platform.
 * 
 * Prerequisites:
 * 1. Temporarily relax Firestore rules to allow authenticated writes
 * 2. Run this script
 * 3. Restore production Firestore rules
 * 
 * Usage: node scripts/create-platform-admin.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const db = getFirestore(app);

async function createPlatformAdmin() {
  try {
    const ADMIN_EMAIL = 'superadmin@syncly.com';
    const ADMIN_PASSWORD = 'SuperAdmin2025!';

    console.log('🚀 Creating Syncly Platform Super Admin...\n');

    // Try to create Firebase Auth user
    console.log('Step 1: Creating Firebase Auth user...');
    let firebaseUid;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      firebaseUid = userCredential.user.uid;
      console.log(`✅ Firebase Auth user created with UID: ${firebaseUid}\n`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️  Firebase Auth user already exists, signing in...');
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        firebaseUid = userCredential.user.uid;
        console.log(`✅ Signed in with UID: ${firebaseUid}\n`);
      } else {
        throw error;
      }
    }

    // Create user document
    console.log('Step 2: Creating platform admin user document...');
    await setDoc(doc(db, 'users', firebaseUid), {
      id: firebaseUid,
      isPlatformAdmin: true, // ⭐ KEY FIELD
      email: ADMIN_EMAIL,
      notificationEmail: ADMIN_EMAIL,
      name: 'Syncly Platform Admin',
      roleId: 'platform_super_admin',
      roleName: 'Platform Super Admin',
      status: 'Active',
      designation: 'Platform Owner'
      // NO tenantId - platform admins don't belong to any tenant
    });
    console.log('✅ User document created\n');

    // Create platform admin role
    console.log('Step 3: Creating platform admin role...');
    await setDoc(doc(db, 'roles', 'platform_super_admin'), {
      id: 'platform_super_admin',
      name: 'Platform Super Admin',
      description: 'Syncly platform owner with access to all tenants',
      permissions: [
        'PLATFORM_ADMIN',
        'CAN_MANAGE_TENANTS',
        'CAN_VIEW_ALL_TENANTS',
        'CAN_MANAGE_USERS',
        'CAN_CREATE_USER',
        'CAN_EDIT_USER',
        'CAN_ARCHIVE_USER',
        'CAN_DELETE_ARCHIVED_USER',
        'CAN_MANAGE_ROLES'
      ]
      // NO tenantId - platform role
    });
    console.log('✅ Platform admin role created\n');

    console.log('🎉 SUCCESS! Platform Super Admin setup complete!\n');
    console.log('📝 Login Credentials:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');
    console.log('Next steps:');
    console.log('1. Login at the app with credentials above');
    console.log('2. Click "Admin Setup" button at bottom of login page');
    console.log('3. Enter secret code: SYNCLY2025');
    console.log('4. Create your first tenant company\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating platform admin:', error.message);
    process.exit(1);
  }
}

createPlatformAdmin();
