import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { User, EODReport, ReportStatus, LeaveRecord, Notification as AppNotification, ActivityLogItem, TimelineEvent, DateRange, ActivityLogActionType, Task, TaskStatus, Meeting, UserStatus } from '../../types';

import * as DataService from '../../services/dataService';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
// FIX: Corrected react-router-dom import to use a standard named import.
import { Link, Navigate, useNavigate } from "react-router-dom";
import Leaderboard from '../Shared/Leaderboard';
import TodaysLeaveStatusCard from './TodaysLeaveStatusCard';
import WeeklyOffRestingCard from './WeeklyOffRestingCard';
import ReportDetailModal from '../Shared/ReportDetailModal';
import { LEAVE_RECORDS_KEY, ACTIVITY_LOG_KEY_PREFIX, REPORTS_KEY, TASKS_KEY } from '../../constants';
import { formatDateTimeDDMonYYYYHHMM, getLocalYYYYMMDD, getNextOccurrence, formatDateDDMonYYYY } from '../../utils/dateUtils';
import TimelineDisplay from '../Shared/TimelineDisplay';
import Spinner from '../Common/Spinner';
import ReportList from './ReportList';
import DelinquentEmployeeList from './DelinquentEmployeeList';
import TriggerLogView from './TriggerLogView';
import CalendarView from '../Shared/CalendarView';
import SmartMeetingModal from './SmartMeetingModal';
import MeetingTypeSelectorModal from './MeetingTypeSelectorModal';
import Modal from '../Common/Modal';
import ScheduleMeetingForm from './ScheduleMeetingForm';
import eventBus from '../../services/eventBus';
import PerformanceHub from './PerformanceHub';
import PerformanceSnapshotCard from './PerformanceSnapshotCard';
import Select from '../Common/Select';
import Input from '../Common/Input';

// --- Recurring Meeting Card for Dashboard ---
const RecurringMeetingCard: React.FC<{meeting: Meeting, tasks: Task[], onStart: (id: string) => void}> = ({ meeting, tasks, onStart }) => {
    const nextOccurrence = getNextOccurrence(meeting);
    const pendingTasks = tasks.filter(t => t.meetingId === meeting.id && t.status !== TaskStatus.Completed);

    if (!nextOccurrence) return null;

    return (
        <Card className="!p-0">
            <div className="p-4">
                <h4 className="font-semibold text-primary dark:text-sky-400">{meeting.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Next: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTimeDDMonYYYYHHMM(nextOccurrence)}</span>
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-secondary dark:text-slate-200">
                        {pendingTasks.length} pending action item(s)
                    </span>
                    <Link to={`/meetings/${meeting.id}`} className="text-xs text-primary hover:underline">View Workspace</Link>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-b-xl">
                 <Button onClick={() => onStart(meeting.id)} variant="secondary" size="sm" className="w-full">
                    <i className="fas fa-bolt mr-2"></i> Start Live Session
                </Button>
            </div>
        </Card>
    );
};


const ManagerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  // State for all data
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allReports, setAllReports] = useState<EODReport[]>([]);
  const [allLeaveRecords, setAllLeaveRecords] = useState<LeaveRecord[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [pinnedTasks, setPinnedTasks] = useState<Task[]>([]);

  // State for UI
  const [selectedReportDetail, setSelectedReportDetail] = useState<EODReport | null>(null);
  const [teamTimelineEvents, setTeamTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [meetingModalType, setMeetingModalType] = useState<'selector' | 'live' | 'formal' | null>(null);
  
  const navigate = useNavigate();
  
  // State for Activity Feed Filtering
  const [activityFilters, setActivityFilters] = useState<{
      type: string;
      userId: string;
      dateRange: { start: string | null; end: string | null; };
  }>({ type: '', userId: '', dateRange: { start: null, end: null } });
  
  const teamMemberOptions = useMemo(() => {
    return [{ value: '', label: 'All Team Members' }, ...allUsers.filter(u => u.businessUnitId === currentUser?.businessUnitId && u.roleName === 'Employee' && u.status === UserStatus.ACTIVE).map(u => ({ value: u.id, label: u.name }))];
  }, [allUsers, currentUser]);

  const activityTypeOptions = useMemo(() => {
      const allTypes = Object.values(ActivityLogActionType);
      const uniqueTypes = [...new Set(allTypes)];
      return [{ value: '', label: 'All Action Types' }, ...uniqueTypes.map(type => ({ value: type, label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) }))];
  }, []);


const fetchData = useCallback(async () => {
    if (currentUser && currentUser.roleName === 'Manager') {
      const [users, reports, leaves, tasks, meetings] = await Promise.all([
        DataService.getUsers(),
        DataService.getReports(),
        DataService.getLeaveRecords(),
        DataService.getTasks(),
        DataService.getMeetings(),
      ]);
      setAllUsers(users);
      setAllReports(reports);
      setAllLeaveRecords(leaves);
      setAllMeetings(meetings);
      
      const teamMemberIds = users.filter(u => u.businessUnitId === currentUser.businessUnitId && u.roleName === 'Employee' && !u.isSuspended).map(u => u.id);
      const managerAndTeamIds = [...teamMemberIds, currentUser.id];
      
      const relevantTasks = tasks.filter(t => t.createdBy === currentUser.id || t.assignedTo.some(id => teamMemberIds.includes(id)));
      setAllTasks(relevantTasks);
      setPinnedTasks(relevantTasks.filter(t => t.pinnedBy.includes(currentUser.id)).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));

      const activityLogs = await Promise.all(managerAndTeamIds.map(id => DataService.getUserActivityLog(id)));
      const combinedLogs = activityLogs.flat().sort((a, b) => b.timestamp - a.timestamp);
      
      const filteredLogs = combinedLogs.filter(log => {
          const matchesType = !activityFilters.type || log.type === activityFilters.type;
          const matchesUser = !activityFilters.userId || log.actorId === activityFilters.userId || log.targetUserId === activityFilters.userId;
          const logDate = new Date(log.timestamp);
          const startDate = activityFilters.dateRange.start ? new Date(activityFilters.dateRange.start) : null;
          const endDate = activityFilters.dateRange.end ? new Date(activityFilters.dateRange.end) : null;
          if(startDate) startDate.setHours(0,0,0,0);
          if(endDate) endDate.setHours(23,59,59,999);
          
          const matchesDate = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
          
          return matchesType && matchesUser && matchesDate;
      });

      const uniqueLogs = Array.from(new Map(filteredLogs.map(item => [item.id, item])).values());
      const timelineEventPromises = uniqueLogs.slice(0, 50).map(log => DataService.transformActivityToTimelineEvent(log, currentUser));
      const resolvedTimelineEvents = await Promise.all(timelineEventPromises);
      setTeamTimelineEvents(resolvedTimelineEvents.sort((a,b) => b.timestamp - a.timestamp).slice(0,25));
    }
  }, [currentUser, activityFilters]);

  const refreshLeaveRecords = useCallback(async () => {
    if (!currentUser || currentUser.roleName !== 'Manager') return;
    const leaves = await DataService.getLeaveRecords();
    setAllLeaveRecords(leaves);
  }, [currentUser]);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));

    const keysToWatch = [REPORTS_KEY, LEAVE_RECORDS_KEY, TASKS_KEY, ACTIVITY_LOG_KEY_PREFIX];
    const handleDataChange = (data?: any) => {
        const keyChanged = data?.keyChanged;
        if(keyChanged?.startsWith(keysToWatch.find(k => keyChanged.startsWith(k)) || '')) {
            fetchData();
        }
    };
    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => unsubscribe();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleMeetingSuccess = (meeting: Meeting) => {
    fetchData(); // Refresh all data
    setMeetingModalType(null); // Close all modals
    navigate(`/meetings/${meeting.id}`); // Navigate to the new workspace
  };

  const recurringMeetings = useMemo(() => {
      if (!currentUser) return [];
      return allMeetings.filter(m => m.createdBy === currentUser.id && m.recurrenceRule && m.recurrenceRule !== 'none');
  }, [allMeetings, currentUser]);

  const meetingInviteCandidates = useMemo(() => {
      if (!currentUser) return [];
      return allUsers.filter(user =>
        user.status === UserStatus.ACTIVE &&
        user.tenantId === currentUser.tenantId &&
        !user.isPlatformAdmin &&
        user.id !== currentUser.id
      );
  }, [allUsers, currentUser]);
  
  if (!currentUser) return <Navigate to="/login" replace />;

  if (isLoading) {
      return <PageContainer title="Manager Dashboard"><Spinner message="Loading dashboard data..."/></PageContainer>
  }

  const managementTools = [
    { label: 'Manage Reports', path: '/manage-reports', icon: 'fa-file-signature', color: 'bg-blue-100 dark:bg-dark-surface-secondary text-blue-600 dark:text-sky-400', hoverColor: 'hover:bg-blue-600 dark:hover:bg-sky-500' },
    { label: 'Team Tasks', path: '/team-tasks', icon: 'fa-users-cog', color: 'bg-teal-50 dark:bg-dark-surface-secondary text-teal-600 dark:text-teal-400', hoverColor: 'hover:bg-teal-600 dark:hover:bg-teal-500' },
    { label: 'Consistency Tracker', path: '/delinquent-reports', icon: 'fa-bell', color: 'bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400', hoverColor: 'hover:bg-orange-600 dark:hover:bg-orange-800/60' },
    { label: 'Calendar View', path: '/calendar-view', icon: 'fa-calendar-alt', color: 'bg-indigo-50 dark:bg-dark-surface-secondary text-indigo-600 dark:text-indigo-400', hoverColor: 'hover:bg-indigo-600 dark:hover:bg-indigo-500' },
  ];
  
  return (
    <PageContainer title={`${getGreeting()}, ${currentUser.name}!`}>
      {/* Meeting Modals */}
      <MeetingTypeSelectorModal
        isOpen={meetingModalType === 'selector'}
        onClose={() => setMeetingModalType(null)}
        onSelect={(type) => setMeetingModalType(type)}
      />
      
      <SmartMeetingModal 
        isOpen={meetingModalType === 'live'} 
        onClose={() => setMeetingModalType(null)}
        manager={currentUser}
        teamMembers={meetingInviteCandidates}
        onSuccess={handleMeetingSuccess}
      />

      <Modal
        isOpen={meetingModalType === 'formal'}
        onClose={() => setMeetingModalType(null)}
        title="Schedule Formal Meeting"
        size="lg"
      >
        <ScheduleMeetingForm
          manager={currentUser}
          teamMembers={meetingInviteCandidates}
          onSuccess={handleMeetingSuccess}
          onCancel={() => setMeetingModalType(null)}
        />
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="🛠️ Management Toolkit">
          <div className="grid grid-cols-2 gap-4 mb-4">
              {managementTools.map((tool) => (
                  <Link
                      key={tool.label}
                      to={tool.path}
                      className={`group flex flex-col items-center justify-center text-center p-4 rounded-xl ${tool.color} ${tool.hoverColor} hover:text-white dark:hover:text-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg`}
                  >
                      <i className={`fas ${tool.icon} text-3xl mb-2 transition-all duration-300 group-hover:scale-110`}></i>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-white transition-colors duration-300">{tool.label}</span>
                  </Link>
              ))}
          </div>
          
          <button
            onClick={() => setMeetingModalType('selector')}
            className="w-full bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <i className="fas fa-plus text-lg"></i>
            <span>Plan a New Meeting</span>
          </button>
        </Card>

        <PerformanceSnapshotCard
            teamMembers={allUsers.filter(u => u.roleName === 'Employee' && u.businessUnitId === currentUser.businessUnitId && u.status === UserStatus.ACTIVE)}
            allReports={allReports}
            allTasks={allTasks}
            allLeaveRecords={allLeaveRecords}
        />
      </div>
      
       {recurringMeetings.length > 0 && (
          <Card title="🔄 Upcoming Recurring Meetings" className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recurringMeetings.map(meeting => (
                      <RecurringMeetingCard 
                          key={meeting.id}
                          meeting={meeting}
                          tasks={allTasks}
                          onStart={(id) => navigate(`/meetings/${id}`)}
                      />
                  ))}
              </div>
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="📌 Pinned Tasks">
            {pinnedTasks.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {pinnedTasks.map(task => (
                        <Link to={`/team-tasks?taskId=${task.id}`} key={task.id} className="block p-3 bg-white dark:bg-slate-800/60 rounded-md shadow-sm hover:shadow-md transition-shadow hover:bg-slate-50 dark:hover:bg-slate-800">
                            <div className="flex justify-between items-start">
                               <p className="font-semibold text-primary dark:text-sky-400 truncate pr-2">{task.title}</p>
                               <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === TaskStatus.Completed ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>{task.status}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due: {formatDateDDMonYYYY(task.dueDate)}</p>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">Pin important tasks from the 'Team Tasks' page to see them here.</p>
            )}
        </Card>
        
        <TimelineDisplay title="Recent Team Activity" events={teamTimelineEvents} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TodaysLeaveStatusCard
          allUsers={allUsers.filter(u => u.businessUnitId === currentUser.businessUnitId)}
          allLeaveRecords={allLeaveRecords}
          onLeaveUpdated={refreshLeaveRecords}
        />
        <WeeklyOffRestingCard
          allUsers={allUsers.filter(u => u.businessUnitId === currentUser.businessUnitId)}
        />
      </div>

      {/* Monthly Leaderboard */}
      <Leaderboard />

      {selectedReportDetail && (
        <ReportDetailModal 
          report={selectedReportDetail} 
          isOpen={!!selectedReportDetail} 
          onClose={() => setSelectedReportDetail(null)} 
          currentUser={currentUser} 
          onReportUpdate={(updatedReport) => {
              setAllReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
              setSelectedReportDetail(updatedReport);
          }}
        />
      )}
    </PageContainer>
  );
};

export default ManagerDashboard;

// FIX: Export page components for routing in App.tsx.
// --- Sub-page Wrapper Components for Routing ---

export const ManagerReportListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        DataService.getUsers().then(users => {
            setAllUsers(users);
            setIsLoading(false);
        });
    }, []);

    if (!currentUser) return <Navigate to="/login" />;
    if (isLoading) return <PageContainer title="Manage Team Reports"><Spinner message="Loading users..." /></PageContainer>;

    return <PageContainer title="Manage Team Reports"><ReportList currentUser={currentUser} allUsers={allUsers} /></PageContainer>;
};

