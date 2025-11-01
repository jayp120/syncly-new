import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllBusinessUnits,
  getBusinessUnitById,
  createBusinessUnit,
  updateBusinessUnit,
  deleteBusinessUnit,
  getAllReports,
  getReportById,
  getReportsByEmployee,
  createReport,
  updateReport,
  deleteReport,
  getAllTasks,
  getTaskById,
  getTasksByAssignee,
  createTask,
  updateTask,
  deleteTask,
  getTaskComments,
  createTaskComment,
  getAllLeaveRecords,
  getLeaveRecordById,
  getLeaveRecordsByEmployee,
  createLeaveRecord,
  updateLeaveRecord,
  deleteLeaveRecord,
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingInstanceById,
  getMeetingInstancesBySeriesId,
  createMeetingInstance,
  getMeetingUpdates,
  createMeetingUpdate,
  getNotificationsByUser,
  createNotification,
  updateNotification,
  deleteNotification,
  getActivityLogByUser,
  getAllActivityLogs,
  createActivityLog,
  getAllTriggerLogs,
  createTriggerLog,
  getUserBadges,
  createUserBadge,
  generateFirestoreId
} from './firestoreService';
import {
  Tenant,
  User,
  Role,
  BusinessUnit,
  EODReport,
  Task,
  TaskComment,
  LeaveRecord,
  Meeting,
  MeetingInstance,
  MeetingUpdate,
  Notification,
  ActivityLogItem,
  TriggerLogEntry,
  UserBadgeRecord
} from '../types';

// In-memory cache for performance
// SECURITY: ALL tenant-scoped data MUST be keyed by tenantId to prevent cross-tenant leaks
const cache = {
  tenants: null as Tenant[] | null,
  users: {} as Record<string, User[]>,
  roles: {} as Record<string, Role[]>,
  businessUnits: {} as Record<string, BusinessUnit[]>,
  reports: {} as Record<string, EODReport[]>,
  tasks: {} as Record<string, Task[]>,
  meetings: {} as Record<string, Meeting[]>,
  lastFetch: {} as Record<string, number>
};

const CACHE_TTL = 60000; // 60 seconds cache (1 minute) - improved performance

function isCacheValid(key: string): boolean {
  const lastFetch = cache.lastFetch[key];
  return Boolean(lastFetch && (Date.now() - lastFetch) < CACHE_TTL);
}

function invalidateCache(key: string) {
  cache.lastFetch[key] = 0;
}

// Clear ALL tenant-scoped caches when user logs out or switches tenants
export function clearUserCache() {
  cache.users = {};
  cache.roles = {};
  cache.businessUnits = {};
  cache.reports = {};
  cache.tasks = {};
  cache.meetings = {};
  
  // CRITICAL: Also clear lastFetch timestamps to force re-fetch
  // Otherwise isCacheValid() will still return true!
  Object.keys(cache.lastFetch).forEach(key => {
    if (key.startsWith('users_') || key.startsWith('roles_') || 
        key.startsWith('businessUnits_') || key.startsWith('reports_') ||
        key.startsWith('tasks_') || key.startsWith('meetings_')) {
      delete cache.lastFetch[key];
    }
  });
}

// Tenant Repository
export const tenantRepository = {
  async getAll(): Promise<Tenant[]> {
    if (isCacheValid('tenants') && cache.tenants) {
      return cache.tenants;
    }
    
    const tenants = await getAllTenants();
    cache.tenants = tenants;
    cache.lastFetch['tenants'] = Date.now();
    return tenants;
  },
  
  async getById(id: string): Promise<Tenant | null> {
    if (cache.tenants) {
      const cached = cache.tenants.find(t => t.id === id);
      if (cached) return cached;
    }
    
    return await getTenantById(id);
  },
  
  async create(id: string, tenantData: Omit<Tenant, 'id'>): Promise<void> {
    await createTenant(id, tenantData);
    invalidateCache('tenants');
  },
  
  async update(id: string, tenantData: Partial<Tenant>): Promise<void> {
    await updateTenant(id, tenantData);
    invalidateCache('tenants');
  },
  
  async delete(id: string): Promise<void> {
    await deleteTenant(id);
    invalidateCache('tenants');
  }
};

