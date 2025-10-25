import React, { useEffect } from 'react';
import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import AdminDashboard, { AdminUserManagementPage, AdminAllReportsPage, AdminTriggerLogPage, AdminBusinessUnitManagementPage, AdminRolesPermissionsPage } from './components/Admin/AdminDashboard';
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard';
// FIX: Corrected import from ManagerDashboard to include newly exported page components.
import ManagerDashboard, { ManagerReportListPage, ManagerDelinquentPage, ManagerCalendarPage, ManagerPerformanceHubPage } from './components/Manager/ManagerDashboard';
import DirectorDashboard from './components/Director/DirectorDashboard';
import EmployeeDashboard, { EmployeeMyReportsPage, EmployeeSubmitEODPage, EmployeeEditEODPage, EmployeeCalendarPage } from './components/Employee/EmployeeDashboard';
import { MyTasksPage } from './components/Tasks/MyTasksPage';
import { TeamTasksPage } from './components/Manager/TeamTasksPage';
import LeaderboardPage from './components/Shared/LeaderboardPage';
import { Permission } from './types';
import Spinner from './components/Common/Spinner';
import AppLayout from './components/Layout/AppLayout';

import { processAndCacheMonthlyAwards, initializeDatabase } from './services/dataService';
import * as syncService from './services/syncService';
import eventBus from './services/eventBus';
import { ensureFirestoreReady } from './services/firestoreMigration';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/Common/ToastContainer';
import AdminLeaveManagementPage from './components/Admin/AdminLeaveManagementPage';
import MeetingListPage from './components/Meetings/MeetingListPage';
import MeetingWorkspacePage from './components/Meetings/MeetingWorkspacePage';
import { GoogleCalendarProvider } from './contexts/GoogleCalendarContext';
import IntegrationsPage from './components/Integrations/IntegrationsPage';
import TermsOfServicePage from './components/Legal/TermsOfServicePage';
import PrivacyPolicyPage from './components/Legal/PrivacyPolicyPage';
import AboutPage from './components/Legal/AboutPage';
import ErrorBoundary from './components/Common/ErrorBoundary';
import FixUsers from './src/pages/FixUsers';
import LandingPage from './components/Landing/LandingPage';
import QuickFixRoles from './components/Admin/QuickFixRoles';


