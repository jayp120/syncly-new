import { User, EODReport, Notification as AppNotification, ReportStatus, LeaveRecord, LeaveStatus, TriggerLogEntry, Attachment, ReportVersion, BusinessUnit, BadgeType, UserBadgeRecord, LeaderboardEntry, StoredAwardEntry, AwardDetailsForPopup, ActivityLogItem, ActivityLogActionType, TimelineEvent, Task, TaskComment, TaskPriority, TaskStatus, TaskType, MemberProgress, Meeting, MeetingUpdate, UserStatus, RsvpStatus, DateRange, DelinquentEmployeeDetails, Role, SubTask, MeetingInstance, MonthlyReportStatus, Permission } from '../types';
import {
    DEFAULT_USERS,
    DEFAULT_REPORTS,
    DEFAULT_NOTIFICATIONS,
    DEFAULT_TASKS,
    MISSING_REPORT_THRESHOLD_DAYS,
    WEEK_DAYS,
    LEAVE_RECORDS_KEY,
    DEFAULT_LEAVE_RECORDS,
    TRIGGER_LOG_KEY,
    DEFAULT_TRIGGER_LOG_ENTRIES,
    MAX_REPORT_VERSIONS,
    BUSINESS_UNITS_KEY,
    DEFAULT_BUSINESS_UNITS,
    USER_BADGES_KEY,
    DEFAULT_USER_BADGES,
    TEN_DAY_STREAK_THRESHOLD,
    TWENTY_DAY_STREAK_THRESHOLD,
    LAST_AWARD_MONTH_PROCESSED_KEY,
    MONTHLY_AWARD_KEY_PREFIX,
    AWARD_SEEN_KEY_PREFIX,
    ACTIVITY_LOG_KEY_PREFIX,
    DEFAULT_ACTIVITY_LOG,
    TIMELINE_EVENT_ICONS,
    TASKS_KEY,
    TASK_COMMENTS_KEY,
    USERS_KEY,
    REPORTS_KEY,
    NOTIFICATIONS_KEY,
    MEETINGS_KEY,
    DEFAULT_MEETINGS,
    MEETING_UPDATES_KEY,
    BADGE_DEFINITIONS,
    ROLES_KEY,
    DEFAULT_ROLES,
    MEETING_INSTANCES_KEY,
    DEFAULT_MEETING_INSTANCES,
    APP_NAME,
    LATE_SUBMISSION_HOUR
} from '../constants';
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM, getLocalYYYYMMDD, getPastDate, getFutureDate, isDayWeeklyOff } from '../utils/dateUtils';
import * as EmailService from './emailService';
import eventBus from './eventBus';
import * as syncService from './syncService';
import { parseLiveMemoText, PendingTask } from '../utils/commandParser';
// FIX: Corrected import of `GoogleGenAI` and `Type` from `@google/genai`.
import { GoogleGenAI, Type } from "@google/genai";
import * as calendarService from './calendarService';
import { parseMentions } from '../utils/mentionUtils';
import * as leaderboardService from './leaderboardService';
import { ensureFirestoreReady as migrateToFirestore } from './firestoreMigration';
import { getCurrentTenantId, requireTenantId } from './tenantContext';
import { 
  userRepository, 
  roleRepository, 
  businessUnitRepository, 
  reportRepository, 
  taskRepository, 
  leaveRepository, 
  meetingRepository,
  notificationRepository,
  activityLogRepository,
  triggerLogRepository,
  badgeRepository,
  generateId
} from './repositories';

// --- LocalStorage Helpers (for backward compatibility during migration) ---

const getLocalStorageData = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const setLocalStorageData = <T,>(key: string, value: T) => {
    try {
        const oldValue = window.localStorage.getItem(key);
        const newValue = JSON.stringify(value);
        window.localStorage.setItem(key, newValue);

        // This is the key change for cross-tab sync.
        // The `storage` event only fires for OTHER tabs, not the current one.
        // So we dispatch it manually for the current tab to ensure consistent state handling.
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            oldValue: oldValue,
            newValue: newValue,
            storageArea: window.localStorage,
        }));
        
        // The event bus is still useful for components that are already listening.
        // No need to remove it, but the storage event is now the primary mechanism.
        eventBus.emit('appDataChanged', { keyChanged: key });
    } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
    }
};

// --- Gemini API Key Management ---
const getApiKey = (): string | null => {
  // 1. Try sessionStorage (for local development)
  const sessionKey = sessionStorage.getItem('GEMINI_API_KEY');
  if (sessionKey) {
    return sessionKey;
  }
  // 2. Fallback to process.env (for deployed environments like AI Studio)
  const envKey = (import.meta as any)?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);
  if (envKey) {
    return envKey;
  }
  return null;
};

export const isAiConfigured = (): boolean => {
  return !!getApiKey();
};

// --- Activity Log ---
export const addActivityLog = async (logItem: Omit<ActivityLogItem, 'id'>) => {
    // Use tenantId from logItem if provided (e.g., during login), otherwise get from context
    const tenantId = (logItem as any).tenantId || requireTenantId();
    const logId = generateId('act');
    
    // SMART FALLBACK: If actorAuthUid not provided, use actorId (they're both Firebase Auth UID)
    // This maintains backwards compatibility with existing code
    const actorAuthUid = (logItem as any).actorAuthUid || (logItem as any).actorId;
    
    const newLog: ActivityLogItem = { ...logItem, id: logId, tenantId, actorAuthUid };
    
    // Safety: Ensure tenantId and actorAuthUid are present before writing
    if (!newLog.tenantId) {
        throw new Error('activityLogs write missing tenantId - cannot create activity log without tenant isolation');
    }
    if (!newLog.actorAuthUid) {
        throw new Error('activityLogs write missing actorAuthUid - Firestore security rules require Firebase Auth UID for validation');
    }
    
    // Store in Firestore
    await activityLogRepository.create(logId, newLog);
    
    // Activity logs are user-specific, no need to duplicate for target users
    // Queries will filter by actorId or targetUserId as needed
};

export const getUserActivityLog = async (userId: string): Promise<ActivityLogItem[]> => {
    return await activityLogRepository.getByUser(userId);
};
export const getAllActivityLogs = async (): Promise<ActivityLogItem[]> => {
    const tenantId = requireTenantId();
    return await activityLogRepository.getAll(tenantId);
};

