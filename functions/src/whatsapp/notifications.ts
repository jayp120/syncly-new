import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface WhatsAppNotificationPayload {
  phoneNumber: string;
  title?: string;
  body: string;
  url?: string;
  userName?: string;
}

const formatWhatsAppNumber = (raw: string): string | null => {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith('whatsapp:')) {
    return value;
  }

  if (value.startsWith('+')) {
    return `whatsapp:${value}`;
  }

  const digits = value.replace(/[^\d+]/g, '');
  if (!digits) {
    return null;
  }

  return digits.startsWith('+') ? `whatsapp:${digits}` : `whatsapp:+${digits}`;
};

const formatFromNumber = (raw: string): string => {
  if (!raw) throw new Error('TWILIO_WHATSAPP_FROM is not configured');
  return raw.startsWith('whatsapp:') ? raw : `whatsapp:${raw}`;
};

export const isWhatsAppConfigured = (): boolean => {
  return Boolean(accountSid && authToken && fromWhatsAppNumber && twilioClient);
};

export const sendWhatsAppNotification = async (
  payload: WhatsAppNotificationPayload
): Promise<boolean> => {
  if (!isWhatsAppConfigured() || !twilioClient) {
    console.warn('[WhatsApp] Integration not configured. Skipping message send.');
    return false;
  }

  const to = formatWhatsAppNumber(payload.phoneNumber);
  if (!to) {
    console.warn('[WhatsApp] Invalid phone number provided, skipping send.');
    return false;
  }

  const messageLines = [
    `*${payload.title || 'Syncly Notification'}*`,
  ];

  if (payload.userName) {
    messageLines.push('', `Hi ${payload.userName},`);
  }

  messageLines.push('', payload.body.trim());

  if (payload.url) {
    messageLines.push('', `Open: ${payload.url}`);
  }

  const body = messageLines.join('\n').trim();

  try {
    await twilioClient.messages.create({
      from: formatFromNumber(fromWhatsAppNumber!),
      to,
      body
    });
    return true;
  } catch (error: any) {
    console.error('[WhatsApp] Failed to send message:', error.message || error);
    return false;
  }
};
