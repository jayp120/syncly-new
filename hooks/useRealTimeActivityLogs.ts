import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ActivityLogItem, TimelineEvent, User } from '../types';
import { transformActivityToTimelineEvent } from '../services/dataService';
import { requireTenantId } from '../services/tenantContext';

interface UseRealTimeActivityLogsReturn {
  activities: TimelineEvent[];
  isLoading: boolean;
}

export const useRealTimeActivityLogs = (
  currentUser: User | null,
  maxItems: number = 50
): UseRealTimeActivityLogsReturn => {
  const [activities, setActivities] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribe: Unsubscribe | undefined;

    try {
      const tenantId = requireTenantId();
      
      // Create real-time listener for activity logs
      const activityLogsRef = collection(db, 'activityLogs');
      const q = query(
        activityLogsRef,
        where('tenantId', '==', tenantId),
        orderBy('timestamp', 'desc'),
        limit(maxItems)
      );

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const logs: ActivityLogItem[] = [];
          
          snapshot.forEach((doc) => {
            logs.push({
              id: doc.id,
              ...doc.data()
            } as ActivityLogItem);
          });

          // Transform to timeline events
          const timelineEvents = await Promise.all(
            logs.map(log => transformActivityToTimelineEvent(log, currentUser))
          );

          setActivities(timelineEvents);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error listening to activity logs:', error);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up activity logs listener:', error);
      setIsLoading(false);
    }

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, maxItems]);

  return {
    activities,
    isLoading
  };
};
