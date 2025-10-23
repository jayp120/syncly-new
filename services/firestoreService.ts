import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp as firestoreServerTimestamp,
  writeBatch,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Role,
  BusinessUnit,
  EODReport,
  Task,
  TaskComment,
  LeaveRecord,
  UserBadgeRecord,
  Meeting,
  MeetingInstance,
  MeetingUpdate,
  Notification,
  TriggerLogEntry,
  ActivityLogItem,
  Tenant
} from '../types';

// Collection names
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  ROLES: 'roles',
  BUSINESS_UNITS: 'businessUnits',
  REPORTS: 'reports',
  TASKS: 'tasks',
  TASK_COMMENTS: 'taskComments',
  LEAVE_RECORDS: 'leaveRecords',
  USER_BADGES: 'userBadges',
  MEETINGS: 'meetings',
  MEETING_INSTANCES: 'meetingInstances',
  MEETING_UPDATES: 'meetingUpdates',
  NOTIFICATIONS: 'notifications',
  TRIGGER_LOG: 'triggerLogs',
  ACTIVITY_LOG: 'activityLogs',
  SYNC_QUEUE: 'syncQueue'
} as const;

// Helper to generate IDs
export const generateFirestoreId = (prefix: string) => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generic CRUD Operations
export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

export async function getAllDocuments<T>(collectionName: string, ...queryConstraints: QueryConstraint[]): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  } catch (error: any) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    
    // Highlight index-required errors with the auto-generated link
    if (error?.message?.includes('index')) {
      console.error('🔥 INDEX REQUIRED ERROR - Click the link above to create the index');
      console.error('Error message:', error.message);
    }
    
    throw error;
  }
}

export async function setDocument<T extends DocumentData>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    
    // Filter out undefined values (Firestore doesn't allow undefined field values)
    const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    await setDoc(docRef, {
      ...cleanedData,
      updatedAt: firestoreServerTimestamp()
    });
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
}

export async function updateDocument<T extends Partial<DocumentData>>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    
    // Filter out undefined values (Firestore doesn't allow undefined field values)
    const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    await updateDoc(docRef, {
      ...cleanedData,
      updatedAt: firestoreServerTimestamp()
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

// Batch operations
export async function batchWrite(operations: Array<{
  type: 'set' | 'update' | 'delete',
  collectionName: string,
  docId: string,
  data?: any
}>): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      const docRef = doc(db, op.collectionName, op.docId);
      
      if (op.type === 'set' && op.data) {
        batch.set(docRef, { ...op.data, updatedAt: firestoreServerTimestamp() });
      } else if (op.type === 'update' && op.data) {
        batch.update(docRef, { ...op.data, updatedAt: firestoreServerTimestamp() });
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    });
    
    await batch.commit();
  } catch (error: any) {
    // Don't log permission-denied errors (expected when user not authenticated)
    if (error?.code !== 'permission-denied') {
      console.error('Error in batch write:', error);
    }
    throw error;
  }
}

// User-specific functions
export const getUserById = (userId: string) => 
  getDocument<User>(COLLECTIONS.USERS, userId);

export const getAllUsers = (tenantId: string) => 
  getAllDocuments<User>(COLLECTIONS.USERS, where('tenantId', '==', tenantId));

export const getUserByEmail = async (email: string, tenantId?: string): Promise<User | null> => {
  const { getCurrentTenantId } = await import('./tenantContext');
  const currentTenantId = tenantId || getCurrentTenantId();
  
  if (!currentTenantId) {
    // Platform admin or no tenant - return null to prevent cross-tenant access
    return null;
  }
  
  const users = await getAllDocuments<User>(
    COLLECTIONS.USERS, 
    where('tenantId', '==', currentTenantId),
    where('email', '==', email.toLowerCase()),
    limit(1)
  );
  return users[0] || null;
};

/**
 * Get all users for a specific tenant (used by platform admin)
 * Platform admins can query any tenant by tenantId directly
 */
export const getUsersByTenantId = async (tenantId: string): Promise<User[]> => {
  console.log('[Users] Platform admin querying users for tenant:', tenantId);
  
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  const snap = await getDocs(q);
  console.log('[Users] Query returned', snap.docs.length, 'users');
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
};

/**
 * Get all users in the current tenant with proper tenant isolation
 * This function ensures fresh token claims and tenant-scoped queries
 */
