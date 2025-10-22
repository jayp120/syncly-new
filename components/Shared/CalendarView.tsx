import React, { useState, useMemo, ChangeEvent } from 'react';
import { EODReport, User, LeaveRecord, LeaveStatus, ReportVersion, Meeting } from '../../types';
// FIX: Corrected react-router-dom import to use a standard named import.
import { useNavigate } from 'react-router-dom';
import Button from '../Common/Button';
import ReportDetailModal from './ReportDetailModal';
import Select from '../Common/Select';
import { formatDateDDMonYYYY, getLocalYYYYMMDD, getAllOccurrencesForMonth } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';
import Modal from '../Common/Modal';
import { useToast } from '../../contexts/ToastContext';
import * as DataService from '../../services/dataService';

interface CalendarViewProps {
  reports: EODReport[];
  meetings: Meeting[];
  currentUser: User;
  allUsersForFilter?: User[]; 
  onReportUpdate?: () => void;
  leaveRecords?: LeaveRecord[];
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOptions = monthNames.map((name, index) => ({ value: index, label: name }));
const dayHeadings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarView: React.FC<CalendarViewProps> = ({ reports, meetings, currentUser, allUsersForFilter, onReportUpdate, leaveRecords = [] }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [actionModalState, setActionModalState] = useState<{ isOpen: boolean, meeting: Meeting | null, date: Date | null }>({ isOpen: false, meeting: null, date: null });
  
  // Filters for manager view
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'reports' | 'meetings'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'acknowledged'>('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => ({ value: currentYear - 5 + i, label: (currentYear - 5 + i).toString() }));
  }, []);

  const employeeOptions = useMemo(() => {
    return [{ value: '', label: 'All Employees' }, ...(allUsersForFilter?.filter(u => u.roleName === 'Employee').map(u => ({ value: u.id, label: u.name })) || [])];
  }, [allUsersForFilter]);

  const filteredData = useMemo(() => {
    let filteredReports = reports;
    let filteredMeetings = meetings.filter(m => m.meetingType !== 'live_memo');
    
    if (currentUser.roleName === 'Employee') {
      filteredReports = reports.filter(r => r.employeeId === currentUser.id);
      filteredMeetings = meetings.filter(m => m.attendeeIds.includes(currentUser.id) || m.createdBy === currentUser.id);
    } else if (employeeFilter) { // Manager view with employee filter
      filteredReports = reports.filter(r => r.employeeId === employeeFilter);
      filteredMeetings = meetings.filter(m => m.attendeeIds.includes(employeeFilter) || m.createdBy === employeeFilter);
    }

    if (reportStatusFilter !== 'all') {
      const status = reportStatusFilter === 'pending' ? 'Pending Acknowledgment' : 'Acknowledged';
      filteredReports = filteredReports.filter(r => r.status === status);
    }
    
    const reportsByDate = new Map<string, EODReport[]>();
    if (eventTypeFilter === 'all' || eventTypeFilter === 'reports') {
        filteredReports.forEach(report => {
            const dateKey = report.date;
            if (!reportsByDate.has(dateKey)) reportsByDate.set(dateKey, []);
            reportsByDate.get(dateKey)!.push(report);
        });
    }

    const meetingsByDate = new Map<string, Meeting[]>();
    if (eventTypeFilter === 'all' || eventTypeFilter === 'meetings') {
        filteredMeetings.forEach(meeting => {
            const occurrences = getAllOccurrencesForMonth(meeting, year, month);
            occurrences.forEach(occurrence => {
                const dateKey = getLocalYYYYMMDD(new Date(occurrence.meetingDateTime));
                if (!meetingsByDate.has(dateKey)) {
                    meetingsByDate.set(dateKey, []);
                }
                meetingsByDate.get(dateKey)!.push(occurrence);
            });
        });
    }

    return { reportsByDate, meetingsByDate };
  }, [reports, meetings, currentUser, employeeFilter, eventTypeFilter, reportStatusFilter, year, month]);

