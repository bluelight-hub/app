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
  'block w-full rounded-control border bg-surface-panel font-medium text-text-primary transition-colors duration-200 placeholder:text-text-muted focus:border-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  default: 'border-border-subtle hover:border-border-strong',
  error: 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text',
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
          {leftIcon && <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted">{leftIcon}</div>}
          <input ref={ref} className={inputClasses} autoCorrect={autoCorrect} {...props} />
          {rightElement && <div className="absolute top-0 right-0 flex h-full items-center pr-1">{rightElement}</div>}
        </div>
      );
    }

    return <input ref={ref} className={inputClasses} autoCorrect={autoCorrect} {...props} />;
  }),
);

Input.displayName = 'Input';
