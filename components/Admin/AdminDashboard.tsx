import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { User, EODReport, ReportStatus, Permission, ActivityLogItem, TimelineEvent } from '../../types';
import * as DataService from '../../services/dataService';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import * as ReactRouterDom from "react-router-dom";
const { Link, Navigate } = ReactRouterDom;
import UserManagementTable from './UserManagementTable';
import AdminReportView from './AdminReportView';
import TriggerLogView from '../Manager/TriggerLogView'; 
import BusinessUnitManagement from './BusinessUnitManagement'; 
import AdminLeaveManagementPage from './AdminLeaveManagementPage'; 
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RolesPermissionsPage from './RolesPermissionsPage';
import TimelineDisplay from '../Shared/TimelineDisplay';


const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    reportsByDay: [] as {name: string, reports: number}[],
    totalBusinessUnits: 0,
    totalLeaveRecords: 0,
  });
  const [systemTimelineEvents, setSystemTimelineEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!currentUser) return; // Guard: only fetch when user is authenticated
    
    const fetchStats = async () => {
        const users = await DataService.getUsers();
        const reports = await DataService.getReports();
        const businessUnits = await DataService.getBusinessUnits();
        const leaveRecords = await DataService.getLeaveRecords();
        const allActivityLogs = await DataService.getAllActivityLogs();
        
        const reportsByDayData: {[key: string]: number} = {};
        const today = new Date();
        for(let i=6; i>=0; i--){
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dayKey = d.toLocaleDateString('en-US', { weekday: 'short'}); 
            reportsByDayData[dayKey] = 0;
        }
        
        const dayLabelsInOrder: string[] = [];
        for(let i=6; i>=0; i--){ 
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dayLabelsInOrder.push(d.toLocaleDateString('en-US', { weekday: 'short'}));
        }

        reports.forEach(report => {
            if (report.versions && report.versions.length > 0) {
                const reportDateObj = new Date(report.date + 'T00:00:00Z');
                const timeDiff = today.getTime() - reportDateObj.getTime();
                const daysAgo = Math.floor(timeDiff / (1000 * 3600 * 24));

                if (daysAgo >=0 && daysAgo < 7) { 
                    const dayKey = reportDateObj.toLocaleDateString('en-US', { weekday: 'short'});
                    if(reportsByDayData[dayKey] !== undefined) { 
                        reportsByDayData[dayKey]++;
                    }
                }
            }
        });
        
        const finalChartData = dayLabelsInOrder.map(label => ({
            name: label,
            reports: reportsByDayData[label] || 0
        }));

        setStats({
          totalUsers: users.length,
          totalReports: reports.length,
          pendingReports: reports.filter(r => r.status === ReportStatus.PENDING_ACKNOWLEDGMENT).length,
          reportsByDay: finalChartData,
          totalBusinessUnits: businessUnits.length,
          totalLeaveRecords: leaveRecords.length,
        });
        
        // Transform activity logs to timeline events for display (safe now with guard)
        const timelinePromises = allActivityLogs.slice(0, 25).map(log => DataService.transformActivityToTimelineEvent(log, currentUser));
        const resolvedEvents = await Promise.all(timelinePromises);
        setSystemTimelineEvents(resolvedEvents.sort((a, b) => b.timestamp - a.timestamp));
    };
    fetchStats();
  }, [currentUser]);

  if (!currentUser) return <Navigate to="/login" replace />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const QuickStatsCard: React.FC = () => (
    <Card title="System Overview" titleIcon={<i className="fas fa-server"></i>}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-sky-50 dark:bg-sky-500/10 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{stats.totalUsers}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">Total Users</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalBusinessUnits}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">Business Units</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalReports}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">Total Reports</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingReports}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">Pending Ack.</p>
            </div>
             <div className="bg-teal-50 dark:bg-teal-500/10 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{stats.totalLeaveRecords}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">Total Leave Records</p>
            </div>
        </div>
    </Card>
  );
  
  /*
  const ReportsChartCard: React.FC = () => {
    const [tickFill, setTickFill] = useState('#666666');
    
    useEffect(() => {
        const updateColor = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setTickFill(isDark ? '#94a3b8' : '#6b7280');
        };
        updateColor();
        const observer = new MutationObserver(updateColor);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return (
    <Card title="Reports Activity (Last 7 Days)" titleIcon={<i className="fas fa-chart-bar"></i>}>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={stats.reportsByDay} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fill: tickFill }} className="text-xs" />
                    <YAxis allowDecimals={false} tick={{ fill: tickFill }} className="text-xs" />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: document.documentElement.classList.contains('dark') ? 'rgb(30 41 59)' : 'white',
                            border: '1px solid #334155',
                            color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#333333'
                        }} 
                        cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                    />
                    <Legend wrapperStyle={{ color: tickFill }} />
                    <Bar dataKey="reports" fill="#3b82f6" name="Reports Submitted" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
    );
  };
  */

  return (
    <PageContainer title={`${getGreeting()}, ${currentUser.name}!`}>
      <div className="space-y-6">
            <QuickStatsCard />
            {/* <ReportsChartCard /> */}
            
            {/* Universal Activity Log */}
            <TimelineDisplay 
              title="System Activity Log" 
              events={systemTimelineEvents}
            />
            
            <Card title="Admin Tools" titleIcon={<i className="fas fa-tools"></i>}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button to="/user-management" variant="primary" size="lg" className="w-full" icon={<i className="fas fa-users-cog"></i>}>
                        Manage Users
                    </Button>
                     <Button to="/roles-permissions" variant="primary" size="lg" className="w-full" icon={<i className="fas fa-user-shield"></i>}>
                        Roles & Permissions
                    </Button>
                    <Button to="/manage-business-units" variant="primary" size="lg" className="w-full" icon={<i className="fas fa-briefcase"></i>}>
                        Manage Business Units
                    </Button>
                    <Button to="/all-reports" variant="secondary" size="lg" className="w-full" icon={<i className="fas fa-archive"></i>}>
                        View All Reports
                    </Button>
                    <Button to="/admin-trigger-log" variant="ghost" size="lg" className="w-full" icon={<i className="fas fa-history"></i>}>
                        View Trigger Log
                    </Button>
                    <Button to="/admin/leave-records" variant="primary" size="lg" className="w-full lg:col-span-1" icon={<i className="fas fa-calendar-times"></i>}>
                        Manage Leave Records
                    </Button>
                </div>
            </Card>
        </div>
    </PageContainer>
  );
};

export const AdminUserManagementPage: React.FC = () => { return <PageContainer title="User Management"><UserManagementTable /></PageContainer>; };
export const AdminAllReportsPage: React.FC = () => { return <PageContainer title="All EOD Reports"><AdminReportView /></PageContainer>; };
export const AdminTriggerLogPage: React.FC = () => { return <PageContainer title="Trigger Log History"><TriggerLogView /></PageContainer>; };
export const AdminBusinessUnitManagementPage: React.FC = () => { return <PageContainer title="Manage Business Units"><BusinessUnitManagement /></PageContainer>; };
export const AdminRolesPermissionsPage: React.FC = () => { return <PageContainer title="Roles & Permissions"><RolesPermissionsPage /></PageContainer>; };


export default AdminDashboard;