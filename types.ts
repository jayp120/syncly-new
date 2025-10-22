export enum Permission {
  // --- Platform Admin (Syncly Owner) ---
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  CAN_MANAGE_TENANTS = 'CAN_MANAGE_TENANTS',
  CAN_VIEW_ALL_TENANTS = 'CAN_VIEW_ALL_TENANTS',

  // --- User Management ---
  CAN_MANAGE_USERS = 'CAN_MANAGE_USERS',
  CAN_CREATE_USER = 'CAN_CREATE_USER',
  CAN_EDIT_USER = 'CAN_EDIT_USER',
  CAN_ARCHIVE_USER = 'CAN_ARCHIVE_USER',
  CAN_DELETE_ARCHIVED_USER = 'CAN_DELETE_ARCHIVED_USER',

  // --- Role Management ---
  CAN_MANAGE_ROLES = 'CAN_MANAGE_ROLES',

  // --- Report Management ---
  CAN_VIEW_ALL_REPORTS = 'CAN_VIEW_ALL_REPORTS',        // Admin level
  CAN_MANAGE_TEAM_REPORTS = 'CAN_MANAGE_TEAM_REPORTS',  // Manager level
  CAN_ACKNOWLEDGE_REPORTS = 'CAN_ACKNOWLEDGE_REPORTS',
  CAN_SUBMIT_OWN_EOD = 'CAN_SUBMIT_OWN_EOD',            // Employee can submit EOD
  CAN_VIEW_OWN_REPORTS = 'CAN_VIEW_OWN_REPORTS',        // Employee can view their reports

  // --- Task Management ---
  CAN_MANAGE_TEAM_TASKS = 'CAN_MANAGE_TEAM_TASKS',
  CAN_CREATE_PERSONAL_TASKS = 'CAN_CREATE_PERSONAL_TASKS',
  CAN_EDIT_ANY_TASK_STATUS = 'CAN_EDIT_ANY_TASK_STATUS', // New permission

  // --- Leave Management ---
  CAN_MANAGE_ALL_LEAVES = 'CAN_MANAGE_ALL_LEAVES',
  CAN_SUBMIT_OWN_LEAVE = 'CAN_SUBMIT_OWN_LEAVE',

  // --- Meeting Management ---
  CAN_MANAGE_TEAM_MEETINGS = 'CAN_MANAGE_TEAM_MEETINGS', // Create/edit team meetings
  CAN_VIEW_OWN_MEETINGS = 'CAN_VIEW_OWN_MEETINGS',       // View meeting workspace

  // --- Other Features ---
  CAN_VIEW_LEADERBOARD = 'CAN_VIEW_LEADERBOARD',
  CAN_VIEW_TEAM_CALENDAR = 'CAN_VIEW_TEAM_CALENDAR',
  CAN_VIEW_OWN_CALENDAR = 'CAN_VIEW_OWN_CALENDAR',
  CAN_MANAGE_BUSINESS_UNITS = 'CAN_MANAGE_BUSINESS_UNITS',
  CAN_VIEW_TRIGGER_LOG = 'CAN_VIEW_TRIGGER_LOG',
  CAN_USE_PERFORMANCE_HUB = 'CAN_USE_PERFORMANCE_HUB',
}

export interface Role {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  name: string;
  description: string;
  permissions: Permission[];
}

export enum UserStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface User {
  id: string; 
  tenantId?: string; // Multi-tenant: Organization/Company ID (undefined for platform admin)
  isPlatformAdmin?: boolean; // True for Syncly platform owner
  email: string; // This is the login ID, e.g., user@mittaleod.com
  notificationEmail: string; // This is the real email for calendar invites, notifications, etc.
  name: string;
  roleId: string;
  roleName?: string; // For display, populated by dataService
  status: UserStatus;
  designation?: string; 
  weeklyOffDay?: string; 
  businessUnitId?: string;
  businessUnitName?: string; 
  isSuspended?: boolean;
}

export enum ReportStatus {
  PENDING_ACKNOWLEDGMENT = 'Pending Acknowledgment',
  ACKNOWLEDGED = 'Acknowledged',
}

export interface Attachment {
  name: string;
  type: string; 
  size: number; 
  dataUrl: string; 
}

export interface ReportVersion {
  versionNumber: number;
  tasksCompleted: string;
  challengesFaced?: string;
  planForTomorrow?: string;
  attachments?: Attachment[];
  isCopied?: boolean; 
  timestamp: number; 
  action: 'submitted' | 'edited'; 
}