// --- Initialization ---
export const initializeDatabase = () => {
    if (!localStorage.getItem(USERS_KEY)) {
        console.log('Initializing database with default data...');
        const businessUnits = DEFAULT_BUSINESS_UNITS;
        const roles = DEFAULT_ROLES;

        const usersWithIds = DEFAULT_USERS.map(user => {
            const bu = businessUnits.find(b => b.id === user.businessUnitId);
            const role = roles.find(r => r.id === user.roleId);
            return { 
                ...user, 
                id: generateId('user'),
                businessUnitName: bu?.name,
                roleName: role?.name,
            };
        });

        setLocalStorageData(USERS_KEY, usersWithIds);
        setLocalStorageData(BUSINESS_UNITS_KEY, businessUnits);
        setLocalStorageData(ROLES_KEY, roles);

        // --- Generate Rich Sample Data for Presentation ---
        const managerRajesh = usersWithIds.find(u => u.email === 'manager.sales@mittaleod.com');
        const priya = usersWithIds.find(u => u.email === 'priya.mehta@mittaleod.com');
        const rohan = usersWithIds.find(u => u.email === 'rohan.singh@mittaleod.com');
        const neha = usersWithIds.find(u => u.email === 'neha.patel@mittaleod.com');
        const alok = usersWithIds.find(u => u.email === 'alok.sharma@mittaleod.com');
        const vivek = usersWithIds.find(u => u.email === 'vivek.kumar@mittaleod.com');

        if (managerRajesh && priya && rohan && neha && alok && vivek) {
            const sampleReports: EODReport[] = [];
            const sampleTasks: Task[] = [];
            const sampleMeetings: Meeting[] = [];
            const sampleMeetingInstances: MeetingInstance[] = [];
            const sampleLeaveRecords: LeaveRecord[] = [];
            const sampleNotifications: AppNotification[] = [];
            const sampleUserBadges: UserBadgeRecord[] = [];
            const sampleActivityLog: ActivityLogItem[] = []; // Will populate this as we go

            const now = new Date();
            const anHourAgo = new Date(now.getTime() - 3600 * 1000);
            
            // --- Priya's 12-day report streak for badge ---
            let workingDaysCount = 0;
            for (let i = 15; i >= 0 && workingDaysCount < 12; i--) {
                const reportDate = new Date();
                reportDate.setDate(now.getDate() - i);
                if (isDayWeeklyOff(reportDate, priya.weeklyOffDay)) continue;

                const submissionTime = new Date(reportDate);
                submissionTime.setHours(18, 30, 0, 0); // 6:30 PM
                const ackTime = new Date(submissionTime.getTime() + 2 * 3600 * 1000); // 2 hours later

                const report: EODReport = {
                    id: generateId('report'), employeeId: priya.id, employeeName: priya.name, date: getLocalYYYYMMDD(reportDate),
                    versions: [{ versionNumber: 1, tasksCompleted: `- Completed daily client calls.\n- Prepared materials for ${i === 1 ? 'tomorrow\'s' : 'the next day\'s'} pitch.\n- Coordinated with marketing on campaign data.`, planForTomorrow: '- Follow up with new leads.', timestamp: submissionTime.getTime(), action: 'submitted' }],
                    status: ReportStatus.ACKNOWLEDGED, managerComments: 'Good work.', isLate: false, submittedAt: submissionTime.getTime(), acknowledgedByManagerId: managerRajesh.id, acknowledgedAt: ackTime.getTime(),
                };
                sampleReports.push(report);
                workingDaysCount++;
                
                // Activity Log for Priya's report
                sampleActivityLog.push({ id: generateId('act'), timestamp: report.submittedAt, actorId: priya.id, actorName: priya.name, type: ActivityLogActionType.EOD_SUBMITTED, description: `submitted EOD report for`, targetId: report.id, targetName: formatDateDDMonYYYY(report.date) });
                // Activity Log for Rajesh's acknowledgement
                sampleActivityLog.push({ id: generateId('act'), timestamp: report.acknowledgedAt!, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.EOD_ACKNOWLEDGED, description: `acknowledged ${priya.name}'s EOD report for`, targetId: report.id, targetName: formatDateDDMonYYYY(report.date), targetUserId: priya.id, targetUserName: priya.name });
            }
            // Badge for Priya
            sampleUserBadges.push({ id: generateId('badge'), userId: priya.id, badgeType: BadgeType.TEN_DAY_STREAK, earnedDate: getLocalYYYYMMDD(new Date()), description: 'Earned for a 10-day reporting streak.' });


            // --- Rohan's Reports (Late & Edited) ---
            const rohanReportDate1 = getPastDate(2); // 2 days ago - will be edited
            const rohanReportDate2 = getPastDate(4); // 4 days ago - will be late
            
            const rohanReport1: EODReport = {
                id: generateId('report'), employeeId: rohan.id, employeeName: rohan.name, date: rohanReportDate1,
                versions: [
                    { versionNumber: 1, tasksCompleted: '- Cold called 20 leads.\n- Onboarded new client.', timestamp: new Date(rohanReportDate1 + 'T18:00:00').getTime(), action: 'submitted' },
                    { versionNumber: 2, tasksCompleted: '- Cold called 25 potential leads.\n- Onboarded new client.\n- Updated CRM with contacts.', challengesFaced: 'Initial data was incomplete.', timestamp: new Date(rohanReportDate1 + 'T19:00:00').getTime(), action: 'edited' }
                ],
                status: ReportStatus.PENDING_ACKNOWLEDGMENT, isLate: false, submittedAt: new Date(rohanReportDate1 + 'T18:00:00').getTime(),
            };
            sampleReports.push(rohanReport1);
            sampleActivityLog.push({ id: generateId('act'), timestamp: rohanReport1.submittedAt, actorId: rohan.id, actorName: rohan.name, type: ActivityLogActionType.EOD_SUBMITTED, description: `submitted EOD report for`, targetId: rohanReport1.id, targetName: formatDateDDMonYYYY(rohanReport1.date) });
            sampleActivityLog.push({ id: generateId('act'), timestamp: rohanReport1.versions[1].timestamp, actorId: rohan.id, actorName: rohan.name, type: ActivityLogActionType.EOD_EDITED, description: `edited EOD report for`, targetId: rohanReport1.id, targetName: formatDateDDMonYYYY(rohanReport1.date) });


            const rohanReport2: EODReport = {
                id: generateId('report'), employeeId: rohan.id, employeeName: rohan.name, date: rohanReportDate2,
                versions: [{ versionNumber: 1, tasksCompleted: '- Followed up on all high-priority leads.', planForTomorrow: '- Start new campaign outreach.', timestamp: new Date(rohanReportDate2 + 'T21:00:00').getTime(), action: 'submitted' }],
                status: ReportStatus.ACKNOWLEDGED, managerComments: 'Thanks for getting this in.', isLate: true, submittedAt: new Date(rohanReportDate2 + 'T21:00:00').getTime(), acknowledgedByManagerId: managerRajesh.id, acknowledgedAt: new Date(rohanReportDate2 + 'T22:00:00').getTime(),
            };
            sampleReports.push(rohanReport2);
            sampleActivityLog.push({ id: generateId('act'), timestamp: rohanReport2.submittedAt, actorId: rohan.id, actorName: rohan.name, type: ActivityLogActionType.EOD_LATE_SUBMITTED, description: `submitted a late EOD report for`, targetId: rohanReport2.id, targetName: formatDateDDMonYYYY(rohanReport2.date), isCrucial: true });
            sampleActivityLog.push({ id: generateId('act'), timestamp: rohanReport2.acknowledgedAt!, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.EOD_ACKNOWLEDGED, description: `acknowledged ${rohan.name}'s EOD report for`, targetId: rohanReport2.id, targetName: formatDateDDMonYYYY(rohanReport2.date), targetUserId: rohan.id, targetUserName: rohan.name });


            // --- Neha's Report (On Week Off) ---
            const nehaReportDate = getPastDate(1);
            const nehaReport: EODReport = {
                id: generateId('report'), employeeId: neha.id, employeeName: neha.name, date: nehaReportDate,
                versions: [{ versionNumber: 1, tasksCompleted: '- Finalized the social media schedule for next week.', timestamp: new Date(nehaReportDate + 'T17:00:00').getTime(), action: 'submitted' }],
                status: ReportStatus.ACKNOWLEDGED, managerComments: 'Thanks for putting in the extra time!', isLate: false, submittedAt: new Date(nehaReportDate + 'T17:00:00').getTime(), acknowledgedByManagerId: managerRajesh.id, acknowledgedAt: new Date(nehaReportDate + 'T18:00:00').getTime(), submittedOnWeekOff: true,
            };
            sampleReports.push(nehaReport);
            sampleActivityLog.push({ id: generateId('act'), timestamp: nehaReport.submittedAt, actorId: neha.id, actorName: neha.name, type: ActivityLogActionType.EOD_SUBMITTED, description: `submitted EOD report for`, targetId: nehaReport.id, targetName: formatDateDDMonYYYY(nehaReport.date) });

            // --- Alok's & Vivek's reports for yesterday for AI summary test ---
            const yesterday = getPastDate(1);
            if (!isDayWeeklyOff(new Date(yesterday.replace(/-/g, '/')), alok.weeklyOffDay)) {
                const alokReport: EODReport = {
                    id: generateId('report'), employeeId: alok.id, employeeName: alok.name, date: yesterday,
                    versions: [{ versionNumber: 1, tasksCompleted: '- Conducted 5 product demos.\n- Finalized monthly sales report.', planForTomorrow: '- Follow up with leads from demos.', timestamp: new Date(yesterday + 'T18:00:00').getTime(), action: 'submitted' }],
                    status: ReportStatus.PENDING_ACKNOWLEDGMENT, isLate: false, submittedAt: new Date(yesterday + 'T18:00:00').getTime(),
                };
                sampleReports.push(alokReport);
                sampleActivityLog.push({ id: generateId('act'), timestamp: alokReport.submittedAt, actorId: alok.id, actorName: alok.name, type: ActivityLogActionType.EOD_SUBMITTED, description: `submitted EOD report for`, targetId: alokReport.id, targetName: formatDateDDMonYYYY(alokReport.date) });
            }
            if (!isDayWeeklyOff(new Date(yesterday.replace(/-/g, '/')), vivek.weeklyOffDay)) {
                const vivekReport: EODReport = {
                    id: generateId('report'), employeeId: vivek.id, employeeName: vivek.name, date: yesterday,
                    versions: [{ versionNumber: 1, tasksCompleted: '- Analyzed campaign performance data.\n- Created new ad creatives.', challengesFaced: 'Ad platform had a temporary outage.', timestamp: new Date(yesterday + 'T18:15:00').getTime(), action: 'submitted' }],
                    status: ReportStatus.PENDING_ACKNOWLEDGMENT, isLate: false, submittedAt: new Date(yesterday + 'T18:15:00').getTime(),
                };
                sampleReports.push(vivekReport);
                sampleActivityLog.push({ id: generateId('act'), timestamp: vivekReport.submittedAt, actorId: vivek.id, actorName: vivek.name, type: ActivityLogActionType.EOD_SUBMITTED, description: `submitted EOD report for`, targetId: vivekReport.id, targetName: formatDateDDMonYYYY(vivekReport.date) });
            }


            // --- Alok's Leave ---
            const alokLeaveDate = getPastDate(3);
            const leave1: LeaveRecord = { id: generateId('leave'), employeeId: alok.id, employeeName: alok.name, date: alokLeaveDate, status: LeaveStatus.APPROVED, reason: 'Personal Emergency', createdAt: new Date(alokLeaveDate + 'T09:00:00').getTime(), businessUnitId: alok.businessUnitId, businessUnitName: alok.businessUnitName };
            sampleLeaveRecords.push(leave1);
            sampleActivityLog.push({ id: generateId('act'), timestamp: leave1.createdAt, actorId: alok.id, actorName: alok.name, type: ActivityLogActionType.LEAVE_MARKED_BY_EMPLOYEE, description: `marked leave for`, targetId: leave1.id, targetName: formatDateDDMonYYYY(leave1.date), isCrucial: true });


            // --- Vivek's Future Leave ---
            const vivekLeaveDate = getFutureDate(5);
            const leave2: LeaveRecord = { id: generateId('leave'), employeeId: vivek.id, employeeName: vivek.name, date: vivekLeaveDate, status: LeaveStatus.APPROVED, reason: 'Vacation', createdAt: anHourAgo.getTime(), businessUnitId: vivek.businessUnitId, businessUnitName: vivek.businessUnitName };
            sampleLeaveRecords.push(leave2);
            sampleActivityLog.push({ id: generateId('act'), timestamp: leave2.createdAt, actorId: vivek.id, actorName: vivek.name, type: ActivityLogActionType.LEAVE_FUTURE_SCHEDULED_BY_EMPLOYEE, description: `scheduled future leave for`, targetId: leave2.id, targetName: formatDateDDMonYYYY(leave2.date) });

            
            // --- TASKS ---
            const priyaPersonalTask: Task = { id: generateId('task'), title: "Outline Q4 personal growth goals", description: "Review last quarter's performance and outline 3-5 key goals.", priority: TaskPriority.Medium, status: TaskStatus.InProgress, dueDate: getFutureDate(7), assignedTo: [priya.id], createdBy: priya.id, createdOn: new Date(getPastDate(2)).getTime(), updatedOn: new Date(getPastDate(2)).getTime(), taskType: TaskType.Personal, isPersonalTask: true, pinnedBy: [priya.id] };
            sampleTasks.push(priyaPersonalTask);
            sampleActivityLog.push({ id: generateId('act'), timestamp: priyaPersonalTask.createdOn, actorId: priya.id, actorName: priya.name, type: ActivityLogActionType.TASK_CREATED, description: `created a personal task: "Outline Q4 personal growth goals"`, targetId: priyaPersonalTask.id, targetName: priyaPersonalTask.title });

            const rohanDirectTask: Task = { id: generateId('task'), title: "Follow up with XYZ Corp", description: "Contact John Doe at XYZ Corp regarding the new proposal.", priority: TaskPriority.High, status: TaskStatus.Completed, dueDate: getPastDate(1), assignedTo: [rohan.id], memberProgress: { [rohan.id]: { status: TaskStatus.Completed, completedAt: new Date(getPastDate(1)).getTime() } }, createdBy: managerRajesh.id, createdOn: new Date(getPastDate(4)).getTime(), updatedOn: new Date(getPastDate(1)).getTime(), taskType: TaskType.Direct, isPersonalTask: false, pinnedBy: [] };
            sampleTasks.push(rohanDirectTask);
            sampleActivityLog.push({ id: generateId('act'), timestamp: rohanDirectTask.createdOn, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.TASK_CREATED, description: `assigned a task to ${rohan.name}:`, targetId: rohanDirectTask.id, targetName: rohanDirectTask.title, targetUserId: rohan.id, targetUserName: rohan.name });

            const salesTeamTask: Task = { id: generateId('task'), title: "Q3 Sales Strategy Brainstorm", description: `Collaborate on a document to outline the sales strategy. @[Priya Mehta](${priya.id}) is the lead.`, teamName: 'Q3 Strategy Team', priority: TaskPriority.High, status: TaskStatus.InProgress, dueDate: getFutureDate(10), assignedTo: [priya.id, rohan.id, neha.id], memberProgress: { [priya.id]: { status: TaskStatus.InProgress }, [rohan.id]: { status: TaskStatus.Completed, completedAt: new Date(getPastDate(1)).getTime() }, [neha.id]: { status: TaskStatus.NotStarted } }, createdBy: managerRajesh.id, createdOn: new Date(getPastDate(5)).getTime(), updatedOn: new Date(getPastDate(1)).getTime(), taskType: TaskType.Team, isPersonalTask: false, pinnedBy: [managerRajesh.id], subTasks: [{title: 'Analyze competitor data', completed: true}, {title: 'Draft initial proposal points', completed: false}, {title: 'Schedule follow-up meeting', completed: false}]};
            sampleTasks.push(salesTeamTask);
            sampleActivityLog.push({ id: generateId('act'), timestamp: salesTeamTask.createdOn, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.TASK_CREATED, description: `created a team task:`, targetId: salesTeamTask.id, targetName: salesTeamTask.title });

            // Add more completed tasks for performance review
            const priyaCompletedTask: Task = { id: generateId('task'), title: "Prepare Q3 pitch deck", description: "Create the main presentation for the Q3 client pitch.", priority: TaskPriority.High, status: TaskStatus.Completed, dueDate: getPastDate(5), assignedTo: [priya.id], memberProgress: { [priya.id]: { status: TaskStatus.Completed, completedAt: new Date(getPastDate(5)).getTime() } }, createdBy: managerRajesh.id, createdOn: new Date(getPastDate(8)).getTime(), updatedOn: new Date(getPastDate(5)).getTime(), taskType: TaskType.Direct, isPersonalTask: false, pinnedBy: [] };
            sampleTasks.push(priyaCompletedTask);
            sampleActivityLog.push({ id: generateId('act'), timestamp: priyaCompletedTask.createdOn, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.TASK_CREATED, description: `assigned a task to ${priya.name}:`, targetId: priyaCompletedTask.id, targetName: priyaCompletedTask.title, targetUserId: priya.id, targetUserName: priya.name });
            sampleActivityLog.push({ id: generateId('act'), timestamp: priyaCompletedTask.memberProgress![priya.id].completedAt!, actorId: priya.id, actorName: priya.name, type: ActivityLogActionType.TASK_COMPLETED, description: `completed the task:`, targetId: priyaCompletedTask.id, targetName: priyaCompletedTask.title });

            const alokCompletedTask: Task = { id: generateId('task'), title: "Research Top 5 Competitors", description: "Compile a report on the top 5 competitors' latest marketing strategies.", priority: TaskPriority.Medium, status: TaskStatus.Completed, dueDate: getPastDate(10), assignedTo: [alok.id], memberProgress: { [alok.id]: { status: TaskStatus.Completed, completedAt: new Date(getPastDate(10)).getTime() } }, createdBy: managerRajesh.id, createdOn: new Date(getPastDate(15)).getTime(), updatedOn: new Date(getPastDate(10)).getTime(), taskType: TaskType.Direct, isPersonalTask: false, pinnedBy: [] };
            sampleTasks.push(alokCompletedTask);
            sampleActivityLog.push({ id: generateId('act'), timestamp: alokCompletedTask.createdOn, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.TASK_CREATED, description: `assigned a task to ${alok.name}:`, targetId: alokCompletedTask.id, targetName: alokCompletedTask.title, targetUserId: alok.id, targetUserName: alok.name });
            sampleActivityLog.push({ id: generateId('act'), timestamp: alokCompletedTask.memberProgress![alok.id].completedAt!, actorId: alok.id, actorName: alok.name, type: ActivityLogActionType.TASK_COMPLETED, description: `completed the task:`, targetId: alokCompletedTask.id, targetName: alokCompletedTask.title });
            
            // --- MEETINGS ---
            // Recurring Formal Meeting
            const weeklySync: Meeting = { id: generateId('meet'), title: "Weekly Sales Sync", meetingDateTime: new Date(getPastDate(7) + 'T10:00:00').getTime(), attendeeIds: [managerRajesh.id, priya.id, rohan.id, neha.id, alok.id, vivek.id], createdBy: managerRajesh.id, createdAt: new Date(getPastDate(8)).getTime(), updatedAt: new Date(getPastDate(8)).getTime(), attendeeRsvps: { [managerRajesh.id]: RsvpStatus.ATTENDING, [priya.id]: RsvpStatus.ATTENDING, [rohan.id]: RsvpStatus.ATTENDING }, meetingType: 'formal_meeting', agenda: "- Review weekly sales numbers\n- Discuss blockers\n- Plan for the upcoming week", recurrenceRule: 'weekly', seenBy: [managerRajesh.id, priya.id], googleEventId: 'test-google-event-id-123' };
            sampleMeetings.push(weeklySync);
            sampleActivityLog.push({ id: generateId('act'), timestamp: weeklySync.createdAt, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.MEETING_CREATED, description: `created a recurring meeting:`, targetId: weeklySync.id, targetName: weeklySync.title });

            // Finalized instance for last week's sync
            const syncTask: Task = { id: generateId('task'), title: 'Update client pipeline from sync meeting', description: 'As discussed, update the pipeline with the latest status for all active leads.', priority: TaskPriority.Medium, status: TaskStatus.InProgress, dueDate: getFutureDate(2), assignedTo: [priya.id, rohan.id], createdBy: managerRajesh.id, createdOn: new Date(getPastDate(7) + 'T11:00:00').getTime(), updatedOn: new Date(getPastDate(7) + 'T11:00:00').getTime(), taskType: TaskType.Team, isPersonalTask: false, pinnedBy: [], meetingId: weeklySync.id };
            sampleTasks.push(syncTask);

            const syncInstance: MeetingInstance = { id: generateId('inst'), seriesId: weeklySync.id, occurrenceDate: getPastDate(7), meetingMinutes: `Great sync today.\n\nPriya showcased the new deck.\n\nRohan has a new high-value lead.\n\n/task Update client pipeline from sync meeting due: in 2 days @[Priya Mehta](${priya.id}) @[Rohan Singh](${rohan.id})`, taskIds: [syncTask.id], finalizedAt: new Date(getPastDate(7) + 'T11:00:00').getTime() };
            sampleMeetingInstances.push(syncInstance);
            sampleActivityLog.push({ id: generateId('act'), timestamp: syncInstance.finalizedAt, actorId: managerRajesh.id, actorName: managerRajesh.name, type: ActivityLogActionType.MEETING_FINALIZED, description: `finalized the meeting session for "${weeklySync.title}" on`, targetId: weeklySync.id, targetName: formatDateDDMonYYYY(syncInstance.occurrenceDate) });

            // Live Memo
            const liveMemo: Meeting = { id: generateId('meet'), title: "Client Pitch Brainstorm", meetingDateTime: new Date(getPastDate(2) + 'T15:00:00').getTime(), attendeeIds: [managerRajesh.id, priya.id], createdBy: managerRajesh.id, createdAt: new Date(getPastDate(2) + 'T15:00:00').getTime(), updatedAt: new Date(getPastDate(2) + 'T15:00:00').getTime(), meetingType: 'live_memo', seenBy: [] };
            sampleMeetings.push(liveMemo);
            
            const memoTask: Task = { id: generateId('task'), title: 'Draft initial slides for new pitch deck', description: '', priority: TaskPriority.High, status: TaskStatus.NotStarted, dueDate: getFutureDate(4), assignedTo: [priya.id], createdBy: managerRajesh.id, createdOn: new Date(getPastDate(2) + 'T15:30:00').getTime(), updatedOn: new Date(getPastDate(2) + 'T15:30:00').getTime(), taskType: TaskType.Direct, isPersonalTask: false, pinnedBy: [], meetingId: liveMemo.id };
            sampleTasks.push(memoTask);

            const memoInstance: MeetingInstance = { id: generateId('inst'), seriesId: liveMemo.id, occurrenceDate: getPastDate(2), meetingMinutes: `Discussed the main value propositions.\n\n/task Draft initial slides for new pitch deck due: in 4 days @[Priya Mehta](${priya.id})`, taskIds: [memoTask.id], finalizedAt: new Date(getPastDate(2) + 'T15:30:00').getTime() };
            sampleMeetingInstances.push(memoInstance);

            // --- NOTIFICATIONS ---
            sampleNotifications.push({ id: generateId('notif'), userId: priya.id, message: `${managerRajesh.name} assigned you to the team task: "${salesTeamTask.title}"`, timestamp: salesTeamTask.createdOn, read: true, type: 'info', link: `/my-tasks?taskId=${salesTeamTask.id}` });
            sampleNotifications.push({ id: generateId('notif'), userId: managerRajesh.id, message: `${rohan.name}'s report for ${formatDateDDMonYYYY(rohanReport1.date)} is pending your acknowledgment.`, timestamp: anHourAgo.getTime(), read: false, type: 'reminder', link: '/manage-reports', actionType: 'ACKNOWLEDGE_REPORT', targetId: rohanReport1.id, actors: [{id: rohan.id, name: rohan.name}] });
            sampleNotifications.push({ id: generateId('notif'), userId: priya.id, message: `Meeting starting in 10 mins: "${weeklySync.title}"`, timestamp: now.getTime() - 5000, read: false, type: 'reminder', link: `/meetings/${weeklySync.id}`, isCrucial: true });

            // --- SET ALL DATA ---
            setLocalStorageData(REPORTS_KEY, sampleReports);
            setLocalStorageData(TASKS_KEY, sampleTasks);
            setLocalStorageData(MEETINGS_KEY, sampleMeetings);
            setLocalStorageData(MEETING_INSTANCES_KEY, sampleMeetingInstances);
            setLocalStorageData(LEAVE_RECORDS_KEY, sampleLeaveRecords);
            setLocalStorageData(NOTIFICATIONS_KEY, sampleNotifications);
            setLocalStorageData(USER_BADGES_KEY, sampleUserBadges);

            // Populate activity logs for all relevant users
            const allDemoUsers = [managerRajesh, priya, rohan, neha, alok, vivek];
            for (const user of allDemoUsers) {
                const userLogs = sampleActivityLog
                    .filter(log => log.actorId === user.id || log.targetUserId === user.id || (user.roleId === 'manager' && log.targetId && (log.targetId.startsWith('task_') || log.targetId.startsWith('meet_'))))
                    .sort((a,b) => b.timestamp - a.timestamp);
                
                const uniqueLogs = Array.from(new Map(userLogs.map(item => [item.id, item])).values());
                
                setLocalStorageData(`${ACTIVITY_LOG_KEY_PREFIX}${user.id}`, uniqueLogs.slice(0, 200));
            }

        } else {
             // Fallback to empty defaults if key users aren't found
            setLocalStorageData(REPORTS_KEY, DEFAULT_REPORTS);
            setLocalStorageData(NOTIFICATIONS_KEY, DEFAULT_NOTIFICATIONS);
            setLocalStorageData(LEAVE_RECORDS_KEY, DEFAULT_LEAVE_RECORDS);
            setLocalStorageData(TASKS_KEY, DEFAULT_TASKS);
            setLocalStorageData(MEETINGS_KEY, DEFAULT_MEETINGS);
            setLocalStorageData(MEETING_INSTANCES_KEY, DEFAULT_MEETING_INSTANCES);
            setLocalStorageData(USER_BADGES_KEY, DEFAULT_USER_BADGES);
        }

        setLocalStorageData(TRIGGER_LOG_KEY, DEFAULT_TRIGGER_LOG_ENTRIES);
    }
};

