import React, { useState, useEffect, useCallback } from 'react';
import { User, LeaveRecord, ActivityLogActionType } from '../../types';
import Card from '../Common/Card';
import Button from '../Common/Button';
import ConfirmationModal from '../Common/ConfirmationModal';
import * as DataService from '../../services/dataService';
import { getLocalYYYYMMDD, formatDateDDMonYYYY } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface LeaveActionsCardProps {
  currentUser: User;
  onManageFutureLeave: () => void;
  onLeaveUpdated: () => void;
}

const LeaveActionsCard: React.FC<LeaveActionsCardProps> = ({ currentUser, onManageFutureLeave, onLeaveUpdated }) => {
  const { addToast } = useToast();
  const [todaysLeave, setTodaysLeave] = useState<LeaveRecord | null>(null);
  const [wasRevoked, setWasRevoked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'mark' | 'revoke' | null>(null);

  const todayStr = getLocalYYYYMMDD(new Date());

  const checkTodaysLeaveStatus = useCallback(async () => {
    setIsLoading(true);
    const leaveRecord = await DataService.getLeaveRecordForEmployeeOnDate(currentUser.id, todayStr);
    setTodaysLeave(leaveRecord);

    if (leaveRecord) {
      const activityLog = await DataService.getUserActivityLog(currentUser.id);
      const hasBeenRevoked = activityLog.some(
        log => log.type === ActivityLogActionType.LEAVE_REVOKED_BY_EMPLOYEE && log.targetId === leaveRecord.id
      );
      setWasRevoked(hasBeenRevoked);
    } else {
      setWasRevoked(false);
    }
    setIsLoading(false);
  }, [currentUser.id, todayStr]);

  useEffect(() => {
    checkTodaysLeaveStatus();
  }, [checkTodaysLeaveStatus]);

  const handleMarkLeave = async () => {
    setIsLoading(true);
    try {
      await DataService.addLeaveRecord(currentUser.id, todayStr, "Marked from Dashboard");
      addToast(`Leave marked for ${formatDateDDMonYYYY(todayStr)}`, 'success');
      onLeaveUpdated();
      await checkTodaysLeaveStatus();
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
    setConfirmAction(action);
    setIsConfirmModalOpen(true);
  };
  
  const renderLeaveStatus = () => {
    if (isLoading) {
        return <div className="h-10 flex items-center justify-center"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-primary"></div></div>;
    }

    if (todaysLeave) {
        if (wasRevoked) {
            return <p className="text-center text-sm text-slate-500 dark:text-slate-400">You have already revoked your leave for today.</p>;
        }
        return (
            <div className="text-center">
                 <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">You are on leave today.</p>
                <Button variant="warning" onClick={() => openConfirmation('revoke')} size="sm">
                    Clicked by mistake? Revoke Leave
                </Button>
            </div>
        );
    }

    return (
      <Button variant="primary" onClick={() => openConfirmation('mark')} className="w-full" size="lg">
        Mark Today as Leave
      </Button>
    );
  };

  return (
    <>
      <Card title="Leave Management" titleIcon={<i className="fas fa-plane-departure"/>}>
        <div className="space-y-4">
            {renderLeaveStatus()}
            <div className="text-center">
                <button 
                    onClick={onManageFutureLeave} 
                    className="text-sm text-primary dark:text-sky-400 hover:underline"
                >
                    Manage Future Leaves
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
          <p>Are you sure you want to mark today, {formatDateDDMonYYYY(todayStr)}, as a leave day? Your manager will be notified.</p>
        ) : (
          <>
            <p>Are you sure you want to revoke your leave for today? Your manager will be notified.</p>
            <p className="font-semibold text-amber-600 mt-2">Note: You can only revoke a leave once.</p>
          </>
        )}
      </ConfirmationModal>
    </>
  );
};

export default LeaveActionsCard;