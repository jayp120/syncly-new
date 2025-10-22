#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firestore Rules to Firebase...\n');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Error: VITE_FIREBASE_PROJECT_ID not found in environment variables');
  process.exit(1);
}

console.log(`📦 Project: ${projectId}`);
console.log('📋 Rules file: firestore.rules');
console.log('📊 Indexes file: firestore.indexes.json\n');

try {
  // Check if firebase-tools is installed
  try {
    execSync('npx firebase --version', { stdio: 'ignore' });
  } catch (e) {
    console.log('📦 Installing firebase-tools...');
    execSync('npm install -g firebase-tools', { stdio: 'inherit' });
  }

  // Method 1: Try using FIREBASE_TOKEN if available
  if (process.env.FIREBASE_TOKEN) {
    console.log('🔐 Using FIREBASE_TOKEN for authentication...');
    
    const deployCommand = `npx firebase deploy --only firestore:rules,firestore:indexes --project ${projectId} --token ${process.env.FIREBASE_TOKEN}`;
    
    console.log('🚀 Deploying...\n');
    execSync(deployCommand, { stdio: 'inherit' });
    
    console.log('\n✅ Firestore rules and indexes deployed successfully!');
    process.exit(0);
  }

  // Method 2: Interactive login (will open browser)
  console.log('⚠️  FIREBASE_TOKEN not found. Using interactive login...');
  console.log('📝 This will open a browser window for authentication.\n');
  
  // Try to login
  try {
    execSync(`npx firebase login --project ${projectId}`, { stdio: 'inherit' });
  } catch (loginError) {
    console.log('\n💡 Alternative: Get a CI token by running locally:');
    console.log('   firebase login:ci');
    console.log('   Then add the token to Replit Secrets as FIREBASE_TOKEN\n');
    throw loginError;
  }

  // Deploy after successful login
  console.log('\n🚀 Deploying rules and indexes...\n');
  execSync(`npx firebase deploy --only firestore:rules,firestore:indexes --project ${projectId}`, { 
    stdio: 'inherit' 
  });

  console.log('\n✅ Firestore rules and indexes deployed successfully!');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  
  console.log('\n📖 Manual Deployment Instructions:');
  console.log('─────────────────────────────────────────────────────');
  console.log('1. Go to: https://console.firebase.google.com');
  console.log(`2. Select project: ${projectId}`);
  console.log('3. Navigate to Firestore Database → Rules');
  console.log('4. Copy content from: firestore.rules');
  console.log('5. Paste and click "Publish"');
  console.log('6. Navigate to Firestore Database → Indexes');
  console.log('7. Import firestore.indexes.json if needed');
  console.log('─────────────────────────────────────────────────────\n');
  
  process.exit(1);
}