export const getUsersInCurrentTenant = async (): Promise<User[]> => {
  const { getCurrentTenantId } = await import('./tenantContext');
  const { auth } = await import('./firebase');
  
  // STEP 1: Force token refresh to get fresh custom claims (tenantId, isTenantAdmin)
  await auth.currentUser?.getIdToken(true);
  const token = await auth.currentUser?.getIdTokenResult();
  console.log('[Users] Token claims:', token?.claims);
  
  // DIAGNOSTICS: Log current user doc to verify role and tenantId
  try {
    const meSnap = await getDoc(doc(db, COLLECTIONS.USERS, auth.currentUser!.uid));
    console.log('[Users] My user doc:', meSnap.exists() ? meSnap.data() : null);
  } catch (e) {
    console.warn('[Users] Failed to read my user doc for diagnostics', e);
  }
  
  // STEP 2: Get tenant ID from refreshed claims
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error('getUsersInCurrentTenant: tenantId missing. User must be logged in as tenant admin.');
  }
  
  console.log('[Users] Querying users for tenant:', tenantId);
  
  // STEP 3: Query users with tenant isolation, exclude deleted, ordered by createdAt
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  const snap = await getDocs(q);
  console.log('[Users] Query returned', snap.docs.length, 'users');
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
};

export const createUser = (userId: string, userData: Omit<User, 'id'>) =>
  setDocument(COLLECTIONS.USERS, userId, userData);

export const updateUser = (userId: string, userData: Partial<User>) =>
  updateDocument(COLLECTIONS.USERS, userId, userData);

export const deleteUser = (userId: string) =>
  deleteDocument(COLLECTIONS.USERS, userId);

// Tenant functions
export const getAllTenants = () => 
  getAllDocuments<Tenant>(COLLECTIONS.TENANTS);

export const getTenantById = (tenantId: string) => 
  getDocument<Tenant>(COLLECTIONS.TENANTS, tenantId);

export const createTenant = (tenantId: string, tenantData: Omit<Tenant, 'id'>) =>
  setDocument(COLLECTIONS.TENANTS, tenantId, tenantData);

export const updateTenant = (tenantId: string, tenantData: Partial<Tenant>) =>
  updateDocument(COLLECTIONS.TENANTS, tenantId, tenantData);

export const deleteTenant = (tenantId: string) =>
  deleteDocument(COLLECTIONS.TENANTS, tenantId);

// Role functions
export const getAllRoles = async (tenantId: string) => {
  console.log('[getAllRoles] Querying roles for tenantId:', tenantId);
  
  // Log custom claims from current auth token
  const { auth } = await import('./firebase');
  if (auth.currentUser) {
    const tokenResult = await auth.currentUser.getIdTokenResult();
    console.log('[getAllRoles] Current token claims:', {
      tenantId: tokenResult.claims.tenantId,
      isPlatformAdmin: tokenResult.claims.isPlatformAdmin,
      isTenantAdmin: tokenResult.claims.isTenantAdmin
    });
  }
  
  return getAllDocuments<Role>(COLLECTIONS.ROLES, where('tenantId', '==', tenantId));
};

export const getRoleById = (roleId: string) => 
  getDocument<Role>(COLLECTIONS.ROLES, roleId);

export const createRole = (roleId: string, roleData: Omit<Role, 'id'>) =>
  setDocument(COLLECTIONS.ROLES, roleId, roleData);

export const updateRole = (roleId: string, roleData: Partial<Role>) =>
  updateDocument(COLLECTIONS.ROLES, roleId, roleData);

export const deleteRole = (roleId: string) =>
  deleteDocument(COLLECTIONS.ROLES, roleId);

// Business Unit functions
export const getAllBusinessUnits = (tenantId: string) => 
  getAllDocuments<BusinessUnit>(COLLECTIONS.BUSINESS_UNITS, where('tenantId', '==', tenantId));

export const getBusinessUnitById = (buId: string) => 
  getDocument<BusinessUnit>(COLLECTIONS.BUSINESS_UNITS, buId);

export const createBusinessUnit = (buId: string, buData: Omit<BusinessUnit, 'id'>) =>
  setDocument(COLLECTIONS.BUSINESS_UNITS, buId, buData);

export const updateBusinessUnit = (buId: string, buData: Partial<BusinessUnit>) =>
  updateDocument(COLLECTIONS.BUSINESS_UNITS, buId, buData);

export const deleteBusinessUnit = (buId: string) =>
  deleteDocument(COLLECTIONS.BUSINESS_UNITS, buId);

// Report functions
export const getAllReports = (tenantId: string) => 
  getAllDocuments<EODReport>(COLLECTIONS.REPORTS, where('tenantId', '==', tenantId), orderBy('date', 'desc'));

export const getReportById = (reportId: string) => 
  getDocument<EODReport>(COLLECTIONS.REPORTS, reportId);