// --- User Management ---
export const getUsers = async (overrideTenantId?: string): Promise<User[]> => {
    // Platform admin can pass explicit tenantId, regular users use their own
    const tenantId = overrideTenantId || requireTenantId();
    const users = await userRepository.getAll(tenantId);
    const roles = await getRoles();
    const businessUnits = await getBusinessUnits();
    // Denormalize roleName and businessUnitName for easier display
    return users.map(user => ({
        ...user,
        roleName: roles.find(r => r.id === user.roleId)?.name || 'N/A',
        businessUnitName: businessUnits.find(bu => bu.id === user.businessUnitId)?.name || 'N/A'
    }));
};
export const getUserById = async (id: string): Promise<User | null> => await userRepository.getById(id);
export const getUserByEmail = async (email: string): Promise<User | null> => await userRepository.getByEmail(email);

export const addUser = async (userData: Omit<User, 'id' | 'status' | 'roleName' | 'businessUnitName'> & { password?: string }, actor: User): Promise<User | null> => {
    const allUsers = await getUsers();
    if (allUsers.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("A user with this email already exists.");
    }
    const tenantId = requireTenantId();
    
    // PRODUCTION: Use Cloud Function to create user with Firebase Auth account
    // This ensures users can login with email/password
    const password = userData.password || `${userData.email.split('@')[0]}@2025`; // Default password if not provided
    
    const roles = await getRoles();
    const businessUnits = await getBusinessUnits();
    const role = roles.find(r => r.id === userData.roleId);
    const businessUnit = businessUnits.find(bu => bu.id === userData.businessUnitId);
    
    try {
        const { callCreateUser } = await import('./cloudFunctions');
        
        const result = await callCreateUser({
            email: userData.email.toLowerCase(),
            password: password,
            name: userData.name,
            roleId: userData.roleId,
            roleName: role?.name || 'Employee',
            businessUnitId: userData.businessUnitId || '',
            businessUnitName: businessUnit?.name || '',
            designation: userData.designation || '',
            tenantId: tenantId
        });
        
        console.log(`✅ User created via Cloud Function: ${result.userId}`);
        
        // CRITICAL: Invalidate user cache so the new user appears in the list
        const { clearUserCache } = await import('./repositories');
        clearUserCache();
        
        // Fetch the created user from Firestore (will bypass stale cache)
        const createdUser = await getUserById(result.userId);
        
        if (createdUser) {
            // Log activity
            await addActivityLog({ 
                timestamp: Date.now(), 
                actorId: actor.id, 
                actorName: actor.name, 
                type: ActivityLogActionType.USER_CREATED, 
                description: `created a new user: ${createdUser.name}`, 
                targetUserId: createdUser.id, 
                targetUserName: createdUser.name 
            });
            
            return createdUser;
        }
        
        return null;
    } catch (error: any) {
        console.error('Error creating user via Cloud Function:', error);
        
        // Better error message for duplicate email (Firebase Auth already has this user)
        if (error.message?.includes('email-already-in-use') || error.message?.includes('already exists')) {
            throw new Error('This email is already registered. If the user doesn\'t appear in the list, please contact support to clean up orphaned accounts.');
        }
        
        throw new Error(error.message || 'Failed to create user');
    }
};

