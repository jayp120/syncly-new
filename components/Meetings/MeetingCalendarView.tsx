import React, { useState, useMemo } from 'react';
import { Meeting, User } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../Common/Button';
import Select from '../Common/Select';
import Modal from '../Common/Modal';
import { getLocalYYYYMMDD, formatDateDDMonYYYY } from '../../utils/dateUtils';
import * as DataService from '../../services/dataService';
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOptions = monthNames.map((name, index) => ({ value: index, label: name }));
const dayHeadings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Simple hash function to get a color from a string
const nameToColorClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200',
    'bg-indigo-100 text-indigo-800 border-indigo-400 hover:bg-indigo-200',
    'bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200',
    'bg-pink-100 text-pink-800 border-pink-400 hover:bg-pink-200',
    'bg-teal-100 text-teal-800 border-teal-400 hover:bg-teal-200',
  ];
  const darkColors = [
    'dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-900',
    'dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700 dark:hover:bg-emerald-900',
    'dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700 dark:hover:bg-indigo-900',
    'dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700 dark:hover:bg-purple-900',
    'dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-700 dark:hover:bg-pink-900',
    'dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-700 dark:hover:bg-teal-900',
  ];
  const index = Math.abs(hash % colors.length);
  return `${colors[index]} ${darkColors[index]}`;
};

interface MeetingCalendarViewProps {
  meetings: Meeting[];
}

