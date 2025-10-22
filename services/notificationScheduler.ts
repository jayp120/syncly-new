

import { User, Task, TaskStatus } from '../types';
import * as DataService from './dataService';
import { getLocalYYYYMMDD, getNextOccurrence, formatDateDDMonYYYY } from '../utils/dateUtils';
import { SCHEDULED_NOTIFICATIONS_KEY } from '../constants';
import eventBus from './eventBus';


// --- LocalStorage for Tracking Sent Notifications ---

interface SentNotifications {
  [key: string]: number; // key is a unique ID for the notification, value is timestamp
}

const getSentNotifications = (): SentNotifications => {
  try {
    const item = localStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    return item ? JSON.parse(item) : {};
  } catch (error) {
    return {};
  }
};

const markAsSent = (key: string) => {
  const sent = getSentNotifications();
  sent[key] = Date.now();
  try {
    localStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(sent));
  } catch (e) {
    console.error("Could not write to local storage, might be full.", e);
  }
};

const hasBeenSent = (key: string): boolean => {
  const sent = getSentNotifications();
  return !!sent[key];
};

const cleanupOldSentMarkers = () => {
    const sent = getSentNotifications();
    const now = Date.now();
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
    const cleanedSent: SentNotifications = {};
    for (const key in sent) {
        if (Object.prototype.hasOwnProperty.call(sent, key)) {
            if (now - sent[key] < threeDaysInMillis) {
                cleanedSent[key] = sent[key];
            }
        }
    }
    localStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(cleanedSent));
};


// --- Notification Checkers ---

/**
 * Meeting Start Reminder (10 and 5 minutes before)
 */
const checkMeetingStartReminder = async (now: Date) => {
  const meetings = await DataService.getMeetings();
  
  for (const meeting of meetings) {
    const nextOccurrenceDate = getNextOccurrence(meeting);

    if (nextOccurrenceDate) {
      const timeDiff = nextOccurrenceDate.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeDiff / (1000 * 60));

      if ((minutesUntil === 10 || minutesUntil === 5) && timeDiff > 0) {
        const key = `meeting-reminder-${meeting.id}-${nextOccurrenceDate.toISOString()}-${minutesUntil}m`;
        if (hasBeenSent(key)) continue;

        // Managers get an interactive toast
        if (meeting.createdBy) {
            const toastId = Date.now() + Math.random();
            eventBus.emit('show-meeting-reminder', { meeting, occurrenceDate: nextOccurrenceDate, toastId });
        }
        
        // Other attendees get a standard notification
        for (const userId of meeting.attendeeIds) {
          if (userId !== meeting.createdBy) {
            await DataService.addNotification({
              userId,
              message: `Meeting starting in ${minutesUntil} mins: "${meeting.title}"`,
              type: 'reminder',
              link: `/meetings/${meeting.id}`,
              isCrucial: true,
            });
          }
        }
        markAsSent(key);
      }
    }
  }
};


/**
 * EOD Reminder at 6:45 PM
 */
const checkEODReminder = async (user: User, now: Date) => {
  if (now.getHours() !== 18 || now.getMinutes() < 45) { // Run from 6:45 PM onwards
    return;
  }
  
  const todayStr = getLocalYYYYMMDD(now);
  const key = `eod-reminder-${user.id}-${todayStr}`;
  
  if (hasBeenSent(key)) return;

  const isWorkingDay = await DataService.isWorkingDayForEmployee(now, user);
  if (!isWorkingDay) {
    markAsSent(key); // Mark as sent to avoid re-checking on a non-working day
    return;
  }
  
  const reports = await DataService.getReportsByEmployee(user.id);
  const hasSubmittedToday = reports.some(r => r.date === todayStr);

  if (!hasSubmittedToday) {
    await DataService.addNotification({
      userId: user.id,
      message: "⏰ It's 6:45 PM. Time to prepare and submit your End-of-Day report!",
      type: 'reminder',
      link: '/submit-eod/today',
      isCrucial: true
    });
    markAsSent(key);
  }
};

/**
 * NEW: Nudge for missed EOD report the next morning at 9:30 AM
 */
const checkMissedEODNudge = async (user: User, now: Date) => {
    // Run this check around 9:30 AM
    if (now.getHours() !== 9 || now.getMinutes() < 30 || now.getMinutes() > 34) {
        return;
    }

    // Determine the previous working day
    let previousWorkingDay = new Date(now);
    previousWorkingDay.setDate(now.getDate() - 1);
    previousWorkingDay.setHours(0, 0, 0, 0);

    let checkCount = 0; // Safety break
    while (checkCount < 7) {
        if (await DataService.isWorkingDayForEmployee(previousWorkingDay, user)) {
            break; // Found it
        }
        previousWorkingDay.setDate(previousWorkingDay.getDate() - 1);
        checkCount++;
    }

    const prevWorkingDayStr = getLocalYYYYMMDD(previousWorkingDay);
    const key = `missed-eod-nudge-${user.id}-${prevWorkingDayStr}`;

    if (hasBeenSent(key)) return;
    
    // Check if a report was submitted for that day
    const reports = await DataService.getReportsByEmployee(user.id);
    const hasSubmitted = reports.some(r => r.date === prevWorkingDayStr);
    
    if (!hasSubmitted) {
        await DataService.addNotification({
            userId: user.id,
            message: `You missed submitting your EOD report for ${formatDateDDMonYYYY(prevWorkingDayStr)}. Please submit a late report.`,
            type: 'warning',
            link: `/submit-eod/${prevWorkingDayStr}`,
            isCrucial: true,
        });
    }
    
    markAsSent(key); // Mark as sent regardless to avoid re-checking for this day
};

