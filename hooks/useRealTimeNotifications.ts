import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Notification as AppNotification } from '../types';
import * as DataService from '../services/dataService';
import { useAuth } from '../components/Auth/AuthContext';

interface UseRealTimeNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  hasCrucialUnread: boolean;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearReadNotifications: () => Promise<void>;
}

export const useRealTimeNotifications = (userId: string | undefined): UseRealTimeNotificationsReturn => {
  const { currentTenantId } = useAuth(); // ✅ Get reactive tenantId from context
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCrucialUnread, setHasCrucialUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const shownNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !currentTenantId) {
      setNotifications([]);
      setUnreadCount(0);
      setHasCrucialUnread(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribe: Unsubscribe | undefined;

    try {
      // Create real-time listener for user's notifications with TENANT FILTERING
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('tenantId', '==', currentTenantId), // ✅ Multi-tenant security: Filter by tenant
        where('userId', '==', userId),             // Filter by user
        orderBy('timestamp', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifs: AppNotification[] = [];
          
          snapshot.forEach((doc) => {
            notifs.push({
              id: doc.id,
              ...doc.data()
            } as AppNotification);
          });

          setNotifications(notifs);
          
          // Calculate unread count and crucial status
          const unread = notifs.filter(n => !n.read);
          setUnreadCount(unread.length);
          setHasCrucialUnread(unread.some(n => n.isCrucial));
          setIsLoading(false);

          // Trigger desktop notification for NEW crucial notifications (dedupe by ID)
          const latestCrucial = notifs.find(n => !n.read && n.isCrucial && !shownNotificationIds.current.has(n.id));
          if (latestCrucial && 'Notification' in window && Notification.permission === 'granted') {
            shownNotificationIds.current.add(latestCrucial.id);
            new Notification(latestCrucial.type === 'warning' ? '⚠️ Important Alert' : '🔔 New Notification', {
              body: latestCrucial.message,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-badge-72x72.png',
              tag: latestCrucial.id,
              requireInteraction: true,
              data: { url: latestCrucial.link || '/' }
            });
          }
        },
        (error) => {
          console.error('Error listening to notifications:', error);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setIsLoading(false);
    }

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, currentTenantId]); // ✅ Re-run when userId or tenantId changes (both are reactive)

  const markAsRead = useCallback(async (notificationId: string) => {
    await DataService.markNotificationAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    await DataService.markAllNotificationsAsRead(userId || '');
  }, [userId]);

  const clearReadNotifications = useCallback(async () => {
    await DataService.clearReadUserNotifications(userId || '');
  }, [userId]);

  return {
    notifications,
    unreadCount,
    hasCrucialUnread,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearReadNotifications
  };
};
