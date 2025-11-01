/**
 * Telegram Bot Commands
 * 
 * Handles user commands like /eod, /tasks, /status, etc.
 */

import * as admin from 'firebase-admin';
import { Telegraf, Context } from 'telegraf';
import { getSynclyUserFromTelegram, linkTelegramUser, verifyLinkingCode } from './auth';

const ACTIVE_TASK_STATUS_KEYWORDS = [
  'not started',
  'not_started',
  'notstarted',
  'in progress',
  'in_progress',
  'inprogress',
  'to do',
  'todo',
  'blocked',
  'pending',
  'open'
];
const ACTIVE_TASK_STATUS_SET = new Set(ACTIVE_TASK_STATUS_KEYWORDS);
const COMPLETED_STATUS_ALIASES = ['completed', 'complete', 'done', 'resolved', 'finished', 'closed', 'cancelled', 'canceled'];

type LinkedSynclyContext = {
  telegramId: string;
  synclyUserId: string;
  tenantId: string;
  userData: Record<string, any>;
};

type LinkedContextResult = LinkedSynclyContext | { error: string };

async function getLinkedContext(ctx: Context): Promise<LinkedContextResult> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    return { error: 'Unable to read your Telegram account. Please try again.' };
  }

  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  if (!linkedUser || !linkedUser.synclyUserId) {
    return {
      error: 'Your Telegram account is not linked to Syncly. Open Syncly → Integrations → Telegram and tap “Connect Telegram” again.'
    };
  }

  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(linkedUser.synclyUserId).get();
  if (!userSnap.exists) {
    console.warn(`[telegram] Linked Syncly user ${linkedUser.synclyUserId} not found for Telegram ${telegramId}`);
    return {
      error: 'We could not find your Syncly profile. Please reconnect from Syncly → Integrations → Telegram.'
    };
  }

  const userData = (userSnap.data() || {}) as Record<string, any>;
  const tenantId = linkedUser.tenantId || userData.tenantId;
  if (!tenantId) {
    console.warn(`[telegram] Missing tenantId for Syncly user ${linkedUser.synclyUserId}`);
    return {
      error: 'Your Syncly account does not have an organisation assigned. Please contact your administrator.'
    };
  }

  return {
    telegramId,
    synclyUserId: linkedUser.synclyUserId,
    tenantId,
    userData
  };
}

function isTaskPendingForUser(task: Record<string, any>, userId: string): boolean {
  const rawStatus = (task.status || '').toString().toLowerCase();
  const status = rawStatus.replace(/\s+/g, ' ');
  const statusUnderscore = rawStatus.replace(/\s+/g, '_');
  const isStatusKnown = ACTIVE_TASK_STATUS_SET.has(status) || ACTIVE_TASK_STATUS_SET.has(statusUnderscore);

  if (!rawStatus || isStatusKnown) {
    // treat as potentially pending; continue to member progress check
  } else {
    // If status explicitly looks completed, skip
    if (COMPLETED_STATUS_ALIASES.includes(rawStatus)) {
      return false;
    }
  }

  const progress = task.memberProgress?.[userId];
  if (progress?.status) {
    const progressStatus = progress.status.toString().toLowerCase();
    if (COMPLETED_STATUS_ALIASES.includes(progressStatus)) {
      return false;
    }
  }

  return true;
}

