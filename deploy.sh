#!/bin/bash
# Firebase Deployment Script for Syncly
# This script deploys Cloud Functions and Firestore rules to production

echo "🚀 Starting Firebase deployment for Syncly..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check authentication
echo "Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  Not authenticated with Firebase"
    echo "Please run: firebase login --no-localhost"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Authenticated with Firebase"
echo ""

# Build Cloud Functions
echo "📦 Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..
echo "✅ Cloud Functions built successfully"
echo ""

# Deploy Firestore Rules
echo "🔒 Deploying Firestore security rules..."
firebase deploy --only firestore:rules
if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi
echo ""

# Deploy Firestore Indexes
echo "📑 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes
if [ $? -eq 0 ]; then
    echo "✅ Firestore indexes deployed successfully"
else
    echo "⚠️  Warning: Firestore indexes deployment failed (may need manual creation)"
fi
echo ""

# Deploy Cloud Functions
echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions
if [ $? -eq 0 ]; then
    echo "✅ Cloud Functions deployed successfully"
else
    echo "❌ Failed to deploy Cloud Functions"
    exit 1
fi
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
echo ""
echo "Cloud Functions:"
firebase functions:list
echo ""
echo "Firestore Rules:"
firebase firestore:rules
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Test tenant creation via Cloud Functions"
echo "2. Verify Firestore security rules are active"
echo "3. Check Cloud Functions logs: firebase functions:log"
echo "4. Monitor in Firebase Console: https://console.firebase.google.com/project/syncly-473404"
