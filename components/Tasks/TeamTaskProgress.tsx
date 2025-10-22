
import React from 'react';
import { Task, TaskStatus } from '../../types';

interface TeamTaskProgressProps {
  task: Task;
  size?: 'default' | 'compact';
}

const TeamTaskProgress: React.FC<TeamTaskProgressProps> = ({ task, size = 'default' }) => {
    if (task.taskType !== 'Team Task' || !task.memberProgress) {
        return <div className="text-xs text-gray-500 italic">N/A for this task type</div>;
    }

    const total = task.assignedTo.length;
    if (total === 0) {
        return <div className="text-xs text-gray-500 italic">No members assigned</div>;
    }
    
    const completed = Object.values(task.memberProgress).filter(p => p.status === TaskStatus.Completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    if (size === 'compact') {
        return (
            <div className="w-full">
                 <div className="flex justify-between items-center text-xs mb-0.5">
                    <span className="font-semibold text-gray-600">Progress</span>
                    <span className="font-bold text-primary">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="text-xs text-right text-gray-500 mt-0.5">
                    {completed}/{total}
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full">
            <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-gray-600">Team Progress</span>
                <span className="font-bold text-primary">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="text-xs text-right text-gray-500 mt-1">
                {completed} of {total} completed
            </div>
        </div>
    );
}
export default TeamTaskProgress;
