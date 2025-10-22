// utils/dateUtils.ts
import { Meeting } from '../types';
import { WEEK_DAYS } from '../constants';

export const formatDateDDMonYYYY = (dateInput: string | Date | number | null | undefined): string => {
  if (dateInput === null || dateInput === undefined || dateInput === '') return 'N/A';
  
  let dateObj: Date;
  let useUTC = false;

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    // For YYYY-MM-DD strings, parse as UTC to preserve the date components
    const parts = dateInput.split('-');
    dateObj = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    useUTC = true;
  } else {
    dateObj = new Date(dateInput);
  }

  if (isNaN(dateObj.getTime())) {
    // Attempt to re-parse if original was a string that might not be YYYY-MM-DD
     if (typeof dateInput === 'string') {
        const reParsedDate = new Date(dateInput);
        if (!isNaN(reParsedDate.getTime())) {
            dateObj = reParsedDate;
            useUTC = false; // Treat as local if re-parsed successfully
        } else {
            return 'Invalid Date';
        }
    } else {
        return 'Invalid Date';
    }
  }
  
  const day = String(useUTC ? dateObj.getUTCDate() : dateObj.getDate()).padStart(2, '0');
  const monthIndex = useUTC ? dateObj.getUTCMonth() : dateObj.getMonth();
  const year = useUTC ? dateObj.getUTCFullYear() : dateObj.getFullYear();
  
  const monthShortName = new Date(Date.UTC(2000, monthIndex, 1)).toLocaleString('en-GB', { month: 'short' });
  
  return `${day}-${monthShortName}-${year}`;
};

export const formatDateTimeDDMonYYYYHHMM = (timestamp: number | string | Date | null | undefined): string => {
    if (timestamp === null || timestamp === undefined || timestamp === '') return 'N/A';
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthIndex = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const monthShortName = new Date(2000, monthIndex, 1).toLocaleString('en-GB', { month: 'short' });
    
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    
    return `${day}-${monthShortName}-${year} ${strTime}`;
};

export const getLocalYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNextOccurrence = (meeting: Meeting): Date | null => {
    if (!meeting.recurrenceRule || meeting.recurrenceRule === 'none') {
        const meetingDate = new Date(meeting.meetingDateTime);
        return meetingDate > new Date() ? meetingDate : null;
    }

    const now = new Date();
    let nextDate = new Date(meeting.meetingDateTime);
    let occurrences = 0;

    // Fast-forward to today or the future
    while(nextDate < now) {
        occurrences++;
        switch(meeting.recurrenceRule) {
            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        }
        if (meeting.recurrenceCount && occurrences >= meeting.recurrenceCount) return null;
    }

    // Now find the next valid occurrence from today onwards
    while (true) {
        const dateKey = getLocalYYYYMMDD(nextDate);
        const isCancelled = meeting.cancelledOccurrences?.includes(dateKey);

        if (!isCancelled && nextDate >= now) {
            if (meeting.recurrenceEndDate && nextDate.getTime() > meeting.recurrenceEndDate) return null;
            if (meeting.recurrenceCount && occurrences >= meeting.recurrenceCount) return null;
            return nextDate;
        }

        occurrences++;
        switch(meeting.recurrenceRule) {
            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        }
        
        // Safety break
        if (occurrences > 500) return null;
    }
};

export const getAllOccurrencesForMonth = (meeting: Meeting, year: number, month: number): Meeting[] => {
  const occurrences: Meeting[] = [];
  if (meeting.meetingType === 'live_memo') return [];

  const isRecurring = meeting.recurrenceRule && meeting.recurrenceRule !== 'none';
  
  const monthStartDate = new Date(Date.UTC(year, month, 1));
  const monthEndDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  
  if (!isRecurring) {
    const meetingDate = new Date(meeting.meetingDateTime);
    const meetingUTCDate = new Date(Date.UTC(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate()));
    if (meetingUTCDate >= monthStartDate && meetingUTCDate <= monthEndDate) {
      occurrences.push(meeting);
    }
    return occurrences;
  }
  
  let currentDate = new Date(meeting.meetingDateTime);
  let occurrenceCount = 0;
  const originalTime = {
      hours: currentDate.getHours(),
      minutes: currentDate.getMinutes(),
      seconds: currentDate.getSeconds(),
      ms: currentDate.getMilliseconds(),
  };

  while (currentDate < monthStartDate) {
    if (meeting.recurrenceEndDate && currentDate.getTime() > meeting.recurrenceEndDate) return occurrences;
    if (meeting.recurrenceCount && occurrenceCount >= meeting.recurrenceCount) return occurrences;
    
    switch (meeting.recurrenceRule) {
      case 'daily': currentDate.setDate(currentDate.getDate() + 1); break;
      case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
      case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
      default: return occurrences;
    }
    occurrenceCount++;
  }
  
  while (currentDate <= monthEndDate) {
    if (meeting.recurrenceEndDate && currentDate.getTime() > meeting.recurrenceEndDate) break;
    if (meeting.recurrenceCount && occurrenceCount >= meeting.recurrenceCount) break;

    const dateKey = getLocalYYYYMMDD(currentDate);
    if (!meeting.cancelledOccurrences?.includes(dateKey)) {
      const occurrenceDate = new Date(currentDate);
      occurrenceDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.ms);
      occurrences.push({ ...meeting, meetingDateTime: occurrenceDate.getTime() });
    }
    
    switch (meeting.recurrenceRule) {
      case 'daily': currentDate.setDate(currentDate.getDate() + 1); break;
      case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
      case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
      default: break;
    }
    occurrenceCount++;
  }

  return occurrences;
};

export const getPastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalYYYYMMDD(date);
};

export const getFutureDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return getLocalYYYYMMDD(date);
};

export const isDayWeeklyOff = (date: Date, weeklyOffDay?: string): boolean => {
  if (!weeklyOffDay) return false;
  const dayIndex = date.getDay(); // Use local day of week
  return WEEK_DAYS[dayIndex] === weeklyOffDay;
};
