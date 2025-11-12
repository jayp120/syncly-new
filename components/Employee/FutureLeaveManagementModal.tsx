import React, { useState, useEffect, useCallback } from 'react';
import { User, LeaveRecord, LeaveStatus } from '../../types';
import * as DataService from '../../services/dataService';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import Alert from '../Common/Alert';
import Spinner from '../Common/Spinner';
// FIX: Import isDayWeeklyOff directly from dateUtils.
import { formatDateDDMonYYYY, getLocalYYYYMMDD, isDayWeeklyOff } from '../../utils/dateUtils';
import ConfirmationModal from '../Common/ConfirmationModal';

interface FutureLeaveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLeaveManaged: () => void; // Callback to refresh dashboard data
}

const FutureLeaveManagementModal: React.FC<FutureLeaveManagementModalProps> = ({ isOpen, onClose, currentUser, onLeaveManaged }) => {
  const [futureLeaves, setFutureLeaves] = useState<LeaveRecord[]>([]);
  const [newLeaveStartDate, setNewLeaveStartDate] = useState('');
  const [newLeaveEndDate, setNewLeaveEndDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: React.ReactNode } | null>(null);
  const [leaveToCancel, setLeaveToCancel] = useState<LeaveRecord | null>(null);

  const fetchFutureLeaves = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    const allUserLeaves = await DataService.getLeaveRecordsByEmployee(currentUser.id);
    const todayStr = getLocalYYYYMMDD(new Date());
    setFutureLeaves(
        allUserLeaves
            .filter(leave => leave.date >= todayStr && leave.status === LeaveStatus.APPROVED)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    );
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchFutureLeaves();
      setNewLeaveStartDate('');
      setNewLeaveEndDate('');
      setNewLeaveReason('');
      setFeedback(null);
    }
  }, [isOpen, fetchFutureLeaves]);

  const handleAddFutureLeave = async () => {
    if (!newLeaveStartDate || !newLeaveReason.trim()) {
      setFeedback({ type: 'error', message: 'Future leave start date and reason are required.' });
      return;
    }
    const today = getLocalYYYYMMDD(new Date());
    if (newLeaveStartDate < today) {
      setFeedback({ type: 'error', message: 'Future leave start date cannot be in the past.' });
      return;
    }
    if (newLeaveEndDate && newLeaveEndDate < newLeaveStartDate) {
        setFeedback({ type: 'error', message: 'End date cannot be before start date.' });
        return;
    }

    setFeedback(null);
    setIsLoading(true);

    const startDate = new Date(newLeaveStartDate + 'T00:00:00');
    const endDate = newLeaveEndDate ? new Date(newLeaveEndDate + 'T00:00:00') : startDate;
    
    let currentIterDate = new Date(startDate);
    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const employeeDetails = await DataService.getUserById(currentUser.id);

    while(currentIterDate <= endDate) {
        const dateStr = getLocalYYYYMMDD(currentIterDate);
        
        // FIX: Call isDayWeeklyOff from dateUtils directly, not via DataService.
        if (employeeDetails && isDayWeeklyOff(currentIterDate, employeeDetails.weeklyOffDay)) {
            skippedCount++;
        } else {
            try {
                await DataService.addLeaveRecord(currentUser.id, dateStr, newLeaveReason, currentUser);
                successCount++;
            } catch (error: any) {
                // If it fails because it already exists, count it as a skip.
                if (error.message.includes('already exists')) {
                    skippedCount++;
                } else {
                    errors.push(`Failed for ${formatDateDDMonYYYY(dateStr)}: ${error.message}`);
                }
            }
        }
        currentIterDate.setDate(currentIterDate.getDate() + 1);
    }
    
    let feedbackMessage = '';
    if (successCount > 0) feedbackMessage += `${successCount} leave day(s) scheduled. `;
    if (skippedCount > 0) feedbackMessage += `${skippedCount} day(s) skipped (e.g., weekly off or already on leave). `;
    if (errors.length > 0) feedbackMessage += `Errors: ${errors.join(', ')}.`;

    if (successCount > 0 && errors.length === 0) {
        setFeedback({ type: 'success', message: feedbackMessage.trim() });
    } else if (successCount > 0 && errors.length > 0) {
        setFeedback({ type: 'warning', message: feedbackMessage.trim() });
    } else if (errors.length > 0) {
        setFeedback({ type: 'error', message: feedbackMessage.trim() || 'Failed to schedule any leaves.' });
    } else if (skippedCount > 0 && successCount === 0 && errors.length === 0) {
        setFeedback({ type: 'info', message: feedbackMessage.trim() || 'No new leave days scheduled (e.g., all were weekly offs or already on leave).' });
    }

    setNewLeaveStartDate('');
    setNewLeaveEndDate('');
    setNewLeaveReason('');
    await fetchFutureLeaves(); 
    onLeaveManaged(); 
    setIsLoading(false);
  };

  const handleConfirmCancelLeave = async () => {
    if (!leaveToCancel) return;
    setFeedback(null);
    setIsLoading(true);
    try {
      const success = await DataService.deleteLeaveRecord(leaveToCancel.id, currentUser);
      if (success) {
        setFeedback({ type: 'success', message: 'Future leave cancelled successfully.' });
        await fetchFutureLeaves(); 
        onLeaveManaged();
      } else {
        setFeedback({ type: 'error', message: 'Failed to cancel future leave.' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to cancel future leave.' });
    } finally {
      setIsLoading(false);
      setLeaveToCancel(null);
    }
  };

  const getMinDateForFutureLeave = () => {
    return getLocalYYYYMMDD(new Date());
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage My Leave"
        size="lg"
        footer={<Button onClick={onClose} variant="ghost">Close</Button>}
      >
        <div className="space-y-6">
          {feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

          <div className="p-4 border dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800/50">
            <h3 className="text-lg font-semibold text-primary dark:text-sky-400 mb-3">Schedule Future Leave(s)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Input
                label="Select Start Date"
                type="date"
                value={newLeaveStartDate}
                onChange={(e) => setNewLeaveStartDate(e.target.value)}
                min={getMinDateForFutureLeave()}
                required
              />
              <Input
                label="Select End Date (Optional)"
                type="date"
                value={newLeaveEndDate}
                onChange={(e) => setNewLeaveEndDate(e.target.value)}
                min={newLeaveStartDate || getMinDateForFutureLeave()}
              />
            </div>
            <Textarea
              label="Reason for Leave(s)"
              value={newLeaveReason}
              onChange={(e) => setNewLeaveReason(e.target.value)}
              placeholder="Enter reason for your future leave(s)..."
              rows={2}
              wrapperClassName="mb-3"
              required
            />
            <Button onClick={handleAddFutureLeave} variant="primary" isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Scheduling...' : 'Schedule Leave(s)'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">If end date is not selected, only the start date will be scheduled. Leaves will not be scheduled on your weekly off days.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary dark:text-sky-400 mb-3">Your Scheduled Leaves</h3>
            {isLoading && !futureLeaves.length ? (
              <Spinner message="Loading scheduled leaves..." />
            ) : futureLeaves.length === 0 ? (
              <p className="text-mediumtext dark:text-slate-400 italic text-center py-4">You have no future leaves scheduled.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {futureLeaves.map(leave => (
                  <div key={leave.id} className="p-3 border dark:border-slate-700/50 rounded-md flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm">
                    <div>
                      <p className="font-semibold dark:text-slate-200">{formatDateDDMonYYYY(leave.date)}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">Reason: {leave.reason}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setLeaveToCancel(leave)}
                      isLoading={isLoading}
                      disabled={isLoading}
                      icon={<i className="fas fa-times-circle"></i>}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
      <ConfirmationModal
        isOpen={!!leaveToCancel}
        onClose={() => setLeaveToCancel(null)}
        onConfirm={handleConfirmCancelLeave}
        title="Confirm Leave Cancellation"
        confirmButtonVariant='danger'
        confirmText='Yes, Cancel Leave'
      >
        <p>Are you sure you want to cancel your leave for <strong>{leaveToCancel ? formatDateDDMonYYYY(leaveToCancel.date) : ''}</strong>?</p>
        <p className="text-sm text-slate-500 mt-2">This action cannot be undone.</p>
      </ConfirmationModal>
    </>
  );
};

export default FutureLeaveManagementModal;

