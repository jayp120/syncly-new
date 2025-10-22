
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { PendingTask } from '../../utils/commandParser';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Card from '../Common/Card';
import Input from '../Common/Input';
import Select from '../Common/Select';
import { TaskPriority } from '../../types';
import PendingTaskCard from '../Manager/PendingTaskCard';

interface FinalizeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalTasks: PendingTask[]) => void;
  initialTasks: PendingTask[];
  meetingTitle: string;
  attendees: User[];
}

const FinalizeSessionModal: React.FC<FinalizeSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialTasks,
  meetingTitle,
  attendees,
}) => {
  const [tasksToFinalize, setTasksToFinalize] = useState<PendingTask[]>([]);

  useEffect(() => {
    // Deep copy to prevent unintended mutations
    setTasksToFinalize(JSON.parse(JSON.stringify(initialTasks)));
  }, [initialTasks, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Finalize: ${meetingTitle}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onConfirm(tasksToFinalize)}>
            <i className="fas fa-check-circle mr-2" /> Confirm & Distribute
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          Review the action items detected in your notes. They will be created and assigned upon confirmation.
        </p>
        {tasksToFinalize.length > 0 ? (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto p-2 bg-slate-100 dark:bg-slate-800/50 rounded-md">
            {tasksToFinalize.map((task, index) => (
              <PendingTaskCard key={index} task={task} attendees={attendees} />
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 italic py-6">
            No action items were detected in the notes.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default FinalizeSessionModal;
