/**
 * Telegram Service
 * 
 * Client-side service for managing Telegram chats and messages
 */

import { db } from './firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe, getDocs } from 'firebase/firestore';

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

const TELEGRAM_CHATS_COLLECTION = 'telegramChats';

/**
 * Get all Telegram chats for a tenant (one-time fetch)
 */
export const getTelegramChats = async (tenantId: string): Promise<TelegramChat[]> => {
  try {
    const chatsRef = collection(db, TELEGRAM_CHATS_COLLECTION);
    const q = query(
      chatsRef,
      where('tenantId', '==', tenantId),
      orderBy('lastMessageAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TelegramChat);
  } catch (error) {
    console.error('Error fetching Telegram chats:', error);
    return [];
  }
};

/**
 * Subscribe to real-time updates of Telegram chats for a tenant
 */
export const subscribeTelegramChats = (
  tenantId: string,
  onUpdate: (chats: TelegramChat[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const chatsRef = collection(db, TELEGRAM_CHATS_COLLECTION);
  const q = query(
    chatsRef,
    where('tenantId', '==', tenantId),
    orderBy('lastMessageAt', 'desc'),
    limit(100)
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs.map(doc => doc.data() as TelegramChat);
      onUpdate(chats);
    },
    (error) => {
      console.error('Error subscribing to Telegram chats:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  );
};

/**
 * Get all unlinked Telegram chats (for super admin view)
 */
export const getUnlinkedTelegramChats = async (): Promise<TelegramChat[]> => {
  try {
    const chatsRef = collection(db, TELEGRAM_CHATS_COLLECTION);
    const q = query(
      chatsRef,
      where('isLinked', '==', false),
      orderBy('lastMessageAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TelegramChat);
  } catch (error) {
    console.error('Error fetching unlinked Telegram chats:', error);
    return [];
  }
};
