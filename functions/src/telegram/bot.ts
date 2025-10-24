/**
 * Telegram Bot Main Logic
 * 
 * Handles webhook setup and bot initialization
 */

import { Telegraf } from 'telegraf';
import * as functions from 'firebase-functions';
import { registerCommands } from './commands';
import { unlinkTelegramUser } from './auth';

/**
 * Create and configure bot instance
 */
export function createBot(): Telegraf {
  // Try Firebase Functions config first (production), then env var (development)
  const token = functions.config().telegram?.bot_token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured. Run: firebase functions:config:set telegram.bot_token="YOUR_TOKEN"');
  }
  
  // Create bot with webhook configuration
  const bot = new Telegraf(token, {
    telegram: { webhookReply: true }
  });
  
  // Register all commands
  registerCommands(bot);
  
  // Handle callback queries (button clicks)
  bot.on('callback_query', async (ctx) => {
    const callbackData = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (!callbackData) return;
    
    // Handle unlink confirmation
    if (callbackData === 'unlink_confirm') {
      const telegramId = ctx.from?.id.toString();
      if (telegramId) {
        await unlinkTelegramUser(telegramId);
        await ctx.editMessageText(
          '✅ Your Telegram has been disconnected from Syncly.\n\nUse /start to link again if needed.',
          { parse_mode: 'HTML' }
        );
      }
      await ctx.answerCbQuery('Account unlinked');
      return;
    }
    
    if (callbackData === 'unlink_cancel') {
      await ctx.editMessageText(
        '↩️ Unlink cancelled. Your Telegram is still connected to Syncly.',
        { parse_mode: 'HTML' }
      );
      await ctx.answerCbQuery('Cancelled');
      return;
    }
    
    // Default response
    await ctx.answerCbQuery();
  });
  
  // Handle regular messages (for conversational features in Phase 2)
  bot.on('text', async (ctx) => {
    // For now, just log
    // In Phase 2, we'll handle EOD submission, task creation, etc.
    console.log(`Message from ${ctx.from?.id}: ${ctx.message.text}`);
  });
  
  // Error handling
  bot.catch((err: any, ctx: any) => {
    console.error('Telegram bot error:', err);
    ctx.reply('❌ An error occurred. Please try again later.')
      .catch((e: any) => console.error('Error sending error message:', e));
  });
  
  return bot;
}

/**
 * Handle webhook updates
 */
export async function handleWebhook(update: any, res: any): Promise<void> {
  const bot = createBot();
  
  try {
    await bot.handleUpdate(update, res);
  } catch (error) {
    console.error('Error handling webhook update:', error);
    throw error;
  }
}

/**
 * Set webhook URL
 */
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  
  const bot = new Telegraf(token);
  
  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Telegram webhook set to: ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error('Error setting webhook:', error);
    return false;
  }
}

/**
 * Get webhook info
 */
export async function getWebhookInfo(): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  
  const bot = new Telegraf(token);
  
  try {
    const info = await bot.telegram.getWebhookInfo();
    return info;
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return null;
  }
}