  const handleMeetingClick = (meeting: Meeting, date: Date) => {
      const isRecurring = meeting.recurrenceRule && meeting.recurrenceRule !== 'none';
      if (currentUser.roleName === 'Manager' && isRecurring) {
          setActionModalState({ isOpen: true, meeting, date });
      } else {
          navigate(`/meetings/${meeting.id}`);
      }
  };

  const handleCancelOccurrence = async () => {
      if (!actionModalState.meeting || !actionModalState.date || !currentUser) return;
      const dateToCancel = getLocalYYYYMMDD(actionModalState.date);
      try {
        const updatedMeeting = await DataService.cancelSingleMeeting(actionModalState.meeting.id, dateToCancel, currentUser);
        if (updatedMeeting && onReportUpdate) {
            addToast(`Meeting for ${formatDateDDMonYYYY(dateToCancel)} cancelled.`, 'success');
            onReportUpdate();
        } else {
            throw new Error("Failed to get updated meeting from data service.");
        }
      } catch(error) {
        console.error(error);
        addToast('Failed to cancel meeting.', 'error');
      }
      setActionModalState({ isOpen: false, meeting: null, date: null });
  };

  const handleEndSeries = async () => {
      if (!actionModalState.meeting || !currentUser) return;
      try {
        const updatedMeeting = await DataService.endRecurringMeeting(actionModalState.meeting.id, currentUser);
        if (updatedMeeting && onReportUpdate) {
            addToast(`Recurring series for "${updatedMeeting.title}" has been stopped.`, 'success');
            onReportUpdate();
        } else {
             throw new Error("Failed to get updated meeting from data service.");
        }
      } catch(error) {
        console.error(error);
        addToast('Failed to stop recurring series.', 'error');
      }
      setActionModalState({ isOpen: false, meeting: null, date: null });
  };

