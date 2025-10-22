#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firestore Rules using Service Account...\n');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'syncly-473404';

// Check for service account in environment
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT not found in environment variables');
  console.log('\n📖 Setup Instructions:');
  console.log('─────────────────────────────────────────────────────');
  console.log('1. Follow: scripts/setup-firebase-service-account.md');
  console.log('2. Add service account JSON to Replit Secrets');
  console.log('3. Run this script again');
  console.log('─────────────────────────────────────────────────────\n');
  process.exit(1);
}

try {
  // Parse service account
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  console.log(`📦 Project: ${projectId}`);
  console.log(`🔑 Service Account: ${serviceAccount.client_email}\n`);

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });

  console.log('✅ Firebase Admin initialized successfully\n');

  // Read rules file
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  
  console.log('📋 Firestore Rules loaded from: firestore.rules');
  console.log(`📊 Rules size: ${rulesContent.length} bytes\n`);

  // Deploy using Firebase CLI (requires service account)
  const { execSync } = require('child_process');
  
  // Create temporary service account file
  const tempKeyPath = '/tmp/firebase-key.json';
  fs.writeFileSync(tempKeyPath, serviceAccountJson);
  
  // Set environment variable for Firebase CLI
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
  
  console.log('🚀 Deploying to Firebase...\n');
  
  try {
    execSync(
      `npx firebase deploy --only firestore:rules,firestore:indexes --project ${projectId}`,
      { 
        stdio: 'inherit',
        env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: tempKeyPath }
      }
    );
    
    console.log('\n✅ Firestore rules and indexes deployed successfully!');
    
    // Clean up temp file
    fs.unlinkSync(tempKeyPath);
    
  } catch (deployError) {
    console.error('\n❌ Deployment failed');
    
    // Clean up temp file
    if (fs.existsSync(tempKeyPath)) {
      fs.unlinkSync(tempKeyPath);
    }
    
    throw deployError;
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  
  console.log('\n📖 Troubleshooting:');
  console.log('─────────────────────────────────────────────────────');
  console.log('• Verify service account JSON is valid');
  console.log('• Ensure service account has Firebase Admin role');
  console.log('• Check project ID matches:', projectId);
  console.log('• Try manual deployment via Firebase Console');
  console.log('─────────────────────────────────────────────────────\n');
  
  process.exit(1);
}
