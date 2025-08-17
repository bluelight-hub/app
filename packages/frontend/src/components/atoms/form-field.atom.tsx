import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string | React.ReactNode;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  autoCorrect?: 'on' | 'off';
}

/**
 * FormField Atom Component
 *
 * Wrapper für Formularfelder mit Label und Hilfetexten
 */
export function FormField({ label, helperText, error, required, className, children, autoCorrect = 'off' }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label autoCorrect={autoCorrect} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {(helperText || error) && <p className={cn('mt-1 text-sm', error ? 'text-red-600' : 'text-gray-500')}>{error || helperText}</p>}
    </div>
  );
}