// User Repository
export const userRepository = {
  async getAll(tenantId: string, forceRefresh: boolean = false): Promise<User[]> {
    // SECURITY: Tenant-specific cache key to prevent cross-tenant data leaks
    const cacheKey = `users_${tenantId}`;
    
    if (!forceRefresh && isCacheValid(cacheKey) && cache.users[tenantId]) {
      console.log('[UserRepository] Returning cached users for tenant:', tenantId);
      return cache.users[tenantId];
    }
    
    console.log('[UserRepository] Fetching fresh users for tenant:', tenantId, forceRefresh ? '(forced refresh)' : '');
    
    // SECURITY: Platform admin uses direct query, tenant admin uses current tenant
    const { getUsersByTenantId, getUsersInCurrentTenant } = await import('./firestoreService');
    const { auth } = await import('./firebase');
    const token = await auth.currentUser?.getIdTokenResult();
    const isPlatformAdmin = token?.claims?.isPlatformAdmin === true;
    
    // Platform admin can query any tenant, tenant admin queries their own
    const users = isPlatformAdmin 
      ? await getUsersByTenantId(tenantId)
      : await getUsersInCurrentTenant();
    
    console.log('[UserRepository] Fetched users count:', users.length);
    console.log('[UserRepository] Users:', users.map(u => ({ email: u.email, role: u.roleName, tenantId: u.tenantId })));
    
    cache.users[tenantId] = users;
    cache.lastFetch[cacheKey] = Date.now();
    return users;
  },
  
  async getById(id: string): Promise<User | null> {
    // Check all tenant caches for this user
    for (const tenantUsers of Object.values(cache.users)) {
      const cached = tenantUsers.find(u => u.id === id);
      if (cached) return cached;
    }
    
    return await getUserById(id);
  },
  
  async getByEmail(email: string): Promise<User | null> {
    // Check all tenant caches for this user
    for (const tenantUsers of Object.values(cache.users)) {
      const cached = tenantUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (cached) return cached;
    }
    
    return await getUserByEmail(email);
  },
  
  async create(id: string, userData: Omit<User, 'id'>): Promise<void> {
    await createUser(id, userData);
    // CRITICAL: Clear all user caches AND timestamps to force fresh fetch
    const tenantId = userData.tenantId;
    if (tenantId) {
      const cacheKey = `users_${tenantId}`;
      delete cache.users[tenantId];
      delete cache.lastFetch[cacheKey];
      console.log('[UserRepository] Cache cleared for tenant after user creation:', tenantId);
    }
  },
  
  async update(id: string, userData: Partial<User>): Promise<void> {
    await updateUser(id, userData);
    // Clear all user caches (tenant-specific)
    cache.users = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteUser(id);
    // Clear all user caches (tenant-specific)
    cache.users = {};
  }
};

// Role Repository
export const roleRepository = {
  async getAll(tenantId: string): Promise<Role[]> {
    const cacheKey = `roles_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.roles[tenantId]) {
      return cache.roles[tenantId];
    }
    
    const roles = await getAllRoles(tenantId);
    cache.roles[tenantId] = roles;
    cache.lastFetch[cacheKey] = Date.now();
    return roles;
  },
  
  async getById(id: string): Promise<Role | null> {
    for (const tenantRoles of Object.values(cache.roles)) {
      const cached = tenantRoles.find(r => r.id === id);
      if (cached) return cached;
    }
    return await getRoleById(id);
  },
  
  async create(id: string, roleData: Omit<Role, 'id'>): Promise<void> {
    await createRole(id, roleData);
    cache.roles = {};
  },
  
  async update(id: string, roleData: Partial<Role>): Promise<void> {
    await updateRole(id, roleData);
    cache.roles = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteRole(id);
    cache.roles = {};
  }
};

// Business Unit Repository
export const businessUnitRepository = {
  async getAll(tenantId: string): Promise<BusinessUnit[]> {
    const cacheKey = `businessUnits_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.businessUnits[tenantId]) {
      return cache.businessUnits[tenantId];
    }
    
    const bus = await getAllBusinessUnits(tenantId);
    cache.businessUnits[tenantId] = bus;
    cache.lastFetch[cacheKey] = Date.now();
    return bus;
  },
  
  async getById(id: string): Promise<BusinessUnit | null> {
    for (const tenantBUs of Object.values(cache.businessUnits)) {
      const cached = tenantBUs.find(b => b.id === id);
      if (cached) return cached;
    }
    return await getBusinessUnitById(id);
  },
  
  async create(id: string, buData: Omit<BusinessUnit, 'id'>): Promise<void> {
    await createBusinessUnit(id, buData);
    cache.businessUnits = {};
  },
  
  async update(id: string, buData: Partial<BusinessUnit>): Promise<void> {
    await updateBusinessUnit(id, buData);
    cache.businessUnits = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteBusinessUnit(id);
    cache.businessUnits = {};
  }
};