export const updateUser = async (updatedUserData: User, actor: User): Promise<User | null> => {
    const oldUser = await getUserById(updatedUserData.id);
    if (!oldUser) return null;

    await userRepository.update(updatedUserData.id, updatedUserData);

    const changes: { type: ActivityLogActionType, description: string }[] = [];
    if (oldUser.roleId !== updatedUserData.roleId) {
        const oldRole = await getRoleById(oldUser.roleId);
        const newRole = await getRoleById(updatedUserData.roleId);
        changes.push({ type: ActivityLogActionType.USER_ROLE_CHANGED, description: `role changed from "${oldRole?.name}" to "${newRole?.name}"`});
    }
    if (oldUser.notificationEmail !== updatedUserData.notificationEmail) {
        changes.push({ type: ActivityLogActionType.USER_NOTIFICATION_EMAIL_CHANGED, description: `notification email was updated`});
    }
    if (oldUser.name !== updatedUserData.name) changes.push({ type: ActivityLogActionType.USER_ROLE_CHANGED, description: `name was updated to "${updatedUserData.name}"` });
    if (oldUser.businessUnitId !== updatedUserData.businessUnitId) changes.push({ type: ActivityLogActionType.USER_ROLE_CHANGED, description: `business unit was updated` });
    if (oldUser.status !== updatedUserData.status) {
        const type = updatedUserData.status === UserStatus.ARCHIVED ? ActivityLogActionType.USER_ARCHIVED : ActivityLogActionType.USER_UNARCHIVED;
        changes.push({ type, description: `status changed to ${updatedUserData.status}` });
    }

    if (changes.length > 0) {
        const changesText = changes.map(c => c.description).join(', ');
        await addNotification({
            userId: updatedUserData.id,
            message: `An administrator updated your profile: ${changesText}.`,
            type: 'info',
            isCrucial: true,
        });

        for (const change of changes) {
            await addActivityLog({
                timestamp: Date.now(),
                actorId: actor.id,
                actorName: actor.name,
                type: change.type,
                description: `updated ${change.description} for user ${updatedUserData.name}`,
                targetUserId: updatedUserData.id,
                targetUserName: updatedUserData.name
            });
        }
    }

    return updatedUserData;
};

export const permanentlyDeleteUser = async (userId: string, actor: User): Promise<void> => {
    const userToDelete = await getUserById(userId);
    if (!userToDelete) throw new Error("User not found.");
    if (userToDelete.status !== UserStatus.ARCHIVED) throw new Error("Only archived users can be permanently deleted.");

    await userRepository.delete(userId);
    
    // Cascade delete related data (using repositories)
    const reports = await getReports();
    for (const report of reports.filter(r => r.employeeId === userId)) {
        await reportRepository.delete(report.id);
    }
    
    const leaves = await leaveRepository.getAll();
    for (const leave of leaves.filter(l => l.employeeId === userId)) {
        await leaveRepository.delete(leave.id);
    }
    
    const notifications = await notificationRepository.getByUser(userId);
    for (const notification of notifications) {
        await notificationRepository.delete(notification.id);
    }
    
    const tasks = await getTasks();
    for (const task of tasks.filter(t => t.createdBy === userId || t.assignedTo.includes(userId))) {
        await taskRepository.delete(task.id);
    }

    await addActivityLog({ timestamp: Date.now(), actorId: actor.id, actorName: actor.name, type: ActivityLogActionType.USER_PERMANENTLY_DELETED, description: `permanently deleted user ${userToDelete.name}`, targetUserId: userToDelete.id, targetUserName: userToDelete.name });
};

// --- Role Management ---
export const getRoles = async (overrideTenantId?: string): Promise<Role[]> => {
    const tenantId = overrideTenantId || requireTenantId();
    return await roleRepository.getAll(tenantId);
};
export const getRoleById = async (id: string): Promise<Role | null> => await roleRepository.getById(id);
export const updateRole = async (role: Role): Promise<Role> => {
    const existingRole = await getRoleById(role.id);
    if (!existingRole) throw new Error("Role not found");
    const actor = getAuthUser();
    await roleRepository.update(role.id, role);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.ROLE_UPDATED,
        description: `updated role:`,
        targetId: role.id,
        targetName: role.name
    });
    
    return role;
};
export const addRole = async (roleData: Omit<Role, 'id'>): Promise<Role> => {
    let roles = await getRoles();
    if (roles.some(r => r.name.toLowerCase() === roleData.name.toLowerCase())) throw new Error("Role name already exists");
    const tenantId = requireTenantId();
    const actor = getAuthUser();
    const newRole: Role = { ...roleData, id: generateId('role'), tenantId };
    await roleRepository.create(newRole.id, newRole);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.ROLE_CREATED,
        description: `created role:`,
        targetId: newRole.id,
        targetName: newRole.name
    });
    
    return newRole;
};
export const deleteRole = async (roleId: string): Promise<void> => {
    const users = await getUsers();
    if (users.some(u => u.roleId === roleId)) throw new Error("Cannot delete role as it is assigned to one or more users.");
    const role = await roleRepository.getById(roleId);
    const actor = getAuthUser();
    await roleRepository.delete(roleId);
    
    // Log activity
    if (role) {
        await addActivityLog({
            timestamp: Date.now(),
            actorId: actor.id,
            actorName: actor.name,
            type: ActivityLogActionType.ROLE_DELETED,
            description: `deleted role:`,
            targetId: roleId,
            targetName: role.name
        });
    }
};

// --- Business Unit Management ---
export const getBusinessUnits = async (overrideTenantId?: string): Promise<BusinessUnit[]> => {
    const tenantId = overrideTenantId || requireTenantId();
    return await businessUnitRepository.getAll(tenantId);
};
export const addBusinessUnit = async (buData: Omit<BusinessUnit, 'id' | 'status'>): Promise<BusinessUnit> => {
    let bus = await getBusinessUnits();
    if (bus.some(b => b.name.toLowerCase() === buData.name.toLowerCase())) throw new Error("Business Unit name already exists");
    const tenantId = requireTenantId();
    const actor = getAuthUser();
    const newBU: BusinessUnit = { ...buData, id: generateId('bu'), status: 'active', tenantId };
    await businessUnitRepository.create(newBU.id, newBU);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.BUSINESS_UNIT_CREATED,
        description: `created business unit:`,
        targetId: newBU.id,
        targetName: newBU.name
    });
    
    return newBU;
};
export const updateBusinessUnit = async (bu: BusinessUnit): Promise<BusinessUnit> => {
    const existing = await businessUnitRepository.getById(bu.id);
    if (!existing) throw new Error("Business Unit not found");
    const actor = getAuthUser();
    await businessUnitRepository.update(bu.id, bu);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.BUSINESS_UNIT_UPDATED,
        description: `updated business unit:`,
        targetId: bu.id,
        targetName: bu.name
    });
    
    return bu;
};
export const archiveBusinessUnit = async (buId: string): Promise<void> => {
    const bu = await businessUnitRepository.getById(buId);
    if (!bu) throw new Error("Business Unit not found");
    const actor = getAuthUser();
    bu.status = 'archived';
    await businessUnitRepository.update(buId, bu);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.BUSINESS_UNIT_ARCHIVED,
        description: `archived business unit:`,
        targetId: bu.id,
        targetName: bu.name
    });
};
export const unarchiveBusinessUnit = async (buId: string): Promise<void> => {
    const bu = await businessUnitRepository.getById(buId);
    if (!bu) throw new Error("Business Unit not found");
    const actor = getAuthUser();
    bu.status = 'active';
    await businessUnitRepository.update(buId, bu);
    
    // Log activity
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.BUSINESS_UNIT_UNARCHIVED,
        description: `restored business unit:`,
        targetId: bu.id,
        targetName: bu.name
    });
};
export const permanentlyDeleteBusinessUnit = async (buId: string): Promise<void> => {
    const users = await getUsers();
    if (users.some(u => u.businessUnitId === buId)) throw new Error("Cannot delete Business Unit as it is assigned to users.");
    const bu = await businessUnitRepository.getById(buId);
    const actor = getAuthUser();
    await businessUnitRepository.delete(buId);
    
    // Log activity
    if (bu) {
        await addActivityLog({
            timestamp: Date.now(),
            actorId: actor.id,
            actorName: actor.name,
            type: ActivityLogActionType.BUSINESS_UNIT_DELETED,
            description: `permanently deleted business unit:`,
            targetId: buId,
            targetName: bu.name
        });
    }
};

// --- Report Management ---
export const getReports = async (): Promise<EODReport[]> => {
    const tenantId = requireTenantId();
    return await reportRepository.getAll(tenantId);
};

// Helper function to filter reports based on user role
export const getReportsForUser = async (currentUser: User): Promise<EODReport[]> => {
    const allReports = await getReports();
    
    // Directors see all reports across all business units in their tenant
    if (isDirector(currentUser.roleName)) {
        return allReports;
    }
    
    // Managers see reports from their business unit only
    if (isManagerOrAdmin(currentUser.roleName) && currentUser.businessUnitId) {
        return allReports.filter(r => r.businessUnitId === currentUser.businessUnitId);
    }
    
    // For other roles (employees, admins without BU), return all
    return allReports;
};
export const getReportById = async (id: string): Promise<EODReport | null> => await reportRepository.getById(id);
export const getReportsByEmployee = async (employeeId: string): Promise<EODReport[]> => await reportRepository.getByEmployee(employeeId);

export const addReport = async (reportData: { employeeId: string; employeeName: string; date: string; initialTasksCompleted: string; initialChallengesFaced?: string; initialPlanForTomorrow?: string; initialAttachments?: Attachment[]; isCopied?: boolean; }): Promise<EODReport> => {
    const allReports = await getReports();
    const allUsers = await getUsers();
    const employee = allUsers.find(u => u.id === reportData.employeeId);
    if (!employee) throw new Error("Employee not found");
    
    const now = new Date();
    // Use local date for weekly off check by parsing without timezone
    const reportDateObj = new Date(reportData.date.replace(/-/g, '/'));
    
    const tenantId = requireTenantId();
    const newReport: EODReport = {
        id: generateId('report'),
        employeeId: reportData.employeeId,
        employeeName: reportData.employeeName,
        date: reportData.date,
        versions: [{
            versionNumber: 1,
            tasksCompleted: reportData.initialTasksCompleted,
            challengesFaced: reportData.initialChallengesFaced,
            planForTomorrow: reportData.initialPlanForTomorrow,
            attachments: reportData.initialAttachments,
            isCopied: reportData.isCopied,
            timestamp: now.getTime(),
            action: 'submitted',
        }],
        status: ReportStatus.PENDING_ACKNOWLEDGMENT,
        submittedOnWeekOff: isDayWeeklyOff(reportDateObj, employee.weeklyOffDay),
        isLate: now.getHours() >= LATE_SUBMISSION_HOUR, // After 7 PM
        isYesterdaySubmission: getLocalYYYYMMDD(now) !== reportData.date,
        submittedAt: now.getTime(),
        tenantId,
    };
    await reportRepository.create(newReport.id, newReport);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'ADD_REPORT', payload: { ...newReport } });

    const logType = newReport.isLate ? ActivityLogActionType.EOD_LATE_SUBMITTED : ActivityLogActionType.EOD_SUBMITTED;
    await addActivityLog({
        timestamp: newReport.submittedAt,
        actorId: employee.id, actorName: employee.name, type: logType,
        description: `submitted EOD report for`,
        targetId: newReport.id, targetName: formatDateDDMonYYYY(newReport.date),
        isCrucial: newReport.isLate
    });

    // Notify Manager
    const manager = allUsers.find(u => u.roleName === 'Manager' && u.businessUnitId === employee.businessUnitId);
    if (manager) {
        await addNotification({
            userId: manager.id,
            message: `${employee.name} submitted a new report.`,
            type: 'reminder',
            link: '/manage-reports',
            actionType: 'ACKNOWLEDGE_REPORT',
            targetId: newReport.id,
            actors: [{ id: employee.id, name: employee.name }],
            isCrucial: true
        });
    }

    return newReport;
};

