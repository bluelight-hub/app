import { cn } from '@/shared/ui/cn';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const BASE_STYLES =
  'block w-full rounded-lg border bg-white font-medium text-gray-900 transition-colors duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500';

const VARIANTS = {
  default:
    'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:bg-white focus:ring-primary-500 dark:border-gray-700 dark:hover:border-gray-600 dark:focus:border-primary-400 dark:focus:bg-gray-900 dark:focus:ring-primary-400',
  error: 'border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:hover:border-red-600 dark:focus:border-red-400 dark:focus:ring-red-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
};

/**
 * Input Atom Component
 *
 * Basis-Input-Komponente mit Tailwind CSS Styling
 */
export const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(({ className, variant = 'default', inputSize = 'md', autoCorrect = 'off', fullWidth = false, leftIcon, rightElement, ...props }, ref) => {
    const inputClasses = cn(BASE_STYLES, VARIANTS[variant], SIZES[inputSize], leftIcon && 'pl-12', rightElement && 'pr-12', fullWidth && 'w-full', className);

    if (leftIcon || rightElement) {
      return (
        <div className="relative w-full">
          {leftIcon && <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 dark:text-gray-400">{leftIcon}</div>}
          <input ref={ref} className={inputClasses} autoCorrect={autoCorrect} {...props} />
          {rightElement && <div className="absolute top-0 right-0 flex h-full items-center pr-1">{rightElement}</div>}
        </div>
      );
    }

    return <input ref={ref} className={inputClasses} autoCorrect={autoCorrect} {...props} />;
  }),
);

Input.displayName = 'Input';