const MeetingCalendarView: React.FC<MeetingCalendarViewProps> = ({ meetings: initialMeetings }) => {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [actionModalState, setActionModalState] = useState<{ isOpen: boolean, meeting: Meeting | null, date: Date | null }>({ isOpen: false, meeting: null, date: null });
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const yearOptions = useMemo(() => {
    const currentSystemYear = new Date().getFullYear();
    const options = [];
    for (let y = currentSystemYear - 5; y <= currentSystemYear + 5; y++) {
      options.push({ value: y, label: y.toString() });
    }
    return options;
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(e.target.value), month, 1));
  };
  
  const handleMeetingClick = (meeting: Meeting, date: Date) => {
      const isRecurring = meeting.recurrenceRule && meeting.recurrenceRule !== 'none';
      if (currentUser?.roleName === 'Manager' && isRecurring) {
          setActionModalState({ isOpen: true, meeting, date });
      } else {
          navigate(`/meetings/${meeting.id}`);
      }
  };

  const handleCancelOccurrence = async () => {
      if (!actionModalState.meeting || !actionModalState.date || !currentUser) return;
      const dateToCancel = getLocalYYYYMMDD(actionModalState.date);
      const updatedMeeting = await DataService.cancelSingleMeeting(actionModalState.meeting.id, dateToCancel, currentUser);
      if (updatedMeeting) {
          addToast(`Meeting for ${formatDateDDMonYYYY(dateToCancel)} cancelled.`, 'success');
          // Update local state to reflect change immediately
          setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
      } else {
          addToast('Failed to cancel meeting.', 'error');
      }
      setActionModalState({ isOpen: false, meeting: null, date: null });
  };

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    const allOccurrences: Meeting[] = [];

    const monthStartDate = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0, 23, 59, 59);

    const formalMeetings = meetings.filter(m => m.meetingType !== 'live_memo');

    formalMeetings.forEach(meeting => {
      const isRecurring = meeting.recurrenceRule && meeting.recurrenceRule !== 'none';
      const seriesEnded = !!meeting.recurrenceEndDate && meeting.meetingDateTime > meeting.recurrenceEndDate;
      
      if (seriesEnded) return;

      if (!isRecurring) {
        const meetingDate = new Date(meeting.meetingDateTime);
        if (meetingDate >= monthStartDate && meetingDate <= monthEndDate) {
            allOccurrences.push(meeting);
        }
        return;
      }
      
      let currentDate = new Date(meeting.meetingDateTime);
      const stopDate = new Date(); 
      stopDate.setFullYear(stopDate.getFullYear() + 2); 

      while(currentDate <= stopDate) {
        if (meeting.recurrenceEndDate && currentDate.getTime() > meeting.recurrenceEndDate) break;
        if (currentDate > monthEndDate) break;
        
        const dateKey = getLocalYYYYMMDD(currentDate);
        if (currentDate >= monthStartDate && !meeting.cancelledOccurrences?.includes(dateKey)) {
           allOccurrences.push({ ...meeting, meetingDateTime: currentDate.getTime() });
        }

        switch(meeting.recurrenceRule) {
            case 'daily': currentDate.setDate(currentDate.getDate() + 1); break;
            case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
            case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
            default: currentDate = new Date(stopDate.getTime() + 1);
        }
      }
    });

    allOccurrences.forEach(occurrence => {
      const dateKey = getLocalYYYYMMDD(new Date(occurrence.meetingDateTime));
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(occurrence);
    });
    
    return map;
  }, [meetings, year, month]);

  const renderCells = () => {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells = [];
    const systemToday = new Date();

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const cellDateObj = new Date(year, month, day);
      const dateKey = getLocalYYYYMMDD(cellDateObj);
      const dayMeetings = (meetingsByDate.get(dateKey) || []).sort((a,b) => a.meetingDateTime - b.meetingDateTime);
      const isTodayFlag = systemToday.getFullYear() === year && systemToday.getMonth() === month && systemToday.getDate() === day;

      cells.push(
        <div key={day} className={`border-slate-200 dark:border-slate-800 p-1.5 min-h-[8rem] flex flex-col relative ${isTodayFlag ? 'bg-blue-50 dark:bg-sky-900/30' : 'bg-white dark:bg-slate-900'}`}>
          <span className={`text-xs sm:text-sm font-semibold self-end ${isTodayFlag ? 'text-primary dark:text-sky-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>{day}</span>
          <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
            {dayMeetings.map(meeting => (
              <button
                key={`${meeting.id}-${meeting.meetingDateTime}`}
                onClick={() => handleMeetingClick(meeting, cellDateObj)}
                title={meeting.title}
                className={`w-full block text-left p-1.5 rounded-md text-xs font-medium border-l-4 transition-all duration-200 ease-in-out ${nameToColorClass(meeting.title)}`}
              >
                <p className="truncate flex items-center">
                  {meeting.title}
                  {meeting.recurrenceRule && meeting.recurrenceRule !== 'none' && !meeting.recurrenceEndDate && (
                      <i className="fas fa-sync-alt text-xs ml-1.5 opacity-70" title={`Repeats ${meeting.recurrenceRule}`}></i>
                  )}
                </p>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900/80 dark:border dark:border-slate-700/50 p-4 sm:p-6 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-4 sm:mb-0">
            <button onClick={prevMonth} aria-label="Previous month" className="p-2 text-primary dark:text-sky-400 hover:bg-primary-light dark:hover:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Select options={monthOptions} value={month} onChange={handleMonthChange} wrapperClassName="mb-0" className="!w-auto !min-w-[120px] !mt-0 py-1.5 px-2 text-sm sm:text-base" aria-label="Select month" />
              <Select options={yearOptions} value={year} onChange={handleYearChange} wrapperClassName="mb-0" className="!w-auto !min-w-[90px] !mt-0 py-1.5 px-2 text-sm sm:text-base" aria-label="Select year" />
            </div>
            <button onClick={nextMonth} aria-label="Next month" className="p-2 text-primary dark:text-sky-400 hover:bg-primary-light dark:hover:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
              <i className="fas fa-chevron-right"></i>
            </button>
            <Button onClick={today} variant="secondary" size="sm">Today</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px border-t border-l border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
          {dayHeadings.map(dayName => (
            <div key={dayName} className="text-center font-medium p-2 bg-slate-100 dark:bg-slate-800 text-sm text-gray-600 dark:text-slate-300">{dayName}</div>
          ))}
          {renderCells()}
        </div>
      </div>
       <Modal
          isOpen={actionModalState.isOpen}
          onClose={() => setActionModalState({ isOpen: false, meeting: null, date: null })}
          title={`Action for "${actionModalState.meeting?.title}"`}
          size="sm"
       >
           <div className="space-y-3">
               <p className="text-slate-600 dark:text-slate-300">What would you like to do for the meeting on <strong>{actionModalState.date ? formatDateDDMonYYYY(actionModalState.date) : ''}</strong>?</p>
               <Button variant="primary" className="w-full" onClick={() => navigate(`/meetings/${actionModalState.meeting?.id}`)}>View/Manage Workspace</Button>
               <Button variant="danger" className="w-full" onClick={handleCancelOccurrence}>Cancel Only This Occurrence</Button>
           </div>
       </Modal>
    </>
  );
};

export default MeetingCalendarView;