#!/bin/bash
# Quick redeploy script for Cloud Functions only

echo "🚀 Redeploying Cloud Functions..."
echo ""

# Build functions
echo "📦 Building Cloud Functions..."
cd functions
npm run build
cd ..
echo "✅ Built successfully"
echo ""

# Deploy only Cloud Functions
echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cloud Functions deployed successfully!"
    echo ""
    echo "🔍 Verifying deployment:"
    firebase functions:list
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "📊 Next steps:"
    echo "1. Test createTenant function in Firebase Console"
    echo "2. https://console.firebase.google.com/project/syncly-473404/functions"
else
    echo ""
    echo "❌ Deployment failed. Check errors above."
    exit 1
fi
