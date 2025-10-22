
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div 
        className={`bg-surface-primary/95 dark:bg-dark-surface-primary/95 backdrop-blur-lg border border-border-primary dark:border-dark-border rounded-xl shadow-2xl m-4 w-full ${sizeClasses[size]} transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
        style={{ animationFillMode: 'forwards' }} // Keep final state of animation
      >
        <div className="flex justify-between items-center p-4 border-b border-border-primary dark:border-dark-border flex-shrink-0">
          <h3 className="text-xl font-semibold text-primary dark:text-accent">{title}</h3>
          <button onClick={onClose} aria-label="Close modal" className="text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text rounded-full w-8 h-8 flex items-center justify-center hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="text-text-primary dark:text-dark-text max-h-[70vh] overflow-y-auto p-6 flex-grow">
          {children}
        </div>
        {footer && <div className="p-4 bg-surface-secondary/50 dark:bg-dark-surface-secondary/50 border-t border-border-primary dark:border-dark-border flex justify-end space-x-3 flex-shrink-0 rounded-b-xl">{footer}</div>}
      </div>
       <style>{`
        @keyframes fade-scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-scale-in {
          animation: fade-scale-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;