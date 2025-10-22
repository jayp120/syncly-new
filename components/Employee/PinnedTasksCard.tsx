
import React, { useMemo } from 'react';
import { Task, User, TaskStatus } from '../../types';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import { MAX_PINNED_TASKS } from '../../constants';
import EmptyState from '../Common/EmptyState';

interface PinnedTasksCardProps {
  tasks: Task[];
  currentUser: User;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
  onViewTask: (task: Task) => void;
}

const PinnedTasksCard: React.FC<PinnedTasksCardProps> = ({ tasks, currentUser, onUpdateTask, onViewTask }) => {

  const pinnedTasks = useMemo(() => {
    return tasks
      .filter(task => task.pinnedBy.includes(currentUser.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, currentUser.id]);

  const handleUnpin = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newPinnedBy = task.pinnedBy.filter(id => id !== currentUser.id);
      onUpdateTask(taskId, { pinnedBy: newPinnedBy });
    }
  };

  return (
    <Card title="📌 Pinned Tasks" titleIcon={<i className="fas fa-thumbtack" />}>
      {pinnedTasks.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 animate-fade-in-up">
          {pinnedTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onViewTask(task)}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out cursor-pointer border-l-4 border-amber-400 dark:border-amber-500 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-primary dark:text-sky-400 truncate pr-2">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Due: {formatDateDDMonYYYY(task.dueDate)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleUnpin(e, task.id)}
                  className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  title="Unpin Task"
                  aria-label="Unpin Task"
                >
                  <i className="fas fa-thumbtack"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<i className="fas fa-thumbtack"></i>}
          title="No Pinned Tasks"
          message={`Pin up to ${MAX_PINNED_TASKS} tasks to see them here for quick access. Click the pin icon on any task!`}
        />
      )}
    </Card>
  );
};

export default PinnedTasksCard;