/**
 * Handle /start command
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  // Check if user is already linked
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (linkedUser) {
    // User is already linked - sync to user document to ensure UI shows connection
    const db = admin.firestore();
    const userUpdate: any = { telegramChatId: telegramId };
    
    if (ctx.from?.username) userUpdate.telegramUsername = ctx.from.username;
    if (ctx.from?.first_name) userUpdate.telegramFirstName = ctx.from.first_name;
    if (ctx.from?.last_name) userUpdate.telegramLastName = ctx.from.last_name;
    
    await db.collection('users').doc(linkedUser.synclyUserId).update(userUpdate);
    console.log(`[/start] Synced existing link to user document: ${linkedUser.synclyUserId}`);
    
    await ctx.reply(
      `✅ Welcome back!\n\nYour Telegram is already linked to your Syncly account.\n\nUse /help to see available commands.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Open Dashboard', url: 'https://syncly.one' }
          ]]
        }
      }
    );
    return;
  }
  
  // Check for linking code in start parameter
  const startPayloadRaw =
    // Telegraf exposes deep-link payload directly for /start
    (ctx as any).startPayload ||
    (ctx.message && 'text' in ctx.message
      ? ctx.message.text.split(' ')[1]
      : undefined);

  const startPayload = startPayloadRaw?.trim().toUpperCase();
  
  if (startPayload) {
    console.log(`[/start] Processing linking code: ${startPayload}`);
    
    // Verify linking code
    const linkData = await verifyLinkingCode(startPayload);
    
    if (linkData) {
      console.log(`[/start] Linking code verified for user: ${linkData.userId}`);
      
      // Link the account
      await linkTelegramUser(
        telegramId,
        ctx.from?.username,
        ctx.from?.first_name,
        ctx.from?.last_name,
        linkData.userId,
        linkData.tenantId
      );
      
      console.log(`[/start] Account linked successfully. Sending confirmation...`);
      
      try {
        await ctx.reply(
          `✅ <b>Account Linked Successfully!</b>\n\nYour Telegram is now connected to your Syncly account.\n\nYou'll receive notifications here and can use commands to interact with Syncly.\n\nTry /help to see what you can do!`,
          { parse_mode: 'HTML' }
        );
        console.log(`[/start] Confirmation message sent successfully`);
      } catch (error) {
        console.error(`[/start] Error sending confirmation message:`, error);
        throw error;
      }
      return;
    } else {
      console.log(`[/start] Linking code verification failed: ${startPayload}`);
    }
  }
  
  // New user - guide them to link account
  await ctx.reply(
    `👋 <b>Welcome to Syncly!</b>\n\nTo get started, you need to link your Telegram to your Syncly account.\n\n<b>How to link:</b>\n1. Open Syncly web app (syncly.one)\n2. Go to Integrations page\n3. Click "Connect Telegram"\n4. You'll be redirected here automatically\n\nOnce linked, you'll receive notifications and can use commands here!`,
    { 
      parse_mode: 'HTML'
    }
  );
}

/**
 * Handle /help command
 */
export async function handleHelpCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }

  const helpText = `
<b>📚 Syncly Bot Commands</b>

<b>Available Commands:</b>
/tasks - View your pending tasks
/today - Today's agenda (tasks + meetings)
/streak - Check your consistency streak
/leaderboard - Team rankings
/unlink - Disconnect Telegram account
/help - Show this help message

<b>Need more help?</b>
Visit syncly.one/help
  `.trim();
  
  await ctx.reply(helpText, { 
    parse_mode: 'HTML'
  });
}

/**
 * Handle /streak command
 */
export async function handleStreakCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }

  const { synclyUserId } = contextResult;

  try {
    const db = admin.firestore();
    
    // Get user data
    const userDoc = await db.collection('users').doc(synclyUserId).get();
    if (!userDoc.exists) {
      await ctx.reply('⚠️ Could not find your Syncly account. Please reconnect from the Integrations page.');
      return;
    }
    
    const userData = userDoc.data()!;
    
    // Get streak data (you'll need to implement this based on your existing streak logic)
    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    const totalReports = userData.totalReports || 0;
    
    const streakMessage = `
🔥 <b>Your Consistency Tracker</b>

<b>Current Streak:</b> ${currentStreak} days
<b>Longest Streak:</b> ${longestStreak} days
<b>Total Reports:</b> ${totalReports}

${currentStreak >= 10 ? '🌟 Amazing consistency!' : '💪 Keep going!'}
    `.trim();
    
    await ctx.reply(streakMessage, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '📊 View Full Stats', url: 'https://syncly.one/consistency' }
        ]]
      }
    });
  } catch (error) {
    console.error('Error fetching streak data:', error);
    await ctx.reply('❌ Error fetching your streak data. Please try again later.');
  }
}

