

import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, User, TaskType, Meeting, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import Button from '../Common/Button';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import { renderMentions } from '../../utils/mentionUtils';
import TeamTaskProgress from './TeamTaskProgress';
import { useToast } from '../../contexts/ToastContext';
import { MAX_PINNED_TASKS } from '../../constants';
import * as ReactRouterDom from "react-router-dom";
const { Link } = ReactRouterDom;
import EmptyState from '../Common/EmptyState';
import { useAuth } from '../Auth/AuthContext';
import Select from '../Common/Select';

interface TaskListProps {
  tasks: Task[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void; // For status, pin, etc.
  onDeleteTask: (taskId: string) => void;
  isManagerView?: boolean;
  onBatchDelete?: (taskIds: string[]) => void;
  onBatchChangeStatus?: (taskIds: string[], status: TaskStatus) => void;
  onBatchChangeDueDate?: (taskIds: string[]) => void;
  onBatchReassign?: (taskIds: string[]) => void;
  meetingsMap?: Map<string, Meeting>;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const TASKS_PER_PAGE = 10;

const TaskList: React.FC<TaskListProps> = ({ 
    tasks, currentUser, onViewTask, onEditTask, onUpdateTask, onDeleteTask, isManagerView = false, 
    onBatchDelete, onBatchChangeStatus, onBatchChangeDueDate, onBatchReassign, meetingsMap = new Map(),
    currentPage, onPageChange
}) => {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: keyof Task; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const pinnedCount = useMemo(() => tasks.filter(t => t.pinnedBy.includes(currentUser.id)).length, [tasks, currentUser.id]);

  useEffect(() => {
    setSelectedTaskIds(new Set());
    const fetchUsers = async () => {
        setAllUsers(await DataService.getUsers());
    };
    fetchUsers();
  }, [tasks]);
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if(task.taskType === TaskType.Team) {
        await DataService.updateTaskMemberStatus(taskId, currentUser.id, newStatus, currentUser);
        onUpdateTask(taskId, {});
    } else {
        onUpdateTask(taskId, { status: newStatus });
    }
  };
  
  const getTaskTypeBadge = (taskType: TaskType) => {
    const styles = {
      [TaskType.Direct]: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
      [TaskType.Team]: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
      [TaskType.Personal]: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[taskType]}`}>{taskType}</span>
  }

  const getPriorityInfo = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.High: return { icon: "fas fa-arrow-up", color: "text-red-600 dark:text-red-400", text: "High" };
      case TaskPriority.Medium: return { icon: "fas fa-equals", color: "text-yellow-600 dark:text-amber-400", text: "Medium" };
      case TaskPriority.Low: return { icon: "fas fa-arrow-down", color: "text-green-600 dark:text-emerald-400", text: "Low" };
      default: return { icon: "fas fa-minus", color: "text-gray-500 dark:text-slate-400", text: "N/A" };
    }
  };
  
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
        const aIsPinned = a.pinnedBy.includes(currentUser.id);
        const bIsPinned = b.pinnedBy.includes(currentUser.id);

        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [tasks, sortConfig, currentUser.id]);

  const filteredTasks = useMemo(() => {
    return showCompleted ? sortedTasks : sortedTasks.filter(t => t.status !== TaskStatus.Completed);
  }, [sortedTasks, showCompleted]);

  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  
  const paginatedTasks = useMemo(() => {
      const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
      return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [filteredTasks, currentPage]);


  useEffect(() => {
      onPageChange(1);
      setSelectedTaskIds(new Set());
  }, [tasks, showCompleted]);

  const handleSelectTask = (taskId: string) => {
      const newSelection = new Set(selectedTaskIds);
      if (newSelection.has(taskId)) {
          newSelection.delete(taskId);
      } else {
          newSelection.add(taskId);
      }
      setSelectedTaskIds(newSelection);
  };

  const handleSelectAllOnPage = () => {
      if (selectedTaskIds.size === paginatedTasks.length && paginatedTasks.length > 0) {
          setSelectedTaskIds(new Set());
      } else {
          setSelectedTaskIds(new Set(paginatedTasks.map(t => t.id)));
      }
  };
  
  const taskStatusOptions = Object.values(TaskStatus).map(s => ({ value: s, label: s }));

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(<Button key={i} onClick={() => onPageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1 !p-0 w-8 h-8">{i}</Button>);
        }
        return pageNumbers;
    }

    pageNumbers.push(<Button key={1} onClick={() => onPageChange(1)} variant={1 === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1 !p-0 w-8 h-8">1</Button>);

    let startPage, endPage;
    if (currentPage <= 3) {
        startPage = 2;
        endPage = 4;
    } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
        endPage = totalPages - 1;
    } else {
        startPage = currentPage - 1;
        endPage = currentPage + 1;
    }

    if (startPage > 2) pageNumbers.push(<span key="start-ellipsis" className="mx-1 self-center p-2">...</span>);
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(<Button key={i} onClick={() => onPageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1 !p-0 w-8 h-8">{i}</Button>);
    }
    if (endPage < totalPages - 1) pageNumbers.push(<span key="end-ellipsis" className="mx-1 self-center p-2">...</span>);

    pageNumbers.push(<Button key={totalPages} onClick={() => onPageChange(totalPages)} variant={totalPages === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1 !p-0 w-8 h-8">{totalPages}</Button>);
    return pageNumbers;
  };

  if (tasks.length === 0) {
    return (
        <EmptyState
            icon={<i className="fas fa-check-double"></i>}
            title="All Tasks Cleared!"
            message="You have no tasks in this view. Great job staying on top of your work!"
        />
    );
  }

  return (
    <div>
      {isManagerView && selectedTaskIds.size > 0 && (
          <div className="fixed bottom-4 right-4 z-30 flex items-center space-x-2 p-3 bg-surface-primary dark:bg-dark-surface-primary rounded-lg shadow-lg border border-primary dark:border-sky-500">
              <span className="text-sm font-semibold text-primary dark:text-sky-400">{selectedTaskIds.size} selected</span>
              <Button size="sm" variant="secondary" onClick={() => onBatchReassign && onBatchReassign(Array.from(selectedTaskIds))} icon={<i className="fas fa-user-friends"></i>}>Reassign</Button>
              <Button size="sm" variant="secondary" onClick={() => onBatchChangeDueDate && onBatchChangeDueDate(Array.from(selectedTaskIds))} icon={<i className="fas fa-calendar-alt"></i>}>Due Date</Button>
              <Button size="sm" variant="secondary" onClick={() => onBatchChangeStatus && onBatchChangeStatus(Array.from(selectedTaskIds), TaskStatus.Completed)} icon={<i className="fas fa-check-circle"></i>}>Complete</Button>
              <Button size="sm" variant="danger" onClick={() => onBatchDelete && onBatchDelete(Array.from(selectedTaskIds))} icon={<i className="fas fa-trash"></i>}>Delete</Button>
          </div>
      )}
      <div className="flex justify-end mb-2">
        <Button onClick={() => setShowCompleted(!showCompleted)} variant="ghost" size="sm" icon={<i className={`fas ${showCompleted ? 'fa-eye-slash' : 'fa-eye'}`}></i>}>
            {showCompleted ? 'Hide' : 'Show'} Completed
        </Button>
      </div>

      <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                  <tr>
                      {isManagerView && <th className="px-4 py-2"><input type="checkbox" className="rounded" onChange={handleSelectAllOnPage} checked={selectedTaskIds.size === paginatedTasks.length && paginatedTasks.length > 0} /></th>}
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Task</th>
                      {isManagerView && <th className="px-4 py-2 text-left min-w-[200px] text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Team Progress</th>}
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">{isManagerView ? 'Overall Status' : 'My Stage'}</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Priority</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Pin</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-border-primary dark:divide-dark-border">
                  {paginatedTasks.length === 0 && (
                      <tr>
                          <td colSpan={isManagerView ? 8 : 7} className="py-4">
                            <EmptyState
                                icon={<i className="fas fa-search"></i>}
                                title="No Tasks Found"
                                message="No tasks matched your current filter criteria. Try adjusting your filters."
                            />
                          </td>
                      </tr>
                  )}
                  {paginatedTasks.map(task => {
                      const canEditOverallStatus = isManagerView && (hasPermission(Permission.CAN_EDIT_ANY_TASK_STATUS) || task.createdBy === currentUser.id);
                      const isPinned = task.pinnedBy.includes(currentUser.id);
                      const pinLimitReached = !isPinned && pinnedCount >= MAX_PINNED_TASKS;
                      const priorityInfo = getPriorityInfo(task.priority);
                      const canEdit = (isManagerView && task.createdBy === currentUser.id) || (!isManagerView && task.isPersonalTask && task.createdBy === currentUser.id);
                      const sourceMeeting = task.meetingId ? meetingsMap.get(task.meetingId) : null;
                      const isCompleted = task.status === TaskStatus.Completed;

                      const handlePinClick = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (pinLimitReached) {
                              addToast(`You can pin a maximum of ${MAX_PINNED_TASKS} tasks.`, 'warning');
                              return;
                          }
                          const newPinnedBy = isPinned
                              ? task.pinnedBy.filter(id => id !== currentUser.id)
                              : [...task.pinnedBy, currentUser.id];
                          onUpdateTask(task.id, { pinnedBy: newPinnedBy });
                      };
                      
                      return (
                      <tr key={task.id} className={`hover:bg-surface-hover dark:hover:bg-dark-surface-hover animate-fade-in-up transition-opacity ${isPinned ? 'bg-yellow-50 dark:bg-yellow-500/10' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                          {isManagerView && <td className="px-4 py-2"><input type="checkbox" className="rounded" checked={selectedTaskIds.has(task.id)} onChange={() => handleSelectTask(task.id)} /></td>}
                          <td className="px-4 py-2 font-medium text-text-primary dark:text-dark-text cursor-pointer max-w-xs" onClick={() => onViewTask(task)}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`truncate font-semibold text-primary dark:text-sky-400 ${isCompleted ? 'line-through' : ''}`}>{task.teamName || renderMentions(task.title, allUsers)}</p>
                              {getTaskTypeBadge(task.taskType)}
                            </div>
                             {sourceMeeting && (
                                <Link to={`/meetings/${sourceMeeting.id}`} onClick={e => e.stopPropagation()} className="text-xs text-text-secondary dark:text-dark-text-secondary mb-1 cursor-pointer inline-block">
                                    <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-medium px-2 py-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900">
                                      <i className="fas fa-link mr-1.5"></i>
                                      From: {sourceMeeting.title}
                                    </span>
                                </Link>
                              )}
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary truncate">{task.teamName ? renderMentions(task.title, allUsers) : renderMentions(task.description, allUsers)}</p>
                          </td>
                          {isManagerView && <td className="px-4 py-2"><TeamTaskProgress task={task} /></td>}
                          <td className="px-4 py-2 text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateDDMonYYYY(task.dueDate)}</td>
                          <td className="px-4 py-2">
                            {canEditOverallStatus ? (
                                <Select
                                    value={task.status}
                                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                                    options={taskStatusOptions}
                                    onClick={(e) => e.stopPropagation()}
                                    className="!mt-0 !text-xs !py-1 w-32"
                                    wrapperClassName="!mb-0"
                                />
                            ) : isManagerView ? (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    task.status === TaskStatus.Completed ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                    task.status === TaskStatus.InProgress ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                    task.status === TaskStatus.Blocked ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                    {task.status}
                                </span>
                            ) : (
                                <Select 
                                    value={task.taskType === TaskType.Team ? (task.memberProgress?.[currentUser.id]?.status || TaskStatus.NotStarted) : task.status} 
                                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)} 
                                    options={taskStatusOptions}
                                    className="p-1 text-xs border rounded-md bg-surface-primary dark:bg-dark-surface-inset dark:border-dark-border focus:ring-primary focus:border-primary"
                                    onClick={e => e.stopPropagation()}
                                    wrapperClassName="!mb-0"
                                    disabled={isCompleted}
                                />
                            )}
                          </td>
                          <td className="px-4 py-2">
                              <div className={`flex items-center justify-center ${priorityInfo.color}`}>
                                  <i className={`${priorityInfo.icon} mr-1`}></i>
                                  <span className="text-sm font-medium">{priorityInfo.text}</span>
                              </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                              <button
                                  type="button"
                                  onClick={handlePinClick}
                                  className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${pinLimitReached ? 'cursor-not-allowed opacity-50' : ''}`}
                                  title={isPinned ? 'Unpin task' : (pinLimitReached ? `Pin limit (${MAX_PINNED_TASKS}) reached` : 'Pin task')}
                                  aria-label={isPinned ? 'Unpin task' : 'Pin task'}
                                  aria-pressed={isPinned}
                                  disabled={pinLimitReached}
                              >
                                  <span className={`text-xl transition-all ${isPinned ? 'transform scale-125' : 'opacity-100'}`}>📌</span>
                              </button>
                          </td>
                          <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                  <Button variant="ghost" size="sm" onClick={() => onViewTask(task)}>View</Button>
                                  {canEdit && <Button variant="secondary" size="sm" onClick={() => onEditTask(task)}>Edit</Button>}
                              </div>
                          </td>
                      </tr>
                  )})}
              </tbody>
          </table>
      </div>

       {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-border-primary dark:border-dark-border gap-4">
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Page {currentPage} of {totalPages}
                <span className="hidden sm:inline"> ({filteredTasks.length} total tasks)</span>
            </span>
            <div className="flex items-center">
                <Button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} variant="ghost" size="sm" icon={<i className="fas fa-chevron-left"></i>} className="mr-1" aria-label="Previous Page">
                    <span className="hidden md:inline">Prev</span>
                </Button>
                <div className="hidden md:flex items-center">
                    {renderPageNumbers()}
                </div>
                <div className="flex md:hidden items-center">
                    <span className="px-2 text-sm">Page {currentPage}</span>
                </div>
                <Button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="ghost" size="sm" className="ml-1" aria-label="Next Page">
                    <span className="hidden md:inline mr-2">Next</span>
                    <i className="fas fa-chevron-right"></i>
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;