export const addReportVersionByEmployee = async (reportId: string, versionData: Omit<ReportVersion, 'versionNumber' | 'timestamp' | 'action'>, actor: User): Promise<EODReport | null> => {
    let allReports = await getReports();
    const reportIndex = allReports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) return null;
    
    const report = allReports[reportIndex];
    if (report.versions.length >= MAX_REPORT_VERSIONS) throw new Error("Maximum number of edits reached.");
    
    const editTimestamp = Date.now();
    report.versions.push({
        ...versionData,
        versionNumber: report.versions.length + 1,
        timestamp: editTimestamp,
        action: 'edited',
    });
    
    await reportRepository.update(report.id, report);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'UPDATE_REPORT', payload: { ...report } });

    await addActivityLog({
        timestamp: editTimestamp,
        actorId: actor.id, actorName: actor.name, type: ActivityLogActionType.EOD_EDITED,
        description: `edited EOD report for`,
        targetId: report.id, targetName: formatDateDDMonYYYY(report.date)
    });

    return report;
};

export const updateReportByManager = async (updateData: { id: string; status?: ReportStatus; managerComments?: string }, manager: User): Promise<EODReport | null> => {
    let allReports = await getReports();
    const reportIndex = allReports.findIndex(r => r.id === updateData.id);
    if (reportIndex === -1) return null;

    const report = allReports[reportIndex];
    const oldStatus = report.status;
    const oldComments = report.managerComments || '';

    if (updateData.status) report.status = updateData.status;
    if (updateData.managerComments !== undefined) report.managerComments = updateData.managerComments;
    const acknowledgedAtTimestamp = Date.now();
    if (updateData.status === ReportStatus.ACKNOWLEDGED) {
        // Legacy fields for backward compatibility
        report.acknowledgedByManagerId = manager.id;
        report.acknowledgedAt = acknowledgedAtTimestamp;
        
        // Multi-Manager Acknowledgment: Append to acknowledgments array
        if (!report.acknowledgments) {
            report.acknowledgments = [];
        }
        
        // Check if this manager already acknowledged
        const existingAckIndex = report.acknowledgments.findIndex(ack => ack.managerId === manager.id);
        if (existingAckIndex === -1) {
            // New acknowledgment - add to array
            report.acknowledgments.push({
                managerId: manager.id,
                managerName: manager.name,
                acknowledgedAt: acknowledgedAtTimestamp,
                comments: updateData.managerComments,
                designation: manager.roleName // Manager, Director, etc.
            });
        } else {
            // Update existing acknowledgment
            report.acknowledgments[existingAckIndex].acknowledgedAt = acknowledgedAtTimestamp;
            report.acknowledgments[existingAckIndex].comments = updateData.managerComments;
        }
    }
    
    await reportRepository.update(report.id, report);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'UPDATE_REPORT', payload: { ...report } });
    
    if (updateData.status === ReportStatus.ACKNOWLEDGED && oldStatus !== ReportStatus.ACKNOWLEDGED) {
        await addActivityLog({
            timestamp: acknowledgedAtTimestamp,
            actorId: manager.id, actorName: manager.name, type: ActivityLogActionType.EOD_ACKNOWLEDGED,
            description: `acknowledged ${report.employeeName}'s EOD report for`,
            targetId: report.id, targetName: formatDateDDMonYYYY(report.date),
            targetUserId: report.employeeId, targetUserName: report.employeeName
        });
        await addNotification({
            userId: report.employeeId,
            message: `Your EOD report was acknowledged by ${manager.name}.`,
            type: 'info',
            link: `/my-reports`,
            actionType: 'EOD_ACKNOWLEDGED',
            targetId: report.id,
            actors: [{ id: report.id, name: formatDateDDMonYYYY(report.date) }],
            isCrucial: true
        });
    }

    if (updateData.managerComments && updateData.managerComments.trim() !== oldComments.trim()) {
        await addNotification({
            userId: report.employeeId,
            message: `${manager.name} left a comment on your EOD report for ${formatDateDDMonYYYY(report.date)}.`,
            type: 'info',
            link: `/my-reports`,
            isCrucial: true
        });
    }

    return report;
};

export const getReportAcknowledgmentStatus = (report: EODReport) => {
    const acknowledgments = report.acknowledgments || [];
    
    const hasManagerAcknowledged = (managerId: string): boolean => {
        if (acknowledgments.length > 0) {
            return acknowledgments.some(ack => ack.managerId === managerId);
        }
        return report.acknowledgedByManagerId === managerId;
    };
    
    const getAcknowledgingManagers = (): Array<{ id: string; name: string; timestamp: number; designation?: string }> => {
        if (acknowledgments.length > 0) {
            return acknowledgments.map(ack => ({
                id: ack.managerId,
                name: ack.managerName,
                timestamp: ack.acknowledgedAt,
                designation: ack.designation
            }));
        }
        if (report.acknowledgedByManagerId && report.acknowledgedAt) {
            return [{
                id: report.acknowledgedByManagerId,
                name: 'Manager',
                timestamp: report.acknowledgedAt
            }];
        }
        return [];
    };
    
    const getAcknowledgmentCount = (): number => {
        if (acknowledgments.length > 0) {
            return acknowledgments.length;
        }
        return report.acknowledgedByManagerId ? 1 : 0;
    };
    
    return {
        hasManagerAcknowledged,
        getAcknowledgingManagers,
        getAcknowledgmentCount
    };
};

export const acknowledgeMultipleReports = async (reportIds: string[], manager: User, comments?: string): Promise<boolean> => {
    let allReports = await getReports();
    let updatedCount = 0;
    const employeeNotifications: { [employeeId: string]: { report: EODReport, managerName: string }[] } = {};

    for (const id of reportIds) {
        const reportIndex = allReports.findIndex(r => r.id === id);
        if (reportIndex === -1) continue;
        
        const report = allReports[reportIndex];
        const acknowledgmentStatus = getReportAcknowledgmentStatus(report);
        
        if (acknowledgmentStatus.hasManagerAcknowledged(manager.id)) {
            console.log(`Manager ${manager.name} has already acknowledged report ${report.id}`);
            continue;
        }
        
        const acknowledgedAtTimestamp = Date.now();
        const newAcknowledgment = {
            managerId: manager.id,
            managerName: manager.name,
            acknowledgedAt: acknowledgedAtTimestamp,
            comments: comments || 'Acknowledged in batch',
            designation: manager.roleName // Store role (Manager, Director, etc.)
        };
        
        if (!report.acknowledgments) {
            report.acknowledgments = [];
        }
        report.acknowledgments.push(newAcknowledgment);
        
        const isFirstAcknowledgment = report.acknowledgments.length === 1;
        
        if (isFirstAcknowledgment) {
            report.status = ReportStatus.ACKNOWLEDGED;
            report.acknowledgedByManagerId = manager.id;
            report.acknowledgedAt = acknowledgedAtTimestamp;
            if (!report.managerComments) {
                report.managerComments = comments || 'Acknowledged in batch';
            }
        }
        
        await reportRepository.update(report.id, report);
        updatedCount++;
        
        await addActivityLog({
            timestamp: acknowledgedAtTimestamp,
            actorId: manager.id,
            actorName: manager.name,
            type: ActivityLogActionType.EOD_ACKNOWLEDGED,
            description: `acknowledged ${report.employeeName}'s EOD report for`,
            targetId: report.id,
            targetName: formatDateDDMonYYYY(report.date),
            targetUserId: report.employeeId,
            targetUserName: report.employeeName
        });

        if (!employeeNotifications[report.employeeId]) {
            employeeNotifications[report.employeeId] = [];
        }
        employeeNotifications[report.employeeId].push({ report, managerName: manager.name });
    }
    
    for (const employeeId in employeeNotifications) {
        const notifs = employeeNotifications[employeeId];
        const managerName = notifs[0].managerName;
        await addNotification({
            userId: employeeId,
            message: `Your EOD reports have been acknowledged by ${managerName}.`,
            type: 'info',
            link: '/my-reports',
            actionType: 'EOD_ACKNOWLEDGED',
            targetId: `batch-ack-${Date.now()}`,
            actors: notifs.map(n => ({ id: n.report.id, name: formatDateDDMonYYYY(n.report.date) })),
            isCrucial: true
        });
    }

    return true;
};

export const isReportEditable = async (report: EODReport): Promise<{ editable: boolean, reason: string }> => {
    if (report.status === ReportStatus.ACKNOWLEDGED) {
        return { editable: false, reason: "Editing locked: Report has been acknowledged by a manager." };
    }
    if (report.versions.length >= MAX_REPORT_VERSIONS) {
        return { editable: false, reason: `Editing locked: Maximum number of edits (${MAX_REPORT_VERSIONS - 1}) reached.` };
    }
    const twoHoursInMillis = 2 * 60 * 60 * 1000;
    if (Date.now() - report.submittedAt > twoHoursInMillis) {
        return { editable: false, reason: "Editing locked: More than 2 hours have passed since initial submission." };
    }
    return { editable: true, reason: "" };
};

// --- Other exports...
// FIX START: Add all missing functions
// --- Task Management ---
export const getTaskById = async (id: string): Promise<Task | null> => await taskRepository.getById(id);
export const getTasks = async (): Promise<Task[]> => {
    const tenantId = requireTenantId();
    return await taskRepository.getAll(tenantId);
};

export const addTask = async (taskData: Omit<Task, 'id' | 'createdOn' | 'updatedOn' | 'pinnedBy' | 'overdueReminderSentFor'>, actor: User): Promise<Task> => {
    const allTasks = await getTasks();
    const tenantId = requireTenantId();
    const now = Date.now();
    const newTask: Task = {
        ...taskData,
        id: generateId('task'),
        createdOn: now,
        updatedOn: now,
        pinnedBy: [],
        overdueReminderSentFor: [],
        tenantId,
    };
    await taskRepository.create(newTask.id, newTask);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'ADD_TASK', payload: { ...newTask } });

    await addActivityLog({
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.TASK_CREATED,
        description: taskData.isPersonalTask ? `created a personal task:` : `created task:`,
        targetId: newTask.id,
        targetName: newTask.title,
    });
    
    for (const assigneeId of newTask.assignedTo) {
        if (assigneeId !== actor.id) {
            await addNotification({
                userId: assigneeId,
                message: `${actor.name} assigned you a new task: "${newTask.title}"`,
                type: 'info',
                link: '/my-tasks?taskId=' + newTask.id,
                isCrucial: true
            });
        }
    }

    return newTask;
};

