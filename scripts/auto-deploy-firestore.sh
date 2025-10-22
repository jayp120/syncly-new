#!/bin/bash

echo "🚀 Automated Firestore Rules Deployment"
echo "========================================"
echo ""

PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-syncly-473404}"
echo "📦 Project: $PROJECT_ID"
echo ""

# Method 1: Check for FIREBASE_TOKEN
if [ ! -z "$FIREBASE_TOKEN" ]; then
    echo "✅ Found FIREBASE_TOKEN - deploying..."
    npx firebase deploy --only firestore:rules,firestore:indexes --project $PROJECT_ID --token $FIREBASE_TOKEN
    exit $?
fi

# Method 2: Check for FIREBASE_SERVICE_ACCOUNT
if [ ! -z "$FIREBASE_SERVICE_ACCOUNT" ]; then
    echo "✅ Found FIREBASE_SERVICE_ACCOUNT - deploying..."
    node scripts/deploy-with-service-account.js
    exit $?
fi

# Method 3: No credentials found - provide instructions
echo "❌ No Firebase credentials found"
echo ""
echo "To deploy Firestore rules, add ONE of these to Replit Secrets:"
echo ""
echo "Option 1 (Recommended) - Firebase CI Token:"
echo "  1. Run locally: firebase login:ci"
echo "  2. Copy the token"
echo "  3. Add to Replit Secrets:"
echo "     Name: FIREBASE_TOKEN"
echo "     Value: <your-token>"
echo ""
echo "Option 2 - Service Account JSON:"
echo "  1. Follow: scripts/setup-firebase-service-account.md"
echo "  2. Add to Replit Secrets:"
echo "     Name: FIREBASE_SERVICE_ACCOUNT"  
echo "     Value: <entire-json-content>"
echo ""
echo "Option 3 - Manual Deployment:"
echo "  1. Go to: https://console.firebase.google.com"
echo "  2. Select project: $PROJECT_ID"
echo "  3. Navigate to: Firestore Database → Rules"
echo "  4. Copy from: firestore.rules"
echo "  5. Paste and click 'Publish'"
echo ""
echo "Then run: bash scripts/auto-deploy-firestore.sh"
echo ""

exit 1