// Report Repository
export const reportRepository = {
  async getAll(tenantId: string): Promise<EODReport[]> {
    const cacheKey = `reports_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.reports[tenantId]) {
      return cache.reports[tenantId];
    }
    
    // Refresh token to ensure latest custom claims (tenantId) are available
    const { auth } = await import('./firebase');
    await auth.currentUser?.getIdToken(true);
    
    const reports = await getAllReports(tenantId);
    cache.reports[tenantId] = reports;
    cache.lastFetch[cacheKey] = Date.now();
    return reports;
  },
  
  async getById(id: string): Promise<EODReport | null> {
    return await getReportById(id);
  },
  
  async getByEmployee(employeeId: string): Promise<EODReport[]> {
    // Refresh token to ensure latest custom claims (tenantId) are available
    const { auth } = await import('./firebase');
    await auth.currentUser?.getIdToken(true);
    return await getReportsByEmployee(employeeId);
  },
  
  async create(id: string, reportData: Omit<EODReport, 'id'>): Promise<void> {
    await createReport(id, reportData);
    cache.reports = {};
  },
  
  async update(id: string, reportData: Partial<EODReport>): Promise<void> {
    await updateReport(id, reportData);
    cache.reports = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteReport(id);
    cache.reports = {};
  }
};

// Task Repository
export const taskRepository = {
  async getAll(tenantId: string): Promise<Task[]> {
    const cacheKey = `tasks_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.tasks[tenantId]) {
      return cache.tasks[tenantId];
    }
    
    const tasks = await getAllTasks(tenantId);
    cache.tasks[tenantId] = tasks;
    cache.lastFetch[cacheKey] = Date.now();
    return tasks;
  },
  
  async getById(id: string): Promise<Task | null> {
    return await getTaskById(id);
  },
  
  async getByAssignee(userId: string): Promise<Task[]> {
    return await getTasksByAssignee(userId);
  },
  
  async create(id: string, taskData: Omit<Task, 'id'>): Promise<void> {
    await createTask(id, taskData);
    cache.tasks = {};
  },
  
  async update(id: string, taskData: Partial<Task>): Promise<void> {
    await updateTask(id, taskData);
    cache.tasks = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteTask(id);
    cache.tasks = {};
  },
  
  async getComments(taskId: string): Promise<TaskComment[]> {
    return await getTaskComments(taskId);
  },
  
  async addComment(id: string, commentData: Omit<TaskComment, 'id'>): Promise<void> {
    await createTaskComment(id, commentData);
  }
};

// Leave Record Repository
export const leaveRepository = {
  async getAll(tenantId: string): Promise<LeaveRecord[]> {
    return await getAllLeaveRecords(tenantId);
  },

  async getById(id: string): Promise<LeaveRecord | null> {
    return await getLeaveRecordById(id);
  },
  
  async getByEmployee(employeeId: string): Promise<LeaveRecord[]> {
    return await getLeaveRecordsByEmployee(employeeId);
  },
  
  async create(id: string, leaveData: Omit<LeaveRecord, 'id'>): Promise<void> {
    await createLeaveRecord(id, leaveData);
  },
  
  async update(id: string, leaveData: Partial<LeaveRecord>): Promise<void> {
    await updateLeaveRecord(id, leaveData);
  },
  
  async delete(id: string): Promise<void> {
    await deleteLeaveRecord(id);
  }
};