export const updateTask = async (taskId: string, updatedFields: Partial<Task>, actor: User): Promise<Task | null> => {
    const allTasks = await getTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const oldTask = await getTaskById(taskId);
    if (!oldTask) return null;
    const updatedTask = { ...oldTask, ...updatedFields, updatedOn: Date.now() };
    await taskRepository.update(taskId, updatedTask);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'UPDATE_TASK', payload: { ...updatedTask } });
    
    // --- Detailed Activity Logging & Notifications ---
    const logChange = async (type: ActivityLogActionType, field: keyof Task, from: any, to: any, isCrucial = false) => {
        await addActivityLog({
            timestamp: updatedTask.updatedOn,
            actorId: actor.id, actorName: actor.name,
            type: type,
            description: `changed the ${field.toLowerCase()} for task`,
            targetId: updatedTask.id, targetName: updatedTask.title,
            details: { changes: [{ field, from, to }] },
            isCrucial
        });
    };

    if (oldTask.priority !== updatedTask.priority) {
        await logChange(ActivityLogActionType.TASK_PRIORITY_CHANGED, 'priority', oldTask.priority, updatedTask.priority, updatedTask.priority === TaskPriority.High);
    }
    if (oldTask.dueDate !== updatedTask.dueDate) {
        await logChange(ActivityLogActionType.TASK_DUE_DATE_UPDATED, 'dueDate', oldTask.dueDate, updatedTask.dueDate);
        // Notify all assignees about the date change
        for (const assigneeId of updatedTask.assignedTo) {
            await addNotification({
                userId: assigneeId,
                message: `The due date for task "${updatedTask.title}" was changed to ${formatDateDDMonYYYY(updatedTask.dueDate)}.`,
                type: 'info',
                link: isManagerOrAdmin(actor.roleName) ? `/team-tasks?taskId=${updatedTask.id}` : `/my-tasks?taskId=${updatedTask.id}`,
                isCrucial: true
            });
        }
    }
    if (oldTask.status !== updatedTask.status) {
        const logType = updatedTask.status === TaskStatus.Completed ? ActivityLogActionType.TASK_COMPLETED : updatedTask.status === TaskStatus.Blocked ? ActivityLogActionType.TASK_STATUS_CHANGED : ActivityLogActionType.TASK_STATUS_CHANGED;
        await logChange(logType, 'status', oldTask.status, updatedTask.status, updatedTask.status === TaskStatus.Blocked);
        // If an employee marks a task as completed, notify the manager who created it
        // Guard: Only notify on TRANSITION to Completed (not if already Completed)
        if (updatedTask.status === TaskStatus.Completed && oldTask.status !== TaskStatus.Completed && actor.id !== updatedTask.createdBy) {
            await addNotification({
                userId: updatedTask.createdBy,
                message: `${actor.name} completed the task: "${updatedTask.title}"`,
                type: 'info',
                isCrucial: true,
                link: `/team-tasks?taskId=${updatedTask.id}`
            });
        }
        // If an employee marks a task as blocked, notify the manager who created it
        if (updatedTask.status === TaskStatus.Blocked && actor.id !== updatedTask.createdBy) {
            await addNotification({
                userId: updatedTask.createdBy,
                message: `${actor.name} marked the task "${updatedTask.title}" as Blocked.`,
                type: 'warning',
                isCrucial: true,
                link: `/team-tasks?taskId=${updatedTask.id}`
            });
        }
    }

    const oldAssignees = new Set(oldTask.assignedTo);
    const newAssignees = new Set(updatedTask.assignedTo);
    if (JSON.stringify([...oldAssignees].sort()) !== JSON.stringify([...newAssignees].sort())) {
        await logChange(ActivityLogActionType.TASK_REASSIGNED, 'assignedTo', oldTask.assignedTo.join(', '), updatedTask.assignedTo.join(', '));
        // Notify only the newly added assignees
        const newlyAdded = [...newAssignees].filter(id => !oldAssignees.has(id));
        for (const newAssigneeId of newlyAdded) {
            await addNotification({
                userId: newAssigneeId,
                message: `${actor.name} assigned you a new task: "${updatedTask.title}"`,
                type: 'info',
                link: `/my-tasks?taskId=${updatedTask.id}`,
                isCrucial: true
            });
        }
    }

    // Generic log for other changes (e.g., description, title)
    if (oldTask.description !== updatedTask.description || oldTask.title !== updatedTask.title) {
         await addActivityLog({
            timestamp: updatedTask.updatedOn, actorId: actor.id, actorName: actor.name,
            type: ActivityLogActionType.TASK_EDITED,
            description: `edited the details for task`,
            targetId: updatedTask.id, targetName: updatedTask.title,
        });
        // Notify all assignees about description/title change
        for (const assigneeId of updatedTask.assignedTo) {
            if (assigneeId !== actor.id) {
                await addNotification({
                    userId: assigneeId,
                    message: `Details for task "${updatedTask.title}" were updated.`,
                    type: 'info',
                    link: isManagerOrAdmin(actor.roleName) ? `/team-tasks?taskId=${updatedTask.id}` : `/my-tasks?taskId=${updatedTask.id}`,
                    isCrucial: true
                });
            }
        }
    }

    return updatedTask;
};

export const deleteTask = async (taskId: string, actor: User): Promise<boolean> => {
    const taskToDelete = await getTaskById(taskId);
    if (!taskToDelete) return false;
    
    await taskRepository.delete(taskId);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'DELETE_TASK', payload: { taskId } });
    
    await addActivityLog({
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.TASK_DELETED,
        description: `deleted task:`,
        targetId: taskToDelete.id,
        targetName: taskToDelete.title,
    });
    
    return true;
};

export const updateTaskMemberStatus = async (taskId: string, memberId: string, newStatus: TaskStatus, actor: User): Promise<Task | null> => {
    const allTasks = await getTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const task = allTasks[taskIndex];
    if (task.taskType !== TaskType.Team) return task;

    const memberProgress = task.memberProgress || {};
    memberProgress[memberId] = {
        status: newStatus,
        completedAt: newStatus === TaskStatus.Completed ? Date.now() : undefined
    };
    task.memberProgress = memberProgress;
    task.updatedOn = Date.now();
    
    const allCompleted = task.assignedTo.every(id => memberProgress[id]?.status === TaskStatus.Completed);
    if (allCompleted) {
        task.status = TaskStatus.Completed;
    } else if (task.status === TaskStatus.Completed) {
        task.status = TaskStatus.InProgress;
    }

    await taskRepository.update(taskId, task);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'UPDATE_TASK', payload: { ...task } });

    await addActivityLog({
        timestamp: task.updatedOn,
        actorId: actor.id,
        actorName: actor.name,
        type: newStatus === TaskStatus.Completed ? ActivityLogActionType.TASK_COMPLETED : ActivityLogActionType.TASK_STATUS_CHANGED,
        description: `updated their status to "${newStatus}" for task:`,
        targetId: task.id,
        targetName: task.title
    });

    // Notify the task creator when all team members complete the task
    if (allCompleted && task.status === TaskStatus.Completed && actor.id !== task.createdBy) {
        await addNotification({
            userId: task.createdBy,
            message: `All team members completed the task: "${task.title}"`,
            type: 'info',
            isCrucial: true,
            link: `/team-tasks?taskId=${task.id}`
        });
    }

    return task;
};

export const getCommentsForTask = async (taskId: string): Promise<TaskComment[]> => {
    return await taskRepository.getComments(taskId);
};

export const addTaskComment = async (taskId: string, text: string, actor: User): Promise<TaskComment> => {
    const commentId = generateId('comment');
    const newComment: TaskComment = {
        id: commentId,
        tenantId: actor.tenantId,
        taskId,
        text,
        createdBy: actor.id,
        createdOn: Date.now(),
    };
    await taskRepository.addComment(commentId, newComment);

    // FIX: Removed incorrect timestamp property
    syncService.addToQueue({ type: 'ADD_TASK_COMMENT', payload: { ...newComment } });
    
    const task = await getTaskById(taskId);
    if (task) {
        await addActivityLog({
            timestamp: newComment.createdOn,
            actorId: actor.id,
            actorName: actor.name,
            type: ActivityLogActionType.TASK_COMMENT_ADDED,
            description: `commented on task:`,
            targetId: task.id,
            targetName: task.title
        });
        
        // --- @Mention Notification Logic ---
        const mentionedIds = parseMentions(text);
        for (const mentionedId of mentionedIds) {
            if (mentionedId !== actor.id) {
                await addNotification({
                    userId: mentionedId,
                    message: `${actor.name} mentioned you in a comment on: "${task.title}"`,
                    type: 'info',
                    link: isManagerOrAdmin(actor.roleName) ? `/team-tasks?taskId=${task.id}` : `/my-tasks?taskId=${task.id}`,
                    isCrucial: true,
                });
            }
        }
        
        // --- Standard New Comment Notification Logic ---
        const recipients = new Set([...task.assignedTo, task.createdBy].filter(id => !mentionedIds.includes(id)));
        for (const recipientId of recipients) {
            if (recipientId !== actor.id) {
                await addNotification({
                    userId: recipientId,
                    message: `${actor.name} commented on task: "${task.title}"`,
                    type: 'info',
                    link: isManagerOrAdmin(actor.roleName) ? `/team-tasks?taskId=${task.id}` : `/my-tasks?taskId=${task.id}`,
                    actionType: 'TASK_COMMENT_ADDED',
                    targetId: task.id,
                    actors: [{ id: actor.id, name: actor.name }],
                    isCrucial: true
                });
            }
        }
    }
    
    return newComment;
};

// --- Leave Management ---
export const getLeaveRecords = async (): Promise<LeaveRecord[]> => {
    const tenantId = requireTenantId();
    return await leaveRepository.getAll(tenantId);
};
export const getLeaveRecordForEmployeeOnDate = async (employeeId: string, date: string): Promise<LeaveRecord | null> => {
    const records = await leaveRepository.getByEmployee(employeeId);
    return records.find(r => r.date === date) || null;
};
export const addLeaveRecord = async (employeeId: string, date: string, reason: string): Promise<LeaveRecord> => {
    const existingRecords = await leaveRepository.getByEmployee(employeeId);
    if (existingRecords.some(r => r.date === date)) {
        throw new Error(`A leave record already exists for this employee on ${formatDateDDMonYYYY(date)}.`);
    }
    const employee = await getUserById(employeeId);
    if (!employee) throw new Error("Employee not found");

    const tenantId = requireTenantId();
    const leaveId = generateId('leave');
    const newRecord: LeaveRecord = {
        id: leaveId,
        employeeId,
        employeeName: employee.name,
        date,
        status: LeaveStatus.APPROVED,
        reason,
        createdAt: Date.now(),
        businessUnitId: employee.businessUnitId,
        businessUnitName: employee.businessUnitName,
        tenantId,
    };

    await leaveRepository.create(leaveId, newRecord);
    
    await addActivityLog({
        timestamp: newRecord.createdAt,
        actorId: employeeId,
        actorName: employee.name,
        type: new Date(date) > new Date() ? ActivityLogActionType.LEAVE_FUTURE_SCHEDULED_BY_EMPLOYEE : ActivityLogActionType.LEAVE_MARKED_BY_EMPLOYEE,
        description: `marked leave for`,
        targetId: newRecord.id,
        targetName: formatDateDDMonYYYY(date),
        isCrucial: true
    });
    
    return newRecord;
};

export const deleteLeaveRecord = async (leaveRecordId: string): Promise<boolean> => {
    const recordToDelete = await leaveRepository.getById(leaveRecordId);
    if (!recordToDelete) throw new Error("Leave record not found.");

    await leaveRepository.delete(leaveRecordId);

    await addActivityLog({
        timestamp: Date.now(),
        actorId: recordToDelete.employeeId,
        actorName: recordToDelete.employeeName,
        type: new Date(recordToDelete.date) > new Date() ? ActivityLogActionType.LEAVE_FUTURE_CANCELED_BY_EMPLOYEE : ActivityLogActionType.LEAVE_REVOKED_BY_EMPLOYEE,
        description: `revoked leave for`,
        targetId: recordToDelete.id,
        targetName: formatDateDDMonYYYY(recordToDelete.date)
    });

    return true;
};

// --- Badge Management ---
export const getUserBadges = async (userId: string): Promise<UserBadgeRecord[]> => {
    return await badgeRepository.getByUser(userId);
};

