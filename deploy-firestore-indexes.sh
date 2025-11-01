#!/bin/bash

echo "========================================="
echo "Syncly - Firestore Indexes Deployment"
echo "========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

echo "✅ Firebase CLI detected"
echo ""

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase:"
    firebase login
fi

echo ""
echo "📋 Deploying indexes from firestore.indexes.json..."
echo ""

# Deploy indexes
firebase deploy --only firestore:indexes --project syncly-19

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Deployment initiated successfully!"
    echo "========================================="
    echo ""
    echo "⏱️  Index build time: 5-15 minutes"
    echo ""
    echo "📊 Check status:"
    echo "  firebase firestore:indexes --project syncly-19"
    echo ""
    echo "Or visit:"
    echo "  https://console.firebase.google.com/project/syncly-19/firestore/indexes"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Try:"
    echo "  1. firebase login --reauth"
    echo "  2. Check your project ID"
    echo "  3. Ensure you have Editor/Owner role"
    echo ""
fi
