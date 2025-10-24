/**
 * Telegram Authentication Service
 * 
 * Handles linking Telegram users to Syncly accounts
 */

import * as admin from 'firebase-admin';
import { TelegramUser } from './types';

const TELEGRAM_USERS_COLLECTION = 'telegramUsers';

/**
 * Generate a one-time linking code
 */
export function generateLinkingCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Store linking code in Firestore (expires in 5 minutes)
 */
export async function storeLinkingCode(
  userId: string,
  tenantId: string,
  code: string
): Promise<void> {
  const db = admin.firestore();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  await db.collection('telegramLinkingCodes').doc(code).set({
    userId,
    tenantId,
    code,
    createdAt: Date.now(),
    expiresAt,
    used: false
  });
}

/**
 * Verify and consume linking code
 */
export async function verifyLinkingCode(code: string): Promise<{
  userId: string;
  tenantId: string;
} | null> {
  const db = admin.firestore();
  const codeDoc = await db.collection('telegramLinkingCodes').doc(code).get();
  
  if (!codeDoc.exists) {
    return null;
  }
  
  const data = codeDoc.data()!;
  
  // Check if expired or already used
  if (data.used || data.expiresAt < Date.now()) {
    return null;
  }
  
  // Mark as used
  await codeDoc.ref.update({ used: true, usedAt: Date.now() });
  
  return {
    userId: data.userId,
    tenantId: data.tenantId
  };
}

/**
 * Link Telegram user to Syncly account
 */
export async function linkTelegramUser(
  telegramId: string,
  telegramUsername: string | undefined,
  telegramFirstName: string | undefined,
  telegramLastName: string | undefined,
  synclyUserId: string,
  tenantId: string
): Promise<TelegramUser> {
  const db = admin.firestore();
  
  const telegramUser: TelegramUser = {
    telegramId: telegramId.toString(),
    telegramUsername,
    telegramFirstName,
    telegramLastName,
    synclyUserId,
    tenantId,
    linkedAt: Date.now(),
    isActive: true
  };
  
  // Store in Firestore with telegramId as document ID
  await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).set(telegramUser);
  
  console.log(`Telegram user ${telegramId} linked to Syncly user ${synclyUserId}`);
  
  return telegramUser;
}

/**
 * Get Syncly user info from Telegram ID
 */
export async function getSynclyUserFromTelegram(
  telegramId: string
): Promise<TelegramUser | null> {
  const db = admin.firestore();
  const doc = await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as TelegramUser;
}

/**
 * Get Telegram ID from Syncly user ID
 */
export async function getTelegramIdFromSynclyUser(
  synclyUserId: string
): Promise<string | null> {
  const db = admin.firestore();
  const snapshot = await db.collection(TELEGRAM_USERS_COLLECTION)
    .where('synclyUserId', '==', synclyUserId)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  return snapshot.docs[0].data().telegramId;
}

/**
 * Unlink Telegram account
 */
export async function unlinkTelegramUser(telegramId: string): Promise<void> {
  const db = admin.firestore();
  await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).update({
    isActive: false,
    unlinkedAt: Date.now()
  });
  
  console.log(`Telegram user ${telegramId} unlinked`);
}