export interface ReportAcknowledgment {
  managerId: string;
  managerName: string;
  acknowledgedAt: number;
  comments?: string;
  designation?: string; // Manager, Director, etc.
}

export interface EODReport {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  employeeId: string;
  employeeName: string; 
  date: string; 
  versions: ReportVersion[]; 
  status: ReportStatus; 
  managerComments?: string; 
  submittedOnWeekOff?: boolean; 
  isLate: boolean; 
  isYesterdaySubmission?: boolean; 
  submittedAt: number; 
  // Legacy fields for backward compatibility
  acknowledgedByManagerId?: string; 
  acknowledgedAt?: number;
  // Multi-manager acknowledgment support
  acknowledgments?: ReportAcknowledgment[];
}

// --- Task Management System Types ---

export enum TaskPriority {
    High = 'High',
    Medium = 'Medium',
    Low = 'Low',
}

export enum TaskStatus {
    NotStarted = 'Not Started',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Blocked = 'Blocked',
}

export enum TaskType {
    Team = 'Team Task',
    Direct = 'Direct Assignment',
    Personal = 'Personal Task',
}

export interface MemberProgress {
    status: TaskStatus;
    completedAt?: number;
}

export interface SubTask {
  title: string;
  completed: boolean;
}

export interface Task {
    id: string;
    tenantId: string; // Multi-tenant: Organization/Company ID
    title: string;
    description: string;
    teamName?: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string; // YYYY-MM-DD
    assignedTo: string[]; // Array of employee IDs
    memberProgress?: { [employeeId: string]: MemberProgress };
    createdBy: string; // User ID of creator
    createdOn: number; // Timestamp
    updatedOn: number; // Timestamp
    taskType: TaskType;
    isPersonalTask: boolean; // Shortcut to identify personal tasks
    pinnedBy: string[]; // Array of user IDs who have pinned this task
    overdueReminderSentFor?: string[]; // Array of user IDs for whom a reminder has been sent
    meetingId?: string; // ID of the meeting instance that generated this task
    subTasks?: SubTask[]; // Optional sub-tasks for the main task
}

export interface TaskComment {
    id: string;
    tenantId: string; // Multi-tenant: Organization/Company ID
    taskId: string;
    text: string;
    createdBy: string; // User ID
    createdOn: number; // Timestamp
}

// --- End of Task Management System Types ---

// --- Smart Meeting Assistant Types ---
export enum RsvpStatus {
    ATTENDING = 'Attending',
    MAYBE = 'Maybe',
    DECLINED = 'Declined',
}

export interface MeetingInstance {
    id: string;
    tenantId: string; // Multi-tenant: Organization/Company ID
    seriesId: string; // ID of the parent Meeting series
    occurrenceDate: string; // YYYY-MM-DD for this specific instance
    meetingMinutes: string; // The finalized, official minutes from this live session
    taskIds: string[]; // Array of Task IDs generated from this specific instance
    finalizedAt: number; // Timestamp when this instance was finalized
    isAsynchronous?: boolean; // To flag catch-up posts
}

export interface Meeting {
    id: string;
    tenantId: string; // Multi-tenant: Organization/Company ID
    title: string;
    meetingDateTime: number; // timestamp for the START of the series
    attendeeIds: string[]; // Array of employee User IDs
    externalGuests?: string[]; // Array of external guest emails
    createdBy: string; // Manager's User ID
    createdAt: number; // Timestamp of creation
    updatedAt?: number; // Timestamp of last update
    updatedBy?: string; // User ID of last updater
    attendeeRsvps?: { [userId: string]: RsvpStatus }; // Tracks RSVP status
    
    // Differentiator for meeting types
    meetingType?: 'live_memo' | 'formal_meeting';

    // For Formal Meetings
    agenda?: string;
    attachments?: Attachment[];
    recurrenceRule?: 'none' | 'daily' | 'weekly' | 'monthly';
    recurrenceEndDate?: number; // Timestamp of when the recurrence was stopped
    recurrenceCount?: number;
    cancelledOccurrences?: string[]; // Array of YYYY-MM-DD strings for cancelled single events
    googleEventId?: string; // ID of the event in Google Calendar

    seenBy?: string[]; // Array of user IDs who have viewed the meeting workspace
}

export interface MeetingUpdate {
    id: string;
    meetingId: string;
    text: string;
    createdBy: string; // User ID
    createdByName: string; // User Name
    createdOn: number; // Timestamp
    isCrucial?: boolean;
}
// --- End of Smart Meeting Assistant Types ---


