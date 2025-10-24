/**
 * Telegram Notification Service
 * 
 * Sends notifications to users via Telegram
 */

import axios from 'axios';
import { NotificationMessage, InlineButton } from './types';
import { getTelegramIdFromSynclyUser } from './auth';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Get bot token from environment
 */
function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Send a text message to a Telegram user
 */
export async function sendMessage(
  chatId: string,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    reply_markup?: any;
  }
): Promise<boolean> {
  try {
    const token = getBotToken();
    const url = `${TELEGRAM_API_URL}${token}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      reply_markup: options?.reply_markup
    });
    
    return response.data.ok;
  } catch (error: any) {
    console.error(`Error sending Telegram message to ${chatId}:`, error.message);
    return false;
  }
}

/**
 * Create inline keyboard markup
 */
function createInlineKeyboard(buttons: InlineButton[]): any {
  return {
    inline_keyboard: [buttons.map(button => ({
      text: button.text,
      url: button.url,
      callback_data: button.callback_data
    }))]
  };
}

/**
 * Format notification message for Telegram
 */
function formatNotificationMessage(notification: NotificationMessage): string {
  let message = `<b>${notification.title}</b>\n\n`;
  message += notification.body;
  
  return message;
}

/**
 * Send notification to Syncly user via Telegram
 */
export async function sendNotificationToUser(
  notification: NotificationMessage
): Promise<boolean> {
  try {
    // Get Telegram ID for this Syncly user
    const telegramId = await getTelegramIdFromSynclyUser(notification.userId);
    
    if (!telegramId) {
      console.log(`User ${notification.userId} has no linked Telegram account`);
      return false;
    }
    
    // Format message
    const message = formatNotificationMessage(notification);
    
    // Create inline keyboard if buttons provided
    const reply_markup = notification.buttons && notification.buttons.length > 0
      ? createInlineKeyboard(notification.buttons)
      : undefined;
    
    // Send message
    return await sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      reply_markup
    });
  } catch (error: any) {
    console.error('Error sending notification via Telegram:', error.message);
    return false;
  }
}

/**
 * Send EOD reminder notification
 */
export async function sendEODReminder(
  userId: string,
  tenantId: string,
  userName: string,
  currentStreak: number
): Promise<boolean> {
  const notification: NotificationMessage = {
    userId,
    tenantId,
    type: 'eod_reminder',
    title: '🕐 Time for your EOD Report!',
    body: `Hey ${userName},\nCurrent streak: ${currentStreak} days 🔥\nDon't break it now!\n\n⏰ Deadline: 6:00 PM`,
    buttons: [
      {
        text: '📝 Submit Now',
        url: 'https://syncly.one/eod'
      }
    ]
  };
  
  return await sendNotificationToUser(notification);
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignment(
  userId: string,
  tenantId: string,
  taskTitle: string,
  taskId: string,
  dueDate: string,
  priority: string
): Promise<boolean> {
  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  
  const notification: NotificationMessage = {
    userId,
    tenantId,
    type: 'task_assigned',
    title: '📋 New Task Assigned',
    body: `<b>${taskTitle}</b>\n\n📅 Due: ${dueDate}\n${priorityEmoji} Priority: ${priority}`,
    buttons: [
      {
        text: '👁️ View Task',
        url: `https://syncly.one/tasks?task=${taskId}`
      }
    ]
  };
  
  return await sendNotificationToUser(notification);
}

/**
 * Send meeting reminder notification
 */
export async function sendMeetingReminder(
  userId: string,
  tenantId: string,
  meetingTitle: string,
  meetingId: string,
  startTime: string
): Promise<boolean> {
  const notification: NotificationMessage = {
    userId,
    tenantId,
    type: 'meeting_reminder',
    title: '📅 Meeting Starting Soon',
    body: `<b>${meetingTitle}</b>\n\n⏰ Starts: ${startTime}`,
    buttons: [
      {
        text: '🔗 Join Meeting',
        url: `https://syncly.one/meetings/${meetingId}`
      }
    ]
  };
  
  return await sendNotificationToUser(notification);
}

/**
 * Send streak milestone notification
 */
export async function sendStreakMilestone(
  userId: string,
  tenantId: string,
  userName: string,
  streak: number
): Promise<boolean> {
  const notification: NotificationMessage = {
    userId,
    tenantId,
    type: 'streak_milestone',
    title: '🔥 Streak Milestone Achieved!',
    body: `Congratulations ${userName}!\n\nYou've reached a <b>${streak}-day streak</b>! 🎉\n\nKeep up the amazing consistency!`,
    buttons: [
      {
        text: '🏆 View Leaderboard',
        url: 'https://syncly.one/leaderboard'
      }
    ]
  };
  
  return await sendNotificationToUser(notification);
}

/**
 * Send badge earned notification
 */
export async function sendBadgeEarned(
  userId: string,
  tenantId: string,
  badgeName: string,
  badgeDescription: string
): Promise<boolean> {
  const notification: NotificationMessage = {
    userId,
    tenantId,
    type: 'badge_earned',
    title: '🏅 New Badge Unlocked!',
    body: `<b>${badgeName}</b>\n\n${badgeDescription}`,
    buttons: [
      {
        text: '🎖️ View Badges',
        url: 'https://syncly.one/profile'
      }
    ]
  };
  
  return await sendNotificationToUser(notification);
}
