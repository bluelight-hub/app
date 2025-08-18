import * as React from 'react';

import { cn } from '@/utils/cn.ts';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

/**
 * Input Atom Component
 *
 * Basis-Input-Komponente mit Tailwind CSS Styling
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, variant = 'default', inputSize = 'md', fullWidth = false, leftIcon, rightElement, ...props }, ref) => {
  const baseStyles =
    'block w-full rounded-lg border-2 bg-gray-50 font-medium text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500';

  const variants = {
    default: 'border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-blue-500 dark:border-gray-700 dark:focus:border-blue-400 dark:focus:bg-gray-800 dark:focus:ring-blue-400',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-400 dark:focus:ring-red-400',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-3.5 text-base',
  };

  const inputClasses = cn(baseStyles, variants[variant], sizes[inputSize], leftIcon && 'pl-12', rightElement && 'pr-12', fullWidth && 'w-full', className);

  if (leftIcon || rightElement) {
    return (
      <div className="relative">
        {leftIcon && <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">{leftIcon}</div>}
        <input ref={ref} className={inputClasses} {...props} />
        {rightElement && <div className="absolute right-0 top-0 flex h-full items-center pr-1">{rightElement}</div>}
      </div>
    );
  }

  return <input ref={ref} className={inputClasses} {...props} />;
});

Input.displayName = 'Input';
