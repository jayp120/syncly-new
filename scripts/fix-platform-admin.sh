#!/bin/bash

# This script sets custom claims for the platform admin user
# Run this to fix the "Missing or insufficient permissions" error

echo "🔧 Fixing Platform Admin Custom Claims..."
echo ""

# Get the platform admin user info from Firestore
echo "Step 1: Finding platform admin user..."
PLATFORM_ADMIN_EMAIL="superadmin@syncly.com"

# We need to get the Firebase UID from the Authentication tab
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Go to: https://console.firebase.google.com/project/syncly-473404/authentication/users"
echo "2. Find user: $PLATFORM_ADMIN_EMAIL"
echo "3. Copy the UID (first column)"
echo "4. Paste it below and press Enter:"
echo ""
read -p "Platform Admin Firebase UID: " PLATFORM_ADMIN_UID

if [ -z "$PLATFORM_ADMIN_UID" ]; then
  echo "❌ Error: UID is required"
  exit 1
fi

echo ""
echo "Step 2: Setting custom claims via Cloud Function..."
echo "UID: $PLATFORM_ADMIN_UID"
echo "isPlatformAdmin: true"
echo ""

# Call the setUserCustomClaims Cloud Function
curl -X POST \
  https://us-central1-syncly-473404.cloudfunctions.net/setUserCustomClaims \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"userId\": \"$PLATFORM_ADMIN_UID\",
      \"isPlatformAdmin\": true
    }
  }"

echo ""
echo ""
echo "✅ Done! Now:"
echo "1. Logout from the app completely"
echo "2. Clear browser cache/cookies"
echo "3. Login again as $PLATFORM_ADMIN_EMAIL"
echo "4. It should work now! 🎉"
echo ""
