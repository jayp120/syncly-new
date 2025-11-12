/**
 * Cloud Functions Service
 * 
 * Client-side interface for calling Firebase Cloud Functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

// Initialize Cloud Functions interfaces
export interface CreateTenantRequest {
  companyName: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export interface CreateTenantResponse {
  success: boolean;
  tenantId: string;
  message: string;
  data: {
    tenant: any;
    adminUserId: string;
    rolesCreated: number;
    businessUnitsCreated: number;
  };
}

export interface UpdateTenantStatusRequest {
  tenantId: string;
  status: 'Active' | 'Suspended' | 'Inactive';
}

export interface UpdateTenantPlanRequest {
  tenantId: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
}

export interface GetTenantLogsRequest {
  tenantId?: string;
  limit?: number;
}

export interface SubmitDemoRequestPayload {
  name: string;
  email: string;
  contactNumber: string;
  companyName: string;
  companySize: string;
}

/**
 * Call Cloud Function to fix all user custom claims
 * This migration sets isTenantAdmin flag for all existing Admin role users
 */
export const callFixAllUserClaims = async (): Promise<{
  success: boolean;
  message: string;
  results: {
    total: number;
    updated: number;
    skipped: number;
    errors: number;
    details: any[];
  };
}> => {
  try {
    const fixClaimsFunction = httpsCallable(functions, 'fixAllUserClaims');
    const result = await fixClaimsFunction();
    return result.data as any;
  } catch (error: any) {
    console.error('Error calling fixAllUserClaims function:', error);
    throw new Error(error.message || 'Failed to fix user claims');
  }
};

/**
 * Call Cloud Function to create a new tenant
 * This runs server-side and does NOT log out the current user
 */
export const callCreateTenant = async (request: CreateTenantRequest): Promise<CreateTenantResponse> => {
  try {
    const createTenantFunction = httpsCallable<CreateTenantRequest, CreateTenantResponse>(
      functions,
      'createTenant'
    );
    
    const result = await createTenantFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling createTenant function:', error);
    throw new Error(error.message || 'Failed to create tenant');
  }
};

/**
 * Call Cloud Function to update tenant status
 */
export const callUpdateTenantStatus = async (request: UpdateTenantStatusRequest): Promise<{ success: boolean; message: string }> => {
  try {
    const updateStatusFunction = httpsCallable<UpdateTenantStatusRequest, { success: boolean; message: string }>(
      functions,
      'updateTenantStatus'
    );
    
    const result = await updateStatusFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling updateTenantStatus function:', error);
    throw new Error(error.message || 'Failed to update tenant status');
  }
};

/**
 * Call Cloud Function to update tenant plan
 */
export const callUpdateTenantPlan = async (request: UpdateTenantPlanRequest): Promise<{ success: boolean; message: string }> => {
  try {
    const updatePlanFunction = httpsCallable<UpdateTenantPlanRequest, { success: boolean; message: string }>(
      functions,
      'updateTenantPlan'
    );
    
    const result = await updatePlanFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling updateTenantPlan function:', error);
    throw new Error(error.message || 'Failed to update tenant plan');
  }
};

/**
 * Public callable used by the landing page to request a live demo.
 */
export const callSubmitDemoRequest = async (payload: SubmitDemoRequestPayload): Promise<{ success: boolean; message: string; requestId: string }> => {
  try {
    const submitDemoFunction = httpsCallable<SubmitDemoRequestPayload, { success: boolean; message: string; requestId: string }>(
      functions,
      'submitDemoRequest'
    );
    const result = await submitDemoFunction(payload);
    return result.data;
  } catch (error: any) {
    console.error('Error submitting demo request:', error);
    throw new Error(error.message || 'Failed to submit demo request');
  }
};

/**
 * Call Cloud Function to get tenant operations logs
 */
export const callGetTenantLogs = async (request: GetTenantLogsRequest = {}): Promise<{ success: boolean; logs: any[] }> => {
  try {
    const getLogsFunction = httpsCallable<GetTenantLogsRequest, { success: boolean; logs: any[] }>(
      functions,
      'getTenantOperationsLog'
    );
    
    const result = await getLogsFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling getTenantOperationsLog function:', error);
    throw new Error(error.message || 'Failed to get tenant logs');
  }
};

/**
 * Call Cloud Function to get tenant users (secure, server-side query)
 * This prevents cross-tenant data exposure by enforcing tenant isolation server-side
 */
