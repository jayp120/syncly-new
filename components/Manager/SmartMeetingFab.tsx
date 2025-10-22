import React from 'react';

interface SmartMeetingFabProps {
  onClick: () => void;
  text?: string;
}

const SmartMeetingFab: React.FC<SmartMeetingFabProps> = ({ onClick, text = "New Meeting" }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-30 flex items-center justify-center h-14 w-auto px-6 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105 transition-all duration-200 ease-in-out group"
      aria-label="Plan a new meeting"
    >
      <i className="fas fa-plus mr-2 transform group-hover:rotate-90 transition-transform"></i>
      <span className="font-semibold text-base">{text}</span>
    </button>
  );
};

export default SmartMeetingFab;
