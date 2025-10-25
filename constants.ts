// constants.ts

import { User, EODReport, ReportStatus, Notification as AppNotification, LeaveRecord, TriggerLogEntry, ReportVersion, Attachment, BusinessUnit, BadgeType, UserBadgeRecord, LeaveStatus, ActivityLogItem, ActivityLogActionType, Task, TaskPriority, TaskStatus, TaskType, MemberProgress, Meeting, MeetingUpdate, UserStatus, Role, Permission, MeetingInstance } from './types';
import { getPastDate, getFutureDate } from '../utils/dateUtils';

export const APP_NAME = "Syncly";

export const USERS_KEY = 'eod_users';
export const REPORTS_KEY = 'eod_reports';
export const NOTIFICATIONS_KEY = 'eod_notifications';
export const LEAVE_RECORDS_KEY = 'eod_leave_records';
export const TRIGGER_LOG_KEY = 'eod_trigger_log';
export const BUSINESS_UNITS_KEY = 'eod_business_units';
export const USER_BADGES_KEY = 'eod_user_badges';
export const ACTIVITY_LOG_KEY_PREFIX = 'eod_activity_log_';
export const TASKS_KEY = 'eod_tasks';
export const TASK_COMMENTS_KEY = 'eod_task_comments';
export const SCHEDULED_NOTIFICATIONS_KEY = 'eod_sent_scheduled_notifications';
export const MEETINGS_KEY = 'eod_meetings';
export const MEETING_INSTANCES_KEY = 'eod_meeting_instances';
export const MEETING_UPDATES_KEY = 'eod_meeting_updates';
export const ROLES_KEY = 'eod_roles';
export const SYNC_QUEUE_KEY = 'eod_sync_queue';


export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MAX_REPORT_VERSIONS = 2; // Initial submission + 1 edit
export const MAX_TEAM_MEMBERS = 15; // Max members for a team task
export const MAX_PINNED_TASKS = 5; // Maximum number of tasks a user can pin
export const PERMISSIONS = Object.values(Permission);
export const LATE_SUBMISSION_HOUR = 19; // 7 PM