export const ManagerDelinquentPage: React.FC = () => {
    return <PageContainer title="Reporting Consistency Tracker"><DelinquentEmployeeList /></PageContainer>;
};

export const ManagerCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [allReports, setAllReports] = useState<EODReport[]>([]);
    const [allLeaveRecords, setAllLeaveRecords] = useState<LeaveRecord[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const teamMemberIds = useMemo(() => {
        if (!currentUser) return [];
        return allUsers.filter(u => u.businessUnitId === currentUser.businessUnitId && u.roleName === 'Employee').map(u => u.id);
    }, [allUsers, currentUser]);

    const fetchData = useCallback(async () => {
        if (currentUser) {
            const [users, reports, leaves, meetings] = await Promise.all([
                DataService.getUsers(),
                DataService.getReports(),
                DataService.getLeaveRecords(),
                DataService.getMeetings(),
            ]);
            setAllUsers(users);
            setAllReports(reports);
            setAllLeaveRecords(leaves);
            setAllMeetings(meetings);
        }
    }, [currentUser]);

    useEffect(() => {
        setIsLoading(true);
        fetchData().finally(() => setIsLoading(false));
    }, [fetchData]);

    if (!currentUser) return null;
    if (isLoading) return <PageContainer title="Team Calendar"><Spinner message="Loading calendar data..." /></PageContainer>;
    
    // Filter data for the manager's team
    const teamReports = allReports.filter(r => teamMemberIds.includes(r.employeeId));
    const teamLeaves = allLeaveRecords.filter(l => teamMemberIds.includes(l.employeeId));
    const teamMeetings = allMeetings.filter(m => m.createdBy === currentUser.id || m.attendeeIds.some(id => teamMemberIds.includes(id)));

    return (
        <PageContainer title="Team Calendar">
            <CalendarView 
                reports={teamReports} 
                meetings={teamMeetings}
                currentUser={currentUser} 
                allUsersForFilter={allUsers.filter(u => u.businessUnitId === currentUser.businessUnitId)}
                leaveRecords={teamLeaves}
                onReportUpdate={fetchData} 
            />
        </PageContainer>
    );
};

export const ManagerPerformanceHubPage: React.FC = () => {
    return <PageContainer title="Performance Hub"><PerformanceHub /></PageContainer>;
};