// --- Meeting Management ---
export const addMeeting = async (meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'meetingType' | 'seenBy'>, actor: User): Promise<Meeting> => {
    const tenantId = requireTenantId();
    const meetingId = generateId('meet');
    const now = Date.now();
    const newMeeting: Meeting = {
        ...meetingData,
        id: meetingId,
        createdAt: now,
        updatedAt: now,
        updatedBy: actor.id,
        meetingType: 'formal_meeting',
        seenBy: [actor.id],
        tenantId,
    };
    await meetingRepository.create(meetingId, newMeeting);
    
    // Notify all internal attendees
    if (meetingData.attendeeIds && meetingData.attendeeIds.length > 0) {
        const meetingDate = new Date(meetingData.meetingDateTime);
        const formattedDate = formatDateTimeDDMonYYYYHHMM(meetingData.meetingDateTime);
        
        for (const attendeeId of meetingData.attendeeIds) {
            // Don't notify the creator
            if (attendeeId !== actor.id) {
                await addNotification({
                    userId: attendeeId,
                    message: `${actor.name} scheduled you for a meeting: "${meetingData.title}" on ${formattedDate}`,
                    type: 'info',
                    isCrucial: true,
                    link: `/meetings/${meetingId}`,
                    actionType: 'MEETING_SCHEDULED',
                    targetId: meetingId,
                    actors: [{ id: actor.id, name: actor.name }]
                });
            }
        }
    }
    
    // Add activity log
    await addActivityLog({
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.MEETING_SCHEDULED,
        description: `scheduled a meeting`,
        targetId: meetingId,
        targetName: meetingData.title
    });
    
    return newMeeting;
};

export const updateMeeting = async (meetingId: string, updatedFields: Partial<Meeting>, actor: User): Promise<Meeting | null> => {
    const existingMeeting = await meetingRepository.getById(meetingId);
    if (!existingMeeting) return null;

    const updatedMeeting = { ...existingMeeting, ...updatedFields, updatedAt: Date.now(), updatedBy: actor.id };
    await meetingRepository.update(meetingId, updatedMeeting);
    // Add logging and notifications
    return updatedMeeting;
};

export const markMeetingAsSeen = async (meetingId: string, userId: string): Promise<void> => {
    const meeting = await meetingRepository.getById(meetingId);
    if (meeting) {
        const seenBy = new Set(meeting.seenBy || []);
        seenBy.add(userId);
        await meetingRepository.update(meetingId, { seenBy: Array.from(seenBy) });
    }
};

export const finalizeLiveMemo = async (data: { title: string; notes: string; attendeeIds: string[]; creator: User; attendees: User[] }): Promise<Meeting> => {
    const { title, notes, attendeeIds, creator } = data;
    const tenantId = requireTenantId();
    const now = new Date();
    
    const meetingId = generateId('meet');
    const newMeeting: Meeting = {
        id: meetingId,
        title,
        meetingDateTime: now.getTime(),
        attendeeIds,
        createdBy: creator.id,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        meetingType: 'live_memo',
        seenBy: [creator.id],
        tenantId,
    };
    
    await meetingRepository.create(meetingId, newMeeting);

    const pendingTasks = parseLiveMemoText(notes, data.attendees, attendeeIds);
    const createdTaskIds: string[] = [];
    for (const task of pendingTasks) {
        const createdTask = await addTask({
            title: task.title,
            description: task.description || '',
            dueDate: task.dueDate,
            priority: task.priority,
            assignedTo: task.assigneeIds,
            createdBy: creator.id,
            taskType: task.assigneeIds.length > 1 ? TaskType.Team : TaskType.Direct,
            isPersonalTask: false,
            meetingId: newMeeting.id,
            status: TaskStatus.NotStarted
        }, creator);
        createdTaskIds.push(createdTask.id);
    }
    
    const instanceId = generateId('inst');
    const newInstance: MeetingInstance = {
        id: instanceId,
        seriesId: newMeeting.id,
        occurrenceDate: getLocalYYYYMMDD(now),
        meetingMinutes: notes,
        taskIds: createdTaskIds,
        finalizedAt: now.getTime(),
        tenantId,
    };
    
    await meetingRepository.createInstance(instanceId, newInstance);

    return newMeeting;
};

export const finalizeMeetingInstance = async (meetingId: string, date: string, notes: string, pendingTasks: PendingTask[], actor: User, isAsync: boolean): Promise<{ calendarSynced: boolean; error?: string }> => {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const createdTaskIds: string[] = [];
    const createdTasks: Task[] = [];
    for (const task of pendingTasks) {
        const createdTask = await addTask({
            title: task.title,
            description: task.description || '',
            dueDate: task.dueDate,
            priority: task.priority,
            assignedTo: task.assigneeIds,
            createdBy: actor.id,
            taskType: task.assigneeIds.length > 1 ? TaskType.Team : TaskType.Direct,
            isPersonalTask: false,
            meetingId: meeting.id,
            status: TaskStatus.NotStarted
        }, actor);
        createdTaskIds.push(createdTask.id);
        createdTasks.push(createdTask);
    }

    const tenantId = requireTenantId();
    const instanceId = generateId('inst');
    const newInstance: MeetingInstance = {
        id: instanceId,
        seriesId: meeting.id,
        occurrenceDate: date,
        meetingMinutes: notes,
        taskIds: createdTaskIds,
        finalizedAt: Date.now(),
        isAsynchronous: isAsync,
        tenantId,
    };

    await meetingRepository.createInstance(instanceId, newInstance);
    
    // ... logging & notifications ...

    return await syncMeetingNotesToCalendar(meeting, newInstance, createdTasks);
};

export const getMonthlyReportStatus = async (userId: string, year: number, month: number): Promise<MonthlyReportStatus> => {
    const statusMap: MonthlyReportStatus = {};
    const user = await getUserById(userId);
    if (!user) return {};

    const reports = await getReportsByEmployee(userId);
    const leaves = await getLeaveRecordsByEmployee(userId);
    const numDays = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= numDays; day++) {
        const date = new Date(Date.UTC(year, month, day));
        const dateStr = getLocalYYYYMMDD(date);
        
        const isWeeklyOff = isDayWeeklyOff(date, user.weeklyOffDay);
        const isOnLeave = leaves.some(l => l.date === dateStr);

        if (isWeeklyOff || isOnLeave) {
            statusMap[dateStr] = 'non-working';
            continue;
        }
        
        if (date > new Date()) continue;

        const hasReport = reports.some(r => r.date === dateStr);
        statusMap[dateStr] = hasReport ? 'submitted' : 'missed';
    }

    return statusMap;
};
// FIX END

export const getMeetings = async (): Promise<Meeting[]> => {
    const tenantId = requireTenantId();
    return await meetingRepository.getAll(tenantId);
};
export const getMeetingById = async (id: string): Promise<Meeting | null> => await meetingRepository.getById(id);
export const getMeetingInstancesForSeries = async (seriesId: string): Promise<MeetingInstance[]> => {
    return await meetingRepository.getInstancesBySeries(seriesId);
};
export const getNotifications = async (): Promise<AppNotification[]> => {
    // Note: This now returns all notifications. Consider filtering by user in components
    const allUsers = await getUsers();
    const allNotifs: AppNotification[] = [];
    for (const user of allUsers) {
        const userNotifs = await notificationRepository.getByUser(user.id);
        allNotifs.push(...userNotifs);
    }
    return allNotifs;
};
export const getNotificationsForUser = async (userId: string): Promise<AppNotification[]> => {
    return await notificationRepository.getByUser(userId);
};
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await notificationRepository.update(notificationId, { read: true });
};
export const clearReadUserNotifications = async (userId: string): Promise<void> => {
    const notifs = await notificationRepository.getByUser(userId);
    const readNotifs = notifs.filter(n => n.read);
    for (const notif of readNotifs) {
        await notificationRepository.delete(notif.id);
    }
};
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const notifs = await notificationRepository.getByUser(userId);
    for (const notif of notifs) {
        if (!notif.read) {
            await notificationRepository.update(notif.id, { read: true });
        }
    }
};
export const clearAllUserNotifications = async (userId: string): Promise<void> => {
    const notifs = await notificationRepository.getByUser(userId);
    for (const notif of notifs) {
        await notificationRepository.delete(notif.id);
    }
};
export const addNotification = async (notificationData: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'tenantId'>): Promise<AppNotification> => {
    const tenantId = requireTenantId();
    const notifId = generateId('notif');
    const newNotification: AppNotification = {
        ...notificationData,
        id: notifId,
        timestamp: Date.now(),
        read: false,
        tenantId,
    };
    await notificationRepository.create(notifId, newNotification);
    
    // Vibrate if supported
    if ('vibrate' in navigator) navigator.vibrate(100);
    
    // Trigger Desktop Notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            const title = `${APP_NAME} ${notificationData.type === 'reminder' ? 'Reminder' : 'Notification'}`;
            const options = {
                body: notificationData.message,
                icon: 'icons/icon-192x192.png',
                badge: 'icons/icon-badge-72x72.png',
                tag: newNotification.id,
                data: {
                    url: notificationData.link || '/'
                }
            };
            registration.showNotification(title, options);
        });
    }
    
    return newNotification;
};
export const getTriggerLogEntries = async (): Promise<TriggerLogEntry[]> => {
    const tenantId = requireTenantId();
    return await triggerLogRepository.getAll(tenantId);
};

export const addTriggerLogEntry = async (logData: Omit<TriggerLogEntry, 'id' | 'timestamp'>): Promise<TriggerLogEntry> => {
    const tenantId = requireTenantId();
    const logId = generateId('trig');
    const newLog: TriggerLogEntry = {
        ...logData,
        id: logId,
        timestamp: Date.now(),
        tenantId,
    };
    await triggerLogRepository.create(logId, newLog);
    return newLog;
};

export const checkAndAwardBadges = async (userId: string): Promise<void> => { /* ... */ };
export const transformActivityToTimelineEvent = async (activity: ActivityLogItem, currentUser: User): Promise<TimelineEvent> => {
  const actorName = activity.actorId === currentUser.id ? "You" : activity.actorName;
  let description = activity.description;
  let link: string | undefined = undefined;
  
  // Handle "Diffs" for more descriptive messages
  if (activity.details?.changes && activity.details.changes.length > 0) {
      const change = activity.details.changes[0];
      let fieldName = change.field.replace(/([A-Z])/g, ' $1').toLowerCase();
      let from = change.from;
      let to = change.to;

      if(fieldName === 'due date') {
          from = formatDateDDMonYYYY(from);
          to = formatDateDDMonYYYY(to);
      }
      
      description = `changed the ${fieldName} for task from "${from}" to "${to}"`;
  }
  
  // Create cross-links
  if (activity.targetId) {
      const targetType = activity.targetId.split('_')[0];
      switch(targetType) {
          case 'task': link = isManagerOrAdmin(currentUser.roleName) ? `/team-tasks?taskId=${activity.targetId}` : `/my-tasks?taskId=${activity.targetId}`; break;
          case 'meet': link = `/meetings/${activity.targetId}`; break;
          case 'report': link = isManagerOrAdmin(currentUser.roleName) ? `/manage-reports` : `/my-reports`; break;
      }
  }

  return {
    id: activity.id,
    timestamp: activity.timestamp,
    actorName: actorName,
    originalActorName: activity.actorName,
    actionDescription: description,
    targetName: activity.targetName,
    targetId: activity.targetId,
    icon: TIMELINE_EVENT_ICONS[activity.type] || 'fas fa-history',
    originalActionType: activity.type,
    isCrucial: activity.isCrucial,
    targetLink: link,
  };
};
const isManagerOrAdmin = (roleName?: string) => roleName === 'Manager' || roleName === 'Super Admin' || roleName === 'Director';
export const isDirector = (roleName?: string) => roleName === 'Director';

export const getMeetingsForUser = async (userId: string): Promise<Meeting[]> => (await getMeetings()).filter(m => m.attendeeIds.includes(userId) || m.createdBy === userId);

