import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStatus, Role, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { setCurrentTenantId, setIsPlatformAdmin } from '../../services/tenantContext';

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
                }
              } catch (error) {
                console.error('Error loading user data:', error);
                setCurrentUser(null);
                setCurrentUserRole(null);
                updateTenantContext(null);
              }
            }
          } else {
            // No Firebase user, clear local state
            if (currentUser) {
              setCurrentUser(null);
              setCurrentUserRole(null);
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
          
          await fetchUserRole(userProfile); // Fetch role before setting user
          setCurrentUser(userProfile);

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
    // CRITICAL: Clear tenant context and platform admin flag on logout
    updateTenantContext(null);
    setIsPlatformAdmin(false);
    
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
    // If we have the role doc, use its permissions
    if (currentUserRole) {
      return currentUserRole.permissions.includes(permission);
    }
    
    // FALLBACK: If role doc unavailable, use roleName from user doc
    // This ensures login works even if role doc read fails
    if (currentUser?.roleName) {
      const roleName = currentUser.roleName.toLowerCase();
      
      // Admin role has all permissions
      if (roleName === 'admin' || roleName === 'tenant admin') {
        return true;
      }
      
      // Manager role permissions (matches DEFAULT_ROLES in constants.ts)
      if (roleName === 'manager') {
        return [
          Permission.CAN_MANAGE_TEAM_REPORTS,
          Permission.CAN_ACKNOWLEDGE_REPORTS,
          Permission.CAN_MANAGE_TEAM_TASKS,
          Permission.CAN_EDIT_ANY_TASK_STATUS,
          Permission.CAN_VIEW_LEADERBOARD,
          Permission.CAN_VIEW_TEAM_CALENDAR,
          Permission.CAN_MANAGE_TEAM_MEETINGS,
          Permission.CAN_VIEW_OWN_MEETINGS,
          Permission.CAN_USE_PERFORMANCE_HUB,
          Permission.CAN_VIEW_TRIGGER_LOG,
          Permission.CAN_CREATE_PERSONAL_TASKS,
          Permission.CAN_SUBMIT_OWN_LEAVE,
          Permission.CAN_VIEW_OWN_REPORTS,
          Permission.CAN_SUBMIT_OWN_EOD,
          Permission.CAN_VIEW_OWN_CALENDAR
        ].includes(permission);
      }
      
      // Employee role permissions (matches DEFAULT_ROLES in constants.ts)
      if (roleName === 'employee') {
        return [
          Permission.CAN_CREATE_PERSONAL_TASKS,
          Permission.CAN_SUBMIT_OWN_LEAVE,
          Permission.CAN_VIEW_OWN_REPORTS,
          Permission.CAN_SUBMIT_OWN_EOD,
          Permission.CAN_VIEW_LEADERBOARD,
          Permission.CAN_VIEW_OWN_CALENDAR,
          Permission.CAN_VIEW_OWN_MEETINGS
        ].includes(permission);
      }
    }
    
    return false;
  }, [currentUserRole, currentUser]);

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
