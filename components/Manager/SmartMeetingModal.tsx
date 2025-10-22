


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Meeting, UserStatus } from '../../types';
import * as DataService from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import Input from '../Common/Input';
import { parseLiveMemoText, PendingTask } from '../../utils/commandParser';
import EmployeeMultiSelect from './EmployeeMultiSelect';
import PendingTaskCard from './PendingTaskCard';
import MentionTextarea from '../Common/MentionTextarea';

const SmartMeetingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  manager: User;
  teamMembers: User[];
  onSuccess: (meeting: Meeting) => void;
}> = ({ isOpen, onClose, manager, teamMembers, onSuccess }) => {
  const { addToast } = useToast();
  
  const [step, setStep] = useState<'details' | 'finalizing'>('details');
  const [title, setTitle] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);

  const resetState = useCallback(() => {
    setStep('details');
    setTitle('');
    setAttendeeIds([]);
    setDescription('');
    setPendingTasks([]);
  }, []);

  useEffect(() => { if (isOpen) resetState(); }, [isOpen, resetState]);

  const activeTeamMembers = useMemo(() => teamMembers.filter(tm => tm.status === UserStatus.ACTIVE), [teamMembers]);
  const attendees = useMemo(() => activeTeamMembers.filter(tm => attendeeIds.includes(tm.id)), [activeTeamMembers, attendeeIds]);

  useEffect(() => {
    try {
      const parsedTasks = parseLiveMemoText(description, attendees, attendeeIds);
      setPendingTasks(parsedTasks);
    } catch (e) {
      console.error("Error parsing memo text:", e);
    }
  }, [description, attendees, attendeeIds]);

  const handleFinalize = async () => {
    if (!title.trim()) { addToast('Please enter a title for this memo.', 'error'); return; }
    if (attendeeIds.length === 0) { addToast('Please select at least one attendee.', 'error'); return; }

    setStep('finalizing');

    try {
      const createdMeeting = await DataService.finalizeLiveMemo({
        title,
        notes: description,
        attendeeIds,
        creator: manager,
        attendees,
      });
      addToast('Live memo finalized and tasks assigned!', 'success');
      onSuccess(createdMeeting);
      onClose();
    } catch (err: any) {
      addToast(`Failed to finalize memo: ${err.message}`, 'error');
      setStep('details');
    }
  };
  
  return (
    <div className={`fixed inset-0 z-40 flex justify-end transition-all duration-300 ${isOpen ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
      <div className={`relative w-full max-w-4xl h-full bg-slate-100 dark:bg-slate-950 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-darktext dark:text-slate-200 flex items-center">
                <i className="fas fa-bolt mr-3 text-amber-500"></i> Live Action Memo
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} icon={<i className="fas fa-times"/>} />
        </header>
        
        <main className="flex-grow overflow-y-auto p-4 md:p-6">
          {step === 'finalizing' && <Spinner message="Finalizing memo and assigning tasks..." />}
          {step === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Editor */}
                <div className="space-y-4">
                    <Input
                        label="Memo Title"
                        placeholder="E.g., Q3 Project Kickoff"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                    <EmployeeMultiSelect
                        selectedIds={attendeeIds}
                        onSelectionChange={setAttendeeIds}
                        teamMembers={activeTeamMembers}
                    />
                    <MentionTextarea
                        value={description}
                        onChange={setDescription}
                        placeholder="Type notes... Use / or /task to create a task. E.g., / Finalize slides due:tomorrow @Priya"
                        rows={10}
                        wrapperClassName="!mb-0"
                        availableUsers={attendees}
                    />
                </div>

                {/* Right Column: Preview */}
                <div className="space-y-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                      <h4 className="font-semibold text-primary dark:text-sky-400 mb-2">
                          <i className="fas fa-tasks mr-2"></i> Action Items Preview
                      </h4>
                      {pendingTasks.length > 0 ? (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {pendingTasks.map((task, index) => (
                                <PendingTaskCard key={index} task={task} attendees={attendees} />
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic text-center py-4">No tasks detected. Start a line with "/" to create one.</p>
                      )}
                    </div>
                </div>
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-end bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-3">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" size="lg" onClick={handleFinalize} disabled={step !== 'details'}>
                    <i className="fas fa-check-circle mr-2"></i> Finalize Memo & Assign Tasks
                </Button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default SmartMeetingModal;