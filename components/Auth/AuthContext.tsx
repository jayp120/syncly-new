import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStatus, Role, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { setCurrentTenantId, setIsPlatformAdmin } from '../../services/tenantContext';
import { autoMigrateRoles } from '../../services/autoMigrationService';

interface AuthContextType {
  currentUser: User | null;
  currentUserRole: Role | null;
  currentTenantId: string | null; // ✅ Expose tenantId for reactive components
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('eod_current_user', null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [currentTenantId, setTenantIdState] = useState<string | null>(null); // ✅ React state for tenant
  const [isTenantAdminClaim, setIsTenantAdminClaim] = useState<boolean>(false); // ✅ Store verified custom claim
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  
  // Sync React state with module-level tenant context
  const updateTenantContext = useCallback((tenantId: string | null) => {
    setTenantIdState(tenantId);
    setCurrentTenantId(tenantId); // Also update module-level context
  }, []);

  const fetchUserRole = useCallback(async (user: User | null) => {
    if (user && user.roleId) {
      try {
        const role = await DataService.getRoleById(user.roleId);
        setCurrentUserRole(role);
      } catch (error) {
        // GRACEFUL DEGRADATION: If role doc read fails (permission error), 
        // continue with roleName from user doc instead of blocking login
        console.warn(`[AuthContext] Could not fetch role doc ${user.roleId}, using roleName from user doc:`, error);
        setCurrentUserRole(null);
        // User still has roleName in their user doc, so app can function
      }
    } else {
      setCurrentUserRole(null);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Wait for Firebase Auth state to be determined
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is authenticated, load their profile from Firestore
            if (currentUser) {
              try {
                // ✅ CRITICAL: Get custom claims from Firebase Auth token
                const tokenResult = await firebaseUser.getIdTokenResult();
                const isTenantAdmin = tokenResult.claims.isTenantAdmin === true;
                setIsTenantAdminClaim(isTenantAdmin);
                setIsPlatformAdmin(tokenResult.claims.isPlatformAdmin === true);
                
                const freshUser = await DataService.getUserById(currentUser.id);
                if(freshUser && freshUser.status === UserStatus.ACTIVE) {
                    setCurrentUser(freshUser);
                    await fetchUserRole(freshUser);
                    // CRITICAL: Set global tenant context on re-authentication
                    updateTenantContext(freshUser.tenantId || null);
                } else {
                    setCurrentUser(null);
                    setCurrentUserRole(null);
                    updateTenantContext(null);
                    setIsTenantAdminClaim(false);
                }
              } catch (error) {
                console.error('Error loading user data:', error);
                setCurrentUser(null);
                setCurrentUserRole(null);
                updateTenantContext(null);
                setIsTenantAdminClaim(false);
              }
            }
          } else {
            // No Firebase user, clear local state
            if (currentUser) {
              setCurrentUser(null);
              setCurrentUserRole(null);
              setIsTenantAdminClaim(false);
            }
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Cleanup function to unsubscribe from auth state changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Run only once on initial load

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      if (!password) {
        return false;
      }
      
      // Sign in to Firebase with email/password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredential.user.uid;
      
      // CRITICAL: Force token refresh to get custom claims (tenantId, isPlatformAdmin)
      // Custom claims are set by Cloud Functions but not available until token refresh
      await userCredential.user.getIdToken(true); // Force refresh
      
      // DEBUGGING: Log custom claims to verify they're set correctly
      const tokenResult = await userCredential.user.getIdTokenResult();
      console.log('✅ Auth token refreshed with custom claims:', {
        tenantId: tokenResult.claims.tenantId,
        isPlatformAdmin: tokenResult.claims.isPlatformAdmin,
        isTenantAdmin: tokenResult.claims.isTenantAdmin
      });
      
      // ✅ CRITICAL: Store verified custom claim in state for permission checks
      setIsTenantAdminClaim(tokenResult.claims.isTenantAdmin === true);
      
      // PRODUCTION: Firestore is already initialized - no localStorage migration needed
      // await initializeFirestoreAfterLogin(); // Disabled for production
      
      // Load user profile from Firestore using Firebase Auth UID (no email query needed!)
      const userProfile = await DataService.getUserById(firebaseUid);
      
      if (userProfile) {
          if(userProfile.status === UserStatus.ARCHIVED){
              addToast("Your account has been archived and cannot be accessed.", 'error');
              await signOut(auth); // Sign out if archived
              return false;
          }
          
          // CRITICAL: Set global tenant context for data isolation FIRST
          // Platform admins don't have a tenantId
          updateTenantContext(userProfile.tenantId || null);
          setIsPlatformAdmin(userProfile.isPlatformAdmin || false);
          
          // ✅ CRITICAL: Set tenant admin claim BEFORE setting currentUser
          // This ensures routes have the claim when they check permissions
          const isTenantAdmin = tokenResult.claims.isTenantAdmin === true;
          setIsTenantAdminClaim(isTenantAdmin);
          
          await fetchUserRole(userProfile); // Fetch role before setting user
          setCurrentUser(userProfile);

          // ✨ AUTO-MIGRATION: Automatically update role permissions if needed
          // Runs silently in background, doesn't block login
          
          if ((userProfile.isPlatformAdmin || isTenantAdmin) && userProfile.tenantId) {
            console.log('[AutoMigration] Triggering auto-migration for admin user...');
            autoMigrateRoles(userProfile.tenantId).catch(err => {
              console.warn('Auto-migration failed (non-critical):', err);
            });
          }

          try {
            await DataService.checkAndAwardBadges(userProfile.id);
          } catch (e) {
            console.error("Error checking/awarding badges on login:", e);
          }

          // Log login activity for timeline (tenant context is now set)
          try {
            await DataService.addActivityLog({
              timestamp: Date.now(),
              actorId: userProfile.id,
              actorAuthUid: firebaseUid,
              actorName: userProfile.name,
              type: 'USER_LOGIN' as any,
              description: 'logged in to the system',
              tenantId: userProfile.tenantId || 'platform'
            });
          } catch (e) {
            console.error("Error logging login activity:", e);
          }

          // ✨ NEW: Request notification permission on login
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
              if (permission === 'granted') {
                console.log('✅ Notification permission granted');
              }
            });
          }

          return true;
      }
      
      addToast('User profile not found', 'error');
      await signOut(auth);
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
        addToast('Invalid email or password', 'error');
      } else if (error?.code === 'auth/too-many-requests') {
        addToast('Too many failed attempts. Please try again later.', 'error');
      } else {
        addToast('Login failed. Please try again.', 'error');
      }
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCurrentUserRole(null);
    // CRITICAL: Clear tenant context, platform admin flag, and tenant admin claim on logout
    updateTenantContext(null);
    setIsPlatformAdmin(false);
    setIsTenantAdminClaim(false);
    
