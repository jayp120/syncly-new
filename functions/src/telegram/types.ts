/**
 * Telegram Integration Types
 * 
 * Type definitions for Telegram bot integration with Syncly
 */

export interface TelegramUser {
  telegramId: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  synclyUserId: string;
  tenantId: string;
  linkedAt: number;
  isActive: boolean;
}

export interface NotificationMessage {
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  buttons?: InlineButton[];
}

export interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface CommandContext {
  userId: string;
  tenantId: string;
  telegramId: string;
  username?: string;
  messageId: number;
  chatId: number;
}

export interface EODSubmission {
  accomplishments: string;
  blockers?: string;
  plans?: string;
  date: string;
}

export interface ConversationState {
  telegramId: string;
  command: string;
  step: string;
  data: Record<string, any>;
  startedAt: number;
  expiresAt: number;
}
