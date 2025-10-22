import React, { useState, useEffect, useCallback } from 'react';
import { User, LeaveRecord, ActivityLogActionType } from '../../types';
import Card from '../Common/Card';
import Button from '../Common/Button';
import ConfirmationModal from '../Common/ConfirmationModal';
import * as DataService from '../../services/dataService';
import { getLocalYYYYMMDD, formatDateDDMonYYYY } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import Input from '../Common/Input';

interface LeaveManagementCardProps {
  currentUser: User;
  onManageFutureLeave: () => void;
  onLeaveUpdated: () => void;
}

const LeaveManagementCard: React.FC<LeaveManagementCardProps> = ({ currentUser, onManageFutureLeave, onLeaveUpdated }) => {
  const { addToast } = useToast();
  const [todaysLeave, setTodaysLeave] = useState<LeaveRecord | null>(null);
  const [wasRevoked, setWasRevoked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'mark' | 'revoke' | null>(null);
  const [leaveReason, setLeaveReason] = useState('');

  const todayStr = getLocalYYYYMMDD(new Date());

  const checkTodaysLeaveStatus = useCallback(async () => {
    setIsLoading(true);
    const [leaveRecord, activityLog] = await Promise.all([
        DataService.getLeaveRecordForEmployeeOnDate(currentUser.id, todayStr),
        DataService.getUserActivityLog(currentUser.id)
    ]);
    
    setTodaysLeave(leaveRecord);

    const hasBeenRevoked = activityLog.some(
      log => log.type === ActivityLogActionType.LEAVE_REVOKED_BY_EMPLOYEE && log.targetName === todayStr
    );
    setWasRevoked(hasBeenRevoked);
    
    setIsLoading(false);
  }, [currentUser.id, todayStr]);

  useEffect(() => {
    checkTodaysLeaveStatus();
  }, [checkTodaysLeaveStatus]);

  const handleMarkLeave = async () => {
    if (!leaveReason.trim()) {
      addToast('A reason is required to mark today as leave.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await DataService.addLeaveRecord(currentUser.id, todayStr, leaveReason);
      addToast(`Leave marked for ${formatDateDDMonYYYY(todayStr)}`, 'success');
      onLeaveUpdated();
      await checkTodaysLeaveStatus();
      setLeaveReason('');
    } catch (error: any) {
      addToast(error.message || 'Failed to mark leave.', 'error');
    } finally {
      setIsLoading(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleRevokeLeave = async () => {
    if (!todaysLeave) return;
    setIsLoading(true);
    try {
      await DataService.deleteLeaveRecord(todaysLeave.id);
      addToast(`Leave for ${formatDateDDMonYYYY(todayStr)} has been revoked.`, 'info');
      onLeaveUpdated();
      await checkTodaysLeaveStatus();
    } catch (error: any) {
      addToast(error.message || 'Failed to revoke leave.', 'error');
    } finally {
      setIsLoading(false);
      setIsConfirmModalOpen(false);
    }
  };

  const openConfirmation = (action: 'mark' | 'revoke') => {
    if (action === 'mark' && !leaveReason.trim()) {
        addToast('Please provide a reason for your leave first.', 'warning');
        return;
    }
    setConfirmAction(action);
    setIsConfirmModalOpen(true);
  };
  
  const renderLeaveStatus = () => {
    if (isLoading) {
        return <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-primary"></div></div>;
    }

    if (todaysLeave) {
        return (
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                 <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">You are marked as on leave today.</p>
                 {wasRevoked ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">You have already used your one-time revoke for today.</p>
                 ) : (
                    <Button variant="warning" onClick={() => openConfirmation('revoke')} size="sm">
                        Clicked by mistake? Revoke Leave
                    </Button>
                 )}
            </div>
        );
    }
    
    if (wasRevoked) {
        return (
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                 <p className="text-sm text-slate-500 dark:text-slate-400">You have already marked and revoked leave today.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <Input 
                label="Reason for today's leave"
                placeholder="E.g., Sick leave, Personal appointment"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                wrapperClassName="!mb-0"
            />
            <Button variant="primary" onClick={() => openConfirmation('mark')} className="w-full" disabled={!leaveReason.trim()}>
                Mark Today as Leave
            </Button>
        </div>
    )
  }

  return (
    <>
      <Card title="Leave Management" titleIcon={<i className="fas fa-plane-departure"/>}>
        <div className="space-y-4">
            {renderLeaveStatus()}
            <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700/50">
                <button 
                    onClick={onManageFutureLeave} 
                    className="text-sm text-primary dark:text-sky-400 hover:underline"
                >
                    Schedule or Cancel Future Leaves
                </button>
            </div>
        </div>
      </Card>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmAction === 'mark' ? handleMarkLeave : handleRevokeLeave}
        title={confirmAction === 'mark' ? 'Confirm Mark Leave' : 'Confirm Revoke Leave'}
        confirmButtonVariant={confirmAction === 'mark' ? 'primary' : 'danger'}
        confirmText={confirmAction === 'mark' ? 'Yes, Mark Leave' : 'Yes, Revoke'}
      >
        {confirmAction === 'mark' ? (
          <p>Are you sure you want to mark today, {formatDateDDMonYYYY(todayStr)}, as a leave day with the reason: "{leaveReason}"?</p>
        ) : (
          <>
            <p>Are you sure you want to revoke your leave for today? Your manager will be notified.</p>
            <p className="font-semibold text-amber-600 dark:text-amber-400 mt-2">Note: You can only revoke a leave once per day.</p>
          </>
        )}
      </ConfirmationModal>
    </>
  );
};

export default LeaveManagementCard;
