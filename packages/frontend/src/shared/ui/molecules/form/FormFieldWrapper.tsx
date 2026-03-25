import type { AnyFieldApi } from '@tanstack/react-form';
import type { ReactNode } from 'react';

interface FormFieldWrapperProps {
  field: AnyFieldApi;
  label: string;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  className?: string;
  children: ReactNode;
}

export function FormFieldWrapper({ field, label, required = false, optional = false, helpText, className = '', children }: FormFieldWrapperProps) {
  return (
    <div className={className}>
      <label htmlFor={field.name} className="block text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="ml-1 text-status-danger-text">*</span>}
        {optional && !required && <span className="ml-2 text-xs text-text-muted">(optional)</span>}
      </label>

      {helpText && <p className="mt-0.5 text-xs text-text-muted">{helpText}</p>}

      {children}

      {field.state.meta.errors.length > 0 && <p className="mt-1 text-sm text-status-danger-text">{field.state.meta.errors.join(', ')}</p>}
    </div>
  );
}
