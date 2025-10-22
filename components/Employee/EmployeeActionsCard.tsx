import React from 'react';
import { User } from '../../types';
import Button from '../Common/Button';
import * as ReactRouterDom from "react-router-dom";
const { Link } = ReactRouterDom;

interface EmployeeActionsCardProps {
  currentUser: User;
}

const EmployeeActionsCard: React.FC<EmployeeActionsCardProps> = ({ currentUser }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg text-white transform hover:-translate-y-1 transition-transform duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold">{getGreeting()}, {currentUser.name.split(' ')[0]}!</h2>
          <p className="mt-1 text-blue-200">Welcome to your dashboard. Here are your quick actions.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            to="/meetings"
            variant="outline" 
            className="!text-white !border-white/50 hover:!bg-white/10 !px-6 !py-3 animate-pulse-slow"
          >
            <i className="fas fa-users-class mr-3 text-xl"></i>
            <span className="font-semibold text-lg">My Meetings</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button to="/submit-eod/today" variant="outline" className="!text-white !border-white/50 hover:!bg-white/10 w-full justify-center">
              <i className="fas fa-paper-plane mr-2"></i> Submit EOD
          </Button>
          <Button to="/my-tasks" variant="outline" className="!text-white !border-white/50 hover:!bg-white/10 w-full justify-center">
              <i className="fas fa-tasks mr-2"></i> View Tasks
          </Button>
           <Button to="/calendar-view" variant="outline" className="!text-white !border-white/50 hover:!bg-white/10 w-full justify-center">
              <i className="fas fa-calendar-alt mr-2"></i> My Calendar
          </Button>
      </div>
    </div>
  );
};

export default EmployeeActionsCard;