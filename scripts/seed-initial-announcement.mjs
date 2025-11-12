#!/usr/bin/env node

/**
 * Seed a baseline HR announcement so environments have real data to validate against.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" \
 *   SYNC_TENANT_ID="tenant_123" \
 *   SYNC_HR_USER_ID="user_abc" \
 *   node scripts/seed-initial-announcement.mjs
 */

import admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const tenantId = process.env.SYNC_TENANT_ID;
const hrUserId = process.env.SYNC_HR_USER_ID;
const hrUserNameOverride = process.env.SYNC_HR_USER_NAME;

if (!serviceAccountJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var.');
  process.exit(1);
}

if (!tenantId) {
  console.error('Missing SYNC_TENANT_ID env var.');
  process.exit(1);
}

if (!hrUserId) {
  console.error('Missing SYNC_HR_USER_ID env var.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson))
});

const db = admin.firestore();

async function resolveHrName() {
  if (hrUserNameOverride) return hrUserNameOverride;
  const userSnap = await db.collection('users').doc(hrUserId).get();
  return userSnap.exists ? userSnap.data().name || 'People Operations' : 'People Operations';
}

async function alreadySeeded() {
  const snapshot = await db
    .collection('announcements')
    .where('tenantId', '==', tenantId)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function run() {
  if (await alreadySeeded()) {
    console.log('Announcement already exists for tenant. Skipping.');
    return;
  }

  const now = Date.now();
  const endsAt = now + 7 * 24 * 60 * 60 * 1000;
  const createdByName = await resolveHrName();
  const docRef = db.collection('announcements').doc();

  const announcement = {
    id: docRef.id,
    tenantId,
    title: 'Welcome to Syncly HR Command Center',
    content:
      'This is our unified workspace for wellbeing, attendance, and organization-wide communication. ' +
      'Look out for weekly digests, recognition shout-outs, and policy refreshes here.',
    targetType: 'all',
    startsAt: now,
    endsAt,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: hrUserId,
    createdByName,
    requireAcknowledgement: false,
  };

  await docRef.set(announcement);
  console.log(`Seeded announcement ${docRef.id} for tenant ${tenantId}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
