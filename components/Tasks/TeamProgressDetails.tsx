import React from 'react';
import { Task, TaskStatus, User } from '../../types';
import * as DataService from '../../services/dataService';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import TeamTaskProgress from './TeamTaskProgress';

interface TeamProgressDetailsProps {
    task: Task;
    allUsers: User[];
}

const TeamProgressDetails: React.FC<TeamProgressDetailsProps> = ({ task, allUsers }) => {
    if (task.taskType !== 'Team Task' || !task.memberProgress) return null;

    const getStatusColor = (status: TaskStatus) => ({
        [TaskStatus.NotStarted]: 'bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-200',
        [TaskStatus.InProgress]: 'bg-blue-200 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200',
        [TaskStatus.Completed]: 'bg-green-200 dark:bg-green-800/60 text-green-800 dark:text-green-200',
        [TaskStatus.Blocked]: 'bg-red-200 dark:bg-red-800/60 text-red-800 dark:text-red-200',
    }[status]);

    return (
        <div className="pt-4 mt-4 border-t dark:border-slate-700">
            <h4 className="font-semibold text-lg mb-2 text-secondary dark:text-slate-300">Team Progress</h4>
            <div className="mb-4">
                <TeamTaskProgress task={task} />
            </div>
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
                {task.assignedTo.map(memberId => {
                    const member = allUsers.find(u => u.id === memberId);
                    const progress = task.memberProgress![memberId];
                    if (!member || !progress) return null;

                    return (
                        <div key={memberId} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                            <span className="font-medium text-gray-800 dark:text-slate-200">{member.name}</span>
                            <div className="text-right">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(progress.status)}`}>{progress.status}</span>
                                {progress.status === 'Completed' && progress.completedAt && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">on {formatDateTimeDDMonYYYYHHMM(progress.completedAt)}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TeamProgressDetails;