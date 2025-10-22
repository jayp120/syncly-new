import React from 'react';
import { Meeting, User } from '../../types';
import Button from '../Common/Button';
import UserAvatar from '../Common/UserAvatar';
import * as DataService from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthContext';

interface MeetingStartToastProps {
  meeting: Meeting;
  occurrenceDate: Date;
  allUsers: User[];
  onClose: () => void;
}

const MeetingStartToast: React.FC<MeetingStartToastProps> = ({ meeting, occurrenceDate, allUsers, onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const handleJoin = () => {
    navigate(`/meetings/${meeting.id}`);
    onClose();
  };

  const handleCancel = async () => {
    if (currentUser) {
      const dateToCancel = occurrenceDate.toISOString().split('T')[0];
      await DataService.cancelSingleMeeting(meeting.id, dateToCancel, currentUser);
      addToast(`Skipped meeting: "${meeting.title}"`, 'info');
      onClose();
    }
  };

  const attendees = allUsers.filter(u => meeting.attendeeIds.includes(u.id));

  return (
    <div className="p-1">
      <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center">
        <i className="fas fa-hourglass-start text-primary dark:text-sky-400 mr-2 animate-pulse"></i>
        Meeting Starting Soon
      </h4>
      <p className="font-semibold text-lg my-1 text-secondary dark:text-slate-200">{meeting.title}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        at {occurrenceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="flex items-center -space-x-2 my-2" title={`${attendees.length} attendee(s)`}>
        {attendees.slice(0, 5).map(user => (
          <UserAvatar key={user.id} name={user.name} size="sm" className="border-2 border-white dark:border-slate-800" />
        ))}
        {attendees.length > 5 && (
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center border-2 border-white dark:border-slate-800">
            +{attendees.length - 5}
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2 mt-3">
        {currentUser?.id === meeting.createdBy && (
          <Button variant="danger" size="sm" onClick={handleCancel}>Skip This Time</Button>
        )}
        <Button variant="primary" size="sm" onClick={handleJoin}>Join Now</Button>
      </div>
    </div>
  );
};

export default MeetingStartToast;
