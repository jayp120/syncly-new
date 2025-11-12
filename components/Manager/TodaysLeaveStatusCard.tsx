import React, { useMemo, useState } from 'react';
import { User, LeaveRecord, LeaveStatus, Permission } from '../../types';
import Card from '../Common/Card';
import { WEEK_DAYS } from '../../constants';
import { useAuth, usePermission } from '../Auth/AuthContext';
import { formatDateDDMonYYYY, getLocalYYYYMMDD, isDayWeeklyOff } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Alert from '../Common/Alert';
import { useToast } from '../../contexts/ToastContext';
import * as DataService from '../../services/dataService';

interface TodaysLeaveStatusCardProps {
  allUsers: User[];
  allLeaveRecords: LeaveRecord[];
  onLeaveUpdated: () => Promise<void> | void;
  scope?: 'team' | 'tenant';
}

type LeaveSummary = {
  employee: User;
  leaveRecord: LeaveRecord;
};

type AvailableForMark = {
  employee: User;
  isWeeklyOffToday: boolean;
};

const TodaysLeaveStatusCard: React.FC<TodaysLeaveStatusCardProps> = ({
  allUsers,
  allLeaveRecords,
  onLeaveUpdated,
  scope = 'team',
}) => {
  const { currentUser: managerUser } = useAuth();
  const canGrantLeaveAccess = usePermission(Permission.CAN_GRANT_LEAVE_ACCESS);
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'mark' | 'revoke' | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedLeaveRecord, setSelectedLeaveRecord] = useState<LeaveRecord | null>(null);
  const [managerReason, setManagerReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const today = new Date();
  const todayDateString = getLocalYYYYMMDD(today);
  const todayDayName = WEEK_DAYS[today.getDay()];

  const teamMembers = useMemo(() => {
    if (!managerUser) {
      return [];
    }
    const baseMembers = allUsers.filter(
      user =>
        user.roleName === 'Employee' &&
        !user.isSuspended
    );

    if (scope === 'tenant' || managerUser.roleName === 'Director' || !managerUser.businessUnitId) {
      return baseMembers;
    }

    return baseMembers.filter(
      user => user.businessUnitId === managerUser.businessUnitId
    );
  }, [allUsers, managerUser, scope]);

  const employeesOnLeaveToday: LeaveSummary[] = useMemo(() => {
    return teamMembers
      .map(employee => {
        const leaveRecord = allLeaveRecords.find(
          record =>
            record.employeeId === employee.id &&
            record.date === todayDateString &&
            record.status === LeaveStatus.APPROVED
        );

        if (!leaveRecord) {
          return null;
        }

        const isWeeklyOffTodayForEmployee =
          employee.weeklyOffDay === todayDayName || isDayWeeklyOff(today, employee.weeklyOffDay ?? '');

        if (isWeeklyOffTodayForEmployee) {
          return null;
        }

        return { employee, leaveRecord };
      })
      .filter((item): item is LeaveSummary => Boolean(item));
  }, [teamMembers, allLeaveRecords, todayDateString, todayDayName, today]);

  const employeesAvailableForMark: AvailableForMark[] = useMemo(() => {
    const employeesOnLeaveIds = new Set(employeesOnLeaveToday.map(item => item.employee.id));

    return teamMembers
      .filter(employee => !employeesOnLeaveIds.has(employee.id))
      .map(employee => ({
        employee,
        isWeeklyOffToday:
          employee.weeklyOffDay === todayDayName || isDayWeeklyOff(today, employee.weeklyOffDay ?? ''),
      }));
  }, [teamMembers, employeesOnLeaveToday, todayDayName, today]);

  if (!managerUser) return null;

  const resetModalState = () => {
    setIsModalOpen(false);
    setModalAction(null);
    setSelectedEmployee(null);
    setSelectedLeaveRecord(null);
    setManagerReason('');
    setModalError(null);
    setIsProcessing(false);
  };

  const openMarkModal = (employee: User) => {
    if (!canGrantLeaveAccess) {
      addToast('You do not have permission to manage team leave records.', 'error');
      return;
    }
    setSelectedEmployee(employee);
    setModalAction('mark');
    setManagerReason('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openRevokeModal = (summary: LeaveSummary) => {
    if (!canManageLeaves) {
      addToast('You do not have permission to manage team leave records.', 'error');
      return;
    }
    setSelectedEmployee(summary.employee);
    setSelectedLeaveRecord(summary.leaveRecord);
    setModalAction('revoke');
    setModalError(null);
    setIsModalOpen(true);
  };

  const selectedEmployeeWeeklyOff = selectedEmployee?.weeklyOffDay ?? null;
  const selectedEmployeeIsWeeklyOff =
    modalAction === 'mark' &&
    !!selectedEmployeeWeeklyOff &&
    isDayWeeklyOff(today, selectedEmployeeWeeklyOff);

  const handleModalSubmit = async () => {
    if (!managerUser || !modalAction || !selectedEmployee || !canGrantLeaveAccess) {
      return;
    }

    if (modalAction === 'mark') {
      if (!managerReason.trim()) {
        setModalError('Please provide a short reason before marking leave.');
        return;
      }
      if (selectedEmployeeIsWeeklyOff) {
        setModalError(
          `${selectedEmployee.name} already has a weekly off scheduled today. Leave is not required.`
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      if (modalAction === 'mark') {
        await DataService.markLeaveForEmployee(
          selectedEmployee.id,
          todayDateString,
          managerReason.trim(),
          managerUser
        );
        addToast(`Marked ${selectedEmployee.name} as on leave for today.`, 'success');
      } else if (modalAction === 'revoke' && selectedLeaveRecord) {
        await DataService.revokeLeaveForEmployee(selectedLeaveRecord.id, managerUser);
        addToast(`Reverted leave for ${selectedEmployee.name}.`, 'info');
      }

      await onLeaveUpdated();
      resetModalState();
    } catch (error: any) {
      const message =
        error?.message ||
        (modalAction === 'mark'
          ? 'Failed to mark leave for this team member.'
          : 'Failed to revoke leave for this team member.');
      setModalError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card title="On Leave Today" className="h-full flex flex-col dark:bg-slate-900">
        <div className="flex-grow">
          {employeesOnLeaveToday.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-mediumtext dark:text-slate-400 py-4">
                No employees are on approved leave today.
              </p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
              {employeesOnLeaveToday.map(({ employee, leaveRecord }) => (
                <div
                  key={employee.id}
                  className="p-3 border dark:border-slate-700 rounded-md bg-blue-50 dark:bg-slate-800/60 shadow-sm flex items-start justify-between space-x-3"
                >
                  <div className="flex items-start space-x-3">
                    <UserAvatar name={employee.name} size="md" />
                    <div>
                      <p className="font-semibold text-primary dark:text-sky-400">{employee.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Reason: <span className="italic">{leaveRecord.reason || 'Not specified'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canGrantLeaveAccess && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => openRevokeModal({ employee, leaveRecord })}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-500 mt-3 pt-2 border-t border-gray-200 dark:border-slate-700/50">
          Note: Weekly-off days are excluded automatically.
        </p>

        {canGrantLeaveAccess && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/40">
            <h4 className="text-sm font-semibold text-secondary dark:text-slate-300 mb-3">
              Quick team actions
            </h4>
            {employeesAvailableForMark.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-slate-500">
                All active team members are accounted for today.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {employeesAvailableForMark.map(({ employee, isWeeklyOffToday }) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-md border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{employee.name}</p>
                      {isWeeklyOffToday && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Weekly off today &mdash; leave not required.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isProcessing || isWeeklyOffToday}
                      onClick={() => openMarkModal(employee)}
                    >
                      Mark On Leave
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isProcessing) {
            resetModalState();
          }
        }}
        title={
          modalAction === 'mark'
            ? `Mark ${selectedEmployee?.name ?? ''} on leave`
            : `Revoke leave for ${selectedEmployee?.name ?? ''}`
        }
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={resetModalState} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'revoke' ? 'danger' : 'primary'}
              onClick={handleModalSubmit}
              disabled={
                isProcessing ||
                (modalAction === 'mark' && (!managerReason.trim() || selectedEmployeeIsWeeklyOff))
              }
              isLoading={isProcessing}
            >
              {modalAction === 'mark' ? 'Mark Leave' : 'Revoke Leave'}
            </Button>
          </div>
        }
      >
        {modalError && <Alert type="error" message={modalError} />}
        {modalAction === 'mark' ? (
          <>
            {selectedEmployeeIsWeeklyOff && (
              <Alert
                type="warning"
                message="This team member already has a weekly off today. Please confirm the schedule before proceeding."
              />
            )}
            <Input
              label="Reason for leave"
              placeholder="E.g., Medical appointment"
              value={managerReason}
              onChange={e => {
                setManagerReason(e.target.value);
                if (modalError) {
                  setModalError(null);
                }
              }}
              disabled={isProcessing}
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              The employee will see this reason in their leave history.
            </p>
          </>
        ) : (
          <p>
            Are you sure you want to revoke the leave for {selectedEmployee?.name}? They will be notified about this
            change.
          </p>
        )}
      </Modal>
    </>
  );
};

export default TodaysLeaveStatusCard;
