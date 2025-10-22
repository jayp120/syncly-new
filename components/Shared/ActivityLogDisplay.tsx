
import React, { useState, useEffect } from 'react';
import { ActivityLogItem, ActivityLogActionType } from '../../types';
import { TIMELINE_EVENT_ICONS } from '../../constants';

import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Spinner from '../Common/Spinner';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';

interface ActivityLogDisplayProps {
  userId: string;
  logType: string; // e.g., "My Recent Activity", "Manager Actions"
  itemCount?: number;
}

const ActivityLogDisplay: React.FC<ActivityLogDisplayProps> = ({ userId, logType, itemCount = 5 }) => {
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
        setIsLoading(true);
        const logs = await DataService.getUserActivityLog(userId);
        setActivityLog(logs.slice(0, itemCount));
        setIsLoading(false);
    };
    fetchLog();
  }, [userId, itemCount]);

  const getIconForActivity = (type: ActivityLogActionType) => {
    const iconClass = TIMELINE_EVENT_ICONS[type] || 'fas fa-history text-gray-500';
    return <i className={`${iconClass} mr-2`}></i>;
  }

  if (isLoading) {
    return (
      <Card title={logType} titleIcon={<i className="fas fa-stream"></i>}>
        <Spinner message="Loading activity..." />
      </Card>
    );
  }

  return (
    <Card title={logType} titleIcon={<i className="fas fa-stream"></i>}>
      {activityLog.length === 0 ? (
        <p className="text-center text-mediumtext py-4 italic">No recent activity found.</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {activityLog.map(item => (
            <li key={item.id} className="p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-start text-sm">
                <span className="mt-0.5">{getIconForActivity(item.type)}</span>
                <div className="flex-grow">
                    <p className="text-gray-700">{item.description}</p>
                    <p className="text-xs text-gray-500">{formatDateTimeDDMonYYYYHHMM(item.timestamp)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ActivityLogDisplay;
