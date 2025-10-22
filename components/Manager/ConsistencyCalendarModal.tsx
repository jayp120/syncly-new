import React, { useState, useEffect } from 'react';
import { User, MonthlyReportStatus } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import * as DataService from '../../services/dataService';
import { getLocalYYYYMMDD } from '../../utils/dateUtils';

interface ConsistencyCalendarModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayHeadings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ConsistencyCalendarModal: React.FC<ConsistencyCalendarModalProps> = ({ user, isOpen, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusMap, setStatusMap] = useState<MonthlyReportStatus>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchStatus = async () => {
        setIsLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const map = await DataService.getMonthlyReportStatus(user.id, year, month);
        setStatusMap(prevMap => {
          // Only update if data actually changed to prevent unnecessary re-renders
          const prevKey = Object.keys(prevMap)[0]?.substring(0, 7); // "YYYY-MM" from first date
          const newKey = Object.keys(map)[0]?.substring(0, 7);
          if (prevKey === newKey && JSON.stringify(prevMap) === JSON.stringify(map)) {
            return prevMap;
          }
          return map;
        });
        setIsLoading(false);
      };
      fetchStatus();
    } else {
      // Reset date to current month when modal is opened for a new user
      setCurrentDate(new Date());
    }
  }, [isOpen, user, currentDate.getFullYear(), currentDate.getMonth()]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const isNextMonthFuture = new Date(year, month + 1, 1) > new Date();

  const renderCells = () => {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells = [];
    const systemToday = getLocalYYYYMMDD(new Date());

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="border-border-primary/30 dark:border-dark-border/30 bg-surface-secondary/50 dark:bg-dark-surface-secondary/30"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = statusMap[dateKey];
      const isTodayFlag = dateKey === systemToday;

      let statusDot = null;
      if (status === 'submitted') {
        statusDot = <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full" title="Report Submitted"></div>;
      } else if (status === 'missed') {
        statusDot = <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" title="Report Missed"></div>;
      }
      
      const isNonWorking = status === 'non-working';

      cells.push(
        <div key={day} className={`border-border-primary/30 dark:border-dark-border/30 p-1 min-h-[3.5rem] flex flex-col relative ${
            isTodayFlag ? 'bg-blue-100 dark:bg-sky-900/40' : (isNonWorking ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-surface-primary dark:bg-dark-surface-primary')
        }`}>
          <span className={`text-xs sm:text-sm self-end ${isTodayFlag ? 'text-primary dark:text-sky-400 font-bold' : (isNonWorking ? 'text-text-secondary/50 dark:text-dark-text-secondary/50' : 'text-text-primary dark:text-dark-text')}`}>{day}</span>
          {statusDot}
        </div>
      );
    }
    return cells;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? `Consistency for ${user.name}` : 'Consistency Calendar'} size="lg">
        <div className="flex justify-between items-center mb-4">
            <Button onClick={prevMonth} variant="ghost" size="sm" icon={<i className="fas fa-chevron-left"/>} />
            <h3 className="font-semibold text-lg text-text-primary dark:text-dark-text">{monthNames[month]} {year}</h3>
            <Button onClick={nextMonth} variant="ghost" size="sm" icon={<i className="fas fa-chevron-right"/>} disabled={isNextMonthFuture}/>
        </div>

        {isLoading ? <Spinner message="Loading calendar..." /> : (
            <div className="grid grid-cols-7 gap-px border-t border-l border-border-primary/30 dark:border-dark-border/30 bg-border-primary dark:bg-dark-border">
                {dayHeadings.map(dayName => (
                    <div key={dayName} className="text-center font-medium p-2 bg-surface-secondary dark:bg-dark-surface-secondary text-xs text-text-secondary dark:text-dark-text-secondary">{dayName}</div>
                ))}
                {renderCells()}
            </div>
        )}

        <div className="flex justify-center items-center gap-6 mt-4 pt-4 border-t border-border-primary dark:border-dark-border">
            <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span>Submitted</span></div>
            <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span>Missed</span></div>
            <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div><span>Non-Working Day</span></div>
        </div>
    </Modal>
  );
};

export default ConsistencyCalendarModal;