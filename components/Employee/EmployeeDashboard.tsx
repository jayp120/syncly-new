import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { EODReport, UserBadgeRecord, User, Task, LeaveRecord, Meeting } from '../../types';
import * as DataService from '../../services/dataService';
import { REPORTS_KEY, TASKS_KEY, LEAVE_RECORDS_KEY, USER_BADGES_KEY, ACTIVITY_LOG_KEY_PREFIX, MEETINGS_KEY } from '../../constants';
import PageContainer from '../Layout/PageContainer';
// FIX: Corrected react-router-dom import to use a standard named import.
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getLocalYYYYMMDD } from '../../utils/dateUtils';
import TimelineDisplay from '../Shared/TimelineDisplay';
import Spinner from '../Common/Spinner';
import eventBus from '../../services/eventBus';
import MyReportsList from './MyReportsList';
import EODReportForm from './EODReportForm';
import CalendarView from '../Shared/CalendarView';
import FutureLeaveManagementModal from './FutureLeaveManagementModal';
import MyPerformanceBadges from './MyPerformanceBadges';
import Leaderboard from '../Shared/Leaderboard';
import PinnedTasksCard from './PinnedTasksCard';
import EmployeeActionsCard from './EmployeeActionsCard';
import LeaveManagementCard from './LeaveManagementCard';

// --- Main Employee Dashboard Component ---

const EmployeeDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]); // Using any to avoid type explosion on local component
  const [badges, setBadges] = useState<UserBadgeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (currentUser && currentUser.roleName === 'Employee') {
      const startTime = performance.now();
      
      const [allTasksData, userBadges, userActivities] = await Promise.all([
        DataService.getTasks(),
        DataService.getUserBadges(currentUser.id),
        DataService.getUserActivityLog(currentUser.id),
      ]);
      
      const dataFetchTime = performance.now() - startTime;
      console.log(`📊 Dashboard data fetch: ${dataFetchTime.toFixed(0)}ms`);

      const userTasks = allTasksData.filter(t => t.assignedTo.includes(currentUser.id) || (t.isPersonalTask && t.createdBy === currentUser.id));
      setTasks(userTasks);
      setBadges(userBadges);

      const transformStart = performance.now();
      const timelinePromises = userActivities.map(activity => DataService.transformActivityToTimelineEvent(activity, currentUser));
      const resolvedEvents = await Promise.all(timelinePromises);
      const transformTime = performance.now() - transformStart;
      console.log(`🔄 Timeline transform: ${transformTime.toFixed(0)}ms`);
      
      setTimelineEvents(resolvedEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ Total dashboard load: ${totalTime.toFixed(0)}ms`);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));

    const keysToWatch = [REPORTS_KEY, TASKS_KEY, LEAVE_RECORDS_KEY, USER_BADGES_KEY, ACTIVITY_LOG_KEY_PREFIX + currentUser.id, MEETINGS_KEY];
    const handleDataChange = (data?: any) => {
      const keyChanged = data?.keyChanged;
      if (keysToWatch.some(k => keyChanged?.startsWith(k))) {
        fetchData();
      }
    };

    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => unsubscribe();
  }, [currentUser?.id, fetchData]);

  const handleUpdateTask = async (taskId: string, updatedFields: Partial<Task>) => {
    if (!currentUser) return;
    await DataService.updateTask(taskId, updatedFields, currentUser);
    // Data will be refetched via eventBus
  };
  
  if (!currentUser) return <Navigate to="/login" />;
  if (isLoading) return <PageContainer><Spinner message="Loading your dashboard..."/></PageContainer>;

  return (
    <>
      <PageContainer>
          <div className="space-y-6">
              {/* 1. Top Section: Impactful Card */}
              <EmployeeActionsCard 
                  currentUser={currentUser}
              />

              {/* 2. Middle Section (Split) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column */}
                  <div className="lg:col-span-3 space-y-6">
                      <PinnedTasksCard 
                        tasks={tasks}
                        currentUser={currentUser}
                        onUpdateTask={handleUpdateTask}
                        onViewTask={(task) => navigate(`/my-tasks?taskId=${task.id}`)}
                      />
                      <LeaveManagementCard 
                        currentUser={currentUser}
                        onManageFutureLeave={() => setIsLeaveModalOpen(true)}
                        onLeaveUpdated={fetchData}
                      />
                  </div>
                  {/* Right Column */}
                  <div className="lg:col-span-2">
                    <TimelineDisplay
                        title="Your Recent Activity"
                        events={timelineEvents}
                        isLoading={isLoading}
                        maxHeight="max-h-96"
                    />
                  </div>
              </div>

              {/* 3. Performance Badges */}
              <MyPerformanceBadges earnedBadges={badges} />

              {/* 4. Leaderboard */}
              <Leaderboard />
          </div>

      </PageContainer>
      <FutureLeaveManagementModal 
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        currentUser={currentUser}
        onLeaveManaged={fetchData}
      />
    </>
  );
};

export default EmployeeDashboard;

// --- Sub-page Wrapper Components for Routing ---

export const EmployeeMyReportsPage: React.FC = () => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    return <PageContainer title="My EOD Reports"><MyReportsList currentUser={currentUser} /></PageContainer>;
};

export const EmployeeSubmitEODPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { forDate: forDateParam } = useParams<{ forDate?: string }>();

    if (!currentUser) return <Navigate to="/login" />;
    
    const reportDate = (forDateParam === 'today' || !forDateParam || !/^\d{4}-\d{2}-\d{2}$/.test(forDateParam))
        ? getLocalYYYYMMDD(new Date())
        : forDateParam;

    return <PageContainer><EODReportForm currentUser={currentUser} reportDate={reportDate} /></PageContainer>;
};

export const EmployeeEditEODPage: React.FC = () => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/my-reports" />;
    // EODReportForm handles fetching the report by ID from the URL params internally
    return <PageContainer><EODReportForm currentUser={currentUser} reportDate="" /></PageContainer>;
};

export const EmployeeCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [reports, setReports] = useState<EODReport[]>([]);
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (currentUser) {
            const [userReports, userLeaves, userMeetings] = await Promise.all([
                DataService.getReportsByEmployee(currentUser.id),
                DataService.getLeaveRecordsByEmployee(currentUser.id),
                DataService.getMeetingsForUser(currentUser.id)
            ]);
            setReports(userReports);
            setLeaveRecords(userLeaves);
            setMeetings(userMeetings);
        }
    }, [currentUser]);

    useEffect(() => {
        setIsLoading(true);
        fetchData().finally(() => setIsLoading(false));
    }, [fetchData]);

    if (!currentUser) return null;
    if (isLoading) return <PageContainer title="My Calendar"><Spinner message="Loading calendar data..." /></PageContainer>;

    return (
        <PageContainer title="My Calendar">
            <CalendarView 
                reports={reports} 
                meetings={meetings}
                currentUser={currentUser} 
                leaveRecords={leaveRecords} 
                onReportUpdate={fetchData} 
            />
        </PageContainer>
    );
};