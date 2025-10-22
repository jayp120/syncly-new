

import React, { useLayoutEffect, useRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  fieldIdentifier?: string; 
  addonButton?: React.ReactNode; 
  hintText?: string; 
  textareaRef?: React.RefObject<HTMLTextAreaElement>; // New prop
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, className = '', wrapperClassName = '', fieldIdentifier, addonButton, hintText, textareaRef: propRef, ...props }) => {
  const baseStyle = "block w-full px-3 py-2 bg-surface-inset dark:bg-dark-surface-inset border border-border-primary dark:border-dark-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm resize-y transition text-text-primary dark:text-dark-text-primary placeholder:text-text-secondary dark:placeholder:text-dark-text-secondary focus:animate-input-glow";
  const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = propRef || internalRef;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily shrink to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scroll height, accounting for box-sizing
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value, textareaRef]); // Re-run when value changes or ref is available

  return (
    <div className={`mb-1 ${wrapperClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">{label}</label>}
      <div className="relative mt-1">
        <textarea
          ref={textareaRef} // Assign ref here
          id={id}
          data-fieldidentifier={fieldIdentifier}
          className={`${baseStyle} ${errorStyle} ${className} ${addonButton ? 'pr-10' : ''}`}
          {...props}
        />
        {addonButton && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {addonButton}
          </div>
        )}
      </div>
      {hintText && <p className="mt-1 text-xs text-text-secondary dark:text-dark-text-secondary">{hintText}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Textarea;