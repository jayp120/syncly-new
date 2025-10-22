import { User } from '../types';

let currentTenantId: string | null = null;
let isPlatformAdmin: boolean = false;

export const setCurrentTenantId = (tenantId: string | null) => {
  currentTenantId = tenantId;
};

export const setIsPlatformAdmin = (isAdmin: boolean) => {
  isPlatformAdmin = isAdmin;
};

export const checkIsPlatformAdmin = (): boolean => {
  // Check memory first
  if (isPlatformAdmin) return true;
  
  // Fallback: Check localStorage
  try {
    const userStr = localStorage.getItem('eod_current_user');
    if (userStr) {
      const user: User | null = JSON.parse(userStr);
      if (user && typeof user === 'object') {
        isPlatformAdmin = user.isPlatformAdmin || false;
        return isPlatformAdmin;
      }
    }
  } catch (error) {
    console.error('Error checking platform admin status:', error);
  }
  
  return false;
};

export const getCurrentTenantId = (): string | null => {
  // Platform admins don't have a tenantId
  if (checkIsPlatformAdmin()) return null;
  
  // Try to get from memory first
  if (currentTenantId) return currentTenantId;
  
  // Fallback: Get from localStorage (current user)
  try {
    const userStr = localStorage.getItem('eod_current_user');
    if (userStr) {
      const user: User | null = JSON.parse(userStr);
      if (user && typeof user === 'object') {
        currentTenantId = user.tenantId || null;
        return currentTenantId;
      }
    }
  } catch (error) {
    console.error('Error getting tenantId from localStorage:', error);
  }
  
  return null;
};

export const requireTenantId = (): string => {
  // Platform admins bypass tenant requirement
  if (checkIsPlatformAdmin()) {
    throw new Error('Platform admin should not require tenantId');
  }
  
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error('No tenant context available. User must be logged in.');
  }
  return tenantId;
};
