import React from 'react';
import { TimelineEvent, ActivityLogActionType } from '../../types';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import Card from '../Common/Card';
import Spinner from '../Common/Spinner';
import UserAvatar from '../Common/UserAvatar';
import * as ReactRouterDom from "react-router-dom";
const { Link } = ReactRouterDom;

interface TimelineDisplayProps {
  title: string;
  events: TimelineEvent[];
  isLoading?: boolean;
  maxHeight?: string; // e.g., 'max-h-96'
}

const TimelineDisplay: React.FC<TimelineDisplayProps> = ({ title, events, isLoading = false, maxHeight = 'max-h-[30rem]' }) => {
  if (isLoading) {
    return (
      <Card title={title} titleIcon={<i className="fas fa-stream"></i>}>
        <Spinner message={`Loading ${title.toLowerCase()}...`} />
      </Card>
    );
  }

  const getCrucialStyles = (event: TimelineEvent): string => {
    if (!event.isCrucial) return 'border-transparent';
    switch (event.originalActionType) {
        case ActivityLogActionType.EOD_SUBMITTED:
        case ActivityLogActionType.EOD_LATE_SUBMITTED:
        case ActivityLogActionType.MEETING_CRUCIAL_UPDATE_POSTED:
            return 'border-amber-500';
        case ActivityLogActionType.TASK_COMPLETED:
            return 'border-emerald-500';
        case ActivityLogActionType.TASK_STATUS_CHANGED: // This is for 'Blocked'
            return 'border-red-500';
        case ActivityLogActionType.LEAVE_MARKED_BY_EMPLOYEE:
            return 'border-rose-500'; // Using a different red
        default:
            return 'border-yellow-500'; // A generic crucial color
    }
  };

  const renderEventContent = (event: TimelineEvent) => {
    const actorDisplayName = <span className="font-semibold text-primary dark:text-sky-400">{event.actorName}</span>;
    
    // If the action description already contains the target name (like in a diff), don't append it again.
    const shouldRenderTarget = event.targetName && !event.actionDescription.includes(`"${event.targetName}"`);

    const target = shouldRenderTarget && event.targetLink && event.targetName ? (
        <Link to={event.targetLink} className="font-medium text-secondary dark:text-blue-300 hover:underline">"{event.targetName}"</Link>
    ) : shouldRenderTarget && event.targetName ? (
        <span className="font-medium text-secondary dark:text-blue-300">"{event.targetName}"</span>
    ) : null;

    return <p className="text-sm text-gray-800 dark:text-slate-300 leading-tight">{actorDisplayName} {event.actionDescription} {target}</p>;
  };

  return (
    <Card title={title} titleIcon={<i className="fas fa-stream"></i>} className="h-full flex flex-col">
      {events.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-center text-mediumtext dark:text-slate-400 py-4 italic">No activity to display.</p>
        </div>
      ) : (
        <div className={`${maxHeight} overflow-y-auto pr-2 space-y-3 flex-grow`}>
          {events.map(event => (
            <div key={`${event.id}-${event.timestamp}`} className={`flex items-start p-2.5 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md transition-colors border-l-4 ${getCrucialStyles(event)}`}>
              <UserAvatar name={event.originalActorName} size="md" className="mr-3 mt-0.5" />
              <div className="flex-grow">
                {renderEventContent(event)}
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{formatDateTimeDDMonYYYYHHMM(event.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default TimelineDisplay;