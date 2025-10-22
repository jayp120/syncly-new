import React, { useMemo } from 'react';
import { User, EODReport } from '../../types';
import Card from '../Common/Card';
import { WEEK_DAYS } from '../../constants';
import { getLocalYYYYMMDD } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';

interface TodaysWeeklyOffStatusCardProps {
  users: User[];
  reports: EODReport[];
}

const TodaysWeeklyOffStatusCard: React.FC<TodaysWeeklyOffStatusCardProps> = ({ users, reports }) => {
  const today = new Date();
  const todayDayName = WEEK_DAYS[today.getDay()];
  const todayDateString = getLocalYYYYMMDD(today);

  const employeesOnWeeklyOffToday = useMemo(() => {
    return users.filter(user => 
      user.roleName === 'Employee' &&
      !user.isSuspended &&
      user.weeklyOffDay === todayDayName
    );
  }, [users, todayDayName]);

  const restingEmployees = useMemo(() => {
    return employeesOnWeeklyOffToday.filter(employee => {
      const reportForToday = reports.find(
        r => r.employeeId === employee.id && r.date === todayDateString
      );
      return !(reportForToday && reportForToday.versions.length > 0);
    });
  }, [employeesOnWeeklyOffToday, reports, todayDateString]);
  
  const workedOnWeeklyOff = useMemo(() => {
    return employeesOnWeeklyOffToday.filter(employee => {
      const reportForToday = reports.find(
        r => r.employeeId === employee.id && r.date === todayDateString
      );
      return reportForToday && reportForToday.versions.length > 0;
    });
  }, [employeesOnWeeklyOffToday, reports, todayDateString]);


  const renderEmployeeInfo = (employee: User) => (
    <div key={employee.id} className="p-3 border dark:border-slate-700 rounded-md bg-white dark:bg-slate-800/60 shadow-sm flex items-center space-x-3">
        <UserAvatar name={employee.name} size="md" />
        <div>
            <p className="font-semibold text-primary dark:text-sky-400">{employee.name}</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">{employee.designation || 'N/A'}</p>
        </div>
    </div>
  );

  return (
    <Card title={`💤 Resting Today`} className="h-full flex flex-col dark:bg-slate-900">
      <div className="flex-grow">
        <h3 className="text-md font-semibold text-secondary dark:text-slate-300 mb-3 pb-2 border-b dark:border-slate-700/50">
          Scheduled Off ({restingEmployees.length})
        </h3>
        {restingEmployees.length > 0 ? (
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
              {restingEmployees.map(renderEmployeeInfo)}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400 italic">
            No employees scheduled for weekly off today.
          </p>
        )}
      </div>
      
      {workedOnWeeklyOff.length > 0 && (
         <div className="flex-grow mt-4 pt-3 border-t dark:border-slate-700/50">
            <h3 className="text-md font-semibold text-secondary dark:text-slate-300 mb-3 pb-2 border-b dark:border-slate-700/50">
                Worked on Off Day ({workedOnWeeklyOff.length})
            </h3>
            <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
                {workedOnWeeklyOff.map(renderEmployeeInfo)}
            </div>
        </div>
      )}
    </Card>
  );
};

export default TodaysWeeklyOffStatusCard;