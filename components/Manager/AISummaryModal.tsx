import React from 'react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import { useToast } from '../../contexts/ToastContext';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryDate: string | null;
  summaryText: string | null;
  isLoading: boolean;
  error: string | null;
  onSaveSummary?: (summary: string) => void;
}

const AISummaryModal: React.FC<AISummaryModalProps> = ({
  isOpen,
  onClose,
  summaryDate,
  summaryText,
  isLoading,
  error,
  onSaveSummary,
}) => {
  const { addToast } = useToast();
  const title = summaryDate 
    ? `AI Summary for ${new Date(summaryDate + 'T00:00:00').toLocaleDateString()}` 
    : 'AI Meeting Summary';

  const handleCopy = () => {
    if (summaryText) {
        navigator.clipboard.writeText(summaryText)
            .then(() => addToast('Summary copied!', 'success'))
            .catch(() => addToast('Failed to copy text.', 'error'));
    }
  };

  const renderFooter = () => {
    if (isLoading) {
      return <Button variant="ghost" onClick={onClose}>Cancel Generation</Button>;
    }
    if (error) {
        return <Button onClick={onClose}>Close</Button>;
    }
    if (summaryText) {
        return (
            <>
                <Button variant="ghost" onClick={handleCopy} icon={<i className="fas fa-copy" />}>Copy Text</Button>
                {onSaveSummary && <Button variant="secondary" onClick={() => onSaveSummary(summaryText)} icon={<i className="fas fa-save" />}>Save to Workspace</Button>}
                <Button variant="primary" onClick={onClose}>Done</Button>
            </>
        );
    }
    return <Button onClick={onClose}>Close</Button>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={renderFooter()}
    >
      {isLoading && <Spinner message="Generating AI summary, please wait..." />}
      
      {error && !isLoading && (
        <Alert type="error" message={error} />
      )}
      
      {!isLoading && !error && summaryText && (
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border dark:border-slate-700 max-h-[60vh] overflow-y-auto">
          {summaryText}
        </div>
      )}

      {!isLoading && !error && !summaryText && (
         <p className="text-gray-600 dark:text-slate-400">No summary available. This might happen if there were no reports or an issue occurred.</p>
      )}
    </Modal>
  );
};

export default AISummaryModal;