/**
 * Task Due Tomorrow (at 6:00 PM Today)
 */
const checkTaskDueTomorrow = async (user: User, tasks: Task[], now: Date) => {
    if (now.getHours() !== 18 || now.getMinutes() > 4) { // 6:00 PM to 6:04 PM
        return;
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = getLocalYYYYMMDD(tomorrow);

    const tasksDueTomorrow = tasks.filter(t => t.dueDate === tomorrowStr && t.status !== TaskStatus.Completed);
    
    for (const task of tasksDueTomorrow) {
        const key = `task-due-tomorrow-${task.id}`;
        if (!hasBeenSent(key)) {
            await DataService.addNotification({
                userId: user.id,
                message: `Task due tomorrow: "${task.title}"`,
                type: 'reminder',
                link: `/my-tasks?taskId=${task.id}`,
                isCrucial: true
            });
            markAsSent(key);
        }
    }
};

/**
 * Task Due Today (at 9:00 AM Today)
 */
const checkTaskDueToday = async (user: User, tasks: Task[], now: Date) => {
    if (now.getHours() !== 9 || now.getMinutes() > 4) { // 9:00 AM to 9:04 AM
        return;
    }

    const todayStr = getLocalYYYYMMDD(now);
    const tasksDueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== TaskStatus.Completed);

    for (const task of tasksDueToday) {
        const key = `task-due-today-${task.id}`;
        if (!hasBeenSent(key)) {
            await DataService.addNotification({
                userId: user.id,
                message: `Task is due today: "${task.title}"`,
                type: 'reminder',
                link: `/my-tasks?taskId=${task.id}`,
                isCrucial: true
            });
            markAsSent(key);
        }
    }
};

/**
 * Task Overdue Alert (Every Day at 10:00 AM)
 */
const checkTaskOverdue = async (user: User, tasks: Task[], now: Date) => {
    if (now.getHours() !== 10 || now.getMinutes() > 4) { // 10:00 AM to 10:04 AM
        return;
    }
    
    const todayStr = getLocalYYYYMMDD(now);
    // Overdue is where due date is before today (not including today)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < todayStart && t.status !== TaskStatus.Completed);

    for (const task of overdueTasks) {
        const key = `task-overdue-${task.id}-${todayStr}`;
        if (!hasBeenSent(key)) {
            await DataService.addNotification({
                userId: user.id,
                message: `❗️ Task is overdue: "${task.title}"`,
                type: 'warning',
                link: `/my-tasks?taskId=${task.id}`,
                isCrucial: true
            });
            markAsSent(key);
        }
    }
};

/**
 * NEW: Meeting agenda reminder for managers 24 hours before
 */
const checkMeetingAgendaReminder = async (now: Date) => {
    // Run this check once per hour, e.g., at the 15-minute mark
    if (now.getMinutes() !== 15) {
        return;
    }
    
    const allMeetings = await DataService.getMeetings();
    const oneDayInMillis = 24 * 60 * 60 * 1000;

    for (const meeting of allMeetings) {
        if (meeting.meetingType !== 'formal_meeting' || meeting.recurrenceEndDate) {
            continue;
        }

        const nextOccurrence = getNextOccurrence(meeting);
        if (nextOccurrence) {
            const timeDiff = nextOccurrence.getTime() - now.getTime();
            // Check if meeting is between 23 and 24 hours from now
            if (timeDiff > (oneDayInMillis - (30 * 60 * 1000)) && timeDiff <= oneDayInMillis) {
                const key = `agenda-reminder-${meeting.id}-${nextOccurrence.toISOString()}`;
                if (hasBeenSent(key)) continue;

                if (!meeting.agenda || meeting.agenda.trim() === '') {
                    await DataService.addNotification({
                        userId: meeting.createdBy,
                        message: `Your meeting "${meeting.title}" is tomorrow. Consider adding an agenda to help attendees prepare.`,
                        type: 'info',
                        link: `/meetings/${meeting.id}`
                    });
                    markAsSent(key);
                }
            }
        }
    }
};


// --- Main Runner ---
export const runScheduledChecks = async (user: User) => {
  if (!user) return;
  
  // CRITICAL: Platform admins don't have tasks/EODs - skip all checks
  if (user.isPlatformAdmin) {
    return;
  }
  
  const now = new Date();
  
  // Fetch tasks once for all checks
  const allTasks = await DataService.getTasks();
  const userTasks = allTasks.filter(t => t.assignedTo.includes(user.id));
  
  // Run all user-specific checks
  await checkEODReminder(user, now);
  await checkMissedEODNudge(user, now);
  await checkTaskDueTomorrow(user, userTasks, now);
  await checkTaskDueToday(user, userTasks, now);
  await checkTaskOverdue(user, userTasks, now);
  
  // Run global checks (idempotent checks are safe here)
  await checkMeetingStartReminder(now);
  await checkMeetingAgendaReminder(now);
  
  // Cleanup old markers occasionally (e.g., once an hour)
  if (now.getMinutes() === 0) {
      cleanupOldSentMarkers();
  }
};