export const getReportsByEmployee = async (employeeId: string): Promise<EODReport[]> => {
  const { getCurrentTenantId } = await import('./tenantContext');
  const tenantId = getCurrentTenantId();
  
  if (!tenantId) {
    // Platform admin or no tenant - return empty to prevent permission errors
    return [];
  }
  
  return getAllDocuments<EODReport>(
    COLLECTIONS.REPORTS,
    where('tenantId', '==', tenantId),
    where('employeeId', '==', employeeId),
    orderBy('date', 'desc')
  );
}

export const getReportsByDate = async (date: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<EODReport>(
    COLLECTIONS.REPORTS,
    where('tenantId', '==', tenantId),
    where('date', '==', date)
  );
};

export const createReport = async (reportId: string, reportData: Omit<EODReport, 'id'>): Promise<void> => {
  const { getCurrentTenantId } = await import('./tenantContext');
  const tenantId = getCurrentTenantId();
  
  // Enforce tenantId on all report writes
  const dataWithTenant = {
    ...reportData,
    tenantId: reportData.tenantId || tenantId
  };
  
  if (!dataWithTenant.tenantId) {
    throw new Error('Cannot create report without tenantId');
  }
  
  return setDocument(COLLECTIONS.REPORTS, reportId, dataWithTenant);
}

export const updateReport = (reportId: string, reportData: Partial<EODReport>) =>
  updateDocument(COLLECTIONS.REPORTS, reportId, reportData);

export const deleteReport = (reportId: string) =>
  deleteDocument(COLLECTIONS.REPORTS, reportId);

// Task functions
export const getAllTasks = (tenantId: string) => 
  getAllDocuments<Task>(COLLECTIONS.TASKS, where('tenantId', '==', tenantId));

export const getTaskById = (taskId: string) => 
  getDocument<Task>(COLLECTIONS.TASKS, taskId);

export const getTasksByAssignee = async (userId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<Task>(
    COLLECTIONS.TASKS,
    where('tenantId', '==', tenantId),
    where('assignedTo', 'array-contains', userId)
  );
};

export const createTask = (taskId: string, taskData: Omit<Task, 'id'>) =>
  setDocument(COLLECTIONS.TASKS, taskId, taskData);

export const updateTask = (taskId: string, taskData: Partial<Task>) =>
  updateDocument(COLLECTIONS.TASKS, taskId, taskData);

export const deleteTask = (taskId: string) =>
  deleteDocument(COLLECTIONS.TASKS, taskId);

// Task Comment functions
export const getTaskComments = async (taskId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<TaskComment>(
    COLLECTIONS.TASK_COMMENTS,
    where('tenantId', '==', tenantId),
    where('taskId', '==', taskId),
    orderBy('createdOn', 'asc')
  );
};

export const createTaskComment = (commentId: string, commentData: Omit<TaskComment, 'id'>) =>
  setDocument(COLLECTIONS.TASK_COMMENTS, commentId, commentData);

// Leave Record functions
export const getAllLeaveRecords = (tenantId: string) => 
  getAllDocuments<LeaveRecord>(COLLECTIONS.LEAVE_RECORDS, where('tenantId', '==', tenantId));

export const getLeaveRecordsByEmployee = async (employeeId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<LeaveRecord>(
    COLLECTIONS.LEAVE_RECORDS,
    where('tenantId', '==', tenantId),
    where('employeeId', '==', employeeId)
  );
};

export const createLeaveRecord = (leaveId: string, leaveData: Omit<LeaveRecord, 'id'>) =>
  setDocument(COLLECTIONS.LEAVE_RECORDS, leaveId, leaveData);

export const updateLeaveRecord = (leaveId: string, leaveData: Partial<LeaveRecord>) =>
  updateDocument(COLLECTIONS.LEAVE_RECORDS, leaveId, leaveData);

export const deleteLeaveRecord = (leaveId: string) =>
  deleteDocument(COLLECTIONS.LEAVE_RECORDS, leaveId);

// Meeting functions
export const getAllMeetings = (tenantId: string) => 
  getAllDocuments<Meeting>(COLLECTIONS.MEETINGS, where('tenantId', '==', tenantId));

export const getMeetingById = (meetingId: string) => 
  getDocument<Meeting>(COLLECTIONS.MEETINGS, meetingId);

export const getMeetingsByAttendee = async (userId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<Meeting>(
    COLLECTIONS.MEETINGS,
    where('tenantId', '==', tenantId),
    where('attendeeIds', 'array-contains', userId)
  );
};

export const createMeeting = (meetingId: string, meetingData: Omit<Meeting, 'id'>) =>
  setDocument(COLLECTIONS.MEETINGS, meetingId, meetingData);

