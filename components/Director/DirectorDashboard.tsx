import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { User, EODReport, LeaveRecord, TimelineEvent, Task, TaskStatus, Meeting, UserStatus, BusinessUnit } from '../../types';
import * as DataService from '../../services/dataService';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { Link, Navigate, useNavigate } from "react-router-dom";
import Leaderboard from '../Shared/Leaderboard';
import TodaysLeaveStatusCard from '../Manager/TodaysLeaveStatusCard';
import WeeklyOffRestingCard from '../Manager/WeeklyOffRestingCard';
import ReportDetailModal from '../Shared/ReportDetailModal';
import { LEAVE_RECORDS_KEY, ACTIVITY_LOG_KEY_PREFIX, REPORTS_KEY, TASKS_KEY, ANNOUNCEMENTS_KEY } from '../../constants';
import { formatDateTimeDDMonYYYYHHMM, getNextOccurrence, formatDateDDMonYYYY } from '../../utils/dateUtils';
import TimelineDisplay from '../Shared/TimelineDisplay';
import Spinner from '../Common/Spinner';
import SmartMeetingModal from '../Manager/SmartMeetingModal';
import MeetingTypeSelectorModal from '../Manager/MeetingTypeSelectorModal';
import Modal from '../Common/Modal';
import ScheduleMeetingForm from '../Manager/ScheduleMeetingForm';
import eventBus from '../../services/eventBus';
import PerformanceSnapshotCard from '../Manager/PerformanceSnapshotCard';
import Select from '../Common/Select';

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

const DirectorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allReports, setAllReports] = useState<EODReport[]>([]);
  const [allLeaveRecords, setAllLeaveRecords] = useState<LeaveRecord[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [pinnedTasks, setPinnedTasks] = useState<Task[]>([]);

  const [selectedReportDetail, setSelectedReportDetail] = useState<EODReport | null>(null);
  const [teamTimelineEvents, setTeamTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [meetingModalType, setMeetingModalType] = useState<'selector' | 'live' | 'formal' | null>(null);
  
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string>('');
  
  const navigate = useNavigate();
  
  const activeEmployees = useMemo(() => {
    return allUsers.filter(u => u.roleName === 'Employee' && u.status === UserStatus.ACTIVE);
  }, [allUsers]);

  const filteredEmployees = useMemo(() => {
    if (!selectedBusinessUnitId) return activeEmployees;
    return activeEmployees.filter(u => u.businessUnitId === selectedBusinessUnitId);
  }, [activeEmployees, selectedBusinessUnitId]);

  const businessUnitOptions = useMemo(() => {
    return [{ value: '', label: 'All Business Units' }, ...allBusinessUnits.filter(bu => bu.status === 'active').map(bu => ({ value: bu.id, label: bu.name }))];
  }, [allBusinessUnits]);

  const fetchData = useCallback(async () => {
    if (currentUser && DataService.isDirector(currentUser.roleName)) {
      const [users, reports, leaves, tasks, meetings, businessUnits] = await Promise.all([
        DataService.getUsers(),
        DataService.getReports(),
        DataService.getLeaveRecords(),
        DataService.getTasks(),
        DataService.getMeetings(),
        DataService.getBusinessUnits(),
      ]);
      setAllUsers(users);
      setAllReports(reports);
      setAllLeaveRecords(leaves);
      setAllMeetings(meetings);
      setAllBusinessUnits(businessUnits);

      const timelineRoles = ['Employee', 'Manager', 'Team Lead'];
      const timelineSourceIds = users
        .filter(u => u.roleName && timelineRoles.includes(u.roleName) && !u.isSuspended)
        .map(u => u.id);
      const directorAndTeamIds = Array.from(new Set([...timelineSourceIds, currentUser.id]));

      const relevantTasks = tasks.filter(
        t => t.createdBy === currentUser.id || t.assignedTo.some(id => timelineSourceIds.includes(id))
      );
      setAllTasks(relevantTasks);
      setPinnedTasks(
        relevantTasks
          .filter(t => t.pinnedBy.includes(currentUser.id))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      );

      const activityLogs = await Promise.all(directorAndTeamIds.map(id => DataService.getUserActivityLog(id)));
      const combinedLogs = activityLogs.flat().sort((a, b) => b.timestamp - a.timestamp);

      const uniqueLogs = Array.from(new Map(combinedLogs.map(item => [item.id, item])).values());
      const timelineEventPromises = uniqueLogs.slice(0, 50).map(log => DataService.transformActivityToTimelineEvent(log, currentUser));
      const resolvedTimelineEvents = await Promise.all(timelineEventPromises);
      setTeamTimelineEvents(resolvedTimelineEvents.sort((a,b) => b.timestamp - a.timestamp).slice(0,25));
    }
  }, [currentUser]);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));

    const keysToWatch = [REPORTS_KEY, LEAVE_RECORDS_KEY, TASKS_KEY, ACTIVITY_LOG_KEY_PREFIX, ANNOUNCEMENTS_KEY];
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
    fetchData();
    setMeetingModalType(null);
    navigate(`/meetings/${meeting.id}`);
  };

  const recurringMeetings = useMemo(() => {
      if (!currentUser) return [];
      return allMeetings.filter(m => m.createdBy === currentUser.id && m.recurrenceRule && m.recurrenceRule !== 'none');
  }, [allMeetings, currentUser]);
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (!DataService.isDirector(currentUser.roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
      return <PageContainer title="Director Dashboard"><Spinner message="Loading dashboard data..."/></PageContainer>
  }

  const managementTools = [
    { label: 'Manage Reports', path: '/manage-reports', icon: 'fa-file-signature', color: 'bg-blue-100 dark:bg-dark-surface-secondary text-blue-600 dark:text-sky-400', hoverColor: 'hover:bg-blue-600 dark:hover:bg-sky-500' },
    { label: 'Team Tasks', path: '/team-tasks', icon: 'fa-users-cog', color: 'bg-teal-50 dark:bg-dark-surface-secondary text-teal-600 dark:text-teal-400', hoverColor: 'hover:bg-teal-600 dark:hover:bg-teal-500' },
    { label: 'Consistency Tracker', path: '/delinquent-reports', icon: 'fa-bell', color: 'bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400', hoverColor: 'hover:bg-orange-600 dark:hover:bg-orange-800/60' },
    { label: 'Calendar View', path: '/calendar-view', icon: 'fa-calendar-alt', color: 'bg-indigo-50 dark:bg-dark-surface-secondary text-indigo-600 dark:text-indigo-400', hoverColor: 'hover:bg-indigo-600 dark:hover:bg-indigo-500' },
  ];
  
  return (
    <PageContainer title={`${getGreeting()}, ${currentUser.name}!`}>
      <MeetingTypeSelectorModal
        isOpen={meetingModalType === 'selector'}
        onClose={() => setMeetingModalType(null)}
        onSelect={(type) => setMeetingModalType(type)}
      />
      
      <SmartMeetingModal 
        isOpen={meetingModalType === 'live'} 
        onClose={() => setMeetingModalType(null)}
        manager={currentUser}
        teamMembers={filteredEmployees}
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
          teamMembers={filteredEmployees}
          onSuccess={handleMeetingSuccess}
          onCancel={() => setMeetingModalType(null)}
        />
      </Modal>

      <div className="mb-6">
        <Card title="🏢 Business Unit Filter">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedBusinessUnitId}
                onChange={(e) => setSelectedBusinessUnitId(e.target.value)}
                options={businessUnitOptions}
                label="Filter by Business Unit"
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 pt-6">
              {selectedBusinessUnitId 
                ? `Showing ${filteredEmployees.length} employee(s) from ${allBusinessUnits.find(bu => bu.id === selectedBusinessUnitId)?.name || 'selected unit'}`
                : `Showing all ${activeEmployees.length} employee(s) across all business units`
              }
            </div>
          </div>
        </Card>
      </div>

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
            teamMembers={filteredEmployees}
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
        
        <TimelineDisplay title="Organization Activity" events={teamTimelineEvents} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TodaysLeaveStatusCard
          allUsers={filteredEmployees.length > 0 ? filteredEmployees : activeEmployees}
          allLeaveRecords={allLeaveRecords}
          onLeaveUpdated={fetchData}
          scope="tenant"
        />
        <WeeklyOffRestingCard
          allUsers={filteredEmployees.length > 0 ? filteredEmployees : activeEmployees}
          scope="tenant"
        />
      </div>

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

export default DirectorDashboard;