export interface Notification {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  userId: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'warning' | 'reminder';
  link?: string;
  isCrucial?: boolean;
  // Fields for aggregation and interactivity
  targetId?: string; // e.g., task ID, report ID
  targetType?: 'task' | 'report' | 'meeting';
  actors?: { id: string, name: string }[];
  actionType?: 'ACKNOWLEDGE_REPORT' | 'TASK_COMMENT_ADDED' | 'EOD_ACKNOWLEDGED';
}

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export enum LeaveStatus {
  APPROVED = 'Approved',
}

export interface LeaveRecord {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  employeeId: string;
  employeeName: string; // Denormalized for easier display in manager views
  date: string; // YYYY-MM-DD
  status: LeaveStatus;
  reason?: string;
  createdAt: number; // Timestamp of when the leave was recorded
  businessUnitId?: string;
  businessUnitName?: string;
}

export interface TriggerLogEntry {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  managerId: string;
  managerName: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
  reason: string;
}

export interface BusinessUnit {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  name: string;
  status: 'active' | 'archived';
}

// --- Multi-Tenant SaaS Types ---
export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export interface Tenant {
  id: string;
  name: string; // Company/Organization name
  domain?: string; // Company domain (e.g., acme.com)
  plan: TenantPlan;
  status: TenantStatus;
  createdAt: number;
  settings?: {
    maxUsers?: number;
    features?: string[];
  };
  adminEmail?: string; // Primary admin contact
}

export enum BadgeType {
  TEN_DAY_STREAK = 'TenDayStreak',
  TWENTY_DAY_STREAK = 'TwentyDayStreak',
  FULL_MONTH_FINISHER = 'FullMonthFinisher',
}

export interface UserBadgeRecord {
  id: string;
  tenantId: string; // Multi-tenant: Organization/Company ID
  userId: string;
  badgeType: BadgeType;
  earnedDate: string;
  description: string;
}

export interface LeaderboardEntry {
  userId: string;
  employeeName: string;
  designation?: string;
  reportsSubmittedThisMonth: number;
  currentReportingStreak: number;
  rank?: number;
  businessUnitName?: string;
}

export interface StoredAwardEntry {
  userId: string;
  employeeName: string;
  designation?: string;
  rank: number;
  reportsForAwardMonth: number;
  awardMonthIndex: number;
  awardYear: number;
  businessUnitName?: string;
}

export interface AwardDetailsForPopup {
  userId: string;
  name: string;
  rank: number;
  awardMonthName: string;
  awardYear: number;
  consistencyDetail: string;
  internalMonthYearKey: string;
}

export enum ActivityLogActionType {
    // EOD Report Actions
    EOD_SUBMITTED = 'EOD_SUBMITTED',
    EOD_LATE_SUBMITTED = 'EOD_LATE_SUBMITTED',
    EOD_EDITED = 'EOD_EDITED',
    EOD_ACKNOWLEDGED = 'EOD_ACKNOWLEDGED',

    // Leave Actions
    LEAVE_MARKED_BY_EMPLOYEE = 'LEAVE_MARKED_BY_EMPLOYEE',
    LEAVE_REVOKED_BY_EMPLOYEE = 'LEAVE_REVOKED_BY_EMPLOYEE',
    LEAVE_FUTURE_SCHEDULED_BY_EMPLOYEE = 'LEAVE_FUTURE_SCHEDULED_BY_EMPLOYEE',
    LEAVE_FUTURE_CANCELED_BY_EMPLOYEE = 'LEAVE_FUTURE_CANCELED_BY_EMPLOYEE',

    // System/Automatic Actions
    WEEKLY_OFF_AUTO = 'WEEKLY_OFF_AUTO',

    // Role Actions
    ROLE_CREATED = 'ROLE_CREATED',
    ROLE_UPDATED = 'ROLE_UPDATED',
    ROLE_DELETED = 'ROLE_DELETED',

    // Business Unit Actions
    BUSINESS_UNIT_CREATED = 'BUSINESS_UNIT_CREATED',
    BUSINESS_UNIT_UPDATED = 'BUSINESS_UNIT_UPDATED',
    BUSINESS_UNIT_ARCHIVED = 'BUSINESS_UNIT_ARCHIVED',
    BUSINESS_UNIT_UNARCHIVED = 'BUSINESS_UNIT_UNARCHIVED',
    BUSINESS_UNIT_DELETED = 'BUSINESS_UNIT_DELETED',

