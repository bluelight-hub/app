import { cn } from '@/shared/ui/cn';
import * as React from 'react';
import { PiCaretDown } from 'react-icons/pi';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: 'default' | 'error';
  selectSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const BASE_STYLES =
  'block w-full appearance-none rounded-control border bg-surface-panel font-medium text-text-primary transition-colors duration-200 focus:border-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  default: 'border-border-subtle hover:border-border-strong',
  error: 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text',
};

const SIZES = {
  sm: 'px-3 pr-8 py-1.5 text-sm',
  md: 'px-3 pr-8 py-1.5 text-sm',
  lg: 'px-3 pr-8 py-2 text-sm',
};

const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

/**
 * Select Atom Component
 *
 * Basis-Select-Komponente mit Tailwind CSS Styling
 */
export const Select = React.memo(
  React.forwardRef<HTMLSelectElement, SelectProps>(({ className, variant = 'default', selectSize = 'md', fullWidth = false, options, placeholder, ...props }, ref) => {
    const selectClasses = cn(BASE_STYLES, VARIANTS[variant], SIZES[selectSize], fullWidth && 'w-full', className);

    return (
      <div className="relative">
        <select ref={ref} className={selectClasses} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <PiCaretDown className={cn('pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-muted', ICON_SIZES[selectSize])} aria-hidden="true" />
      </div>
    );
  }),
);

Select.displayName = 'Select';
