
import React, { useState } from 'react';
import { Task, MeetingInstance, User } from '../../types';
import Button from '../Common/Button';
import { renderMentions } from '../../utils/mentionUtils';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';

interface MeetingRecallProps {
  previousSessionData: {
    instance: MeetingInstance;
    tasks: Task[]; // these are only PENDING tasks
  } | null;
  onCopyNote: (noteText: string) => void;
  onCopyTask: (taskCommand: string) => void;
  allUsers: User[];
}

const MeetingRecall: React.FC<MeetingRecallProps> = ({ previousSessionData, onCopyNote, onCopyTask, allUsers }) => {
  const [isMinutesCollapsed, setIsMinutesCollapsed] = useState(true);

  if (!previousSessionData) {
    return (
        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-center text-sm text-slate-500 italic h-full flex items-center justify-center">
            This is the first session for this recurring meeting.
        </div>
    );
  }

  const { instance, tasks: pendingTasks } = previousSessionData;
  const previousNotesText = instance.meetingMinutes;

  const getAssigneeName = (id: string) => allUsers.find(u => u.id === id)?.name || 'Unknown';

  const constructTaskCommand = (task: Task): string => {
    const assignees = task.assignedTo.map(id => `@[${getAssigneeName(id)}](${id})`).join(' ');
    // a simplified version of the task command
    return `/task ${task.title} due: next week ${assignees}`;
  }

  return (
    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 rounded-lg h-full flex flex-col">
      <h4 className="text-md font-semibold text-indigo-800 dark:text-indigo-200 flex items-center mb-3 flex-shrink-0">
        <i className="fas fa-history mr-2"></i> Follow-up from {formatDateDDMonYYYY(instance.occurrenceDate)}
      </h4>
      <div className="space-y-4 overflow-y-auto flex-grow">
        {/* Pending Action Items */}
        <div>
          <h5 className="text-sm font-bold uppercase text-indigo-600 dark:text-indigo-300 tracking-wider">Pending Action Items ({pendingTasks.length})</h5>
          <div className="mt-2 space-y-2">
            {pendingTasks.length > 0 ? (
                pendingTasks.map(task => (
                <div key={task.id} className="text-sm p-2 bg-white/60 dark:bg-slate-800/40 rounded-md flex justify-between items-start gap-2">
                    <div className="flex-grow">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">To:</span>
                            <div className="flex -space-x-2">
                                {task.assignedTo.map(id => (
                                    <UserAvatar key={id} name={getAssigneeName(id)} size="sm" className="border border-white dark:border-slate-800" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onCopyTask(constructTaskCommand(task))} 
                        icon={<i className="fas fa-redo" />} 
                        className="!p-1 h-auto flex-shrink-0" 
                        title="Carry over task to current notes" 
                        aria-label="Carry over task to current notes"
                    />
                </div>
                ))
            ) : (
                <p className="text-xs text-indigo-700 dark:text-indigo-300 italic p-2">All tasks from the previous session were completed. Great job!</p>
            )}
          </div>
        </div>

        {/* Previous Minutes */}
        {previousNotesText && (
          <div className="pt-3 border-t border-indigo-200/50 dark:border-indigo-700/50">
            <div className="flex justify-between items-center">
                <h5 className="text-sm font-bold uppercase text-indigo-600 dark:text-indigo-300 tracking-wider">Previous Minutes</h5>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onCopyNote(previousNotesText)} icon={<i className="fas fa-copy" />} className="!p-1 h-auto" title="Copy notes to current session" aria-label="Copy previous notes to current session" />
                    <Button variant="ghost" size="sm" onClick={() => setIsMinutesCollapsed(!isMinutesCollapsed)} icon={<i className={`fas ${isMinutesCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}/>} className="!p-1 h-auto" title={isMinutesCollapsed ? "Expand" : "Collapse"} aria-label={isMinutesCollapsed ? "Expand previous minutes" : "Collapse previous minutes"}/>
                </div>
            </div>
            {!isMinutesCollapsed && (
                <div className="mt-2 text-sm p-2 bg-white/60 dark:bg-slate-800/40 rounded-md max-h-48 overflow-y-auto">
                    <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-full">
                        {renderMentions(previousNotesText, allUsers)}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRecall;