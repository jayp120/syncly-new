import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, EODReport, Task, LeaveRecord, TaskStatus } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Select from '../Common/Select';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import { useToast } from '../../contexts/ToastContext';
import { Link } from "react-router-dom";
// FIX: Add missing import for getLocalYYYYMMDD.
import { getLocalYYYYMMDD } from '../../utils/dateUtils';

interface PerformanceSnapshotCardProps {
  teamMembers: User[];
  allReports: EODReport[];
  allTasks: Task[];
  allLeaveRecords: LeaveRecord[];
}

const PerformanceSnapshotCard: React.FC<PerformanceSnapshotCardProps> = ({
  teamMembers,
  allReports,
  allTasks,
  allLeaveRecords,
}) => {
  const { addToast } = useToast();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('7'); // '7', '30', '90' days

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [isAiAvailable, setIsAiAvailable] = useState(DataService.isAiConfigured());


  const employeeOptions = useMemo(() => {
    return teamMembers.map(u => ({ value: u.id, label: u.name }));
  }, [teamMembers]);
  
  const periodOptions = [
      { value: '7', label: 'Last 7 Days' },
      { value: '30', label: 'Last 30 Days' },
      { value: '90', label: 'Last 90 Days (Quarter)' },
  ];

  const getDateRange = useCallback(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - parseInt(selectedPeriod, 10));
      return {
          startDate: getLocalYYYYMMDD(start),
          endDate: getLocalYYYYMMDD(end)
      };
  }, [selectedPeriod]);

  const handleGenerateSnapshot = useCallback(async () => {
    if (!selectedEmployeeId) {
      // Don't show a toast for this, as it's the default state
      return;
    }
    const employee = teamMembers.find(u => u.id === selectedEmployeeId);
    if (!employee) return;

    setIsLoading(true);
    setError('');
    setSnapshot(null);

    try {
      const dateRange = getDateRange();
      const relevantReports = allReports.filter(r => r.employeeId === selectedEmployeeId && r.date >= dateRange.startDate && r.date <= dateRange.endDate);
      const relevantTasks = allTasks.filter(t => t.assignedTo.includes(selectedEmployeeId) && t.status === TaskStatus.Completed && t.dueDate >= dateRange.startDate && t.dueDate <= dateRange.endDate);
      const relevantLeaves = allLeaveRecords.filter(l => l.employeeId === selectedEmployeeId && l.date >= dateRange.startDate && l.date <= dateRange.endDate);

      const result = await DataService.generatePerformanceSnapshotSummary(employee, relevantReports, relevantTasks, relevantLeaves, dateRange);
      setSnapshot(result);
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to generate snapshot.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId, selectedPeriod, teamMembers, allReports, allTasks, allLeaveRecords, addToast, getDateRange]);

  useEffect(() => {
    let isMounted = true;

    DataService.getGeminiApiKeyAsync().then((key) => {
      if (isMounted) {
        setIsAiAvailable(Boolean(key));
      }
    });

    const unsubscribe = DataService.onGeminiKeyChange((value) => {
      setIsAiAvailable(Boolean(value));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Auto-generate on selection change
  useEffect(() => {
      if (selectedEmployeeId && isAiAvailable) {
          handleGenerateSnapshot();
      } else {
          setSnapshot(null); // Clear snapshot if no employee is selected
      }
  }, [selectedEmployeeId, selectedPeriod, handleGenerateSnapshot, isAiAvailable]);


  return (
    <Card title="Performance Snapshot" titleIcon={<i className="fas fa-bolt"/>} className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select
          label="Select Employee"
          options={employeeOptions}
          value={selectedEmployeeId}
          onChange={e => setSelectedEmployeeId(e.target.value)}
          placeholder="Choose employee..."
          wrapperClassName="flex-grow"
        />
        <Select
          label="Period"
          options={periodOptions}
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          wrapperClassName="sm:w-48"
        />
      </div>

      <div className="flex-grow flex flex-col justify-center">
        {!isAiAvailable ? (
            <Alert type="warning">
                AI features are not configured. Please set up your Gemini API key.
            </Alert>
        ) : !selectedEmployeeId ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <p>Select an employee to view their performance snapshot.</p>
          </div>
        ) : isLoading ? (
          <Spinner message="Generating snapshot..." />
        ) : error ? (
          <Alert type="error" message={error} />
        ) : snapshot ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
            {snapshot}
          </div>
        ) : (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <p>No performance data available for the selected period.</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border-primary dark:border-dark-border text-center">
         <Link to="/performance-hub" className="text-sm text-primary hover:underline">
            Go to Full Performance Hub for detailed analysis &rarr;
          </Link>
      </div>
    </Card>
  );
};

export default PerformanceSnapshotCard;
