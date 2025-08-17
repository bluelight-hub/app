import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'default' | 'error';
  selectSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * Select Atom Component
 *
 * Basis-Select-Komponente mit Tailwind CSS Styling
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, variant = 'default', selectSize = 'md', fullWidth = false, children, ...props }, ref) => {
  const baseStyles =
    'block w-full rounded-xl border-2 bg-gray-50 font-medium text-gray-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:1.5rem]';

  const variants = {
    default: 'border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-blue-500 dark:border-gray-700 dark:focus:border-blue-400 dark:focus:bg-gray-800 dark:focus:ring-blue-400',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-400 dark:focus:ring-red-400',
  };

  const sizes = {
    sm: 'px-3 py-2 pr-8 text-sm',
    md: 'px-4 py-3 pr-10 text-base',
    lg: 'px-4 py-3.5 pr-10 text-base',
  };

  const selectClasses = cn(baseStyles, variants[variant], sizes[selectSize], fullWidth && 'w-full', className);

  // Add custom arrow styles
  const wrapperStyles = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  };

  return (
    <select ref={ref} className={selectClasses} style={wrapperStyles} {...props}>
      {children}
    </select>
  );
});

Select.displayName = 'Select';
