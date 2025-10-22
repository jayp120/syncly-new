import React, { useMemo } from 'react';
import { User, LeaveRecord, LeaveStatus } from '../../types';
import Card from '../Common/Card';
import { WEEK_DAYS } from '../../constants'; 
import { useAuth } from '../Auth/AuthContext'; 
import { formatDateDDMonYYYY, getLocalYYYYMMDD } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';


interface TodaysLeaveStatusCardProps {
  allUsers: User[]; 
  allLeaveRecords: LeaveRecord[]; 
}

const TodaysLeaveStatusCard: React.FC<TodaysLeaveStatusCardProps> = ({ allUsers, allLeaveRecords }) => {
  const { currentUser: managerUser } = useAuth();
  const today = new Date();
  const todayDateString = getLocalYYYYMMDD(today);
  const todayDayName = WEEK_DAYS[today.getDay()];

  const employeesOnLeaveToday = useMemo(() => {
    const relevantUsers = allUsers.filter(user => user.roleName === 'Employee' && !user.isSuspended);

    return relevantUsers.filter(employee => {
      const isWeeklyOffTodayForThisEmployee = employee.weeklyOffDay === todayDayName;
      
      const hasApprovedLeaveRecordForToday = allLeaveRecords.some(
        record =>
          record.employeeId === employee.id &&
          record.date === todayDateString &&
          record.status === LeaveStatus.APPROVED
      );
      
      return hasApprovedLeaveRecordForToday && !isWeeklyOffTodayForThisEmployee;

    }).map(employee => {
        const leaveRecord = allLeaveRecords.find(
            lr => lr.employeeId === employee.id && lr.date === todayDateString && lr.status === LeaveStatus.APPROVED
        );
        return {
            ...employee,
            leaveReason: leaveRecord?.reason || "N/A"
        };
    });
  }, [allUsers, allLeaveRecords, todayDateString, todayDayName]);

  if (!managerUser) return null;

  return (
    <Card title={`🗓️ On Leave Today`} className="h-full flex flex-col dark:bg-slate-900">
        <div className="flex-grow">
            {employeesOnLeaveToday.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-center text-mediumtext dark:text-slate-400 py-4">No employees are on approved leave today.</p>
                </div>
            ) : (
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                {employeesOnLeaveToday.map(employee => (
                    <div key={employee.id} className="p-3 border dark:border-slate-700 rounded-md bg-blue-50 dark:bg-slate-800/60 shadow-sm flex items-center space-x-3">
                        <UserAvatar name={employee.name} size="md" />
                        <div>
                            <p className="font-semibold text-primary dark:text-sky-400">{employee.name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Reason: <span className="italic">{employee.leaveReason}</span></p>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-3 pt-2 border-t border-gray-200 dark:border-slate-700/50">
            Note: This list excludes leaves that fall on an employee's weekly off day.
        </p>
    </Card>
  );
};

export default TodaysLeaveStatusCard;