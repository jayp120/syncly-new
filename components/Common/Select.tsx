
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  wrapperClassName?: string;
  placeholder?: string; // Added placeholder to SelectProps
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', wrapperClassName = '', placeholder, ...props }) => {
  const baseStyle = "mt-1 block w-full pl-3 pr-10 py-2 bg-surface-inset dark:bg-dark-surface-inset border-border-primary dark:border-dark-border text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm rounded-lg shadow-sm transition focus:animate-input-glow";
  const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

  return (
    <div className={`mb-2 ${wrapperClassName}`}> {/* Changed mb-4 to mb-2 */}
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">{label}</label>}
      <select
        id={id}
        className={`${baseStyle} ${errorStyle} ${className}`}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-white dark:bg-dark-bg">{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;