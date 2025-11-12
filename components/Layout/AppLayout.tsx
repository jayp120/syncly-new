import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import useLocalStorage from '../../hooks/useLocalStorage';
import { runScheduledChecks } from '../../services/notificationScheduler';
import * as DataService from '../../services/dataService';
import { ANNOUNCEMENTS_KEY, MEETINGS_KEY } from '../../constants';
import eventBus from '../../services/eventBus';
import { useToast } from '../../contexts/ToastContext';
import MeetingStartToast from '../Manager/MeetingStartToast';
import { Announcement, Meeting, User } from '../../types';
import AnnouncementBoardModal from '../Announcements/AnnouncementBoardModal';


const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast, removeToast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // State for mobile overlay sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // State for desktop collapsible sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebar_collapsed', false);
  const [hasUnseenMeetings, setHasUnseenMeetings] = useState(false);
  const [boardAnnouncements, setBoardAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementBoardVisible, setIsAnnouncementBoardVisible] = useState(false);


  useEffect(() => {
    // Platform admin doesn't need users list (they see Super Admin Dashboard)
    if (currentUser && !currentUser.isPlatformAdmin) {
      DataService.getUsers().then(setAllUsers);
    }
  }, [currentUser]);

  const checkUnseenMeetings = useCallback(async () => {
    // Platform admin doesn't have meetings (they manage tenants, not participate in tenant activities)
    if (currentUser && !currentUser.isPlatformAdmin) {
        const meetings = await DataService.getMeetingsForUser(currentUser.id);
        const unseen = meetings.some(m => !m.seenBy?.includes(currentUser.id));
        setHasUnseenMeetings(unseen);
    }
  }, [currentUser]);

  const refreshAnnouncementBoard = useCallback(async () => {
    if (!currentUser || currentUser.isPlatformAdmin) {
        setBoardAnnouncements([]);
        setIsAnnouncementBoardVisible(false);
        return;
    }
    try {
        const [activeAnnouncements, views] = await Promise.all([
            DataService.getActiveAnnouncementsForUser(currentUser),
            DataService.getAnnouncementViewsForUser(currentUser.id),
        ]);
        const pending = activeAnnouncements.filter((announcement) => {
            const view = views[announcement.id];
            if (!view) return true;
            const lastInteraction = view.acknowledgedAt || view.viewedAt;
            return (announcement.updatedAt || announcement.startsAt) > (lastInteraction || 0);
        });
        setBoardAnnouncements(pending);
        setIsAnnouncementBoardVisible(pending.length > 0);
    } catch (error) {
        console.error('Unable to refresh announcement board', error);
    }
  }, [currentUser]);

  useEffect(() => {
      checkUnseenMeetings();
      // Also listen for changes
      const handleDataChange = (data?: any) => {
          if (data?.keyChanged === MEETINGS_KEY) {
              checkUnseenMeetings();
          }
          if (data?.keyChanged === ANNOUNCEMENTS_KEY) {
              refreshAnnouncementBoard();
          }
      };
      const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
      return () => unsubscribe();
  }, [checkUnseenMeetings, refreshAnnouncementBoard]);

  useEffect(() => {
    refreshAnnouncementBoard();
  }, [refreshAnnouncementBoard]);

  // --- Real-time Cross-Tab Synchronization ---
  useEffect(() => {
    const syncTabs = (event: StorageEvent) => {
      // The 'storage' event is fired in all other tabs/windows when localStorage is changed.
      // We check if the key belongs to our app and then emit an event on the local event bus.
      // This triggers the useEffect hooks in components to refetch their data.
      if (event.key && event.key.startsWith('eod_')) {
        console.log(`[Cross-Tab Sync] Received update for key: ${event.key}`);
        eventBus.emit('appDataChanged', { keyChanged: event.key });
      }
    };

    window.addEventListener('storage', syncTabs);

    return () => {
      window.removeEventListener('storage', syncTabs);
    };
  }, []);


  useEffect(() => {
    // This effect is for the mobile overlay behavior
    if (window.innerWidth < 1024 && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const PERMISSION_REQUESTED_KEY = 'notification_permission_requested';
    const permissionRequested = localStorage.getItem(PERMISSION_REQUESTED_KEY);
    
    if ('Notification' in window && Notification.permission === 'default' && !permissionRequested) {
      Notification.requestPermission().then(permission => {
        localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
        console.log('Notification permission status:', permission);
      });
    }
  }, []); // Run only once when the layout mounts

  // --- NEW: Meeting Reminder Listener ---
  useEffect(() => {
    const handleShowReminder = (data: { meeting: Meeting; occurrenceDate: Date; toastId: number }) => {
        const toastId = data.toastId;
        addToast(
            <MeetingStartToast 
                meeting={data.meeting} 
                occurrenceDate={data.occurrenceDate}
                allUsers={allUsers}
                onClose={() => removeToast(toastId)} 
            />,
            'custom',
            Infinity // Keep it open until user interaction
        );
    };

    const unsubscribe = eventBus.on('show-meeting-reminder', handleShowReminder);
    return () => unsubscribe();
  }, [addToast, removeToast, allUsers]);

  // --- Notification Scheduler ---
  useEffect(() => {
    if (!currentUser) return;
    
    // Run checks immediately on login/layout mount
    runScheduledChecks(currentUser);
    
    // Set up an interval to run checks periodically (e.g., every minute)
    const intervalId = setInterval(() => {
        if(currentUser) { // Check again in case of logout
            runScheduledChecks(currentUser);
        }
    }, 60 * 1000); // 60000 ms = 1 minute

    // Clean up the interval when the component unmounts or user logs out
    return () => {
        clearInterval(intervalId);
    };
  }, [currentUser]); // Re-run if user changes


  if (!currentUser) return null;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        hasUnseenMeetings={hasUnseenMeetings}
      />
      
      <div 
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <Header 
          onToggleSidebar={toggleSidebar} 
        />
        <AnnouncementBoardModal
          announcements={boardAnnouncements}
          isOpen={isAnnouncementBoardVisible}
          onDismiss={async (announcement, acknowledge) => {
            if (!currentUser) return;
            await DataService.markAnnouncementViewed(announcement.id, currentUser, { acknowledge });
            await refreshAnnouncementBoard();
          }}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
