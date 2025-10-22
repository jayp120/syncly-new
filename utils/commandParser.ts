import { User, TaskPriority, SubTask } from '../types';
import { getLocalYYYYMMDD } from './dateUtils';

export interface PendingTask {
  title: string;
  description?: string;
  subTasks?: SubTask[];
  assigneeIds: string[];
  dueDate: string;
  priority: TaskPriority;
}

const parseDueDate = (dateString: string): string => {
  const lowerDateString = dateString.toLowerCase();
  const today = new Date();
  
  if (lowerDateString === 'today') {
    return getLocalYYYYMMDD(today);
  }
  if (lowerDateString === 'tomorrow' || lowerDateString === 'tmw') {
    today.setDate(today.getDate() + 1);
    return getLocalYYYYMMDD(today);
  }
  // Check for YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(lowerDateString)) {
    return lowerDateString;
  }
  // Default to 3 days from now if not recognized
  today.setDate(today.getDate() + 3);
  return getLocalYYYYMMDD(today);
};

const parsePriority = (priorityString: string): TaskPriority => {
  const lowerPriorityString = priorityString.toLowerCase();
  if (lowerPriorityString === 'high' || lowerPriorityString === 'hi') return TaskPriority.High;
  if (lowerPriorityString === 'low' || lowerPriorityString === 'lo') return TaskPriority.Low;
  return TaskPriority.Medium;
};

export const parseLiveMemoText = (text: string, attendeesForMentions: User[], allMeetingAttendeeIds?: string[]): PendingTask[] => {
  const pendingTasks: PendingTask[] = [];
  const lines = text.split('\n');
  const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    let taskText: string | null = null;

    if (trimmedLine.toLowerCase().startsWith('/task ')) {
      taskText = trimmedLine.substring(5).trim();
    } else if (trimmedLine.startsWith('/') && !trimmedLine.startsWith('//')) {
      // A single slash command, but not a double slash (which might be a comment)
      taskText = trimmedLine.substring(1).trim();
    }

    if (taskText === null || taskText === '') {
      continue; // Not a valid task command or empty
    }


    let assigneeIds: string[] = [];
    let dueDate = getLocalYYYYMMDD(new Date(Date.now() + 3 * 86400000)); // Default due date 3 days from now
    let priority = TaskPriority.Medium;

    // Extract mentions first, as they contain special characters
    const mentionMatches = [...taskText.matchAll(MENTION_REGEX)];
    if (mentionMatches.length > 0) {
      mentionMatches.forEach(match => {
        if (match[2]) {
          assigneeIds.push(match[2]);
        }
      });
      taskText = taskText.replace(MENTION_REGEX, '').trim();
    } else if (allMeetingAttendeeIds && allMeetingAttendeeIds.length > 0) {
      // If no one is mentioned in a team meeting, assign to all attendees
      assigneeIds = [...allMeetingAttendeeIds];
    }
    
    // Extract due date
    const dueDateMatch = taskText.match(/(?:due:|on:)\s*(\S+)/i);
    if (dueDateMatch) {
      dueDate = parseDueDate(dueDateMatch[1]);
      taskText = taskText.replace(dueDateMatch[0], '').trim();
    }
    
    // Extract priority
    const priorityMatch = taskText.match(/(?:priority:|p:)\s*(\S+)/i);
    if (priorityMatch) {
      priority = parsePriority(priorityMatch[1]);
      taskText = taskText.replace(priorityMatch[0], '').trim();
    }
    
    const title = taskText.trim();
    const description = ''; // Simple parser for now
    const subTasks: SubTask[] = [];

    if (title) {
      pendingTasks.push({
        title,
        description,
        subTasks,
        assigneeIds,
        dueDate,
        priority,
      });
    }
  }

  return pendingTasks;
};