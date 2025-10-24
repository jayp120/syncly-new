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
  
  // Build telegram user object, omitting undefined fields for Firestore compatibility
  const telegramUser: any = {
    telegramId: telegramId.toString(),
    synclyUserId,
    tenantId,
    linkedAt: Date.now(),
    isActive: true
  };
  
  // Only add optional fields if they exist
  if (telegramUsername) telegramUser.telegramUsername = telegramUsername;
  if (telegramFirstName) telegramUser.telegramFirstName = telegramFirstName;
  if (telegramLastName) telegramUser.telegramLastName = telegramLastName;
  
  // Store in telegramUsers collection (for reverse lookup: telegramId -> userId)
  await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).set(telegramUser);
  
  // Also update the user document with Telegram info (for UI to check connection status)
  const userUpdate: any = {
    telegramChatId: telegramId.toString()
  };
  if (telegramUsername) userUpdate.telegramUsername = telegramUsername;
  if (telegramFirstName) userUpdate.telegramFirstName = telegramFirstName;
  if (telegramLastName) userUpdate.telegramLastName = telegramLastName;
  
  await db.collection('users').doc(synclyUserId).update(userUpdate);
  
  console.log(`Telegram user ${telegramId} linked to Syncly user ${synclyUserId}`);
  
  return telegramUser as TelegramUser;
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
  
  // Get the linked user info first
  const telegramDoc = await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).get();
  const telegramData = telegramDoc.data();
  
  // Mark as inactive in telegramUsers collection
  await db.collection(TELEGRAM_USERS_COLLECTION).doc(telegramId.toString()).update({
    isActive: false,
    unlinkedAt: Date.now()
  });
  
  // Also remove from user document
  if (telegramData?.synclyUserId) {
    await db.collection('users').doc(telegramData.synclyUserId).update({
      telegramChatId: null,
      telegramUsername: null,
      telegramFirstName: null,
      telegramLastName: null
    });
  }
  
  console.log(`Telegram user ${telegramId} unlinked`);
}
