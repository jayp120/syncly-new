import React from 'react';
import { PendingTask } from '../../utils/commandParser';
import { User } from '../../types';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';

interface PendingTaskCardProps {
  task: PendingTask;
  attendees: User[];
}

const PendingTaskCard: React.FC<PendingTaskCardProps> = ({ task, attendees }) => {
  const getAssigneeName = (id: string) => attendees.find(a => a.id === id)?.name || 'Unknown';
  
  return (
    <div className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm">
      <p className="font-semibold text-sm text-darktext dark:text-slate-200">{task.title}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          <i className="fas fa-calendar-alt mr-1.5 text-slate-500 dark:text-slate-400"></i>
          {formatDateDDMonYYYY(task.dueDate)}
        </span>
        <span className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          <i className="fas fa-exclamation-circle mr-1.5 text-slate-500 dark:text-slate-400"></i>
          {task.priority}
        </span>
      </div>
      {task.assigneeIds.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">To:</span>
          <div className="flex flex-wrap gap-1">
            {task.assigneeIds.map(id => (
              <div key={id} className="flex items-center bg-primary-light text-primary-dark text-xs font-medium px-1.5 py-0.5 rounded-full">
                <UserAvatar name={getAssigneeName(id)} size="sm" className="w-4 h-4 text-[10px] mr-1" />
                <span>{getAssigneeName(id)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTaskCard;
