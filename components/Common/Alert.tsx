
import React from 'react';

interface AlertProps {
  message?: React.ReactNode;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ message, children, className = '', ...props }) => {
  const [type, setType] = React.useState(props.type);
  const typeStyles = {
    success: 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300',
    error: 'bg-red-50 border-red-500 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300',
    warning: 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300',
    info: 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300',
  };

  const icons = {
    success: <i className="fas fa-check-circle mr-3 text-emerald-500 dark:text-emerald-400"></i>,
    error: <i className="fas fa-exclamation-circle mr-3 text-red-500 dark:text-red-400"></i>,
    warning: <i className="fas fa-exclamation-triangle mr-3 text-amber-500 dark:text-amber-400"></i>,
    info: <i className="fas fa-info-circle mr-3 text-blue-500 dark:text-blue-400"></i>,
  }
  
  // A single onClose handler is better for accessibility and simplicity
  const [show, setShow] = React.useState(true);
  const handleClose = () => {
      setShow(false);
      if(props.onClose) props.onClose();
  }

  if (!show) return null;

  return (
    <div className={`border-l-4 p-4 my-4 rounded-r-lg shadow-sm ${typeStyles[type]} ${className}`} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
            {icons[type]}
        </div>
        <div className="flex-1">
            {/* FIX: Conditionally render message and adjust child margin */}
            {message && <p className="font-medium">{message}</p>}
            {children && <div className={message ? "mt-2" : ""}>{children}</div>}
        </div>
        
          <button onClick={handleClose} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 focus:ring-opacity-50" aria-label="Dismiss">
            <i className="fas fa-times"></i>
          </button>
      </div>
    </div>
  );
};

export default Alert;