export const getLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
    // Fetch all necessary data
    const [users, reports, leaveRecords] = await Promise.all([
        getUsers(),
        getReports(),
        getLeaveRecords()
    ]);

    // Delegate calculation to the specialized service
    return leaderboardService.calculateLeaderboardData(users, reports, leaveRecords);
};

export const getEmployeeConsistencyDetails = async (): Promise<DelinquentEmployeeDetails[]> => {
    const users = await getUsers();
    const reports = await getReports();
    const activeEmployees = users.filter(u => u.status === UserStatus.ACTIVE && u.roleName === 'Employee');

    const consistencyDetails: DelinquentEmployeeDetails[] = [];

    for (const employee of activeEmployees) {
        let consecutiveDaysMissed = 0;
        let lastReportSubmittedOn: string | undefined = undefined;

        // Find the most recent report for this employee to display
        const employeeReports = reports
            .filter(r => r.employeeId === employee.id)
            .sort((a, b) => b.date.localeCompare(a.date));

        if (employeeReports.length > 0) {
            lastReportSubmittedOn = employeeReports[0].date;
        }

        // Calculate reports this month
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayStr = getLocalYYYYMMDD(firstDayOfMonth);
        const todayStr = getLocalYYYYMMDD(today);
        
        const reportsThisMonth = employeeReports.filter(r => r.date >= firstDayStr && r.date <= todayStr).length;

        // Check backwards from today (not yesterday) to count consecutive missed working days
        // Stop checking after a reasonable limit, e.g., 90 days
        for (let i = 0; i <= 90; i++) { 
            const checkDate = new Date();
            checkDate.setDate(today.getDate() - i);
            checkDate.setHours(0,0,0,0);

            const isWorkingDay = await isWorkingDayForEmployee(checkDate, employee);
            if (!isWorkingDay) {
                continue; // Skip non-working days (weekly offs and approved leaves)
            }

            const dateStr = getLocalYYYYMMDD(checkDate);
            const hasReport = reports.some(r => r.employeeId === employee.id && r.date === dateStr);

            if (!hasReport) {
                consecutiveDaysMissed++;
            } else {
                // Streak is broken - found a report
                break;
            }
        }
        
        consistencyDetails.push({
            user: employee,
            consecutiveDaysMissed,
            lastReportSubmittedOn,
            reportsThisMonth,
        });
    }

    // Sort by most days missed descending
    return consistencyDetails.sort((a, b) => b.consecutiveDaysMissed - a.consecutiveDaysMissed);
};

export const processAndCacheMonthlyAwards = async (): Promise<void> => { /* ... */ };
export const generateReportSummary = async (reports: EODReport[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key is not configured. Please set it up to use AI features.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Summarize the following EOD reports for a manager. Highlight key achievements, common challenges, and any notable plans. Be concise and use bullet points.\n\nREPORTS:\n${JSON.stringify(reports, null, 2)}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const generatePerformanceReviewSummary = async (employee: User, reports: EODReport[], tasks: Task[], leaves: LeaveRecord[], dateRange: DateRange): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key is not configured. Please set it up to use AI features.");
  const ai = new GoogleGenAI({ apiKey });

  const sanitizedReports = reports.map(r => ({
    date: r.date,
    isLate: r.isLate,
    tasksCompleted: r.versions[r.versions.length - 1].tasksCompleted,
    challengesFaced: r.versions[r.versions.length - 1].challengesFaced,
  }));

  const sanitizedTasks = tasks.map(t => ({
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
  }));

  const prompt = `
    Generate a concise performance review summary for the employee "${employee.name}" for the period from ${dateRange.startDate} to ${dateRange.endDate}.
    Use the provided data. The output should be professional, well-structured markdown.

    Employee Details:
    - Name: ${employee.name}
    - Designation: ${employee.designation}

    Data:
    - Total EOD Reports Submitted in Period: ${reports.length}
    - Reports Marked as Late: ${reports.filter(r => r.isLate).length}
    - Total Completed Tasks in Period: ${tasks.length}
    - Total Leave Days in Period: ${leaves.length}

    EOD Report Details:
    ${JSON.stringify(sanitizedReports, null, 2)}

    Completed Task Details:
    ${JSON.stringify(sanitizedTasks, null, 2)}

    Instructions:
    1.  **Overall Summary:** Start with a brief paragraph summarizing the employee's performance, mentioning consistency, task management, and any standout achievements or areas for improvement.
    2.  **Reporting Consistency:** Analyze their EOD reporting habits. Mention their consistency, punctuality (late reports), and the quality of their reports if discernible from the tasks completed and challenges.
    3.  **Task Management:** Evaluate their task completion. Mention the volume and priority of tasks handled.
    4.  **Key Achievements:** Based on the "Tasks Completed" in reports and the list of completed tasks, identify and list 2-3 key achievements as bullet points.
    5.  **Areas for Improvement:** Based on "Challenges Faced" in reports or patterns of late submissions/overdue tasks, identify 1-2 constructive areas for improvement as bullet points.
    6.  **Attendance:** Briefly mention their attendance based on the number of leaves taken.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const generatePerformanceSnapshotSummary = async (employee: User, reports: EODReport[], tasks: Task[], leaves: LeaveRecord[], dateRange: DateRange): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key is not configured. Please set it up to use AI features.");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze the following performance data for employee "${employee.name}" from ${dateRange.startDate} to ${dateRange.endDate} and provide a very concise, 2-3 bullet point snapshot for a manager's dashboard.
    Focus on key metrics and actionable insights.

    Data:
    - EOD Reports Submitted: ${reports.length}
    - Late Reports: ${reports.filter(r => r.isLate).length}
    - Completed Tasks: ${tasks.length}
    - High Priority Tasks Completed: ${tasks.filter(t => t.priority === TaskPriority.High).length}
    - Days on Leave: ${leaves.length}
    - Key tasks completed titles: ${tasks.map(t => t.title).slice(0, 5).join(', ')}

    Example Output Format:
    - **Reporting:** Submitted 18/20 reports, with 2 late. Good consistency.
    - **Task Output:** Completed 15 tasks, including 5 high-priority. Key accomplishment was closing the "Project X" deal.
    - **Attendance:** Took 1 day of planned leave. Reliable attendance.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

export const getLeaveRecordsByEmployee = async (employeeId: string): Promise<LeaveRecord[]> => (await getLeaveRecords()).filter(l => l.employeeId === employeeId);

export const cancelSingleMeeting = async (meetingId: string, dateToCancel: string, actor: User): Promise<Meeting | null> => {
    const meeting = await meetingRepository.getById(meetingId);
    if (!meeting) return null;
    
    const cancelled = meeting.cancelledOccurrences || [];
    if (!cancelled.includes(dateToCancel)) {
        cancelled.push(dateToCancel);
    }
    
    const updatedMeeting = {
        ...meeting,
        cancelledOccurrences: cancelled,
        updatedAt: Date.now(),
        updatedBy: actor.id
    };
    
    await meetingRepository.update(meetingId, updatedMeeting);

    await addActivityLog({
        timestamp: updatedMeeting.updatedAt,
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.MEETING_OCCURRENCE_CANCELLED,
        description: `cancelled the meeting "${updatedMeeting.title}" for ${formatDateDDMonYYYY(dateToCancel)}`,
        targetId: updatedMeeting.id,
        targetName: formatDateDDMonYYYY(dateToCancel),
        isCrucial: true,
    });

    for (const attendeeId of updatedMeeting.attendeeIds) {
        if (attendeeId !== actor.id) {
            await addNotification({
                userId: attendeeId,
                message: `Meeting cancelled for ${formatDateDDMonYYYY(dateToCancel)}: "${updatedMeeting.title}"`,
                type: 'warning',
                link: `/meetings/${updatedMeeting.id}`,
                isCrucial: true
            });
        }
    }
    return updatedMeeting;
};

export const endRecurringMeeting = async (meetingId: string, actor: User): Promise<Meeting | null> => {
    const meeting = await meetingRepository.getById(meetingId);
    if (!meeting) return null;

    const updatedMeeting = {
        ...meeting,
        recurrenceEndDate: new Date().getTime(), // Set end date to now
        updatedAt: Date.now(),
        updatedBy: actor.id
    };
    
    await meetingRepository.update(meetingId, updatedMeeting);

    await addActivityLog({
        timestamp: updatedMeeting.updatedAt,
        actorId: actor.id,
        actorName: actor.name,
        type: ActivityLogActionType.MEETING_ENDED,
        description: `ended the recurring series for meeting: "${updatedMeeting.title}"`,
        targetId: updatedMeeting.id,
        targetName: updatedMeeting.title,
        isCrucial: true,
    });

    return updatedMeeting;
};

export const isWorkingDayForEmployee = async (date: Date, user: User): Promise<boolean> => {
    // 1. Check for weekly off day
    if (isDayWeeklyOff(date, user.weeklyOffDay)) {
        return false;
    }

    // 2. Check for leave record
    const dateStr = getLocalYYYYMMDD(date);
    const leaveRecord = await getLeaveRecordForEmployeeOnDate(user.id, dateStr);
    if (leaveRecord) {
        return false;
    }

    return true;
};

export const getPreviousMeetingInSeries = async (meeting: Meeting, fromDate: Date): Promise<{ instance: MeetingInstance, tasks: Task[] } | null> => {
    const allInstances = await meetingRepository.getInstancesBySeries(meeting.id);
    const relevantInstances = allInstances
        .filter(i => new Date(i.occurrenceDate) < fromDate)
        .sort((a, b) => b.finalizedAt - a.finalizedAt);

    if (relevantInstances.length === 0) return null;
    
    const latestInstance = relevantInstances[0];
    
    if (!latestInstance.taskIds || latestInstance.taskIds.length === 0) {
        return { instance: latestInstance, tasks: [] };
    }
    
    const allTasks = await getTasks();
    const instanceTasks = allTasks.filter(t => latestInstance.taskIds.includes(t.id));
    const pendingTasks = instanceTasks.filter(t => t.status !== TaskStatus.Completed);
    
    return { instance: latestInstance, tasks: pendingTasks };
};

async function syncMeetingNotesToCalendar(meeting: Meeting | null, instance: MeetingInstance, tasks: Task[]): Promise<{ calendarSynced: boolean; error?: string }> {
    if (!meeting || !meeting.googleEventId) {
        return { calendarSynced: false };
    }
    
    if (!calendarService.isSignedIn()) {
        return { calendarSynced: false, error: "Not signed in to Google Calendar" };
    }

    try {
        const instanceResponse = await calendarService.getInstance(meeting.googleEventId, instance.occurrenceDate);
        if (!instanceResponse || !instanceResponse.result || !instanceResponse.result.items || instanceResponse.result.items.length === 0) {
            return { calendarSynced: false, error: "Could not find the specific meeting instance in your calendar." };
        }
        
        const calendarInstance = instanceResponse.result.items[0];
        const eventId = calendarInstance.id;

        const allUsers = await getUsers();
        const getAssigneeName = (id: string) => allUsers.find(u => u.id === id)?.name || 'Unknown';

        const taskListString = tasks.length > 0
            ? tasks.map(t => `- [ ] ${t.title} (To: ${t.assignedTo.map(getAssigneeName).join(', ')}, Due: ${formatDateDDMonYYYY(t.dueDate)})`).join('\n')
            : 'No action items were created from this session.';

        const newDescription = `---SYNC-NOTES---\n${instance.meetingMinutes}\n---END-SYNC-TASKS---\n\n---SYNC-TASKS---\n${taskListString}\n---END-SYNC-TASKS---`;
        
        await calendarService.updateEvent(eventId, { description: newDescription });

        return { calendarSynced: true };
    } catch (e: any) {
        console.error("Calendar sync failed:", e);
        const errorMessage = e?.result?.error?.message || e?.message || "An unknown error occurred during calendar sync.";
        return { calendarSynced: false, error: errorMessage };
    }
}

// Export Firestore migration function
export const ensureFirestoreReady = migrateToFirestore;