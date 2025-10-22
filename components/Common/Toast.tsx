
import React, { useEffect, useState, ReactNode } from 'react';

interface ToastProps {
  message: ReactNode;
  type: 'success' | 'error' | 'info' | 'warning' | 'custom';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration !== Infinity) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const typeStyles = {
    success: 'bg-emerald-500 text-white dark:bg-emerald-500/90 dark:text-emerald-50',
    error: 'bg-red-500 text-white dark:bg-red-500/90 dark:text-red-50',
    info: 'bg-blue-500 text-white dark:bg-sky-500/90 dark:text-sky-50',
    warning: 'bg-amber-500 text-white dark:bg-amber-500/90 dark:text-amber-50',
    custom: 'bg-white dark:bg-dark-surface-secondary text-text-primary dark:text-dark-text-primary border border-border-primary dark:border-dark-border'
  };

  const icons = {
    success: <i className="fas fa-check-circle mr-3"></i>,
    error: <i className="fas fa-exclamation-circle mr-3"></i>,
    info: <span className="mr-3 text-xl" aria-hidden="true">🔔</span>,
    warning: <i className="fas fa-exclamation-triangle mr-3"></i>,
    custom: null
  };

  const isCustom = type === 'custom';
  const messageContent = typeof message === 'string' ? (
    <div className="flex items-center">
      <div className="text-xl">{icons[type]}</div>
      <div className="flex-grow font-medium">{message}</div>
    </div>
  ) : (
    message
  );

  return (
    <div
      className={`p-4 rounded-xl shadow-2xl transition-all duration-300 ease-in-out transform w-full ${typeStyles[type]} ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-grow">{messageContent}</div>
        <button
          onClick={handleClose}
          aria-label="Dismiss"
          className={`ml-4 text-xl font-semibold opacity-80 hover:opacity-100 ${isCustom ? 'text-text-secondary dark:text-dark-text-secondary' : ''}`}
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default Toast;