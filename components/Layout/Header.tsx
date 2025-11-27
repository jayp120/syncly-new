import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { User, Notification as AppNotification, ReportStatus, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import { isClientGeminiKeyAllowed } from '../../services/dataService';
import { useNavigate } from "react-router-dom";
import ThemeToggle from '../Common/ThemeToggle';
import UserAvatar from '../Common/UserAvatar';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Common/Button';
import ConfirmationModal from '../Common/ConfirmationModal';
import Modal from '../Common/Modal';
import Alert from '../Common/Alert';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import { tenantRepository } from '../../services/repositories';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const groupNotifications = (notifications: AppNotification[], currentUserId: string): AppNotification[] => {
    const commentGroups = new Map<string, AppNotification>();
    const reportSubmitGroups = new Map<string, AppNotification>(); // Key: 'pending-reports'
    const reportAckGroups = new Map<string, AppNotification>(); // Key: 'acknowledged-reports'
    const otherNotifications: AppNotification[] = [];

    const unreadNotifications = notifications.filter(n => !n.read);

    for (const notif of unreadNotifications) {
        if (notif.actionType === 'TASK_COMMENT_ADDED' && notif.targetId) {
            const group = commentGroups.get(notif.targetId) || { ...notif, actors: [] };
            if(notif.actors) group.actors!.push(...notif.actors);
            group.timestamp = Math.max(group.timestamp, notif.timestamp);
            commentGroups.set(notif.targetId, group);
        } else if (notif.actionType === 'ACKNOWLEDGE_REPORT') {
            const group = reportSubmitGroups.get('pending-reports') || { ...notif, actors: [], id: 'group-pending-reports' };
            if (notif.actors) group.actors!.push(...notif.actors);
            group.timestamp = Math.max(group.timestamp, notif.timestamp);
            reportSubmitGroups.set('pending-reports', group);
        } else if (notif.actionType === 'EOD_ACKNOWLEDGED') {
            const group = reportAckGroups.get('acknowledged-reports') || { ...notif, actors: [], id: 'group-ack-reports' };
             if (notif.actors) group.actors!.push(...notif.actors);
            group.timestamp = Math.max(group.timestamp, notif.timestamp);
            reportAckGroups.set('acknowledged-reports', group);
        }
        else {
            otherNotifications.push(notif);
        }
    }

    const groupedNotifications: AppNotification[] = [];

    // Process comment groups
    commentGroups.forEach((group, targetId) => {
        const uniqueActors = Array.from(new Map(group.actors!.map(a => [a.id, a])).values());
        const taskTitleMatch = group.message.match(/"(.*?)"/);
        const taskTitle = taskTitleMatch ? taskTitleMatch[0] : 'a task';
        let message = '';
        if (uniqueActors.length === 1) message = `${uniqueActors[0].name} commented on: ${taskTitle}`;
        else if (uniqueActors.length === 2) message = `${uniqueActors[0].name} and ${uniqueActors[1].name} commented on: ${taskTitle}`;
        else message = `${uniqueActors[0].name}, ${uniqueActors[1].name}, and ${uniqueActors.length - 2} others commented on: ${taskTitle}`;
        groupedNotifications.push({ ...group, message, actors: uniqueActors, id: `group-comment-${targetId}` });
    });

    // Process report submission groups (for managers)
    reportSubmitGroups.forEach((group) => {
        const uniqueActors = Array.from(new Map(group.actors!.map(a => [a.id, a])).values());
        let message = '';
        if (uniqueActors.length === 1) message = `${uniqueActors[0].name} submitted a new EOD report.`;
        else if (uniqueActors.length === 2) message = `${uniqueActors[0].name} and ${uniqueActors[1].name} submitted new reports.`;
        else message = `${uniqueActors[0].name}, ${uniqueActors[1].name}, and ${uniqueActors.length - 2} others submitted reports.`;
        groupedNotifications.push({ ...group, message, actors: uniqueActors });
    });

    // Process report acknowledgement groups (for employees)
    reportAckGroups.forEach((group) => {
        const uniqueActors = Array.from(new Map(group.actors!.map(a => [a.id, a])).values()); // Here actors are {id: reportId, name: reportDate}
        let message = '';
        if (uniqueActors.length === 1) message = `Your report for ${uniqueActors[0].name} has been acknowledged.`;
        else if (uniqueActors.length === 2) message = `Your reports for ${uniqueActors[0].name} and ${uniqueActors[1].name} were acknowledged.`;
        else message = `Your reports for ${uniqueActors[0].name}, ${uniqueActors[1].name}, and ${uniqueActors.length - 2} others were acknowledged.`;
        groupedNotifications.push({ ...group, message, actors: uniqueActors });
    });

    return [...groupedNotifications, ...otherNotifications, ...notifications.filter(n => n.read)];
}


const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, logout, hasPermission, currentTenantId } = useAuth();
  const { addToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const prevUnreadCount = useRef(0);
  const navigate = useNavigate();
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [hasStoredGeminiKey, setHasStoredGeminiKey] = useState(false);
  const [hasTenantGeminiKey, setHasTenantGeminiKey] = useState(false);
  const allowClientGeminiKey = isClientGeminiKeyAllowed();
  const canManageAiKey = !!currentUser && currentUser.isPlatformAdmin;
  const [orgLabel, setOrgLabel] = useState<string>(() => {
    if (!currentUser) return '';
    if (currentUser.isPlatformAdmin) return 'Syncly Platform Admin';
    return currentUser.tenant?.companyName || 'Your organization';
  });

  useEffect(() => {
    if (!isApiKeyModalOpen) {
      return;
    }

    const currentKey = DataService.getGeminiApiKey();
    setAiApiKey(currentKey ?? '');
    setHasStoredGeminiKey(Boolean(currentKey));
    setApiKeyError(null);

    // Check tenant-level key availability
    DataService.getGeminiApiKeyAsync().then((key) => setHasTenantGeminiKey(Boolean(key)));

    const unsubscribe = DataService.onGeminiKeyChange((value) => {
      setAiApiKey(value ?? '');
      setHasStoredGeminiKey(Boolean(value));
      setApiKeyError(null);
      setHasTenantGeminiKey(Boolean(value));
    });

    return () => {
      unsubscribe();
    };
  }, [isApiKeyModalOpen]);

  useEffect(() => {
    if (!currentUser) {
      setOrgLabel('');
      return;
    }
    if (currentUser.isPlatformAdmin) {
      setOrgLabel('Syncly Platform Admin');
      return;
    }
    const fallback = currentUser.tenant?.companyName || 'Your organization';
    setOrgLabel(fallback);
    if (!currentTenantId) return;

    tenantRepository
      .getById(currentTenantId)
      .then((tenant) => {
        if (tenant) {
          setOrgLabel(tenant.name || (tenant as any).companyName || tenant.domain || fallback);
        }
      })
      .catch(() => {
        setOrgLabel(fallback);
      });
  }, [currentUser, currentTenantId]);

  const handleSaveApiKey = useCallback(() => {
    if (!allowClientGeminiKey) return;
    const trimmed = aiApiKey.trim();
    if (!trimmed) {
      setApiKeyError('Please paste a valid Google Gemini API key to enable AI features.');
      return;
    }

    setIsSavingApiKey(true);
    setApiKeyError(null);
    try {
      DataService.setGeminiApiKey(trimmed);
      addToast('Gemini API key saved to this device. AI tools are ready to use.', 'success');
      setHasStoredGeminiKey(true);
      setIsApiKeyModalOpen(false);
    } catch (error) {
      console.error('Failed to store Gemini API key:', error);
      setApiKeyError('Could not save the API key on this device. Please try again.');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [aiApiKey, addToast]);

  const handleClearApiKey = useCallback(() => {
    if (!allowClientGeminiKey) return;
    DataService.clearGeminiApiKey();
    setAiApiKey('');
    setApiKeyError(null);
    setHasStoredGeminiKey(false);
    addToast('Gemini API key removed from this device.', 'info');
  }, [addToast]);

  // ✨ NEW: Use real-time notifications hook for instant updates
  const {
    notifications: rawNotifications,
    unreadCount,
    hasCrucialUnread,
    markAsRead,
    markAllAsRead,
    clearReadNotifications
  } = useRealTimeNotifications(currentUser?.id);

  // Group notifications for display
  const notifications = currentUser ? groupNotifications(rawNotifications, currentUser.id) : [];

  // Animate bell icon when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
        setJustUpdated(true);
        const timer = setTimeout(() => setJustUpdated(false), 1500);
        return () => clearTimeout(timer);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.id.startsWith('group-')) {
      await markAsRead(notification.id);
    }
    if (notification.link) navigate(notification.link);
    setNotificationsOpen(false);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };
  
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
    addToast('All notifications marked as read.', 'info');
  };

  const handleClearReadNotifications = async () => {
    await clearReadNotifications();
  };
  
  const handleConfirmClearAll = async () => {
    if (!currentUser) return;
    await DataService.clearAllUserNotifications(currentUser.id);
    addToast('All notifications have been cleared.', 'success');
    setIsConfirmClearAllOpen(false);
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;
    
    setPasswordError('');
    setIsChangingPassword(true);
    
    try {
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../../services/firebase');
      const user = auth.currentUser;
      
      if (!user) {
        setPasswordError('Not authenticated');
        setIsChangingPassword(false);
        return;
      }
      
      // SECURITY: Check server-verified custom claim for platform admin status
      const token = await user.getIdTokenResult();
      const isPlatformAdmin = token.claims.isPlatformAdmin === true;
      
      // Validation
      if (!isPlatformAdmin && (!oldPassword || oldPassword.length < 6)) {
        setPasswordError('Current password is required');
        setIsChangingPassword(false);
        return;
      }
      
      if (!newPassword || newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long');
        setIsChangingPassword(false);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        setIsChangingPassword(false);
        return;
      }
      
      // SECURITY: Regular users must reauthenticate before changing password
      // Platform admin relies on Firebase's requires-recent-login check
      if (!isPlatformAdmin) {
        const credential = EmailAuthProvider.credential(user.email!, oldPassword);
        await reauthenticateWithCredential(user, credential);
      }
      
      await updatePassword(user, newPassword);
      addToast('Password changed successfully!', 'success');
      setIsPasswordChangeOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('Please log out and log back in before changing password');
      } else {
        setPasswordError(error.message || 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAcknowledgeReport = async (e: React.MouseEvent, reportId: string, notificationId: string) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
        await DataService.updateReportByManager({ id: reportId, status: ReportStatus.ACKNOWLEDGED }, currentUser);
        addToast("Report Acknowledged!", "success");
        if(!notificationId.startsWith('group-')) {
          await markAsRead(notificationId);
        }
    } catch (error) {
        addToast("Failed to acknowledge report.", "error");
    }
  };

  if (!currentUser) return null;

  const hasReadNotifications = notifications.some(n => n.read && n.userId === currentUser.id);

  const getNotificationIcon = (notif: AppNotification) => {
    if (notif.actionType === 'TASK_COMMENT_ADDED') return <span className="mr-3 text-xl" aria-hidden="true">💬</span>;
    if (notif.actionType === 'ACKNOWLEDGE_REPORT') return <i className="fas fa-file-alt mr-3 text-green-500"></i>;
    if (notif.actionType === 'EOD_ACKNOWLEDGED') return <i className="fas fa-check-circle mr-3 text-green-500"></i>;
    
    switch(notif.type) {
        case 'reminder': return <span className="mr-3 text-xl" aria-hidden="true">🔔</span>;
        case 'warning': return <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>;
        case 'info':
        default: return <i className="fas fa-info-circle mr-3 text-blue-500"></i>;
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1; // Unread first
      }
      if ((a.isCrucial || false) !== (b.isCrucial || false)) {
        return (a.isCrucial || false) ? -1 : 1; // Crucial unread first
      }
      return b.timestamp - a.timestamp; // Then by time
  });

  return (
    <>
    <header className="bg-surface-primary/80 dark:bg-dark-surface-secondary/80 backdrop-blur-lg border-b border-border-primary dark:border-dark-border p-4 flex justify-between items-center sticky top-0 z-20">
      <div className="flex items-center">
        <button 
          onClick={onToggleSidebar} 
          className="lg:hidden mr-4 p-2.5 rounded-md text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
          aria-label="Open sidebar"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>
        <div className="hidden md:flex flex-col leading-tight">
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text">Welcome, {currentUser.name.split(' ')[0]}!</h2>
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{orgLabel}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <ThemeToggle />

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 transition-all duration-200"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <span
              style={{ filter: unreadCount > 0 ? 'grayscale(0)' : 'grayscale(1)', opacity: unreadCount > 0 ? 1 : 0.7 }}
              className={`text-2xl transition-all duration-300 ease-in-out ${hasCrucialUnread ? 'animate-pulse-slow' : (justUpdated ? 'animate-bounce' : '')}`}
              aria-hidden="true"
            >
              🔔
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">{unreadCount}</span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-primary dark:bg-dark-surface-primary backdrop-blur-md rounded-lg shadow-2xl overflow-hidden z-20 border border-border-primary dark:border-dark-border">
              <div className="p-3 font-semibold text-sm text-text-primary dark:text-dark-text border-b dark:border-dark-border flex justify-between items-center bg-surface-secondary/50 dark:bg-dark-surface-secondary/50">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="text-xs text-primary dark:text-accent hover:underline font-semibold">Mark all as Read</button>
                )}
              </div>
              {sortedNotifications.length === 0 ? (
                 <p className="p-4 text-sm text-text-secondary dark:text-dark-text-secondary">No new notifications.</p>
              ) : (
                <ul className="max-h-96 overflow-y-auto">
                  {sortedNotifications.map(notif => (
                    <li
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
                      role="button"
                      tabIndex={0}
                      className={`w-full text-left p-3 border-b border-border-primary dark:border-dark-border/50 hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${
                       !notif.read && notif.isCrucial ? 'bg-amber-400/20' : !notif.read ? 'bg-primary/10 dark:bg-sky-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start">
                        {getNotificationIcon(notif)}
                        <p className="text-sm text-text-primary dark:text-dark-text flex-grow">{notif.message}</p>
                      </div>
                      <div className="flex justify-between items-center mt-1 pl-8"> 
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{new Date(notif.timestamp).toLocaleString()}</p>
                        {!notif.read && !notif.id.startsWith('group-') && (
                            <button
                                onClick={(e) => handleMarkAsRead(e, notif.id)}
                                className="text-xs text-primary dark:text-accent hover:underline font-semibold"
                            >
                                Mark as Read
                            </button>
                        )}
                      </div>
                       {notif.actionType === 'ACKNOWLEDGE_REPORT' && notif.targetId && !notif.read && !notif.id.startsWith('group-') && (
                        <div className="pl-8 mt-2">
                           <Button 
                              variant="success" 
                              size="sm" 
                              onClick={(e) => handleAcknowledgeReport(e, notif.targetId!, notif.id)}
                              className="w-full"
                           >
                            <i className="fas fa-check-circle mr-2"></i> Acknowledge Report
                           </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
               {notifications.length > 0 && (
                <div className="p-2 border-t dark:border-dark-border flex justify-end space-x-2 bg-surface-secondary/50 dark:bg-dark-surface-secondary/50">
                    <Button variant="ghost" size="sm" onClick={handleClearReadNotifications} disabled={!hasReadNotifications}>Clear Read</Button>
                    <Button variant="danger" size="sm" onClick={() => setIsConfirmClearAllOpen(true)}>Clear All</Button>
                </div>
               )}
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center focus:outline-none p-1 rounded-full hover:bg-surface-hover dark:hover:bg-dark-surface-hover focus:ring-2 focus:ring-accent focus:ring-offset-1 transition-colors">
            <UserAvatar name={currentUser.name} size="md" className="ring-2 ring-white/20 dark:ring-dark-bg/20" />
            <span className="text-text-primary dark:text-dark-text font-semibold mr-2 hidden md:inline ml-2">{currentUser.name}</span>
            <i className={`fas fa-chevron-down ml-1 text-text-secondary dark:text-dark-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-primary dark:bg-dark-surface-primary backdrop-blur-md rounded-lg shadow-2xl py-1 z-20 border border-border-primary dark:border-dark-border">
              <div className="px-4 py-3 text-sm text-text-secondary dark:text-dark-text-secondary border-b border-border-primary dark:border-dark-border/50">
                <p className="font-semibold text-text-primary dark:text-dark-text">{currentUser.name}</p>
                <p className="text-xs">{currentUser.email}</p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">{orgLabel}</p>
                <p className="text-xs mt-1 bg-surface-secondary dark:bg-dark-surface-secondary text-text-secondary dark:text-dark-text-secondary inline-block px-2 py-0.5 rounded-full">{currentUser.roleName || 'Platform Admin'}</p> 
              </div>
              {currentUser?.isPlatformAdmin && allowClientGeminiKey && (
                <button
                  onClick={() => { setIsApiKeyModalOpen(true); setDropdownOpen(false); }}
                  className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
                >
                  <i className="fas fa-robot mr-2"></i>Manage Tenant AI Key
                </button>
              )}
              <button
                onClick={() => { setIsPasswordChangeOpen(true); setDropdownOpen(false); }}
                className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
              >
                <i className="fas fa-key mr-2"></i>Change Password
              </button>
              <button
                onClick={() => { logout(); setDropdownOpen(false); }}
                className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-500/10"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <ConfirmationModal
        isOpen={isConfirmClearAllOpen}
        onClose={() => setIsConfirmClearAllOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Confirm Clear All Notifications"
        confirmButtonVariant="danger"
        confirmText="Yes, Clear All"
      >
        <p>Are you sure you want to clear all your notifications? This action cannot be undone.</p>
    </ConfirmationModal>

    {allowClientGeminiKey && (
      <Modal
        isOpen={isApiKeyModalOpen}
        onClose={() => {
          if (isSavingApiKey) return;
          setIsApiKeyModalOpen(false);
          setAiApiKey('');
          setApiKeyError(null);
        }}
        title="Tenant AI Configuration"
      >
        <div className="space-y-4">
          {hasTenantGeminiKey ? (
            <Alert
              type="success"
              message="AI is configured by your organization. This tenant uses a server-managed key."
              className="mb-2"
            />
          ) : (
            <Alert
              type="warning"
              message="No tenant AI key is configured. Please ask a platform admin to set it in the Super Admin panel."
              className="mb-2"
            />
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">How this works</p>
            <p>- Tenant AI keys are set by platform admins in the Super Admin panel.</p>
            <p>- Keys are stored server-side per tenant; end users do not need to paste keys.</p>
            <p>- This view is informational; tenant users cannot add personal keys.</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                if (isSavingApiKey) return;
                setIsApiKeyModalOpen(false);
                setAiApiKey('');
                setApiKeyError(null);
              }}
              disabled={isSavingApiKey}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    )}

    <Modal
      isOpen={isPasswordChangeOpen}
      onClose={() => {
        setIsPasswordChangeOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
      }}
      title="Change Password"
    >
      <div className="space-y-4">
        {!currentUser?.isPlatformAdmin && (
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border-primary dark:border-dark-border rounded-lg bg-surface-primary dark:bg-dark-surface-secondary text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter current password"
              disabled={isChangingPassword}
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border-primary dark:border-dark-border rounded-lg bg-surface-primary dark:bg-dark-surface-secondary text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter new password (min 6 characters)"
            disabled={isChangingPassword}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border-primary dark:border-dark-border rounded-lg bg-surface-primary dark:bg-dark-surface-secondary text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Confirm new password"
            disabled={isChangingPassword}
          />
        </div>

        {passwordError && (
          <p className="text-red-500 text-sm">{passwordError}</p>
        )}

        <div className="flex justify-end space-x-2 mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsPasswordChangeOpen(false);
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError('');
            }}
            disabled={isChangingPassword}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePasswordChange}
            disabled={isChangingPassword}
          >
            <i className={`fas ${isChangingPassword ? 'fa-spinner fa-spin' : 'fa-key'} mr-2`}></i>
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default Header;
