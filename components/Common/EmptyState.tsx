
import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  cta?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, cta, className = '' }) => {
  return (
    <div className={`text-center py-12 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 animate-fade-in-up ${className}`}>
      <div className="text-5xl text-slate-400 dark:text-slate-500 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{message}</p>
      {cta && (
        <div className="mt-6">
          {cta}
        </div>
      )}
    </div>
  );
};

export default EmptyState;