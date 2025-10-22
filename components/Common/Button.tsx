import React from 'react';
// FIX: Corrected react-router-dom import to use a standard named import.
import { Link } from "react-router-dom";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  to?: string; // For react-router Link behavior
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  to,
  onClick,
  ...props
}) => {
  // Determine if the button should be styled as icon-only (square)
  const isIconOnly = !!icon && (!children || React.Children.count(children) === 0);

  const baseStyle = "rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out flex items-center justify-center shadow-sm hover:shadow-md disabled:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0";

  const variantStyles = {
    primary: "bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/50 focus:ring-accent dark:from-sky-500 dark:to-cyan-400 dark:hover:shadow-cyan-500/30 dark:focus:ring-cyan-300 dark:focus:ring-offset-dark-bg",
    secondary: "bg-secondary hover:bg-secondary-hover text-white focus:ring-secondary dark:focus:ring-offset-dark-bg",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:focus:ring-offset-dark-bg",
    warning: "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500 dark:focus:ring-offset-dark-bg",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400 dark:focus:ring-offset-dark-bg",
    ghost: "bg-surface-secondary/70 dark:bg-dark-surface-secondary/70 hover:bg-surface-hover dark:hover:bg-dark-surface-hover text-text-secondary dark:text-dark-text-secondary border-0 focus:ring-primary focus:ring-opacity-50 dark:focus:ring-offset-dark-bg",
    outline: "bg-transparent hover:bg-accent/10 text-accent border border-accent focus:ring-accent dark:focus:ring-offset-dark-bg",
  };

  const sizeStyles = {
    sm: isIconOnly ? 'w-9 h-9 p-0 text-lg' : 'px-3 py-1.5 text-sm',
    md: isIconOnly ? 'w-10 h-10 p-0 text-xl' : 'px-4 py-2 text-base',
    lg: isIconOnly ? 'w-12 h-12 p-0 text-2xl' : 'px-6 py-3 text-lg',
  };

  const disabledStyle = isLoading || props.disabled ? "opacity-60 cursor-not-allowed transform-none hover:shadow-sm" : "";
  const combinedClassName = `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyle} ${className}`;

  const buttonContent = (
    <>
      {isLoading ? (
        <svg className={`animate-spin h-5 w-5`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {icon}
          {children && <span className={`${icon ? 'ml-2' : ''} whitespace-nowrap`}>{children}</span>}
        </>
      )}
    </>
  );

  if (to) {
    const { disabled: propDisabled, type, ...linkProps } = props;
    return (
      <Link
        to={to}
        className={combinedClassName}
        onClick={(e) => {
          if (isLoading || propDisabled) {
            e.preventDefault();
          }
          if (onClick) {
            onClick(e as React.MouseEvent<HTMLAnchorElement>);
          }
        }}
        aria-disabled={isLoading || propDisabled}
        {...(linkProps as any)}
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button
      className={combinedClassName}
      disabled={isLoading || props.disabled}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      {...props}
    >
      {buttonContent}
    </button>
  );
};

export default Button;