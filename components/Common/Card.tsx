import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleIcon?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void; // Added onClick prop
}

const Card: React.FC<CardProps> = ({ children, className = '', title, titleIcon, actions, onClick }) => {
  const clickableStyles = onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : '';
  const baseStyles = 'bg-surface-primary dark:bg-dark-surface-primary backdrop-blur-md shadow-lg rounded-xl border border-border-primary dark:border-dark-border transition-all duration-300 ease-in-out';

  return (
    <div className={`${baseStyles} ${clickableStyles} ${className}`} onClick={onClick}>
      {(title || actions) && (
        <div className="flex justify-between items-center p-4 border-b border-border-primary dark:border-dark-border bg-surface-primary/50 dark:bg-dark-surface-primary/50 rounded-t-xl">
          {title && <h3 className="text-lg font-semibold text-primary dark:text-accent flex items-center">{titleIcon && <span className="mr-3 text-primary/80 dark:text-accent/80">{titleIcon}</span>}{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6 text-text-primary dark:text-dark-text">
        {children}
      </div>
    </div>
  );
};

export default Card;