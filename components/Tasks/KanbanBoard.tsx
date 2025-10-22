
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User, TaskType, Meeting, Permission } from '../../types';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import * as DataService from '../../services/dataService';
import { useAuth } from '../Auth/AuthContext';
import { renderMentions } from '../../utils/mentionUtils';
import TeamTaskProgress from './TeamTaskProgress';
import { useToast } from '../../contexts/ToastContext';
import { MAX_PINNED_TASKS } from '../../constants';
import UserAvatar from '../Common/UserAvatar';
import * as ReactRouterDom from "react-router-dom";
const { Link } = ReactRouterDom;

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onViewTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
  meetingsMap?: Map<string, Meeting>;
}

const KanbanColumn: React.FC<{
  status: TaskStatus;
  tasks: Task[];
  allTasks: Task[]; // All tasks on the board
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onViewTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
  allUsers: User[];
  pinnedCount: number;
  meetingsMap: Map<string, Meeting>;
}> = ({ status, tasks, allTasks, onDrop, onViewTask, onUpdateTask, allUsers, pinnedCount, meetingsMap }) => {
  const [isOver, setIsOver] = useState(false);
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false); // Reset visual state immediately

    const taskId = e.dataTransfer.getData("text/plain");
    const task = allTasks.find(t => t.id === taskId);

    if (!currentUser || !task) return;

    // Determine the task's current status for the current view
    let currentStatusInView: TaskStatus;
    if (task.taskType === TaskType.Team && currentUser.roleName === 'Employee') {
        currentStatusInView = task.memberProgress?.[currentUser.id]?.status || TaskStatus.NotStarted;
    } else {
        currentStatusInView = task.status;
    }

    // Prevent redundant drops
    if (currentStatusInView === status) {
        return;
    }

    // Prevent employees from updating their part of an already completed team task
    if (task.taskType === TaskType.Team && currentUser.roleName === 'Employee' && task.status === TaskStatus.Completed) {
        addToast("This team task has already been marked as complete by the manager.", "warning");
        return;
    }
    
    onDrop(taskId, status);
  };
  
  const getHeaderStyle = (status: TaskStatus) => ({
      [TaskStatus.NotStarted]: 'bg-slate-200 dark:bg-dark-surface-secondary border-b-4 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200',
      [TaskStatus.InProgress]: 'bg-blue-200 dark:bg-blue-800/50 border-b-4 border-blue-500 dark:border-blue-500 text-blue-800 dark:text-blue-200',
      [TaskStatus.Completed]: 'bg-emerald-200 dark:bg-emerald-800/50 border-b-4 border-emerald-500 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200',
      [TaskStatus.Blocked]: 'bg-red-200 dark:bg-red-800/50 border-b-4 border-red-500 dark:border-red-500 text-red-800 dark:text-red-200',
  }[status]);


  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[300px] rounded-xl p-2 transition-colors flex flex-col ${isOver ? 'bg-primary-light dark:bg-sky-900/50' : 'bg-surface-secondary dark:bg-dark-bg'}`}
    >
      <h3 className={`font-semibold p-3 rounded-lg text-center text-sm ${getHeaderStyle(status)}`}>{status} ({tasks.length})</h3>
      <div className="space-y-3 mt-2 h-[60vh] overflow-y-auto p-1 flex-grow">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary italic p-4 text-center">Drag tasks here or change their status to see them in this column.</p>
          </div>
        ) : (
          tasks.map(task => (
            <KanbanCard key={task.id} task={task} onViewTask={onViewTask} onUpdateTask={onUpdateTask} allUsers={allUsers} pinnedCount={pinnedCount} meetingsMap={meetingsMap} />
          ))
        )}
      </div>
    </div>
  );
};

const KanbanCard: React.FC<{ task: Task; onViewTask: (task: Task) => void; onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void; allUsers: User[]; pinnedCount: number; meetingsMap: Map<string, Meeting>; }> = ({ task, onViewTask, onUpdateTask, allUsers, pinnedCount, meetingsMap }) => {
    const { currentUser, hasPermission } = useAuth();
    const { addToast } = useToast();

    const isDraggable = useMemo(() => {
        if (!currentUser) return false;

        // Admins with this permission or managers who created the task can drag anything.
        if (hasPermission(Permission.CAN_EDIT_ANY_TASK_STATUS) || (currentUser.roleName === 'Manager' && task.createdBy === currentUser.id)) {
            return true;
        }

        // Employee logic
        if (currentUser.roleName === 'Employee') {
            if (task.taskType === TaskType.Team) {
                // Employee can drag to update their own status, unless their part is done OR the whole task is done.
                const myStatus = task.memberProgress?.[currentUser.id]?.status;
                return myStatus !== TaskStatus.Completed && task.status !== TaskStatus.Completed;
            }
            // Employee can drag personal/direct tasks, unless completed.
            return task.status !== TaskStatus.Completed;
        }

        return false; // Default to not draggable
    }, [task, currentUser, hasPermission]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", task.id);
    };

    const getAssigneeName = (userId: string) => {
        return allUsers.find(u => u.id === userId)?.name || 'Unknown';
    }
    
    const getPriorityPill = (priority: TaskPriority) => {
        const styles = {
            [TaskPriority.High]: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
            [TaskPriority.Medium]: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300',
            [TaskPriority.Low]: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[priority]}`}>
                {priority}
            </span>
        );
    };

    const handlePinToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(!currentUser) return;
        const isCurrentlyPinned = task.pinnedBy.includes(currentUser.id);

        if (!isCurrentlyPinned && pinnedCount >= MAX_PINNED_TASKS) {
            addToast(`You can pin a maximum of ${MAX_PINNED_TASKS} tasks.`, 'warning');
            return;
        }

        const newPinnedBy = isCurrentlyPinned
            ? task.pinnedBy.filter(id => id !== currentUser.id)
            : [...task.pinnedBy, currentUser.id];
        onUpdateTask(task.id, { pinnedBy: newPinnedBy });
    };
    
    const isPinned = currentUser && task.pinnedBy.includes(currentUser.id);
    const sourceMeeting = task.meetingId ? meetingsMap.get(task.meetingId) : null;
    const isCompleted = task.status === TaskStatus.Completed;

    return (
        <div
            draggable={isDraggable}
            onDragStart={handleDragStart}
            onClick={() => onViewTask(task)}
            className={`p-4 rounded-lg shadow-sm border dark:border-dark-border ${isDraggable ? 'cursor-grab' : 'cursor-pointer'} hover:shadow-lg dark:hover:border-slate-500 transition-all duration-200 ease-in-out ${isPinned ? 'border-l-4 border-amber-400' : ''} animate-fade-in-up ${isCompleted ? 'opacity-70 bg-emerald-50 dark:bg-emerald-900/20' : 'bg-surface-primary dark:bg-dark-surface-primary'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <p className="font-semibold text-text-primary dark:text-dark-text text-sm pr-2">{task.teamName || renderMentions(task.title, allUsers)}</p>
                <button
                    onClick={handlePinToggle}
                    className="p-1 text-xl flex-shrink-0 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 rounded-full"
                    title={isPinned ? 'Unpin task' : 'Pin task'}
                    aria-label={isPinned ? 'Unpin task' : 'Pin task'}
                    aria-pressed={isPinned}
                >
                    <span className={`transition-all duration-200 ${isPinned ? 'transform scale-125 opacity-100' : 'opacity-40 hover:opacity-100'}`}>📌</span>
                </button>
            </div>
            
            {sourceMeeting && (
                <Link to={`/meetings/${sourceMeeting.id}`} onClick={e => e.stopPropagation()} className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2 cursor-pointer inline-block">
                    <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-medium px-2 py-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900">
                        <i className="fas fa-link mr-1.5"></i>
                        From: {sourceMeeting.title}
                    </span>
                </Link>
            )}

            {task.taskType === 'Team Task' && task.memberProgress && (
                <div className="mb-2">
                     <TeamTaskProgress task={task} />
                </div>
            )}

            <div className="flex justify-between items-center text-xs text-text-secondary dark:text-dark-text-secondary">
                <span className={`${new Date(task.dueDate + 'T23:59:59') < new Date() && task.status !== TaskStatus.Completed ? 'text-red-500 dark:text-red-400 font-semibold' : ''}`}>
                    <i className="far fa-calendar-alt mr-1"></i>
                    {formatDateDDMonYYYY(task.dueDate)}
                </span>
                <div className="flex items-center gap-x-2">
                    {getPriorityPill(task.priority)}
                    <div className="flex -space-x-2">
                        {task.assignedTo.slice(0, 3).map(id => (
                            <UserAvatar key={id} name={getAssigneeName(id)} size="sm" className="border-2 border-white dark:border-dark-surface-primary" />
                        ))}
                        {task.assignedTo.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center border-2 border-white dark:border-dark-surface-primary">+{task.assignedTo.length - 3}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTaskStatus, onViewTask, onUpdateTask, meetingsMap = new Map() }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const columns: TaskStatus[] = [
    TaskStatus.NotStarted,
    TaskStatus.InProgress,
    TaskStatus.Blocked,
    TaskStatus.Completed,
  ];
  
  useEffect(() => {
      const fetchUsers = async () => {
          setAllUsers(await DataService.getUsers());
      };
      fetchUsers();
  }, []);

  const { currentUser } = useAuth();

  const pinnedCount = useMemo(() => {
    if (!currentUser) return 0;
    return tasks.filter(t => t.pinnedBy.includes(currentUser.id)).length;
  }, [tasks, currentUser]);

  const sortedTasks = useMemo(() => {
    if (!currentUser) return tasks;
    return [...tasks].sort((a,b) => {
        const aIsPinned = a.pinnedBy.includes(currentUser.id);
        const bIsPinned = b.pinnedBy.includes(currentUser.id);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        // if status is same, sort by due date
        if (a.status === b.status) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0; // keep original order for different statuses as they are in different columns
    });
  }, [tasks, currentUser]);

  const tasksByStatus = (status: TaskStatus) => sortedTasks.filter(t => {
      if(t.taskType === TaskType.Team && currentUser && currentUser.roleName === 'Employee') {
        const myStatus = t.memberProgress?.[currentUser.id]?.status;
        if (myStatus) return myStatus === status;
        // Default to not started if no progress entry exists
        return status === TaskStatus.NotStarted;
      }
      return t.status === status;
  });

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {columns.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasksByStatus(status)}
          allTasks={sortedTasks}
          onDrop={onUpdateTaskStatus}
          onViewTask={onViewTask}
          onUpdateTask={onUpdateTask}
          allUsers={allUsers}
          pinnedCount={pinnedCount}
          meetingsMap={meetingsMap}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;