export const callGetTenantUsers = async (tenantId?: string): Promise<{ success: boolean; users: any[]; tenantId: string }> => {
  try {
    const getUsersFunction = httpsCallable<{ tenantId?: string }, { success: boolean; users: any[]; tenantId: string }>(
      functions,
      'getTenantUsers'
    );
    
    const result = await getUsersFunction({ tenantId });
    return result.data;
  } catch (error: any) {
    console.error('Error calling getTenantUsers function:', error);
    throw new Error(error.message || 'Failed to get tenant users');
  }
};

/**
 * Check if Cloud Functions are deployed and available
 */
export const checkCloudFunctionsAvailable = async (): Promise<boolean> => {
  try {
    // Try to call a simple function to check availability
    // If functions aren't deployed, this will fail
    httpsCallable(functions, 'createTenant');
    return true;
  } catch (error) {
    console.warn('Cloud Functions not available:', error);
    return false;
  }
};

/**
 * Call Cloud Function to create a user with Firebase Auth account
 * This ensures users can login with email/password
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  roleId: string;
  roleName?: string;
  notificationEmail?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  designation?: string;
  tenantId: string;
}

export interface CreateUserResponse {
  success: boolean;
  userId: string;
  message: string;
}

export const callCreateUser = async (request: CreateUserRequest): Promise<CreateUserResponse> => {
  try {
    const createUserFunction = httpsCallable<CreateUserRequest, CreateUserResponse>(
      functions,
      'createUser'
    );
    
    const result = await createUserFunction(request);
    return result.data;
  } catch (error: any) {
    // Firebase Functions errors expose a code/message/details structure.
    const normalizedMessage = (() => {
      const rawMessage =
        (typeof error?.message === 'string' && error.message.trim()) ||
        (typeof error?.details === 'string' && error.details.trim()) ||
        (typeof error?.details?.message === 'string' && error.details.message.trim()) ||
        '';
      if (rawMessage && rawMessage.toLowerCase() !== 'internal') {
        return rawMessage;
      }
      const errorCode = error?.code || error?.status;

      switch (errorCode) {
        case 'functions/permission-denied':
        case 'permission-denied':
          return 'You do not have permission to create users.';
        case 'functions/already-exists':
        case 'already-exists':
          return 'A user with this email already exists.';
        case 'functions/invalid-argument':
        case 'invalid-argument':
          return 'One or more fields are invalid. Please double-check and try again.';
        default:
          if (errorCode) {
            return `Failed to create user. (${errorCode})`;
          }
          return 'Failed to create user. Please try again.';
      }
    })();

    throw new Error(normalizedMessage);
  }
};

/**
 * Call Cloud Function to set custom claims for a user (migration/admin tool)
 */
export interface SetCustomClaimsRequest {
  userId: string;
  tenantId: string;
  isPlatformAdmin?: boolean;
  isTenantAdmin?: boolean;
  canManageAnnouncements?: boolean;
}

export interface SetCustomClaimsResponse {
  success: boolean;
  message: string;
}

export const callSetUserCustomClaims = async (request: SetCustomClaimsRequest): Promise<SetCustomClaimsResponse> => {
  try {
    const setClaimsFunction = httpsCallable<SetCustomClaimsRequest, SetCustomClaimsResponse>(
      functions,
      'setUserCustomClaims'
    );
    
    const result = await setClaimsFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('Error calling setUserCustomClaims function:', error);
    throw new Error(error.message || 'Failed to set custom claims');
  }
};

/**
 * ONE-TIME MIGRATION: Fix existing data (users and business units)
 * Adds missing fields: isDeleted for users, status for business units
 */
export interface MigrateDataResponse {
  success: boolean;
  message: string;
  results: {
    usersFixed: number;
    businessUnitsFixed: number;
    errors: number;
    details: any[];
  };
}

export const callMigrateExistingData = async (): Promise<MigrateDataResponse> => {
  try {
    const migrateFunction = httpsCallable<{}, MigrateDataResponse>(
      functions,
      'migrateExistingData'
    );
    
    const result = await migrateFunction({});
    return result.data;
  } catch (error: any) {
    console.error('Error calling migrateExistingData function:', error);
    throw new Error(error.message || 'Failed to migrate data');
  }
};

/**
 * Telegram Integration Functions
 */

export interface GenerateTelegramLinkingCodeResponse {
  success: boolean;
  code: string;
  deepLink: string;
  expiresAt: number;
}

export const callGenerateTelegramLinkingCode = async (): Promise<GenerateTelegramLinkingCodeResponse> => {
  try {
    const generateCodeFunction = httpsCallable<{}, GenerateTelegramLinkingCodeResponse>(
      functions,
      'generateTelegramLinkingCode'
    );
    
    const result = await generateCodeFunction({});
    return result.data;
  } catch (error: any) {
    console.error('Error calling generateTelegramLinkingCode function:', error);
    throw new Error(error.message || 'Failed to generate Telegram linking code');
  }
};
