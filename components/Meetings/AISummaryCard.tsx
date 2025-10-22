import React from 'react';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';

interface AISummaryCardProps {
  summary: string;
  generatedAt: number;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, generatedAt }) => {
  const { addToast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
      .then(() => addToast('Summary copied to clipboard!', 'success'))
      .catch(() => addToast('Failed to copy summary.', 'error'));
  };

  return (
    <Card 
      title="AI Generated Summary" 
      titleIcon={<i className="fas fa-magic text-cyan-500" />}
      actions={<Button variant="ghost" size="sm" onClick={handleCopy} icon={<i className="fas fa-copy" />}>Copy</Button>}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap max-h-60 overflow-y-auto">
        {summary}
      </div>
      <p className="text-xs text-slate-400 mt-2 text-right">
        Generated on: {formatDateTimeDDMonYYYYHHMM(generatedAt)}
      </p>
    </Card>
  );
};

export default AISummaryCard;