    // Task Actions
    TASK_CREATED = 'TASK_CREATED',
    TASK_EDITED = 'TASK_EDITED',
    TASK_REASSIGNED = 'TASK_REASSIGNED',
    TASK_DUE_DATE_UPDATED = 'TASK_DUE_DATE_UPDATED',
    TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
    TASK_COMMENT_ADDED = 'TASK_COMMENT_ADDED',
    TASK_COMPLETED = 'TASK_COMPLETED',
    TASK_REOPENED = 'TASK_REOPENED',
    TASK_PINNED = 'TASK_PINNED',
    TASK_UNPINNED = 'TASK_UNPINNED',
    TASK_DELETED = 'TASK_DELETED',
    TASK_OVERDUE_REMINDER = 'TASK_OVERDUE_REMINDER',

    // Meeting Actions
    MEETING_CREATED = 'MEETING_CREATED',
    MEETING_EDITED = 'MEETING_EDITED',
    MEETING_RSVP = 'MEETING_RSVP',
    MEETING_OCCURRENCE_CANCELLED = 'MEETING_OCCURRENCE_CANCELLED',
    MEETING_ENDED = 'MEETING_ENDED', // Kept for ending a RECURRING series
    MEETING_UPDATE_POSTED = 'MEETING_UPDATE_POSTED',
    MEETING_CRUCIAL_UPDATE_POSTED = 'MEETING_CRUcial_UPDATE_POSTED',
    MEETING_STARTING_SOON = 'MEETING_STARTING_SOON',
    MEETING_FINALIZED = 'MEETING_FINALIZED',
    MEETING_ASYNCHRONOUS_UPDATE = 'MEETING_ASYNCHRONOUS_UPDATE',


    // Admin/HR Actions
    COMPLETION_LETTER_GENERATED = 'COMPLETION_LETTER_GENERATED',

    // User Management Actions
    USER_CREATED = 'USER_CREATED',
    USER_ARCHIVED = 'USER_ARCHIVED',
    USER_UNARCHIVED = 'USER_UNARCHIVED',
    USER_PERMANENTLY_DELETED = 'USER_PERMANENTLY_DELETED',
    USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
    USER_NOTIFICATION_EMAIL_CHANGED = 'USER_NOTIFICATION_EMAIL_CHANGED',
    USER_LOGIN = 'USER_LOGIN',
}


// Updated ActivityLogItem to use more specific types
export interface ActivityLogItem {
    id: string; // Could be report version ID, leaveRecord ID, etc.
    tenantId: string; // Multi-tenant: Organization/Company ID
    timestamp: number;
    type: ActivityLogActionType; // More specific action types
    description: string; // Detailed description of the action
    actorId: string; // User ID of who performed the action
    actorAuthUid?: string; // Firebase Auth UID for secure rule validation
    actorName: string; // Name of the user who performed action
    targetId?: string; // e.g., Report ID, LeaveRecord ID, Task ID
    targetName?: string; // e.g., Report Date, Leave Date, Task Title
    targetUserId?: string; // If action targets another user
    targetUserName?: string;
    details?: {
      changes?: {
        field: string;
        from: any;
        to: any;
      }[];
    };
    isCrucial?: boolean;
}

export interface TimelineEvent {
    id: string;
    timestamp: number;
    actorName: string; // Can be "You"
    originalActorName: string; // Always the full name
    actionDescription: string;
    targetName?: string;
    targetId?: string;
    icon: string;
    originalActionType: ActivityLogActionType;
    isCrucial?: boolean;
    targetLink?: string; // For cross-linking
}

// --- Letter of Completion ---
export interface CompletionLetter {
  id: string;
  employeeId: string;
  employeeName: string; // denormalized
  issuedByAdminId: string;
  issuedByAdminName: string; // denormalized
  issuedDate: number; // timestamp
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string; // YYYY-MM-DD
  achievements: string; // Custom text from admin
}

// For Unified Delinquency Dashboard
export interface DelinquentEmployeeDetails {
  user: User;
  consecutiveDaysMissed: number;
  lastReportSubmittedOn?: string; // YYYY-MM-DD
  reportsThisMonth: number;
}

// For AI Meeting Task Generation
export interface AiGeneratedTask {
  title: string;
  description: string;
  subTasks: SubTask[];
  assigneeIds: string[]; // Initially names from AI, then mapped to IDs
  dueDate: string;
  priority: TaskPriority;
}

// For Consistency Calendar
export type MonthlyReportStatus = {
  [date: string]: 'submitted' | 'missed' | 'non-working';
};