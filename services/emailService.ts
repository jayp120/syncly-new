
import { Announcement, User, Task } from '../types';
import { formatDateDDMonYYYY } from '../utils/dateUtils';

const SENT_EMAILS_KEY = 'eod_sent_emails';

// Helper to simulate sending an email by logging to console and localStorage
const sendEmail = (to: string, subject: string, body: string) => {
  console.log(`--- SIMULATING EMAIL ---
To: ${to}
Subject: ${subject}
Body:
${body}
------------------------`);

  const sentEmails = JSON.parse(localStorage.getItem(SENT_EMAILS_KEY) || '[]');
  sentEmails.unshift({ to, subject, body, sentAt: new Date().toISOString() });
  if (sentEmails.length > 50) sentEmails.length = 50; // Keep log size manageable
  localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(sentEmails));
};

/**
 * Sends an email alert to an employee about their overdue task.
 * @param employee The employee to notify.
 * @param task The overdue task.
 */
export const sendOverdueTaskEmailToEmployee = (employee: User, task: Task) => {
  const subject = `🔴 Overdue Task: "${task.title}"`;
  const body = `Hi ${employee.name},

You were assigned the task "${task.title}" which was due on ${formatDateDDMonYYYY(task.dueDate)}. It is still incomplete.

Please take action as soon as possible.

Thank you,
Syncly`;
  sendEmail(employee.email, subject, body);
};

/**
 * Sends an email alert to the manager about an employee's overdue task.
 * The recipient is hardcoded for testing purposes.
 * @param manager The manager who assigned the task.
 * @param employee The employee with the overdue task.
 * @param task The overdue task.
 */
export const sendOverdueTaskEmailToManager = (manager: User, employee: User, task: Task) => {
  const testingEmail = 'it.support@mittalcorp.co.in';
  const subject = `⏰ Overdue Task by ${employee.name}`;
  const body = `Hi ${manager.name},

This is an alert that the task "${task.title}" assigned to ${employee.name} is overdue.
The due date was ${formatDateDDMonYYYY(task.dueDate)}.

Please follow up with the employee.

(This email was sent to ${testingEmail} for testing purposes. Original recipient: ${manager.email})

Thank you,
Syncly`;
  sendEmail(testingEmail, subject, body);
};

/**
 * Sends an email alert to an employee about missing EOD reports for 3+ days.
 * @param employee The employee to notify.
 * @param manager The manager sending the reminder.
 */
export const sendMissedReportsEmailToEmployee = (employee: User, manager: User) => {
  const subject = `❗️3 Days of Missing EOD Reports`;
  const body = `Hi ${employee.name},

This is a critical reminder from your manager, ${manager.name}.
You have not submitted your daily EOD reports for the last 3 consecutive working days. This may affect your performance review.

Please act immediately and submit your pending reports.

Thank you,
Syncly`;
  sendEmail(employee.email, subject, body);
};

export const sendAnnouncementEmail = (recipient: User, announcement: Announcement) => {
  const subject = "\uD83D\uDCE3 " + announcement.title;
  const body = `Hi ${recipient.name},

A new announcement has been published for your organization.

${announcement.content}

Active from: ${new Date(announcement.startsAt).toLocaleString()}
Expires on: ${new Date(announcement.endsAt).toLocaleString()}

Please open Syncly to review the full details and acknowledge if required.

Thank you,
People Operations`;
  sendEmail(recipient.notificationEmail || recipient.email, subject, body);
};
