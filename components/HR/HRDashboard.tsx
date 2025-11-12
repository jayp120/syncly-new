import React, { useEffect, useMemo, useState } from 'react';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { useAuth } from '../Auth/AuthContext';
import { Announcement, EODReport, LeaveRecord, Task, TaskStatus, User } from '../../types';
import * as DataService from '../../services/dataService';
import Spinner from '../Common/Spinner';
import PerformanceSnapshotCard from '../Manager/PerformanceSnapshotCard';
import TodaysLeaveStatusCard from '../Manager/TodaysLeaveStatusCard';
import WeeklyOffRestingCard from '../Manager/WeeklyOffRestingCard';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';

const HRDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<EODReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);

  const quickActions = [
    {
      label: 'Plan Announcement',
      description: 'Broadcast org-wide updates',
      icon: 'fa-bullhorn',
      color: 'bg-gradient-to-br from-primary/80 via-sky-500 to-cyan-500 text-white',
      hoverColor: 'hover:opacity-90',
      path: '/announcements',
    },
    {
      label: 'Attendance Pulse',
      description: 'Monitor leaves & weekly offs',
      icon: 'fa-calendar-check',
      color: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white',
      hoverColor: 'hover:opacity-90',
      path: '/admin/leave-records',
    },
    {
      label: 'Consistency Tracker',
      description: 'Spot delinquent reporting',
      icon: 'fa-route',
      color: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white',
      hoverColor: 'hover:opacity-90',
      path: '/delinquent-reports',
    },
    {
      label: 'HR Taskboard',
      description: 'Follow up on policy work',
      icon: 'fa-list-check',
      color: 'bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white',
      hoverColor: 'hover:opacity-90',
      path: '/team-tasks',
    },
  ];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [announcementData, userData, reportData, taskData, leaveData] = await Promise.all([
          DataService.getAnnouncements(),
          DataService.getUsers(),
          DataService.getReports(),
          DataService.getTasks(),
          DataService.getLeaveRecords(),
        ]);
        setAnnouncements(announcementData);
        setUsers(userData);
        setReports(reportData);
        setTasks(taskData);
        setLeaves(leaveData);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const announcementStats = useMemo(() => {
    const active = announcements.filter((a) => a.status === 'active');
    const upcoming = announcements.filter((a) => a.status === 'scheduled');
    const expired = announcements.filter((a) => a.status === 'expired');
    return { active, upcoming, expired };
  }, [announcements]);

  const activeEmployees = useMemo(() => users.filter((user) => user.roleName === 'Employee'), [users]);

  if (isLoading || !currentUser) {
    return (
      <PageContainer title="HR Command Center">
        <div className="flex justify-center py-20">
          <Spinner message="Preparing insights..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="HR Command Center"
      description="Monitor wellbeing, attendance, and announcements across the organization."
      action={
        <Link to="/announcements">
          <Button>
            <i className="fas fa-bullhorn mr-2" />
            Manage Announcements
          </Button>
        </Link>
      }
    >
      <Card title="HR Quick Actions" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className={`group flex flex-col h-full rounded-2xl p-4 transition-all duration-300 ${action.color} ${action.hoverColor} transform hover:-translate-y-1 hover:shadow-2xl`}
            >
              <div className="flex items-center justify-between">
                <i className={`fas ${action.icon} text-2xl group-hover:scale-110 transition-transform`} />
                <span className="text-xs uppercase tracking-[0.3em] opacity-70">Go</span>
              </div>
              <div className="mt-6">
                <p className="text-lg font-semibold">{action.label}</p>
                <p className="text-sm opacity-80">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Active Announcements">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{announcementStats.active.length}</p>
          {announcementStats.active.slice(0, 2).map((announcement) => (
            <p key={announcement.id} className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {announcement.title} • active until {formatDateTimeDDMonYYYYHHMM(new Date(announcement.endsAt))}
            </p>
          ))}
        </Card>
        <Card title="Upcoming Campaigns">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{announcementStats.upcoming.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Next launch:{' '}
            {announcementStats.upcoming[0]
              ? formatDateTimeDDMonYYYYHHMM(new Date(announcementStats.upcoming[0].startsAt))
              : 'TBD'}
          </p>
        </Card>
        <Card title="Pending Tasks">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {tasks.filter((task) => task.status !== TaskStatus.Completed && !task.isPersonalTask).length}
          </p>
          <Link to="/team-tasks" className="text-sm text-primary hover:underline">
            Go to My Tasks
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="h-full">
          <PerformanceSnapshotCard
            teamMembers={activeEmployees}
            allReports={reports}
            allTasks={tasks}
            allLeaveRecords={leaves}
          />
        </div>
        <div className="h-full">
          <TodaysLeaveStatusCard
            allUsers={users}
            allLeaveRecords={leaves}
            onLeaveUpdated={async () => {
              const freshLeaves = await DataService.getLeaveRecords();
              setLeaves(freshLeaves);
            }}
            scope="tenant"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-full">
          <WeeklyOffRestingCard allUsers={users} scope="tenant" />
        </div>
        <Card title="Announcement Health">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active campaigns</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{announcementStats.active.length}</p>
              </div>
              <Button onClick={() => navigate('/announcements')}>
                <i className="fas fa-plus mr-2" />
                New announcement
              </Button>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Highlights</p>
              {announcementStats.active.slice(0, 2).map((announcement) => (
                <p key={announcement.id} className="text-sm text-slate-600 dark:text-slate-300">
                  {announcement.title} — ends {formatDateTimeDDMonYYYYHHMM(new Date(announcement.endsAt))}
                </p>
              ))}
              {announcementStats.active.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No live announcements right now.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default HRDashboard;