// This component contains the main application content, rendered within the layout
const AppContent: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();

  if (!currentUser) {
      // This should ideally not be reached if routing is correct, but as a safeguard:
      return <Navigate to="/login" replace />;
  }
  
  const getDashboard = () => {
    // CRITICAL: Platform admin gets their own dashboard (no tenantId)
    if (currentUser?.isPlatformAdmin) return <SuperAdminDashboard />;
    // Regular tenant users get role-based dashboards
    if (hasPermission(Permission.CAN_MANAGE_USERS)) return <AdminDashboard />;
    if (currentUser?.roleName === 'Director') return <DirectorDashboard />;
    if (hasPermission(Permission.CAN_MANAGE_TEAM_REPORTS)) return <ManagerDashboard />;
    return <EmployeeDashboard />;
  };

  return (
    <Routes>
      <Route path="/" element={getDashboard()} />
      <Route path="/dashboard" element={getDashboard()} />
      
      {/* Platform Admin Routes */}
      {currentUser?.isPlatformAdmin && <Route path="/super-admin" element={<SuperAdminDashboard />} />}
      {currentUser?.isPlatformAdmin && <Route path="/fix-users" element={<FixUsers />} />}
      
      {/* Emergency Role Migration - Available to Platform Admin and Tenant Admin */}
      {(currentUser?.isPlatformAdmin || currentUser?.roleName === 'Tenant Admin') && <Route path="/fix-roles" element={<QuickFixRoles />} />}

      {/* Admin Routes */}
      {hasPermission(Permission.CAN_MANAGE_USERS) && <Route path="/user-management" element={<AdminUserManagementPage />} />}
      {hasPermission(Permission.CAN_MANAGE_ROLES) && <Route path="/roles-permissions" element={<AdminRolesPermissionsPage />} />}
      {hasPermission(Permission.CAN_MANAGE_BUSINESS_UNITS) && <Route path="/manage-business-units" element={<AdminBusinessUnitManagementPage />} />}
      {hasPermission(Permission.CAN_VIEW_ALL_REPORTS) && <Route path="/all-reports" element={<AdminAllReportsPage />} />}
      {hasPermission(Permission.CAN_VIEW_TRIGGER_LOG) && <Route path="/admin-trigger-log" element={<AdminTriggerLogPage />} />}
      {hasPermission(Permission.CAN_MANAGE_ALL_LEAVES) && <Route path="/admin/leave-records" element={<AdminLeaveManagementPage />} />}

      {/* Manager Routes */}
      {hasPermission(Permission.CAN_MANAGE_TEAM_REPORTS) && <Route path="/manage-reports" element={<ManagerReportListPage />} />}
      {hasPermission(Permission.CAN_MANAGE_TEAM_REPORTS) && <Route path="/delinquent-reports" element={<ManagerDelinquentPage />} />}
      {hasPermission(Permission.CAN_MANAGE_TEAM_TASKS) && <Route path="/team-tasks" element={<TeamTasksPage />} />}
      {hasPermission(Permission.CAN_USE_PERFORMANCE_HUB) && <Route path="/performance-hub" element={<ManagerPerformanceHubPage />} />}
      {(hasPermission(Permission.CAN_MANAGE_TEAM_MEETINGS) || hasPermission(Permission.CAN_MANAGE_USERS)) && <Route path="/integrations" element={<IntegrationsPage />} />}

      {/* Director Routes */}
      {currentUser?.roleName === 'Director' && <Route path="/director-dashboard" element={<DirectorDashboard />} />}


      {/* Employee Routes */}
      {hasPermission(Permission.CAN_VIEW_OWN_REPORTS) && <Route path="/my-reports" element={<EmployeeMyReportsPage />} />}
      {hasPermission(Permission.CAN_SUBMIT_OWN_EOD) && <Route path="/submit-eod/:forDate" element={<EmployeeSubmitEODPage />} />}
      {hasPermission(Permission.CAN_SUBMIT_OWN_EOD) && <Route path="/edit-eod/:reportId" element={<EmployeeEditEODPage />} />}
      {hasPermission(Permission.CAN_CREATE_PERSONAL_TASKS) && <Route path="/my-tasks" element={<MyTasksPage />} />}
      
      {/* Shared Routes */}
      {hasPermission(Permission.CAN_VIEW_OWN_CALENDAR) && <Route path="/calendar-view" element={hasPermission(Permission.CAN_MANAGE_TEAM_REPORTS) ? <ManagerCalendarPage /> : <EmployeeCalendarPage />} />}
      {hasPermission(Permission.CAN_VIEW_LEADERBOARD) && <Route path="/leaderboard" element={<LeaderboardPage />} />}
      {hasPermission(Permission.CAN_VIEW_OWN_MEETINGS) && <Route path="/meetings" element={<MeetingListPage />} />}
      {hasPermission(Permission.CAN_VIEW_OWN_MEETINGS) && <Route path="/meetings/:meetingId" element={<MeetingWorkspacePage />} />}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const MainAppContent = () => {
    const { currentUser, isLoading } = useAuth();
    const { addToast } = useToast();
    
    // Effect for handling offline queue processing
    useEffect(() => {
        // Process queue on initial load in case there are pending items from a previous session
        syncService.processQueue();

        const handleOnline = () => {
            addToast('Connection restored. Syncing pending actions...', 'info');
            syncService.processQueue();
        };

        const handleSyncComplete = () => {
            addToast('✅ Data synced successfully!', 'success');
        };

        window.addEventListener('online', handleOnline);
        const unsubscribe = eventBus.on('sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('online', handleOnline);
            unsubscribe();
        };
    }, [addToast]);
    
    return (
        <Routes>
            <Route path="/" element={!currentUser ? <LandingPage /> : (isLoading ? <div className="w-screen h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950"><Spinner message="Loading..." /></div> : <Navigate to="/dashboard" replace />)} />
            <Route path="/login" element={!currentUser ? <LoginForm /> : (isLoading ? <div className="w-screen h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950"><Spinner message="Loading..." /></div> : <Navigate to="/dashboard" replace />)} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/*" element={currentUser ? <AppLayout><AppContent /></AppLayout> : (isLoading ? <div className="w-screen h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950"><Spinner message="Loading..." /></div> : <Navigate to="/" replace />)} />
        </Routes>
    );
};

const App: React.FC = () => {
  useEffect(() => {
    const initApp = async () => {
      try {
        await ensureFirestoreReady();
        initializeDatabase();
        processAndCacheMonthlyAwards();
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    initApp();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AuthProvider>
                  <GoogleCalendarProvider>
                      <MainAppContent />
                  </GoogleCalendarProvider>
              </AuthProvider>
          </HashRouter>
          <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
