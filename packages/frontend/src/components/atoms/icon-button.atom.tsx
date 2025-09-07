import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Icon-Button-Komponente für Aktionen mit Icons
 *
 * Bietet verschiedene Varianten und Größen für Icon-basierte Buttons.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ variant = 'ghost', size = 'md', className, children, disabled, ...props }, ref) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-primary-500';

  const variantClasses = {
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
    solid: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-900',
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  return (
    <button ref={ref} type="button" className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)} disabled={disabled} {...props}>
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
