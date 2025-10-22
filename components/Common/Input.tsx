
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  fieldIdentifier?: string; // Optional: to help parent identify the field
}

const Input: React.FC<InputProps> = ({ label, id, error, className = '', wrapperClassName = '', fieldIdentifier, ...props }) => {
  const baseStyle = "mt-1 block w-full px-3 py-2 bg-surface-inset dark:bg-dark-surface-inset border border-border-primary dark:border-dark-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm transition text-text-primary dark:text-dark-text-primary placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary focus:animate-input-glow";
  const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

  return (
    <div className={`mb-2 ${wrapperClassName}`}> {/* Changed mb-4 to mb-2 */}
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">{label}</label>}
      <input
        id={id}
        data-fieldidentifier={fieldIdentifier} // Attach for potential parent use
        className={`${baseStyle} ${errorStyle} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Input;