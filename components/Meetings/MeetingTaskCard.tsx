import React from 'react';
import { Task, User, TaskStatus, TaskType } from '../../types';
import UserAvatar from '../Common/UserAvatar';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import Select from '../Common/Select';

interface MeetingTaskCardProps {
  task: Task;
  allUsers: User[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  onUpdateMemberStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
}

const MeetingTaskCard: React.FC<MeetingTaskCardProps> = ({ task, allUsers, currentUser, onViewTask, onUpdateMemberStatus, onUpdateTask }) => {
  const getAssigneeName = (id: string) => allUsers.find(u => u.id === id)?.name || 'Unknown';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Blocked': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const isAssignee = task.assignedTo.includes(currentUser.id);
  const myStatus = (isAssignee && task.memberProgress?.[currentUser.id]?.status) || TaskStatus.NotStarted;
  
  const employeeStatusOptions = Object.values(TaskStatus)
    .filter(s => s !== TaskStatus.Blocked) // Employees can't set Blocked status
    .map(s => ({ value: s, label: s }));
    
  const canChangeStatus = isAssignee && (task.taskType === TaskType.Team || task.taskType === TaskType.Direct) && task.status !== TaskStatus.Completed;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as TaskStatus;
      if (task.taskType === TaskType.Team) {
        onUpdateMemberStatus(task.id, newStatus);
      } else if (task.taskType === TaskType.Direct) {
        onUpdateTask(task.id, { status: newStatus });
      }
  };

  return (
    <div
      className="block w-full text-left p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:shadow-md transition-shadow relative"
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow pr-4">
            <p onClick={() => onViewTask(task)} className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:underline">{task.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Due: {formatDateDDMonYYYY(task.dueDate)}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
            {task.status}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Assigned To:</span>
            <div className="flex flex-wrap gap-1">
              {task.assignedTo.map(id => (
                <div key={id} className="flex items-center bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium px-1.5 py-0.5 rounded-full shadow-sm">
                  <UserAvatar name={getAssigneeName(id)} size="sm" className="w-4 h-4 text-[10px] mr-1.5" />
                  <span>{getAssigneeName(id)}</span>
                </div>
              ))}
            </div>
        </div>
        {canChangeStatus && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor={`status-select-${task.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">My Status:</label>
            <Select
              id={`status-select-${task.id}`}
              options={employeeStatusOptions}
              value={task.taskType === TaskType.Team ? myStatus : task.status}
              onChange={handleStatusChange}
              wrapperClassName="!mb-0 flex-grow"
              className="!mt-0 !text-xs !py-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingTaskCard;