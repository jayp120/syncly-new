/**
 * Telegram Chat Service
 * 
 * Manages Telegram chat conversations and message persistence
 */

import * as admin from 'firebase-admin';
import { getSynclyUserFromTelegram } from './auth';

export interface TelegramChat {
  chatId: string;
  telegramUserId: string;
  synclyUserId: string | null;
  tenantId: string | null;
  isLinked: boolean;
  lastMessageText: string;
  lastMessageAt: number;
  messageCount: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TelegramMessage {
  messageId: string;
  chatId: string;
  text: string;
  fromUserId: string;
  fromUsername: string | null;
  fromFirstName: string | null;
  fromLastName: string | null;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}

const TELEGRAM_CHATS_COLLECTION = 'telegramChats';

/**
 * Store an incoming message and update chat metadata
 */
export async function storeIncomingMessage(
  chatId: string,
  messageId: string,
  text: string,
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }
): Promise<void> {
  const db = admin.firestore();
  const telegramUserId = from.id.toString();
  
  // Check if user is linked to a Syncly account
  const linkedUser = await getSynclyUserFromTelegram(telegramUserId);
  
  // Create or update chat document
  const chatRef = db.collection(TELEGRAM_CHATS_COLLECTION).doc(chatId);
  const chatDoc = await chatRef.get();
  
  if (!chatDoc.exists) {
    // Create new chat
    const newChat: TelegramChat = {
      chatId,
      telegramUserId,
      synclyUserId: linkedUser?.synclyUserId || null,
      tenantId: linkedUser?.tenantId || null,
      isLinked: !!linkedUser,
      lastMessageText: text,
      lastMessageAt: Date.now(),
      messageCount: 1,
      username: from.username || null,
      firstName: from.first_name || null,
      lastName: from.last_name || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await chatRef.set(newChat);
  } else {
    // Update existing chat
    await chatRef.update({
      lastMessageText: text,
      lastMessageAt: Date.now(),
      messageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: Date.now(),
      // Update linkage status if it changed
      ...(linkedUser && {
        synclyUserId: linkedUser.synclyUserId,
        tenantId: linkedUser.tenantId,
        isLinked: true
      })
    });
  }
  
  // Store the message in subcollection
  const message: TelegramMessage = {
    messageId: messageId.toString(),
    chatId,
    text,
    fromUserId: telegramUserId,
    fromUsername: from.username || null,
    fromFirstName: from.first_name || null,
    fromLastName: from.last_name || null,
    timestamp: Date.now(),
    direction: 'incoming'
  };
  
  await chatRef.collection('messages').doc(messageId.toString()).set(message);
  
  console.log(`Stored message ${messageId} in chat ${chatId}`);
}

/**
 * Store an outgoing message (from bot to user)
 */
export async function storeOutgoingMessage(
  chatId: string,
  messageId: string,
  text: string
): Promise<void> {
  const db = admin.firestore();
  const chatRef = db.collection(TELEGRAM_CHATS_COLLECTION).doc(chatId);
  
  const message: TelegramMessage = {
    messageId: messageId.toString(),
    chatId,
    text,
    fromUserId: 'bot',
    fromUsername: 'Syncly Bot',
    fromFirstName: null,
    fromLastName: null,
    timestamp: Date.now(),
    direction: 'outgoing'
  };
  
  await chatRef.collection('messages').doc(messageId.toString()).set(message);
}

/**
 * Get all chats for a tenant
 */
export async function getChatsByTenant(tenantId: string): Promise<TelegramChat[]> {
  const db = admin.firestore();
  const snapshot = await db.collection(TELEGRAM_CHATS_COLLECTION)
    .where('tenantId', '==', tenantId)
    .orderBy('lastMessageAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data() as TelegramChat);
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string, limit: number = 50): Promise<TelegramMessage[]> {
  const db = admin.firestore();
  const snapshot = await db.collection(TELEGRAM_CHATS_COLLECTION)
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => doc.data() as TelegramMessage);
}

/**
 * Update chat linkage when user links their Telegram account
 */
export async function updateChatLinkage(
  telegramUserId: string,
  synclyUserId: string,
  tenantId: string
): Promise<void> {
  const db = admin.firestore();
  
  // Find all chats for this Telegram user
  const snapshot = await db.collection(TELEGRAM_CHATS_COLLECTION)
    .where('telegramUserId', '==', telegramUserId)
    .get();
  
  // Update all chats to reflect the linkage
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      synclyUserId,
      tenantId,
      isLinked: true,
      updatedAt: Date.now()
    });
  });
  
  await batch.commit();
  console.log(`Updated ${snapshot.docs.length} chats for linked user ${telegramUserId}`);
}