export const updateMeeting = (meetingId: string, meetingData: Partial<Meeting>) =>
  updateDocument(COLLECTIONS.MEETINGS, meetingId, meetingData);

export const deleteMeeting = (meetingId: string) =>
  deleteDocument(COLLECTIONS.MEETINGS, meetingId);

// Meeting Instance functions
export const getAllMeetingInstances = (tenantId: string) => 
  getAllDocuments<MeetingInstance>(COLLECTIONS.MEETING_INSTANCES, where('tenantId', '==', tenantId));

export const getMeetingInstanceById = (instanceId: string) => 
  getDocument<MeetingInstance>(COLLECTIONS.MEETING_INSTANCES, instanceId);

export const getMeetingInstancesBySeriesId = async (seriesId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<MeetingInstance>(
    COLLECTIONS.MEETING_INSTANCES,
    where('tenantId', '==', tenantId),
    where('seriesId', '==', seriesId)
  );
};

export const createMeetingInstance = (instanceId: string, instanceData: Omit<MeetingInstance, 'id'>) =>
  setDocument(COLLECTIONS.MEETING_INSTANCES, instanceId, instanceData);

export const updateMeetingInstance = (instanceId: string, instanceData: Partial<MeetingInstance>) =>
  updateDocument(COLLECTIONS.MEETING_INSTANCES, instanceId, instanceData);

// Meeting Update functions
export const getMeetingUpdates = async (meetingId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<MeetingUpdate>(
    COLLECTIONS.MEETING_UPDATES,
    where('tenantId', '==', tenantId),
    where('meetingId', '==', meetingId),
    orderBy('createdOn', 'desc')
  );
};

export const createMeetingUpdate = (updateId: string, updateData: Omit<MeetingUpdate, 'id'>) =>
  setDocument(COLLECTIONS.MEETING_UPDATES, updateId, updateData);

// User Badge functions
export const getUserBadges = async (userId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<UserBadgeRecord>(
    COLLECTIONS.USER_BADGES,
    where('tenantId', '==', tenantId),
    where('userId', '==', userId)
  );
};

export const createUserBadge = (badgeId: string, badgeData: Omit<UserBadgeRecord, 'id'>) =>
  setDocument(COLLECTIONS.USER_BADGES, badgeId, badgeData);

// Notification functions
export const getNotificationsByUser = async (userId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<Notification>(
    COLLECTIONS.NOTIFICATIONS,
    where('tenantId', '==', tenantId),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
};

export const createNotification = (notificationId: string, notificationData: Omit<Notification, 'id'>) =>
  setDocument(COLLECTIONS.NOTIFICATIONS, notificationId, notificationData);

export const updateNotification = (notificationId: string, notificationData: Partial<Notification>) =>
  updateDocument(COLLECTIONS.NOTIFICATIONS, notificationId, notificationData);

export const deleteNotification = (notificationId: string) =>
  deleteDocument(COLLECTIONS.NOTIFICATIONS, notificationId);

// Activity Log functions
export const getActivityLogByUser = async (userId: string) => {
  const { requireTenantId } = await import('./tenantContext');
  const tenantId = requireTenantId();
  return getAllDocuments<ActivityLogItem>(
    COLLECTIONS.ACTIVITY_LOG,
    where('tenantId', '==', tenantId),
    where('actorId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(200)
  );
};

export const getAllActivityLogs = (tenantId: string) =>
  getAllDocuments<ActivityLogItem>(
    COLLECTIONS.ACTIVITY_LOG,
    where('tenantId', '==', tenantId),
    orderBy('timestamp', 'desc'),
    limit(500)
  );

export const createActivityLog = (logId: string, logData: Omit<ActivityLogItem, 'id'>) =>
  setDocument(COLLECTIONS.ACTIVITY_LOG, logId, logData);

// Trigger Log functions
export const getAllTriggerLogs = (tenantId: string) => 
  getAllDocuments<TriggerLogEntry>(COLLECTIONS.TRIGGER_LOG, where('tenantId', '==', tenantId), orderBy('timestamp', 'desc'));

export const createTriggerLog = async (logId: string, logData: Omit<TriggerLogEntry, 'id'>): Promise<void> => {
  const { getCurrentTenantId } = await import('./tenantContext');
  const tenantId = getCurrentTenantId();
  
  // Enforce tenantId on all trigger log writes
  const dataWithTenant = {
    ...logData,
    tenantId: logData.tenantId || tenantId
  };
  
  if (!dataWithTenant.tenantId) {
    throw new Error('Cannot create trigger log without tenantId');
  }
  
  return setDocument(COLLECTIONS.TRIGGER_LOG, logId, dataWithTenant);
}
