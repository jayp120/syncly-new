

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, UserStatus, TriggerLogEntry, DelinquentEmployeeDetails, BusinessUnit, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Alert from '../Common/Alert';
import Spinner from '../Common/Spinner';
import { useAuth } from '../Auth/AuthContext';
import * as EmailService from '../../services/emailService';
import UserAvatar from '../Common/UserAvatar';
import { formatDateTimeDDMonYYYYHHMM, formatDateDDMonYYYY } from '../../utils/dateUtils';
import Input from '../Common/Input';
import Select from '../Common/Select';
import ConfirmationModal from '../Common/ConfirmationModal';
import ConsistencyCalendarModal from './ConsistencyCalendarModal';

const UnifiedDelinquencyDashboard: React.FC = () => {
  const { currentUser: managerUser, hasPermission } = useAuth();
  const [consistencyData, setConsistencyData] = useState<DelinquentEmployeeDetails[]>([]);
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [triggerLogs, setTriggerLogs] = useState<TriggerLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [calendarModalUser, setCalendarModalUser] = useState<User | null>(null);
  const [modalContent, setModalContent] = useState<{
      employees: User[];
      isBulk: boolean;
      onConfirm: () => void;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: React.ReactNode } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>(() => managerUser?.businessUnitId || '');
  const canViewEntireTenant = hasPermission(Permission.CAN_VIEW_ALL_REPORTS);
  const scopedBusinessUnitId = managerUser?.businessUnitId;
  
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const [details, logs, bus] = await Promise.all([
        DataService.getEmployeeConsistencyDetails(),
        DataService.getTriggerLogEntries(),
        DataService.getBusinessUnits()
    ]);
    setConsistencyData(details);
    setTriggerLogs(logs);
    setAllBusinessUnits(bus.filter(bu => bu.status === 'active'));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!canViewEntireTenant && scopedBusinessUnitId) {
        setBusinessUnitFilter(scopedBusinessUnitId);
    }
  }, [canViewEntireTenant, scopedBusinessUnitId]);

  const scopedConsistencyData = useMemo(() => {
    if (canViewEntireTenant || !scopedBusinessUnitId) {
        return consistencyData;
    }
    return consistencyData.filter(detail => detail.user.businessUnitId === scopedBusinessUnitId);
  }, [consistencyData, canViewEntireTenant, scopedBusinessUnitId]);

  const businessUnitOptions = useMemo(() => {
    if (canViewEntireTenant) {
        return [{ value: '', label: 'All Business Units' }, ...allBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }))];
    }
    const managerBU = allBusinessUnits.find(bu => bu.id === scopedBusinessUnitId);
    return managerBU ? [{ value: managerBU.id, label: managerBU.name }] : [];
  }, [allBusinessUnits, canViewEntireTenant, scopedBusinessUnitId]);

  const filteredData = useMemo(() => {
    return scopedConsistencyData.filter(d => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = d.user.name.toLowerCase().includes(term) || d.user.email.toLowerCase().includes(term);
        const matchesBU = businessUnitFilter ? d.user.businessUnitId === businessUnitFilter : true;
        return matchesSearch && matchesBU;
    });
  }, [scopedConsistencyData, searchTerm, businessUnitFilter]);

  const sendReminderSideEffects = async (employee: User, reason: string): Promise<TriggerLogEntry | null> => {
    if (!managerUser) return null;
    
    await DataService.addNotification({
        userId: employee.id,
        message: `🔔 Reminder from your manager, ${managerUser.name}: ${reason}`,
        type: 'reminder',
        isCrucial: true,
    });

    const newLog = await DataService.addTriggerLogEntry({
        managerId: managerUser.id,
        managerName: managerUser.name,
        employeeId: employee.id,
        employeeName: employee.name,
        reason
    });
    
    return newLog;
  };
  
  const handleSendSingleReminder = (detail: DelinquentEmployeeDetails) => {
    const reason = `You have missed your EOD report for ${detail.consecutiveDaysMissed} consecutive working day(s). Please submit it ASAP.`;
    setModalContent({
        employees: [detail.user],
        isBulk: false,
        onConfirm: async () => {
            const newLog = await sendReminderSideEffects(detail.user, reason);
            if (newLog) {
                setTriggerLogs(prev => [newLog, ...prev].sort((a,b) => b.timestamp - a.timestamp));
            }
            if (detail.consecutiveDaysMissed >= 3 && managerUser) {
                EmailService.sendMissedReportsEmailToEmployee(detail.user, managerUser);
            }
            setFeedback({ type: 'success', message: `Reminder sent to ${detail.user.name}.` });
            setShowConfirmModal(false);
        }
    });
    setShowConfirmModal(true);
  };
  
  const handleSendAll = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sentIdsToday = new Set(triggerLogs
      .filter(log => new Date(log.timestamp).toISOString().split('T')[0] === todayStr)
      .map(log => log.employeeId));
      
    const employeesToSend = filteredData.filter(d => d.consecutiveDaysMissed > 0 && !sentIdsToday.has(d.user.id));
    
    if (employeesToSend.length === 0) {
        setFeedback({type: 'info', message: 'Reminders have already been sent to all applicable employees today.'});
        return;
    }

    setModalContent({
      isBulk: true,
      employees: employeesToSend.map(d => d.user),
      onConfirm: async () => {
        if (!managerUser) return;
        
        const newLogs: TriggerLogEntry[] = [];
        for (const d of employeesToSend) {
            const reason = `You have missed your EOD report for ${d.consecutiveDaysMissed} consecutive working day(s). Please submit it ASAP.`;
            const newLog = await sendReminderSideEffects(d.user, reason);
            if (d.consecutiveDaysMissed >= 3) {
                EmailService.sendMissedReportsEmailToEmployee(d.user, managerUser);
            }
            if (newLog) newLogs.push(newLog);
        }
        
        if (newLogs.length > 0) {
            setTriggerLogs(prev => [...newLogs, ...prev].sort((a, b) => b.timestamp - a.timestamp));
        }

        setFeedback({ type: 'success', message: `${employeesToSend.length} reminder(s) sent successfully.` });
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const getConsistencyInfo = (days: number): { base: string; text: string; label: string, icon: string } => {
    if (days >= 3) return { base: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: `${days} Days Missed`, icon: '🔥' };
    if (days > 0) return { base: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-800 dark:text-amber-300', label: `${days} Day${days > 1 ? 's' : ''} Missed`, icon: '⚠️' };
    return { base: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-300', label: 'On Track', icon: '✅' };
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const sentReminderIdsToday = useMemo(() => new Set(triggerLogs
      .filter(log => new Date(log.timestamp).toISOString().split('T')[0] === todayStr)
      .map(log => log.employeeId)), [triggerLogs, todayStr]);

  const eligibleForBulkReminderCount = useMemo(() => {
    return filteredData.filter(d => d.consecutiveDaysMissed > 0 && !sentReminderIdsToday.has(d.user.id)).length;
  }, [filteredData, sentReminderIdsToday]);

  return (
    <>
      <Card title="Reporting Consistency Tracker" titleIcon={<i className="fas fa-check-double text-primary" />}>
        {feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
        
        <div className="mb-4 p-3 border rounded-md bg-surface-secondary dark:bg-dark-surface-secondary dark:border-dark-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
            <Input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Select
              options={businessUnitOptions}
              value={businessUnitFilter}
              onChange={e => setBusinessUnitFilter(e.target.value)}
              label="Filter by Business Unit"
              disabled={!canViewEntireTenant || businessUnitOptions.length <= 1}
            />
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <Button onClick={handleSendAll} variant="warning" icon={<i className="fas fa-paper-plane" />} disabled={eligibleForBulkReminderCount === 0}>
            Send Reminder to All ({eligibleForBulkReminderCount})
          </Button>
        </div>
        
        {isLoading ? <Spinner message="Loading consistency data..." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Last Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Reports This Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">No employees match the current filters.</td></tr>
                ) : (
                  filteredData.map(d => {
                    const consistency = getConsistencyInfo(d.consecutiveDaysMissed);
                    const hasSentToday = sentReminderIdsToday.has(d.user.id);
                    return (
                      <tr key={d.user.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text">
                          <div className="flex items-center">
                            <UserAvatar name={d.user.name} size="md" className="mr-3" />
                            <div>
                              <div>{d.user.name}</div>
                              <div className="text-xs text-text-secondary dark:text-dark-text-secondary">{d.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{d.lastReportSubmittedOn ? formatDateDDMonYYYY(d.lastReportSubmittedOn) : 'Never'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button onClick={() => setCalendarModalUser(d.user)} className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2 ${consistency.base} ${consistency.text} hover:shadow-md transition-shadow`}>
                            <span>{consistency.icon}</span>
                            <span>{d.reportsThisMonth}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button onClick={() => handleSendSingleReminder(d)} size="sm" variant="secondary" disabled={hasSentToday || d.consecutiveDaysMissed === 0} title={hasSentToday ? 'Reminder already sent today' : (d.consecutiveDaysMissed === 0 ? 'User is on track' : 'Send a reminder')}>
                            {hasSentToday ? 'Sent Today' : 'Send Reminder'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => { if (modalContent?.onConfirm) modalContent.onConfirm(); }}
        title="Confirm Reminder"
      >
        {modalContent && (
          <div>
            <p>Are you sure you want to send a reminder to {modalContent.isBulk ? `${modalContent.employees.length} employee(s)` : <strong>{modalContent.employees[0].name}</strong>}?</p>
            <p className="text-sm text-slate-500 mt-2">This will send them an in-app notification and log the action.</p>
          </div>
        )}
      </ConfirmationModal>
      
      <ConsistencyCalendarModal
        isOpen={!!calendarModalUser}
        onClose={() => setCalendarModalUser(null)}
        user={calendarModalUser}
      />
    </>
  );
};

export default UnifiedDelinquencyDashboard;