  const renderCells = () => {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells = [];
    const systemToday = getLocalYYYYMMDD(new Date());

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="border-border-primary dark:border-dark-border bg-surface-secondary/50 dark:bg-dark-surface-secondary/50"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReports = filteredData.reportsByDate.get(dateKey) || [];
      const dayMeetings = filteredData.meetingsByDate.get(dateKey) || [];
      const isTodayFlag = dateKey === systemToday;
      
      cells.push(
        <div key={day} className={`border-border-primary dark:border-dark-border p-1 min-h-[8rem] flex flex-col relative ${isTodayFlag ? 'bg-blue-50 dark:bg-sky-900/30' : 'bg-surface-primary dark:bg-dark-surface-primary'}`}>
          <span className={`text-xs sm:text-sm font-semibold self-end ${isTodayFlag ? 'text-primary dark:text-sky-400 font-bold' : 'text-text-primary dark:text-dark-text'}`}>{day}</span>
          <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
            {/* Meetings */}
            {dayMeetings.map(meeting => (
               <button onClick={() => handleMeetingClick(meeting, new Date(dateKey + 'T12:00:00Z'))} key={`${meeting.id}-${meeting.meetingDateTime}`} title={meeting.title} className="block w-full text-left p-1.5 rounded-md text-xs font-medium border-l-4 bg-indigo-100 text-indigo-800 border-indigo-400 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700 dark:hover:bg-indigo-900">
                <p className="truncate flex items-center"><i className="fas fa-users-crown mr-1.5"></i>{meeting.title}</p>
              </button>
            ))}
            {/* Reports */}
            <div className="flex flex-wrap gap-1 mt-1">
            {dayReports.map(report => {
                const isAcknowledged = report.status === 'Acknowledged';
                return (
                    <button key={report.id} onClick={() => setSelectedReport(report)} title={`${report.employeeName} - ${report.status}`} 
                        className={`w-auto px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${isAcknowledged ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900' : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900'}`}>
                        {currentUser.roleName === 'Manager' && <UserAvatar name={report.employeeName} size="sm" className="w-4 h-4 text-[10px]" />}
                        <span className="hidden sm:inline">{currentUser.roleName === 'Manager' ? report.employeeName.split(' ')[0] : 'Report'}</span>
                    </button>
                )
            })}
            </div>
          </div>
        </div>
      );
    }
    return cells;
  };
  
  return (
    <div className="bg-surface-primary dark:bg-dark-surface-primary dark:border dark:border-dark-border p-4 sm:p-6 rounded-lg shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center space-x-1 sm:space-x-2 mb-4 sm:mb-0">
          <button onClick={prevMonth} aria-label="Previous month" className="p-2 text-primary dark:text-sky-400 hover:bg-primary-light dark:hover:bg-dark-surface-hover rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-colors"><i className="fas fa-chevron-left"></i></button>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Select options={monthOptions} value={month} onChange={e => setCurrentDate(new Date(year, parseInt(e.target.value), 1))} wrapperClassName="mb-0" className="!w-auto !min-w-[120px] !mt-0 py-1.5 px-2 text-sm sm:text-base" aria-label="Select month" />
            <Select options={yearOptions} value={year} onChange={e => setCurrentDate(new Date(parseInt(e.target.value), month, 1))} wrapperClassName="mb-0" className="!w-auto !min-w-[90px] !mt-0 py-1.5 px-2 text-sm sm:text-base" aria-label="Select year" />
          </div>
          <button onClick={nextMonth} aria-label="Next month" className="p-2 text-primary dark:text-sky-400 hover:bg-primary-light dark:hover:bg-dark-surface-hover rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-colors"><i className="fas fa-chevron-right"></i></button>
          <Button onClick={today} variant="outline" size="sm" className="hover:!shadow-accent/30 hover:shadow-sm dark:hover:shadow-accent/40">Today</Button>
        </div>
      </div>

      {currentUser.roleName === 'Manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-surface-secondary dark:bg-dark-surface-secondary rounded-lg border dark:border-dark-border">
            <Select label="Filter by Type" options={[{value: 'all', label: 'All Events'}, {value: 'reports', label: 'Reports Only'}, {value: 'meetings', label: 'Meetings Only'}]} value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value as any)} wrapperClassName="!mb-0" />
            <Select label="Filter by Employee" options={employeeOptions} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} wrapperClassName="!mb-0" />
            <Select label="Report Status" options={[{value: 'all', label: 'All Reports'}, {value: 'pending', label: 'Pending'}, {value: 'acknowledged', label: 'Acknowledged'}]} value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value as any)} wrapperClassName="!mb-0" disabled={eventTypeFilter === 'meetings'}/>
        </div>
      )}

      <div className="grid grid-cols-7 gap-px border-t border-l border-border-primary dark:border-dark-border bg-border-primary dark:bg-dark-border">
        {dayHeadings.map(dayName => (
          <div key={dayName} className="text-center font-medium p-2 bg-surface-secondary dark:bg-dark-surface-secondary text-sm text-text-secondary dark:text-dark-text-secondary">{dayName}</div>
        ))}
        {renderCells()}
      </div>
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          currentUser={currentUser}
          onReportUpdate={(updatedReportFromModal) => { 
            if (onReportUpdate) onReportUpdate();
            setSelectedReport(updatedReportFromModal); 
          }}
        />
      )}
       {actionModalState.isOpen && actionModalState.meeting && (
        <Modal
            isOpen={actionModalState.isOpen}
            onClose={() => setActionModalState({ isOpen: false, meeting: null, date: null })}
            title={`Action for "${actionModalState.meeting.title}"`}
            size="sm"
        >
            <div className="space-y-3">
                <p className="text-text-primary dark:text-dark-text">What would you like to do for the meeting on <strong>{actionModalState.date ? formatDateDDMonYYYY(actionModalState.date) : ''}</strong>?</p>
                <Button variant="primary" className="w-full" onClick={() => {
                    if (!actionModalState.meeting || !actionModalState.date) return;
                    const dateStr = getLocalYYYYMMDD(actionModalState.date);
                    setActionModalState({ isOpen: false, meeting: null, date: null });
                    navigate(`/meetings/${actionModalState.meeting.id}?date=${dateStr}`);
                }}>View/Manage Workspace</Button>
                <Button variant="warning" className="w-full" onClick={handleCancelOccurrence}>Cancel Only This Occurrence</Button>
                <Button variant="danger" className="w-full" onClick={handleEndSeries}>Stop The Entire Recurring Series</Button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarView;