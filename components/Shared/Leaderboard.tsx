
import React, { useState, useEffect, useMemo } from 'react';
import * as DataService from '../../services/dataService';
import { LeaderboardEntry, User, Permission } from '../../types';
import Card from '../Common/Card';
import Spinner from '../Common/Spinner';
import { useAuth } from '../Auth/AuthContext';
import Select from '../Common/Select';
import UserAvatar from '../Common/UserAvatar';
import EmptyState from '../Common/EmptyState';

const Leaderboard: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>('');
  const [availableBusinessUnits, setAvailableBusinessUnits] = useState<{ value: string; label: string }[]>([]);

  const isManagerOrAdmin = hasPermission(Permission.CAN_MANAGE_TEAM_REPORTS) || hasPermission(Permission.CAN_MANAGE_USERS);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const [data, users, bus] = await Promise.all([
            DataService.getLeaderboardData(),
            DataService.getUsers(),
            DataService.getBusinessUnits()
        ]);
        setLeaderboardData(data);
        setAllUsers(users);

        if (isManagerOrAdmin) {
            const buOptions = bus.map(bu => ({ value: bu.id, label: bu.name }));
            setAvailableBusinessUnits([{ value: '', label: 'All Business Units' }, ...buOptions]);
        }
        setIsLoading(false);
    }
    fetchData();
  }, [currentUser, isManagerOrAdmin]);

  const getRankIcon = (rank: number | undefined): string | number => {
    if (rank === undefined) return '';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const filteredLeaderboardData = useMemo(() => {
    if (!businessUnitFilter || !isManagerOrAdmin) {
      return leaderboardData;
    }
    const filtered = leaderboardData.filter(entry => {
        const user = allUsers.find(u => u.id === entry.userId);
        return user?.businessUnitId === businessUnitFilter;
    });

    // Re-rank after filtering
    return filtered.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [leaderboardData, businessUnitFilter, isManagerOrAdmin, allUsers]);

  if (isLoading) {
    return <Spinner message="Loading Leadership Board..." />;
  }

  return (
    <Card title="🏆 Monthly Leadership Board" titleIcon={<i className="fas fa-trophy"></i>}>
      {isManagerOrAdmin && availableBusinessUnits.length > 1 && (
        <div className="mb-4">
          <Select
            label="Filter by Business Unit:"
            options={availableBusinessUnits}
            value={businessUnitFilter}
            onChange={(e) => setBusinessUnitFilter(e.target.value)}
            wrapperClassName="max-w-xs"
          />
        </div>
      )}
      {filteredLeaderboardData.length === 0 ? (
        <EmptyState
            icon={<i className="fas fa-award"></i>}
            title="Leaderboard is Fresh"
            message="No employees have ranked on the leaderboard yet for this period, or no employees match your filter."
        />
      ) : (
        <div className="overflow-x-auto max-h-96"> {/* Added max-h-96 and kept overflow-x-auto for responsiveness */}
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Designation</th>
                {isManagerOrAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Business Unit</th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Current Streak</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Reports This Month</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700/50">{filteredLeaderboardData.map((entry) => (
                <tr key={entry.userId} className={`animate-fade-in-up ${entry.rank && entry.rank <=3 ? 'bg-amber-50 dark:bg-amber-500/10' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-center w-16 dark:text-slate-300">{getRankIcon(entry.rank)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-200">
                    <div className="flex items-center">
                      <UserAvatar name={entry.employeeName} size="md" className="mr-3" />
                      {entry.employeeName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{entry.designation || 'N/A'}</td>
                  {isManagerOrAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{entry.businessUnitName || 'N/A'}</td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 text-center">{entry.currentReportingStreak} days</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 text-center">{entry.reportsSubmittedThisMonth}</td>
                </tr>
              ))}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-slate-500 mt-4 text-center">
        Leaderboard stats (Reports This Month) reset at the start of each new month.
        Ranking is based on Current Reporting Streak (working days), then Reports This Month.
      </p>
    </Card>
  );
};

export default Leaderboard;
