import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, EODReport, Task, TaskStatus, UserStatus, LeaveRecord } from '../../types';
import * as DataService from '../../services/dataService';
import { useAuth } from '../Auth/AuthContext';
import Card from '../Common/Card';
import Select from '../Common/Select';
import Input from '../Common/Input';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import { useToast } from '../../contexts/ToastContext';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';

const PerformanceHub: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  // Data state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allReports, setAllReports] = useState<EODReport[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allLeaveRecords, setAllLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Result state
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setIsDataLoading(true);
      const [users, reports, tasks, leaves] = await Promise.all([
        DataService.getUsers(),
        DataService.getReports(),
        DataService.getTasks(),
        DataService.getLeaveRecords()
      ]);
      setAllUsers(users);
      setAllReports(reports);
      setAllTasks(tasks);
      setAllLeaveRecords(leaves);
      setIsDataLoading(false);
    };
    fetchData();
  }, [currentUser]);

  const employeeOptions = useMemo(() => {
    return allUsers
      .filter(u => u.roleName === 'Employee' && u.status === UserStatus.ACTIVE && u.businessUnitId === currentUser?.businessUnitId)
      .map(u => ({ value: u.id, label: u.name }));
  }, [allUsers, currentUser]);

  const handleGenerateSummary = async () => {
    if (!selectedEmployeeId || !startDate || !endDate) {
      addToast('Please select an employee and a date range.', 'error');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        addToast('Start date cannot be after end date.', 'error');
        return;
    }

    setIsGenerating(true);
    setError('');
    setSummary('');
    
    const selectedEmployee = allUsers.find(u => u.id === selectedEmployeeId);
    if (!selectedEmployee) {
        setError("Selected employee not found.");
        setIsGenerating(false);
        return;
    }
    setSelectedEmployeeName(selectedEmployee.name);

    const relevantReports = allReports.filter(r => 
        r.employeeId === selectedEmployeeId &&
        r.date >= startDate &&
        r.date <= endDate
    );
    const relevantTasks = allTasks.filter(t => 
        t.assignedTo.includes(selectedEmployeeId) &&
        t.status === TaskStatus.Completed && // Only consider completed tasks for performance
        t.dueDate >= startDate &&
        t.dueDate <= endDate
    );

    if (relevantReports.length === 0 && relevantTasks.length === 0) {
      setError(`No EOD reports or completed tasks found for ${selectedEmployee.name} in the selected period.`);
      setIsGenerating(false);
      return;
    }

    try {
      const result = await DataService.generatePerformanceReviewSummary(
          selectedEmployee, 
          relevantReports, 
          relevantTasks,
          allLeaveRecords,
          { startDate, endDate }
      );
      setSummary(result);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred while generating the summary.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopy = () => {
    if (summary) {
        navigator.clipboard.writeText(summary)
            .then(() => addToast('Summary copied!', 'success'))
            .catch(() => addToast('Failed to copy text.', 'error'));
    }
  };

  if (isDataLoading) {
      return <Spinner message="Loading performance data..."/>
  }

  return (
    <div className="space-y-6">
      <Card title="Generate Performance Summary" titleIcon={<i className="fas fa-user-chart" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <Select
            label="Select Employee"
            options={employeeOptions}
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            placeholder="Choose an employee..."
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            max={endDate || undefined}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleGenerateSummary}
            isLoading={isGenerating}
            disabled={!selectedEmployeeId || !startDate || !endDate}
            size="lg"
          >
            Generate AI Summary
          </Button>
        </div>
      </Card>
      
      {(isGenerating || error || summary) && (
          <Card 
            title={summary ? `Summary for ${selectedEmployeeName}` : 'AI Analysis'}
            actions={summary && <Button variant="ghost" size="sm" onClick={handleCopy} icon={<i className="fas fa-copy" />}>Copy</Button>}
          >
              {isGenerating && <Spinner message="Analyzing performance data..." />}
              {error && <Alert type="error" message={error} />}
              {summary && (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                      {summary}
                  </div>
              )}
          </Card>
      )}
    </div>
  );
};

export default PerformanceHub;