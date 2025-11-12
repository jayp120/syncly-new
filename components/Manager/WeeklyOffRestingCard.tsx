import React, { useMemo } from 'react';
import { User, Permission, UserStatus } from '../../types';
import Card from '../Common/Card';
import { useAuth, usePermission } from '../Auth/AuthContext';
import { WEEK_DAYS } from '../../constants';
import { formatDateDDMonYYYY, getLocalYYYYMMDD, isDayWeeklyOff } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';
import Alert from '../Common/Alert';

interface WeeklyOffRestingCardProps {
  allUsers: User[];
  scope?: 'team' | 'tenant';
}

const WeeklyOffRestingCard: React.FC<WeeklyOffRestingCardProps> = ({ allUsers, scope = 'team' }) => {
  const { currentUser } = useAuth();
  const canViewRestingCard = usePermission(Permission.CAN_MANAGE_WEEKLY_OFF);
  const hasDirectorOverride = currentUser?.roleName === 'Director';
  const viewScope = scope;

  if (!currentUser || (!canViewRestingCard && !hasDirectorOverride)) {
    return null;
  }

  const today = new Date();
  const todayDateString = getLocalYYYYMMDD(today);
  const todayDayName = WEEK_DAYS[today.getDay()];

  const weeklyOffEntries = useMemo(() => {
    const activeMembers = allUsers.filter(
      user =>
        user.status === UserStatus.ACTIVE &&
        user.id !== currentUser.id
    );

    const scopedMembers =
      viewScope === 'tenant' || hasDirectorOverride || !currentUser.businessUnitId
        ? activeMembers
        : activeMembers.filter(user => user.businessUnitId === currentUser.businessUnitId);

    const subjects: User[] = [...scopedMembers, currentUser];

    return subjects
      .filter(user => user.weeklyOffDay && isDayWeeklyOff(today, user.weeklyOffDay))
      .map(user => ({
        user,
        weeklyOffDay: user.weeklyOffDay ?? todayDayName,
        displayDate: formatDateDDMonYYYY(todayDateString),
      }))
      .sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [allUsers, currentUser, today, todayDateString, todayDayName, viewScope, hasDirectorOverride]);

  return (
    <Card title="Resting Today" titleIcon={<i className="fas fa-bed"></i>} className="h-full flex flex-col">
      <Alert
        type="info"
        message="Team members listed here are on their scheduled weekly off and cannot be edited."
        className="mb-3 text-sm"
      />
      {weeklyOffEntries.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">No team members are resting today.</p>
        </div>
      ) : (
        <div className="flex-grow space-y-2 overflow-y-auto pr-1">
          {weeklyOffEntries.map(({ user, weeklyOffDay, displayDate }) => (
            <div
              key={user.id}
              className="flex items-start justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex items-start space-x-3">
                <UserAvatar name={user.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {user.designation || 'Team Member'}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 dark:text-slate-400">
                <p>{weeklyOffDay}</p>
                <p>{displayDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WeeklyOffRestingCard;