/**
 * Handle /tasks command
 */
export async function handleTasksCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }

  const { tenantId, synclyUserId } = contextResult;

  try {
    const db = admin.firestore();

    const tasksSnapshot = await db.collection('tasks')
      .where('tenantId', '==', tenantId)
      .where('assignedTo', 'array-contains', synclyUserId)
      .limit(25)
      .get();

    const taskDocs = tasksSnapshot.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) })) as Array<Record<string, any>>;

    const pendingTasks = taskDocs.filter(task => {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [];
      if (!assignees.includes(synclyUserId)) {
        return false;
      }
      return isTaskPendingForUser(task, synclyUserId);
    });

    console.log(`[telegram]/tasks tenant=${tenantId} user=${synclyUserId} snapshot=${tasksSnapshot.size} pending=${pendingTasks.length}`);

    if (pendingTasks.length === 0) {
      await ctx.reply('✅ You have no pending tasks right now!');
      return;
    }

    let message = `📋 <b>Your Tasks (${pendingTasks.length})</b>\n\n`;

    pendingTasks.forEach(task => {
      const priorityLabel = (task.priority || '').toString().toLowerCase();
      const priorityIcon = priorityLabel === 'high' ? '🔴' : priorityLabel === 'medium' ? '🟡' : '🟢';
      const userStatus = (task.memberProgress?.[synclyUserId]?.status || task.status || '').toString().toLowerCase();
      const normalizedStatus = userStatus.replace(/\s+/g, ' ');
      const statusIcon = normalizedStatus === 'in progress'
        ? '⚡'
        : normalizedStatus === 'blocked'
          ? '⛔'
          : '📌';
      const dueText = task.dueDate || 'No date';

      message += `${statusIcon} <b>${task.title}</b>\n`;
      message += `   ${priorityIcon} ${task.priority || 'Priority not set'} | Due: ${dueText}\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '➕ Create Task', url: 'https://syncly.one/tasks?new=true' },
          { text: '📋 View All', url: 'https://syncly.one/tasks' }
        ]]
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    await ctx.reply('❌ Error fetching your tasks. Please try again later.');
  }
}

/**
 * Handle /today command
 */
export async function handleTodayCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }

  const { tenantId, synclyUserId } = contextResult;

  try {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate today's start and end timestamps for meeting queries
    const todayStart = new Date(today + 'T00:00:00Z').getTime();
    const todayEnd = new Date(today + 'T23:59:59Z').getTime();
    
    // Get today's tasks
    const tasksSnapshot = await db.collection('tasks')
      .where('tenantId', '==', tenantId)
      .where('assignedTo', 'array-contains', synclyUserId)
      .limit(25)
      .get();
    const todayTaskDocs = tasksSnapshot.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) })) as Array<Record<string, any>>;
    const pendingTasks = todayTaskDocs.filter(task => {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [];
      if (!assignees.includes(synclyUserId)) {
        return false;
      }
      return isTaskPendingForUser(task, synclyUserId);
    });
    
    // Get today's meetings (using meetingDateTime timestamp)
    const meetingsSnapshot = await db.collection('meetings')
      .where('tenantId', '==', tenantId)
      .where('attendeeIds', 'array-contains', synclyUserId)
      .where('meetingDateTime', '>=', todayStart)
      .where('meetingDateTime', '<=', todayEnd)
      .get();
    console.log(`[telegram]/today tenant=${tenantId} user=${synclyUserId} tasks=${pendingTasks.length} meetings=${meetingsSnapshot.size}`);
    
    // Get user's EOD status for today
    const eodSnapshot = await db.collection('eodReports')
      .where('tenantId', '==', tenantId)
      .where('userId', '==', synclyUserId)
      .where('date', '==', today)
      .limit(1)
      .get();
    
    const hasSubmittedEOD = !eodSnapshot.empty;
    
    // Build agenda message
    let message = `📅 <b>Your Agenda for Today</b>\n\n`;
    
    // Tasks section
    if (pendingTasks.length > 0) {
      message += `<b>📋 Tasks (${pendingTasks.length}):</b>\n`;
      pendingTasks.slice(0, 3).forEach((task) => {
        const priorityLabel = (task.priority || '').toString().toLowerCase();
        const priorityIcon = priorityLabel === 'high' ? '🔴' : priorityLabel === 'medium' ? '🟡' : '🟢';
        message += `  ${priorityIcon} ${task.title}\n`;
      });
      if (pendingTasks.length > 3) {
        message += `  ... and ${pendingTasks.length - 3} more\n`;
      }
      message += '\n';
    } else {
      message += `<b>📋 Tasks:</b> No pending tasks ✅\n\n`;
    }
    
    // Meetings section
    if (!meetingsSnapshot.empty) {
      message += `<b>📅 Meetings (${meetingsSnapshot.size}):</b>\n`;
      meetingsSnapshot.docs.forEach((doc) => {
        const meeting = doc.data();
        const meetingTime = new Date(meeting.meetingDateTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        message += `  🕐 ${meetingTime} - ${meeting.title}\n`;
      });
      message += '\n';
    } else {
      message += `<b>📅 Meetings:</b> No meetings scheduled\n\n`;
    }
    
    // EOD status
    if (hasSubmittedEOD) {
      message += `<b>📝 EOD Report:</b> ✅ Submitted`;
    } else {
      message += `<b>📝 EOD Report:</b> ⏳ Pending (Deadline: 6:00 PM)`;
    }
    
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '📊 Open Dashboard', url: 'https://syncly.one' }
        ]]
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s agenda:', error);
    await ctx.reply('❌ Error fetching your agenda. Please try again later.');
  }
}

/**
 * Handle /leaderboard command
 */
export async function handleLeaderboardCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }
  
  await ctx.reply(
    `🏆 <b>Team Leaderboard</b>\n\nView the full leaderboard on the web app to see detailed rankings and stats.`,
    { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🏆 View Leaderboard', url: 'https://syncly.one/leaderboard' }
        ]]
      }
    }
  );
}

/**
 * Handle /unlink command
 */
export async function handleUnlinkCommand(ctx: Context): Promise<void> {
  const contextResult = await getLinkedContext(ctx);
  if ('error' in contextResult) {
    await ctx.reply(`⚠️ ${contextResult.error}`);
    return;
  }
  
  await ctx.reply(
    `⚠️ <b>Unlink Telegram Account</b>\n\nAre you sure you want to disconnect your Telegram from Syncly?\n\nYou will stop receiving notifications and won't be able to use bot commands.\n\nYou can always re-link later from syncly.one/settings`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ Yes, Unlink', callback_data: 'unlink_confirm' },
            { text: '↩️ Cancel', callback_data: 'unlink_cancel' }
          ]
        ]
      }
    }
  );
}

/**
 * Register all bot commands
 */
export function registerCommands(bot: Telegraf): void {
  bot.command('start', handleStartCommand);
  bot.command('help', handleHelpCommand);
  bot.command('streak', handleStreakCommand);
  bot.command('tasks', handleTasksCommand);
  bot.command('today', handleTodayCommand);
  bot.command('leaderboard', handleLeaderboardCommand);
  bot.command('unlink', handleUnlinkCommand);
  
  // Set bot commands for UI
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Link your Syncly account' },
    { command: 'help', description: 'Show available commands' },
    { command: 'tasks', description: 'View your tasks' },
    { command: 'today', description: "Today's agenda" },
    { command: 'streak', description: 'Check your streak' },
    { command: 'leaderboard', description: 'Team rankings' },
    { command: 'unlink', description: 'Disconnect Telegram' }
  ]).catch(console.error);
}
