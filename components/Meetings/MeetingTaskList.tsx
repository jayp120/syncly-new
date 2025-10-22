import React from 'react';
import { Task, User, TaskStatus } from '../../types';
import MeetingTaskCard from './MeetingTaskCard';

interface MeetingTaskListProps {
  tasks: Task[];
  allUsers: User[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  onUpdateMemberStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
}

const MeetingTaskList: React.FC<MeetingTaskListProps> = ({ tasks, allUsers, currentUser, onViewTask, onUpdateMemberStatus, onUpdateTask }) => {
  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <MeetingTaskCard
          key={task.id}
          task={task}
          allUsers={allUsers}
          currentUser={currentUser}
          onViewTask={onViewTask}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </div>
  );
};

export default MeetingTaskList;