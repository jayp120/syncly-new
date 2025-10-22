import React from 'react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import { AwardDetailsForPopup } from '../../types';
// No specific date formatting needed here as awardMonthName and awardYear are already textual/numeric.

interface MonthlyAwardPopupProps {
  awardDetails: AwardDetailsForPopup;
  onDismiss: () => void;
}

const MonthlyAwardPopup: React.FC<MonthlyAwardPopupProps> = ({ awardDetails, onDismiss }) => {
  const { name, rank, awardMonthName, awardYear, consistencyDetail } = awardDetails;

  const title = `🎉 Congratulations, ${name}! 🎉`;
  const message = `You're ranked #${rank} for ${awardMonthName} ${awardYear} ${consistencyDetail}`;

  return (
    <Modal
      isOpen={true}
      onClose={onDismiss}
      title={title}
      size="md"
      footer={
        <div className="w-full flex justify-center"> {/* Centering wrapper for the button */}
          <Button onClick={onDismiss} variant="primary" className="w-full sm:w-auto">
            Awesome!
          </Button>
        </div>
      }
    >
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <p className="text-lg text-mediumtext mb-2">{message}</p>
        <p className="text-sm text-gray-500">Keep up the fantastic work!</p>
      </div>
    </Modal>
  );
};

export default MonthlyAwardPopup;