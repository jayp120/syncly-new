/**
 * Telegram Bot Commands
 * 
 * Handles user commands like /eod, /tasks, /status, etc.
 */

import * as admin from 'firebase-admin';
import { Telegraf, Context } from 'telegraf';
import { getSynclyUserFromTelegram, linkTelegramUser, verifyLinkingCode } from './auth';

/**
 * Handle /start command
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  // Check if user is already linked
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (linkedUser) {
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
  const startPayload = ctx.message && 'text' in ctx.message 
    ? ctx.message.text.split(' ')[1] 
    : undefined;
  
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
    `👋 <b>Welcome to Syncly!</b>\n\nTo get started, you need to link your Telegram to your Syncly account.\n\n<b>How to link:</b>\n1. Go to syncly.one/settings\n2. Click "Connect Telegram"\n3. Follow the instructions\n\nOnce linked, you'll receive notifications and can use commands here!`,
    { 
      parse_mode: 'HTML'
    }
  );
}

/**
 * Handle /help command
 */
export async function handleHelpCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Your Telegram is not linked to Syncly. Use /start to link your account first.');
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
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Please link your Telegram account first using /start');
    return;
  }
  
  try {
    const db = admin.firestore();
    
    // Get user data
    const userDoc = await db.collection('users').doc(linkedUser.synclyUserId).get();
    if (!userDoc.exists) {
      await ctx.reply('❌ User data not found');
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
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Please link your Telegram account first using /start');
    return;
  }
  
  try {
    const db = admin.firestore();
    
    // Get today's tasks for this user
    const tasksSnapshot = await db.collection('tasks')
      .where('tenantId', '==', linkedUser.tenantId)
      .where('assignedTo', '==', linkedUser.synclyUserId)
      .where('status', 'in', ['To Do', 'In Progress'])
      .limit(10)
      .get();
    
    if (tasksSnapshot.empty) {
      await ctx.reply('✅ You have no pending tasks for today!');
      return;
    }
    
    let message = `📋 <b>Your Tasks (${tasksSnapshot.size})</b>\n\n`;
    
    tasksSnapshot.docs.forEach((doc, index) => {
      const task = doc.data();
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      const status = task.status === 'In Progress' ? '⚡' : '📌';
      
      message += `${status} <b>${task.title}</b>\n`;
      message += `   ${priority} ${task.priority} | Due: ${task.dueDate || 'No date'}\n\n`;
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
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Please link your Telegram account first using /start');
    return;
  }
  
  try {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate today's start and end timestamps for meeting queries
    const todayStart = new Date(today + 'T00:00:00Z').getTime();
    const todayEnd = new Date(today + 'T23:59:59Z').getTime();
    
    // Get today's tasks
    const tasksSnapshot = await db.collection('tasks')
      .where('tenantId', '==', linkedUser.tenantId)
      .where('assignedTo', '==', linkedUser.synclyUserId)
      .where('status', 'in', ['To Do', 'In Progress'])
      .limit(5)
      .get();
    
    // Get today's meetings (using meetingDateTime timestamp)
    const meetingsSnapshot = await db.collection('meetings')
      .where('tenantId', '==', linkedUser.tenantId)
      .where('participants', 'array-contains', linkedUser.synclyUserId)
      .where('meetingDateTime', '>=', todayStart)
      .where('meetingDateTime', '<=', todayEnd)
      .get();
    
    // Get user's EOD status for today
    const eodSnapshot = await db.collection('eodReports')
      .where('tenantId', '==', linkedUser.tenantId)
      .where('userId', '==', linkedUser.synclyUserId)
      .where('date', '==', today)
      .limit(1)
      .get();
    
    const hasSubmittedEOD = !eodSnapshot.empty;
    
    // Build agenda message
    let message = `📅 <b>Your Agenda for Today</b>\n\n`;
    
    // Tasks section
    if (!tasksSnapshot.empty) {
      message += `<b>📋 Tasks (${tasksSnapshot.size}):</b>\n`;
      tasksSnapshot.docs.slice(0, 3).forEach((doc) => {
        const task = doc.data();
        const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        message += `  ${priority} ${task.title}\n`;
      });
      if (tasksSnapshot.size > 3) {
        message += `  ... and ${tasksSnapshot.size - 3} more\n`;
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
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Please link your Telegram account first using /start');
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
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  
  const linkedUser = await getSynclyUserFromTelegram(telegramId);
  
  if (!linkedUser) {
    await ctx.reply('❌ Your Telegram is not linked to any Syncly account.');
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