// ========== Permission Groups for UI Organization ==========
export const PERMISSION_GROUPS = {
  platformAdmin: {
    label: 'Platform Administration (Syncly Owner Only)',
    permissions: [
      Permission.PLATFORM_ADMIN,
      Permission.CAN_MANAGE_TENANTS,
      Permission.CAN_VIEW_ALL_TENANTS,
    ],
  },
  userManagement: {
    label: 'User Management',
    permissions: [
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
    ],
  },
  roleManagement: {
    label: 'Role & Permission Management',
    permissions: [
      Permission.CAN_VIEW_ROLES,
      Permission.CAN_CREATE_ROLE,
      Permission.CAN_EDIT_ROLE,
      Permission.CAN_DELETE_ROLE,
      Permission.CAN_ASSIGN_PERMISSIONS,
    ],
  },
  businessUnitManagement: {
    label: 'Business Unit Management',
    permissions: [
      Permission.CAN_VIEW_BUSINESS_UNITS,
      Permission.CAN_CREATE_BUSINESS_UNIT,
      Permission.CAN_EDIT_BUSINESS_UNIT,
      Permission.CAN_ARCHIVE_BUSINESS_UNIT,
      Permission.CAN_DELETE_BUSINESS_UNIT,
      Permission.CAN_ASSIGN_BUSINESS_UNIT,
    ],
  },
  taskManagement: {
    label: 'Task Management',
    permissions: [
      Permission.CAN_VIEW_TEAM_TASKS,
      Permission.CAN_CREATE_TEAM_TASK,
      Permission.CAN_EDIT_TEAM_TASK,
      Permission.CAN_DELETE_ANY_TASK,
      Permission.CAN_ASSIGN_TASK,
      Permission.CAN_EDIT_ANY_TASK_STATUS,
      Permission.CAN_COMMENT_ON_TEAM_TASK,
      Permission.CAN_CREATE_PERSONAL_TASKS,
      Permission.CAN_VIEW_OWN_TASKS,
    ],
  },
  eodReportManagement: {
    label: 'EOD Report Management',
    permissions: [
      Permission.CAN_VIEW_ALL_REPORTS,
      Permission.CAN_VIEW_TEAM_REPORTS,
      Permission.CAN_VIEW_OWN_REPORTS,
      Permission.CAN_ACKNOWLEDGE_REPORTS,
      Permission.CAN_ACKNOWLEDGE_ANY_EOD,
      Permission.CAN_REQUIRE_EOD_SUBMISSION,
      Permission.CAN_MARK_EOD_LATE,
      Permission.CAN_SUBMIT_OWN_EOD,
      Permission.CAN_EXPORT_EODS,
    ],
  },
  leaveManagement: {
    label: 'Leave Management',
    permissions: [
      Permission.CAN_VIEW_ALL_LEAVES,
      Permission.CAN_VIEW_TEAM_LEAVES,
      Permission.CAN_APPROVE_LEAVE,
      Permission.CAN_REJECT_LEAVE,
      Permission.CAN_OVERRIDE_LEAVE_BALANCE,
      Permission.CAN_SUBMIT_OWN_LEAVE,
    ],
  },
  meetingManagement: {
    label: 'Meeting & Calendar Management',
    permissions: [
      Permission.CAN_MANAGE_TEAM_MEETINGS,
      Permission.CAN_VIEW_TEAM_MEETINGS,
      Permission.CAN_VIEW_OWN_MEETINGS,
      Permission.CAN_SCHEDULE_MEETING,
      Permission.CAN_VIEW_TEAM_CALENDAR,
      Permission.CAN_VIEW_OWN_CALENDAR,
      Permission.CAN_MANAGE_TEAM_CALENDAR,
    ],
  },
  settingsAndConfiguration: {
    label: 'Settings & Configuration',
    permissions: [
      Permission.CAN_MANAGE_TENANT_SETTINGS,
      Permission.CAN_VIEW_TENANT_SETTINGS,
      Permission.CAN_MANAGE_INTEGRATIONS,
      Permission.CAN_MANAGE_NOTIFICATIONS,
      Permission.CAN_VIEW_BILLING,
    ],
  },
  auditAndActivityLog: {
    label: 'Audit & Activity Logs',
    permissions: [
      Permission.CAN_VIEW_ACTIVITY_LOG,
      Permission.CAN_EXPORT_ACTIVITY_LOG,
      Permission.CAN_VIEW_AUDIT_TRAIL,
    ],
  },
  analyticsAndReporting: {
    label: 'Analytics & Reporting',
    permissions: [
      Permission.CAN_VIEW_ANALYTICS_DASHBOARD,
      Permission.CAN_EXPORT_DATA,
      Permission.CAN_VIEW_LEADERBOARD,
      Permission.CAN_USE_PERFORMANCE_HUB,
      Permission.CAN_VIEW_TRIGGER_LOG,
    ],
  },
};


const todayDayIndex = new Date().getDay();
const todayDayName = WEEK_DAYS[todayDayIndex];

export const MISSING_REPORT_THRESHOLD_DAYS = 3;




export const TEN_DAY_STREAK_THRESHOLD = 10;
export const TWENTY_DAY_STREAK_THRESHOLD = 20;

export const LAST_AWARD_MONTH_PROCESSED_KEY = 'eod_last_award_month_processed';
export const MONTHLY_AWARD_KEY_PREFIX = 'eod_monthly_awards_';
export const AWARD_SEEN_KEY_PREFIX = 'eod_award_seen_';


export const DEFAULT_BUSINESS_UNITS: BusinessUnit[] = [
  { id: 'bu_sales', name: 'Sales & Marketing', status: 'active' },
  { id: 'bu_tech', name: 'Technology & Engineering', status: 'active' },
  { id: 'bu_ops', name: 'Operations & Logistics', status: 'active' },
  { id: 'bu_hr', name: 'Human Resources & Admin', status: 'active' },
  { id: 'bu_finance', name: 'Finance & Accounts', status: 'active' },
];