    // SECURITY: Clear user cache on logout to prevent cross-tenant data leaks
    const { clearUserCache } = await import('../../services/repositories');
    clearUserCache();
  };

  const refreshUser = useCallback(async () => {
    if (currentUser) {
      const refreshedUser = await DataService.getUserById(currentUser.id);
      if (refreshedUser) {
        const roleChanged = refreshedUser.roleId !== currentUser.roleId;
        setCurrentUser(refreshedUser);
        if(roleChanged) {
          await fetchUserRole(refreshedUser);
        }
      } else {
        await logout();
      }
    }
  }, [currentUser, setCurrentUser, fetchUserRole]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    // Platform admins have all permissions except tenant-specific ones
    if (currentUser?.isPlatformAdmin) {
      return true;
    }
    
    // ✅ SECURE: Check verified Firebase Auth custom claim for Tenant Admin
    // This bypasses outdated role permissions during migration
    // Uses isTenantAdminClaim which is set from Firebase Auth token (secure, not mutable)
    if (isTenantAdminClaim) {
      // Grant ALL tenant admin permissions based on verified custom claim (68 total)
      const tenantAdminPermissions = [
        // Role Management (6)
        Permission.CAN_MANAGE_ROLES,
        Permission.CAN_VIEW_ROLES,
        Permission.CAN_CREATE_ROLE,
        Permission.CAN_EDIT_ROLE,
        Permission.CAN_DELETE_ROLE,
        Permission.CAN_ASSIGN_PERMISSIONS,
        
        // User Management (13)
        Permission.CAN_MANAGE_USERS,
        Permission.CAN_VIEW_ALL_USERS,
        Permission.CAN_CREATE_USER,
        Permission.CAN_EDIT_USER,
        Permission.CAN_INVITE_USER,
        Permission.CAN_SUSPEND_USER,
        Permission.CAN_RESTORE_USER,
        Permission.CAN_ARCHIVE_USER,
        Permission.CAN_DELETE_ARCHIVED_USER,
        Permission.CAN_RESET_USER_PASSWORD,
        Permission.CAN_RESET_USER_MFA,
        Permission.CAN_ASSIGN_ROLE,
        Permission.CAN_VIEW_USER_ACTIVITY,
        
        // Business Unit Management (7)
        Permission.CAN_MANAGE_BUSINESS_UNITS,
        Permission.CAN_VIEW_BUSINESS_UNITS,
        Permission.CAN_CREATE_BUSINESS_UNIT,
        Permission.CAN_EDIT_BUSINESS_UNIT,
        Permission.CAN_ARCHIVE_BUSINESS_UNIT,
        Permission.CAN_DELETE_BUSINESS_UNIT,
        Permission.CAN_ASSIGN_BUSINESS_UNIT,
        
        // Task Management (10)
        Permission.CAN_MANAGE_TEAM_TASKS,
        Permission.CAN_VIEW_TEAM_TASKS,
        Permission.CAN_CREATE_TEAM_TASK,
        Permission.CAN_EDIT_TEAM_TASK,
        Permission.CAN_DELETE_ANY_TASK,
        Permission.CAN_ASSIGN_TASK,
        Permission.CAN_EDIT_ANY_TASK_STATUS,
        Permission.CAN_COMMENT_ON_TEAM_TASK,
        Permission.CAN_CREATE_PERSONAL_TASKS,
        Permission.CAN_VIEW_OWN_TASKS,
        
        // EOD Report Management (10)
        Permission.CAN_VIEW_ALL_REPORTS,
        Permission.CAN_VIEW_TEAM_REPORTS,
        Permission.CAN_VIEW_OWN_REPORTS,
        Permission.CAN_MANAGE_TEAM_REPORTS,
        Permission.CAN_ACKNOWLEDGE_REPORTS,
        Permission.CAN_ACKNOWLEDGE_ANY_EOD,
        Permission.CAN_REQUIRE_EOD_SUBMISSION,
        Permission.CAN_MARK_EOD_LATE,
        Permission.CAN_SUBMIT_OWN_EOD,
        Permission.CAN_EXPORT_EODS,
        
        // Leave Management (7)
        Permission.CAN_MANAGE_ALL_LEAVES,
        Permission.CAN_VIEW_ALL_LEAVES,
        Permission.CAN_VIEW_TEAM_LEAVES,
        Permission.CAN_APPROVE_LEAVE,
        Permission.CAN_REJECT_LEAVE,
        Permission.CAN_OVERRIDE_LEAVE_BALANCE,
        Permission.CAN_SUBMIT_OWN_LEAVE,
        
        // Meeting & Calendar Management (7)
        Permission.CAN_MANAGE_TEAM_MEETINGS,
        Permission.CAN_VIEW_TEAM_MEETINGS,
        Permission.CAN_VIEW_OWN_MEETINGS,
        Permission.CAN_SCHEDULE_MEETING,
        Permission.CAN_VIEW_TEAM_CALENDAR,
        Permission.CAN_VIEW_OWN_CALENDAR,
        Permission.CAN_MANAGE_TEAM_CALENDAR,
        
        // Settings & Integration (7)
        Permission.CAN_MANAGE_INTEGRATIONS,
        Permission.CAN_VIEW_ACTIVITY_LOG,
        Permission.CAN_VIEW_TRIGGER_LOG,
        Permission.CAN_VIEW_LEADERBOARD,
        Permission.CAN_USE_PERFORMANCE_HUB,
        Permission.CAN_VIEW_ANALYTICS_DASHBOARD,
        Permission.CAN_EXPORT_DATA,
        
        // Integration Access (3)
        Permission.CAN_USE_GOOGLE_CALENDAR,
        Permission.CAN_USE_TELEGRAM_BOT,
        Permission.CAN_USE_GEMINI_AI
      ];
      if (tenantAdminPermissions.includes(permission)) {
        return true;
      }
    }
    
    // If we have the role doc, use its permissions
    if (currentUserRole) {
      return currentUserRole.permissions.includes(permission);
    }
    
    // FALLBACK: If role doc unavailable, use roleName from user doc
    // This ensures login works even if role doc read fails
    if (currentUser?.roleName) {
      const roleName = currentUser.roleName.toLowerCase();
      
      // Tenant Admin role has all tenant-level permissions
      if (roleName === 'tenant admin' || roleName === 'admin' || roleName === 'super admin') {
        // Exclude platform-only permissions
        if ([Permission.PLATFORM_ADMIN, Permission.CAN_MANAGE_TENANTS, Permission.CAN_VIEW_ALL_TENANTS].includes(permission)) {
          return false;
        }
        return true;
      }
      
      // Manager role permissions (matches DEFAULT_ROLES in constants.ts)
      if (roleName === 'manager') {
        return [
          Permission.CAN_VIEW_USER_ACTIVITY,
          Permission.CAN_VIEW_BUSINESS_UNITS,
          Permission.CAN_VIEW_TEAM_TASKS,
          Permission.CAN_CREATE_TEAM_TASK,
          Permission.CAN_EDIT_TEAM_TASK,
          Permission.CAN_ASSIGN_TASK,
          Permission.CAN_EDIT_ANY_TASK_STATUS,
          Permission.CAN_COMMENT_ON_TEAM_TASK,
          Permission.CAN_CREATE_PERSONAL_TASKS,
          Permission.CAN_VIEW_OWN_TASKS,
          Permission.CAN_VIEW_TEAM_REPORTS,
          Permission.CAN_ACKNOWLEDGE_REPORTS,
          Permission.CAN_SUBMIT_OWN_EOD,
          Permission.CAN_VIEW_OWN_REPORTS,
          Permission.CAN_REQUIRE_EOD_SUBMISSION,
          Permission.CAN_VIEW_TEAM_LEAVES,
          Permission.CAN_APPROVE_LEAVE,
          Permission.CAN_REJECT_LEAVE,
          Permission.CAN_SUBMIT_OWN_LEAVE,
          Permission.CAN_MANAGE_TEAM_MEETINGS,
          Permission.CAN_VIEW_TEAM_MEETINGS,
          Permission.CAN_VIEW_OWN_MEETINGS,
          Permission.CAN_SCHEDULE_MEETING,
          Permission.CAN_VIEW_TEAM_CALENDAR,
          Permission.CAN_VIEW_OWN_CALENDAR,
          Permission.CAN_MANAGE_TEAM_CALENDAR,
          Permission.CAN_VIEW_ANALYTICS_DASHBOARD,
          Permission.CAN_VIEW_LEADERBOARD,
          Permission.CAN_USE_PERFORMANCE_HUB,
          Permission.CAN_VIEW_TRIGGER_LOG
        ].includes(permission);
      }
      
      // Team Lead role permissions
      if (roleName === 'team lead') {
        return [
          Permission.CAN_VIEW_BUSINESS_UNITS,
          Permission.CAN_VIEW_TEAM_TASKS,
          Permission.CAN_CREATE_TEAM_TASK,
          Permission.CAN_ASSIGN_TASK,
          Permission.CAN_COMMENT_ON_TEAM_TASK,
          Permission.CAN_CREATE_PERSONAL_TASKS,
          Permission.CAN_VIEW_OWN_TASKS,
          Permission.CAN_VIEW_TEAM_REPORTS,
          Permission.CAN_SUBMIT_OWN_EOD,
          Permission.CAN_VIEW_OWN_REPORTS,
          Permission.CAN_VIEW_TEAM_LEAVES,
          Permission.CAN_SUBMIT_OWN_LEAVE,
          Permission.CAN_VIEW_TEAM_MEETINGS,
          Permission.CAN_VIEW_OWN_MEETINGS,
          Permission.CAN_SCHEDULE_MEETING,
          Permission.CAN_VIEW_TEAM_CALENDAR,
          Permission.CAN_VIEW_OWN_CALENDAR,
          Permission.CAN_VIEW_LEADERBOARD,
          Permission.CAN_VIEW_TRIGGER_LOG
        ].includes(permission);
      }
      
      // Employee role permissions (matches DEFAULT_ROLES in constants.ts)
      if (roleName === 'employee') {
        return [
          Permission.CAN_CREATE_PERSONAL_TASKS,
          Permission.CAN_VIEW_OWN_TASKS,
          Permission.CAN_SUBMIT_OWN_EOD,
          Permission.CAN_VIEW_OWN_REPORTS,
          Permission.CAN_SUBMIT_OWN_LEAVE,
          Permission.CAN_VIEW_OWN_MEETINGS,
          Permission.CAN_VIEW_OWN_CALENDAR,
          Permission.CAN_VIEW_LEADERBOARD
        ].includes(permission);
      }
    }
    
    return false;
  }, [currentUserRole, currentUser, isTenantAdminClaim]);

  return (
    <AuthContext.Provider value={{ currentUser, currentUserRole, currentTenantId, login, logout, isLoading, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ========== Permission Utilities ==========

export const usePermission = (permission: Permission): boolean => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

export const usePermissions = (permissions: Permission[]): boolean[] => {
  const { hasPermission } = useAuth();
  return permissions.map(p => hasPermission(p));
};

export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  const { hasPermission } = useAuth();
  return permissions.some(p => hasPermission(p));
};

export const useHasAllPermissions = (permissions: Permission[]): boolean => {
  const { hasPermission } = useAuth();
  return permissions.every(p => hasPermission(p));
};

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};

interface RequireAnyPermissionProps {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireAnyPermission: React.FC<RequireAnyPermissionProps> = ({ permissions, children, fallback = null }) => {
  const hasAny = useHasAnyPermission(permissions);
  return hasAny ? <>{children}</> : <>{fallback}</>;
};

interface RequireAllPermissionsProps {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireAllPermissions: React.FC<RequireAllPermissionsProps> = ({ permissions, children, fallback = null }) => {
  const hasAll = useHasAllPermissions(permissions);
  return hasAll ? <>{children}</> : <>{fallback}</>;
};
