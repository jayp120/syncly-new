import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

type CallableResult<T> = { data: T };

export interface GoogleCalendarProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export interface ExchangeAuthCodeResponse {
  success: boolean;
  profile?: GoogleCalendarProfile;
}

export interface CalendarEventResult {
  result: any;
}

const exchangeCodeFn = httpsCallable<
  { code: string },
  ExchangeAuthCodeResponse
>(functions, 'exchangeGoogleCalendarCode');

const unlinkFn = httpsCallable<Record<string, never>, { success: boolean }>(
  functions,
  'unlinkGoogleCalendar'
);

const createEventFn = httpsCallable<
  { event: Record<string, any>; calendarId?: string; sendUpdates?: string },
  CalendarEventResult
>(functions, 'createGoogleCalendarEvent');

const updateEventFn = httpsCallable<
  {
    eventId: string;
    eventPatch: Record<string, any>;
    calendarId?: string;
    sendUpdates?: string;
  },
  CalendarEventResult
>(functions, 'updateGoogleCalendarEvent');

const getInstanceFn = httpsCallable<
  { eventId: string; occurrenceDate: string },
  CalendarEventResult
>(functions, 'getGoogleCalendarInstance');

export const exchangeAuthCode = async (code: string) => {
  const response = (await exchangeCodeFn({ code })) as CallableResult<ExchangeAuthCodeResponse>;
  return response.data;
};

export const unlinkGoogleCalendar = async () => {
  const response = (await unlinkFn({})) as CallableResult<{ success: boolean }>;
  return response.data;
};

export const createEvent = async (
  event: Record<string, any>,
  options?: { calendarId?: string; sendUpdates?: string }
) => {
  const response = (await createEventFn({
    event,
    calendarId: options?.calendarId,
    sendUpdates: options?.sendUpdates
  })) as CallableResult<CalendarEventResult>;

  return response.data;
};

export const updateEvent = async (
  eventId: string,
  eventPatch: Record<string, any>,
  options?: { calendarId?: string; sendUpdates?: string }
) => {
  const response = (await updateEventFn({
    eventId,
    eventPatch,
    calendarId: options?.calendarId,
    sendUpdates: options?.sendUpdates
  })) as CallableResult<CalendarEventResult>;

  return response.data;
};

export const getInstance = async (eventId: string, occurrenceDate: string) => {
  const response = (await getInstanceFn({
    eventId,
    occurrenceDate
  })) as CallableResult<CalendarEventResult>;

  return response.data;
};