// ========== System Roles (Cannot be deleted or renamed) ==========
export const SYSTEM_ROLE_IDS = ['tenant_admin', 'manager', 'team_lead', 'employee'];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'tenant_admin',
    tenantId: '', // Will be set during tenant creation
    name: 'Tenant Admin',
    description: 'Full control over tenant settings, users, roles, and all features. Cannot manage other tenants or platform settings.',
    permissions: [
      // NOTE: Platform-only permissions (PLATFORM_ADMIN, CAN_MANAGE_TENANTS, CAN_VIEW_ALL_TENANTS) are excluded
      
      // User Management - Full Control
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
      
      // Role Management - Full Control
      Permission.CAN_VIEW_ROLES,
      Permission.CAN_CREATE_ROLE,
      Permission.CAN_EDIT_ROLE,
      Permission.CAN_DELETE_ROLE,
      Permission.CAN_ASSIGN_PERMISSIONS,
      
      // Business Unit Management - Full Control
      Permission.CAN_VIEW_BUSINESS_UNITS,
      Permission.CAN_CREATE_BUSINESS_UNIT,
      Permission.CAN_EDIT_BUSINESS_UNIT,
      Permission.CAN_ARCHIVE_BUSINESS_UNIT,
      Permission.CAN_DELETE_BUSINESS_UNIT,
      Permission.CAN_ASSIGN_BUSINESS_UNIT,
      
      // Task Management - Full Control
      Permission.CAN_VIEW_TEAM_TASKS,
      Permission.CAN_CREATE_TEAM_TASK,
      Permission.CAN_EDIT_TEAM_TASK,
      Permission.CAN_DELETE_ANY_TASK,
      Permission.CAN_ASSIGN_TASK,
      Permission.CAN_EDIT_ANY_TASK_STATUS,
      Permission.CAN_COMMENT_ON_TEAM_TASK,
      Permission.CAN_CREATE_PERSONAL_TASKS,
      Permission.CAN_VIEW_OWN_TASKS,
      
      // EOD Reports - Full Control
      Permission.CAN_VIEW_ALL_REPORTS,
      Permission.CAN_VIEW_TEAM_REPORTS,
      Permission.CAN_ACKNOWLEDGE_ANY_EOD,
      Permission.CAN_REQUIRE_EOD_SUBMISSION,
      Permission.CAN_MARK_EOD_LATE,
      Permission.CAN_SUBMIT_OWN_EOD,
      Permission.CAN_VIEW_OWN_REPORTS,
      Permission.CAN_EXPORT_EODS,
      
      // Leave Management - Full Control
      Permission.CAN_VIEW_ALL_LEAVES,
      Permission.CAN_VIEW_TEAM_LEAVES,
      Permission.CAN_APPROVE_LEAVE,
      Permission.CAN_REJECT_LEAVE,
      Permission.CAN_OVERRIDE_LEAVE_BALANCE,
      Permission.CAN_SUBMIT_OWN_LEAVE,
      
      // Meetings & Calendar - Full Control
      Permission.CAN_MANAGE_TEAM_MEETINGS,
      Permission.CAN_VIEW_TEAM_MEETINGS,
      Permission.CAN_VIEW_OWN_MEETINGS,
      Permission.CAN_SCHEDULE_MEETING,
      Permission.CAN_VIEW_TEAM_CALENDAR,
      Permission.CAN_VIEW_OWN_CALENDAR,
      Permission.CAN_MANAGE_TEAM_CALENDAR,
      
      // Settings - Full Control
      Permission.CAN_MANAGE_TENANT_SETTINGS,
      Permission.CAN_VIEW_TENANT_SETTINGS,
      Permission.CAN_MANAGE_INTEGRATIONS,
      Permission.CAN_MANAGE_NOTIFICATIONS,
      Permission.CAN_VIEW_BILLING,
      
      // Audit & Activity - Full Control
      Permission.CAN_VIEW_ACTIVITY_LOG,
      Permission.CAN_EXPORT_ACTIVITY_LOG,
      Permission.CAN_VIEW_AUDIT_TRAIL,
      
      // Analytics & Reporting - Full Control
      Permission.CAN_VIEW_ANALYTICS_DASHBOARD,
      Permission.CAN_EXPORT_DATA,
      Permission.CAN_VIEW_LEADERBOARD,
      Permission.CAN_USE_PERFORMANCE_HUB,
      Permission.CAN_VIEW_TRIGGER_LOG,
    ],
  },
  {
    id: 'manager',
    tenantId: '', // Will be set during tenant creation
    name: 'Manager',
    description: 'Manages team members, approves leaves, acknowledges EODs, and oversees team tasks and meetings.',
    permissions: [
      // User Management - View Only
      Permission.CAN_VIEW_USER_ACTIVITY,
      
      // Business Units - View Only
      Permission.CAN_VIEW_BUSINESS_UNITS,
      
      // Task Management - Team Level
      Permission.CAN_VIEW_TEAM_TASKS,
      Permission.CAN_CREATE_TEAM_TASK,
      Permission.CAN_EDIT_TEAM_TASK,
      Permission.CAN_ASSIGN_TASK,
      Permission.CAN_EDIT_ANY_TASK_STATUS,
      Permission.CAN_COMMENT_ON_TEAM_TASK,
      Permission.CAN_CREATE_PERSONAL_TASKS,
      Permission.CAN_VIEW_OWN_TASKS,
      
      // EOD Reports - Team Management
      Permission.CAN_VIEW_TEAM_REPORTS,
      Permission.CAN_ACKNOWLEDGE_REPORTS,
      Permission.CAN_SUBMIT_OWN_EOD,
      Permission.CAN_VIEW_OWN_REPORTS,
      Permission.CAN_REQUIRE_EOD_SUBMISSION,
      
      // Leave Management - Approval Authority
      Permission.CAN_VIEW_TEAM_LEAVES,
      Permission.CAN_APPROVE_LEAVE,
      Permission.CAN_REJECT_LEAVE,
      Permission.CAN_SUBMIT_OWN_LEAVE,
      
      // Meetings & Calendar - Team Level
      Permission.CAN_MANAGE_TEAM_MEETINGS,
      Permission.CAN_VIEW_TEAM_MEETINGS,
      Permission.CAN_VIEW_OWN_MEETINGS,
      Permission.CAN_SCHEDULE_MEETING,
      Permission.CAN_VIEW_TEAM_CALENDAR,
      Permission.CAN_VIEW_OWN_CALENDAR,
      Permission.CAN_MANAGE_TEAM_CALENDAR,
      
      // Analytics & Reporting
      Permission.CAN_VIEW_ANALYTICS_DASHBOARD,
      Permission.CAN_VIEW_LEADERBOARD,
      Permission.CAN_USE_PERFORMANCE_HUB,
      Permission.CAN_VIEW_TRIGGER_LOG,
    ],
  },
  {
    id: 'team_lead',
    tenantId: '', // Will be set during tenant creation
    name: 'Team Lead',
    description: 'Coordinates team tasks and meetings, reviews EODs, but cannot approve leaves or manage users.',
    permissions: [
      // Business Units - View Only
      Permission.CAN_VIEW_BUSINESS_UNITS,
      
      // Task Management - Team Coordination
      Permission.CAN_VIEW_TEAM_TASKS,
      Permission.CAN_CREATE_TEAM_TASK,
      Permission.CAN_ASSIGN_TASK,
      Permission.CAN_COMMENT_ON_TEAM_TASK,
      Permission.CAN_CREATE_PERSONAL_TASKS,
      Permission.CAN_VIEW_OWN_TASKS,
      
      // EOD Reports - Team Visibility
      Permission.CAN_VIEW_TEAM_REPORTS,
      Permission.CAN_SUBMIT_OWN_EOD,
      Permission.CAN_VIEW_OWN_REPORTS,
      
      // Leave Management - View Only
      Permission.CAN_VIEW_TEAM_LEAVES,
      Permission.CAN_SUBMIT_OWN_LEAVE,
      
      // Meetings & Calendar - Team Level
      Permission.CAN_VIEW_TEAM_MEETINGS,
      Permission.CAN_VIEW_OWN_MEETINGS,
      Permission.CAN_SCHEDULE_MEETING,
      Permission.CAN_VIEW_TEAM_CALENDAR,
      Permission.CAN_VIEW_OWN_CALENDAR,
      
      // Analytics - Basic Access
      Permission.CAN_VIEW_LEADERBOARD,
      Permission.CAN_VIEW_TRIGGER_LOG,
    ],
  },
  {
    id: 'employee',
    tenantId: '', // Will be set during tenant creation
    name: 'Employee',
    description: 'Standard employee with self-service capabilities for tasks, EODs, leave, and calendar.',
    permissions: [
      // Task Management - Personal Only
      Permission.CAN_CREATE_PERSONAL_TASKS,
      Permission.CAN_VIEW_OWN_TASKS,
      
      // EOD Reports - Self-Service
      Permission.CAN_SUBMIT_OWN_EOD,
      Permission.CAN_VIEW_OWN_REPORTS,
      
      // Leave Management - Self-Service
      Permission.CAN_SUBMIT_OWN_LEAVE,
      
      // Meetings & Calendar - Personal Only
      Permission.CAN_VIEW_OWN_MEETINGS,
      Permission.CAN_VIEW_OWN_CALENDAR,
      
      // Analytics - Basic Access
      Permission.CAN_VIEW_LEADERBOARD,
    ],
  },
];