// Meeting Repository  
export const meetingRepository = {
  async getAll(tenantId: string): Promise<Meeting[]> {
    const cacheKey = `meetings_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.meetings[tenantId]) {
      return cache.meetings[tenantId];
    }
    
    const meetings = await getAllMeetings(tenantId);
    cache.meetings[tenantId] = meetings;
    cache.lastFetch[cacheKey] = Date.now();
    return meetings;
  },
  
  async getById(id: string): Promise<Meeting | null> {
    return await getMeetingById(id);
  },
  
  async create(id: string, meetingData: Omit<Meeting, 'id'>): Promise<void> {
    await createMeeting(id, meetingData);
    cache.meetings = {};
  },
  
  async update(id: string, meetingData: Partial<Meeting>): Promise<void> {
    await updateMeeting(id, meetingData);
    cache.meetings = {};
  },
  
  async delete(id: string): Promise<void> {
    await deleteMeeting(id);
    cache.meetings = {};
  },
  
  async getInstance(id: string): Promise<MeetingInstance | null> {
    return await getMeetingInstanceById(id);
  },
  
  async getInstancesBySeries(seriesId: string): Promise<MeetingInstance[]> {
    return await getMeetingInstancesBySeriesId(seriesId);
  },
  
  async createInstance(id: string, instanceData: Omit<MeetingInstance, 'id'>): Promise<void> {
    await createMeetingInstance(id, instanceData);
  },
  
  async getUpdates(meetingId: string): Promise<MeetingUpdate[]> {
    return await getMeetingUpdates(meetingId);
  },
  
  async createUpdate(id: string, updateData: Omit<MeetingUpdate, 'id'>): Promise<void> {
    await createMeetingUpdate(id, updateData);
  }
};

// Notification Repository
export const notificationRepository = {
  async getByUser(userId: string): Promise<Notification[]> {
    return await getNotificationsByUser(userId);
  },
  
  async create(id: string, notificationData: Omit<Notification, 'id'>): Promise<void> {
    await createNotification(id, notificationData);
  },
  
  async update(id: string, notificationData: Partial<Notification>): Promise<void> {
    await updateNotification(id, notificationData);
  },
  
  async delete(id: string): Promise<void> {
    await deleteNotification(id);
  }
};

// Activity Log Repository (with tenant-specific caching)
export const activityLogRepository = {
  async getAll(tenantId: string): Promise<ActivityLogItem[]> {
    const cacheKey = `activityLogs_${tenantId}`;
    if (isCacheValid(cacheKey) && cache.lastFetch[cacheKey]) {
      // Note: Activity logs don't have dedicated cache storage, relying on TTL only
      // Could add cache.activityLogs[tenantId] if needed for performance
    }
    
    const logs = await getAllActivityLogs(tenantId);
    cache.lastFetch[cacheKey] = Date.now();
    return logs;
  },
  
  async getByUser(userId: string): Promise<ActivityLogItem[]> {
    return await getActivityLogByUser(userId);
  },
  
  async create(id: string, logData: Omit<ActivityLogItem, 'id'>): Promise<void> {
    await createActivityLog(id, logData);
    // Invalidate all activity log caches when creating new logs
    Object.keys(cache.lastFetch)
      .filter(key => key.startsWith('activityLogs_'))
      .forEach(key => invalidateCache(key));
  }
};

// Trigger Log Repository
export const triggerLogRepository = {
  async getAll(tenantId: string): Promise<TriggerLogEntry[]> {
    return await getAllTriggerLogs(tenantId);
  },
  
  async create(id: string, logData: Omit<TriggerLogEntry, 'id'>): Promise<void> {
    await createTriggerLog(id, logData);
  }
};

// User Badge Repository
export const badgeRepository = {
  async getByUser(userId: string): Promise<UserBadgeRecord[]> {
    return await getUserBadges(userId);
  },
  
  async create(id: string, badgeData: Omit<UserBadgeRecord, 'id'>): Promise<void> {
    await createUserBadge(id, badgeData);
  }
};

// Export ID generator
export { generateFirestoreId as generateId };
