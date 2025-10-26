import React from 'react';
import { Permission } from '../../types';
// FIX: Corrected react-router-dom import to use a standard named import.
import { Link, NavLink } from "react-router-dom";
import { useAuth } from '../Auth/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Send,
  ListTodo,
  Presentation,
  FileSignature,
  UserCog,
  KanbanSquare,
  LineChart,
  Bell,
  Calendar,
  ShieldCheck,   
  Briefcase,
  Archive,
  CalendarX,
  Puzzle,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasUnseenMeetings: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  permission: Permission | 'dashboard' | 'integrations' | 'super_admin';
  end?: boolean;
}

// ✅ Clean Permission Mapping
const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard', end: true }, 
  
  // Super Admin
  { path: '/super-admin', label: 'Super Admin Panel', icon: ShieldCheck, permission: 'super_admin' },
  
  // Employee
  { path: '/my-reports', label: 'My EOD Reports', icon: FileText, permission: Permission.CAN_VIEW_OWN_REPORTS },
  { path: '/submit-eod/today', label: 'Submit EOD', icon: Send, permission: Permission.CAN_SUBMIT_OWN_EOD },
  { path: '/my-tasks', label: 'My Tasks', icon: ListTodo, permission: Permission.CAN_CREATE_PERSONAL_TASKS },
  
  // Unified Meetings
  { path: '/meetings', label: 'Meetings', icon: Presentation, permission: Permission.CAN_VIEW_OWN_MEETINGS },

  // Manager
  { path: '/manage-reports', label: 'Manage Reports', icon: FileSignature, permission: Permission.CAN_MANAGE_TEAM_REPORTS },
  { path: '/team-tasks', label: 'Team Tasks', icon: KanbanSquare, permission: Permission.CAN_MANAGE_TEAM_TASKS },
  { path: '/performance-hub', label: 'Performance Hub', icon: LineChart, permission: Permission.CAN_USE_PERFORMANCE_HUB },
  { path: '/delinquent-reports', label: 'Consistency Tracker', icon: Bell, permission: Permission.CAN_MANAGE_TEAM_REPORTS },
  { path: '/integrations', label: 'Integrations', icon: Puzzle, permission: 'integrations' },

  // Shared
  { path: '/calendar-view', label: 'Calendar View', icon: Calendar, permission: Permission.CAN_VIEW_OWN_CALENDAR },

  // Admin
  { path: '/user-management', label: 'User Management', icon: UserCog, permission: Permission.CAN_MANAGE_USERS },
  { path: '/roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck, permission: Permission.CAN_MANAGE_ROLES },
  { path: '/manage-business-units', label: 'Business Units', icon: Briefcase, permission: Permission.CAN_MANAGE_BUSINESS_UNITS },
  { path: '/all-reports', label: 'All Reports', icon: Archive, permission: Permission.CAN_VIEW_ALL_REPORTS },
  { path: '/admin/leave-records', label: 'Leave Management', icon: CalendarX, permission: Permission.CAN_MANAGE_ALL_LEAVES },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, onToggleCollapse, hasUnseenMeetings }) => {
  const { currentUser, hasPermission } = useAuth();
  
  const filteredNavItems = navItems.filter(item => {
    if (item.permission === 'dashboard') return true; 
    if (item.permission === 'super_admin') return currentUser?.roleName === 'Super Admin';
    if (item.permission === 'integrations') return hasPermission(Permission.CAN_USE_GOOGLE_CALENDAR) || hasPermission(Permission.CAN_USE_TELEGRAM_BOT);
    return hasPermission(item.permission);
  });

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onClose}></div>}

      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-surface-secondary/80 dark:bg-dark-surface-secondary/70 backdrop-blur-xl text-text-primary dark:text-dark-text border-r border-border-primary dark:border-dark-border transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-all duration-300 ease-in-out shadow-2xl flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo & Toggle */}
        <div className={`flex items-center h-16 mb-4 flex-shrink-0 px-4 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link to="/" className="flex items-center overflow-hidden min-w-0" title="Go to Dashboard">
            <i className="fas fa-infinity text-primary dark:text-accent text-2xl flex-shrink-0"></i>
            <span className={`text-xl font-bold text-text-primary dark:text-dark-text whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}`}>
              Syncly
            </span>
          </Link>
          
          <div className="flex items-center">
            {/* Desktop Toggle */}
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-surface-inset/50 text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:bg-dark-surface-inset dark:hover:bg-dark-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent dark:focus:ring-offset-dark-bg ${isCollapsed ? 'ml-0' : 'ml-2'}`}
              aria-label="Toggle sidebar"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-xl font-sans">{isCollapsed ? '⇛' : '⇚'}</span>
            </button>
            
            {/* Mobile Close */}
            <button onClick={onClose} className="lg:hidden text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        {/* Nav Items */}
        <nav className="flex-grow px-2 overflow-y-auto">
          <ul>
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="mb-2 relative group">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onClick={() => { if (window.innerWidth < 1024) { onClose(); } }}
                    className={({ isActive }) =>
                      `flex items-center p-3 rounded-lg hover:bg-primary-light dark:hover:bg-dark-surface-hover transition-colors duration-150 text-text-secondary dark:text-dark-text-secondary font-medium ${
                        isActive ? 'bg-primary/90 dark:bg-accent/80 text-white dark:text-white shadow-lg' : ''
                      } ${isCollapsed ? 'justify-center' : ''}`
                    }
                  >
                    <Icon 
                      className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? '' : 'mr-4'}`}
                      size={20}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span className={`whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      {item.label}
                    </span>
                    {item.path === '/meetings' && hasUnseenMeetings && (
                        <span className={`absolute bg-accent rounded-full animate-pulse ${isCollapsed ? 'w-2 h-2 top-2 right-2' : 'w-2.5 h-2.5 top-1/2 -translate-y-1/2 right-4'}`} title="New Meeting Activity"></span>
                    )}
                  </NavLink>
                  {isCollapsed && (
                    <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-dark-bg text-white text-xs font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 mt-auto border-t border-border-primary/50 dark:border-dark-border/50">
          <div className={`text-xs text-center text-text-secondary dark:text-dark-text-secondary py-2 transition-opacity duration-200 overflow-hidden ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>
            &copy; {new Date().getFullYear()} Syncly
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;