const manager001TeamWeeklyOffDay = todayDayName;

export const DEFAULT_USERS: Omit<User, 'businessUnitName' | 'id' | 'roleName'>[] = [
  { email: 'superadmin@mittaleod.com', notificationEmail: 'superadmin@example.com', name: 'Super Admin', roleId: 'tenant_admin', status: UserStatus.ACTIVE },
  { email: 'admin@mittaleod.com', notificationEmail: 'raj.chauhan.admin@example.com', name: 'Raj Chauhan (Admin)', roleId: 'tenant_admin', status: UserStatus.ACTIVE },
  { email: 'manager.sales@mittaleod.com', notificationEmail: 'rajesh.k.manager@example.com', name: 'Rajesh K.', roleId: 'manager', designation: 'Sales Manager', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'manager.tech@mittaleod.com', notificationEmail: 'anita.s.manager@example.com', name: 'Anita S.', roleId: 'manager', designation: 'Tech Lead', businessUnitId: 'bu_tech', status: UserStatus.ACTIVE },
  { email: 'manager.ops@mittaleod.com', notificationEmail: 'vikram.r.manager@example.com', name: 'Vikram R.', roleId: 'manager', designation: 'Operations Head', businessUnitId: 'bu_ops', status: UserStatus.ACTIVE },
  { email: 'manager.hr@mittaleod.com', notificationEmail: 'sunita.m.manager@example.com', name: 'Sunita M.', roleId: 'manager', designation: 'HR Manager', businessUnitId: 'bu_hr', status: UserStatus.ACTIVE },

  { email: 'alok.sharma@mittaleod.com', notificationEmail: 'alok.sharma@example.com', name: 'Alok Sharma', roleId: 'employee', designation: 'Sales Lead', weeklyOffDay: 'Sunday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'priya.mehta@mittaleod.com', notificationEmail: 'priya.mehta@example.com', name: 'Priya Mehta', roleId: 'employee', designation: 'Marketing Executive', weeklyOffDay: manager001TeamWeeklyOffDay, businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'rohan.singh@mittaleod.com', notificationEmail: 'rohan.singh@example.com', name: 'Rohan Singh', roleId: 'employee', designation: 'Sales Associate', weeklyOffDay: manager001TeamWeeklyOffDay, businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'neha.patel@mittaleod.com', notificationEmail: 'neha.patel@example.com', name: 'Neha Patel', roleId: 'employee', designation: 'Sales Associate', weeklyOffDay: manager001TeamWeeklyOffDay, businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'vivek.kumar@mittaleod.com', notificationEmail: 'vivek.kumar@example.com', name: 'Vivek Kumar', roleId: 'employee', designation: 'Marketing Analyst', weeklyOffDay: manager001TeamWeeklyOffDay, businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'sunidhi.chauhan@mittaleod.com', notificationEmail: 'sunidhi.chauhan@example.com', name: 'Sunidhi Chauhan', roleId: 'employee', designation: 'Sales Representative', weeklyOffDay: manager001TeamWeeklyOffDay, businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },

  { email: 'arjun.reddy@mittaleod.com', notificationEmail: 'arjun.reddy@example.com', name: 'Arjun Reddy', roleId: 'employee', designation: 'Sales Specialist', weeklyOffDay: 'Saturday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'kiara.advani@mittaleod.com', notificationEmail: 'kiara.advani@example.com', name: 'Kiara Advani', roleId: 'employee', designation: 'Marketing Coordinator', weeklyOffDay: 'Sunday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'vijay.deverakonda@mittaleod.com', notificationEmail: 'vijay.deverakonda@example.com', name: 'Vijay Deverakonda', roleId: 'employee', designation: 'Business Development', weeklyOffDay: 'Saturday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'ananya.pandey@mittaleod.com', notificationEmail: 'ananya.pandey@example.com', name: 'Ananya Pandey', roleId: 'employee', designation: 'Sales Intern', weeklyOffDay: 'Sunday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'sandeep.g@mittaleod.com', notificationEmail: 'sandeep.g@example.com', name: 'Sandeep Gupta', roleId: 'employee', designation: 'Sales Associate', weeklyOffDay: 'Monday', businessUnitId: 'bu_sales', status: UserStatus.ACTIVE },
  { email: 'shawn.mendes@mittaleod.com', notificationEmail: 'shawn.mendes@example.com', name: 'Shawn Mendes', roleId: 'employee', designation: 'Software Engineer', weeklyOffDay: 'Sunday', businessUnitId: 'bu_tech', status: UserStatus.ACTIVE },
];

export const DEFAULT_REPORTS: EODReport[] = [];
export const DEFAULT_NOTIFICATIONS: AppNotification[] = [];
export const DEFAULT_TASKS: Task[] = [];
export const DEFAULT_LEAVE_RECORDS: LeaveRecord[] = [];
export const DEFAULT_TRIGGER_LOG_ENTRIES: TriggerLogEntry[] = [];
export const DEFAULT_USER_BADGES: UserBadgeRecord[] = [];
export const DEFAULT_ACTIVITY_LOG: ActivityLogItem[] = [];
export const DEFAULT_MEETINGS: Meeting[] = [];
export const DEFAULT_MEETING_INSTANCES: MeetingInstance[] = [];

export const TIMELINE_EVENT_ICONS: { [key in ActivityLogActionType]: string } = {
    [ActivityLogActionType.EOD_SUBMITTED]: 'fas fa-paper-plane text-primary dark:text-sky-400',
    [ActivityLogActionType.EOD_LATE_SUBMITTED]: 'fas fa-clock text-orange-500 dark:text-orange-400',
    [ActivityLogActionType.EOD_EDITED]: 'fas fa-edit text-secondary dark:text-violet-400',
    [ActivityLogActionType.EOD_ACKNOWLEDGED]: 'fas fa-check-circle text-green-500 dark:text-emerald-400',
    [ActivityLogActionType.LEAVE_MARKED_BY_EMPLOYEE]: 'fas fa-plane-departure text-teal-500 dark:text-teal-400',
    [ActivityLogActionType.LEAVE_REVOKED_BY_EMPLOYEE]: 'fas fa-undo text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.LEAVE_FUTURE_SCHEDULED_BY_EMPLOYEE]: 'fas fa-calendar-plus text-teal-500 dark:text-teal-400',
    [ActivityLogActionType.LEAVE_FUTURE_CANCELED_BY_EMPLOYEE]: 'fas fa-calendar-times text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.WEEKLY_OFF_AUTO]: 'fas fa-bed text-indigo-500 dark:text-indigo-400',
    [ActivityLogActionType.TASK_CREATED]: 'fas fa-tasks text-primary dark:text-sky-400',
    [ActivityLogActionType.TASK_EDITED]: 'fas fa-pen text-secondary dark:text-violet-400',
    [ActivityLogActionType.TASK_REASSIGNED]: 'fas fa-users text-indigo-500 dark:text-indigo-400',
    [ActivityLogActionType.TASK_DUE_DATE_UPDATED]: 'fas fa-calendar-alt text-orange-500 dark:text-orange-400',
    [ActivityLogActionType.TASK_PRIORITY_CHANGED]: 'fas fa-exclamation text-yellow-500 dark:text-yellow-400',
    [ActivityLogActionType.TASK_STATUS_CHANGED]: 'fas fa-exchange-alt text-yellow-500 dark:text-yellow-400',
    [ActivityLogActionType.TASK_COMMENT_ADDED]: 'fas fa-comment text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.TASK_COMPLETED]: 'fas fa-check-double text-green-500 dark:text-emerald-400',
    [ActivityLogActionType.TASK_REOPENED]: 'fas fa-folder-open text-primary dark:text-sky-400',
    [ActivityLogActionType.TASK_PINNED]: 'fas fa-thumbtack text-yellow-500 dark:text-yellow-400',
    [ActivityLogActionType.TASK_UNPINNED]: 'fas fa-thumbtack text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.TASK_DELETED]: 'fas fa-trash-alt text-red-500 dark:text-red-400',
    [ActivityLogActionType.TASK_OVERDUE_REMINDER]: 'fas fa-bell text-red-500 dark:text-red-400',
    [ActivityLogActionType.MEETING_CREATED]: 'fas fa-users-crown text-secondary dark:text-violet-400',
    [ActivityLogActionType.MEETING_EDITED]: 'fas fa-edit text-indigo-500 dark:text-indigo-400',
    [ActivityLogActionType.MEETING_RSVP]: 'fas fa-user-check text-green-500 dark:text-emerald-400',
    [ActivityLogActionType.MEETING_OCCURRENCE_CANCELLED]: 'fas fa-calendar-times text-orange-500 dark:text-orange-400',
    [ActivityLogActionType.MEETING_ENDED]: 'fas fa-flag-checkered text-red-500 dark:text-red-400',
    [ActivityLogActionType.MEETING_UPDATE_POSTED]: 'fas fa-comment-alt text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.MEETING_CRUCIAL_UPDATE_POSTED]: 'fas fa-bell text-amber-500 dark:text-amber-400',
    [ActivityLogActionType.MEETING_STARTING_SOON]: 'fas fa-hourglass-start text-accent dark:text-cyan-400',
    [ActivityLogActionType.MEETING_FINALIZED]: 'fas fa-gavel text-green-600 dark:text-emerald-400',
    [ActivityLogActionType.MEETING_ASYNCHRONOUS_UPDATE]: 'fas fa-comment-alt-edit text-blue-600 dark:text-sky-400',
    [ActivityLogActionType.COMPLETION_LETTER_GENERATED]: 'fas fa-file-award text-emerald-500 dark:text-emerald-400',
    [ActivityLogActionType.USER_CREATED]: 'fas fa-user-plus text-accent dark:text-cyan-400',
    [ActivityLogActionType.USER_ARCHIVED]: 'fas fa-user-lock text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.USER_UNARCHIVED]: 'fas fa-user-unlock text-gray-500 dark:text-slate-400',
    [ActivityLogActionType.USER_PERMANENTLY_DELETED]: 'fas fa-user-slash text-red-700 dark:text-red-500',
    [ActivityLogActionType.USER_ROLE_CHANGED]: 'fas fa-user-tag text-indigo-500 dark:text-indigo-400',
    [ActivityLogActionType.USER_NOTIFICATION_EMAIL_CHANGED]: 'fas fa-envelope text-blue-500 dark:text-blue-400',
    [ActivityLogActionType.USER_LOGIN]: 'fas fa-sign-in-alt text-green-500 dark:text-emerald-400',
};

export const BADGE_DEFINITIONS: { [key in BadgeType]: { icon: string; title: string; defaultTooltip: string; earnedTooltipText: string; } } = {
    [BadgeType.TEN_DAY_STREAK]: {
      icon: '🔥',
      title: '10-Day Streak',
      defaultTooltip: 'Submit reports for 10 consecutive working days to earn this!',
      earnedTooltipText: 'Awesome! You submitted reports for 10 consecutive working days.',
    },
    [BadgeType.TWENTY_DAY_STREAK]: {
      icon: '🚀',
      title: '20-Day Streak',
      defaultTooltip: 'Submit reports for 20 consecutive working days for this achievement.',
      earnedTooltipText: 'Incredible! You maintained a 20-day reporting streak.',
    },
    [BadgeType.FULL_MONTH_FINISHER]: {
      icon: '🗓️',
      title: 'Full Month Finisher',
      defaultTooltip: 'Submit reports for every working day in a calendar month.',
      earnedTooltipText: 'Consistency King/Queen! You reported on every working day of a month.',
    },
};