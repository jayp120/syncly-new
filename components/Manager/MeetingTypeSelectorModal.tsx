import React from 'react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';

interface MeetingTypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'live' | 'formal') => void;
}

const MeetingTypeSelectorModal: React.FC<MeetingTypeSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Meeting Type" size="md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('live')}
          className="group flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary-light dark:hover:bg-sky-900/40 dark:hover:border-sky-500 transition-all duration-200"
        >
          <i className="fas fa-bolt text-4xl text-primary dark:text-sky-400 mb-3 group-hover:scale-110 transition-transform"></i>
          <h3 className="font-semibold text-lg text-darktext dark:text-slate-200">Start Live Memo</h3>
          <p className="text-sm text-mediumtext dark:text-slate-400 text-center mt-1">
            For spontaneous, in-person meetings. Quickly capture notes and delegate tasks.
          </p>
        </button>
        <button
          onClick={() => onSelect('formal')}
          className="group flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-secondary hover:bg-indigo-50 dark:hover:bg-indigo-900/40 dark:hover:border-indigo-500 transition-all duration-200"
        >
          <i className="fas fa-calendar-alt text-4xl text-secondary dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform"></i>
          <h3 className="font-semibold text-lg text-darktext dark:text-slate-200">Schedule Formal Meeting</h3>
          <p className="text-sm text-mediumtext dark:text-slate-400 text-center mt-1">
            For planned events with agendas, attachments, and recurring options.
          </p>
        </button>
      </div>
    </Modal>
  );
};

export default MeetingTypeSelectorModal;
