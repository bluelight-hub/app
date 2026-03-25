import { cn } from '@/shared/ui/cn';
import type * as React from 'react';

/**
 * Zod-Fehler-Objekt Struktur (für TanStack Form mit zodValidator)
 */
interface ZodErrorObject {
  message?: string;
  code?: string;
  path?: (string | number)[];
}

interface FormFieldProps {
  label?: string | React.ReactNode;
  helperText?: string;
  /** Fehler kann ein String oder ein Zod-Error-Objekt sein (TanStack Form mit zodValidator) */
  error?: string | ZodErrorObject | undefined;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

/**
 * Extrahiert die Fehlermeldung aus String oder Zod-Error-Objekt.
 */
function getErrorMessage(error: string | ZodErrorObject | undefined): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  return error.message;
}

/**
 * FormField Atom Component
 *
 * Wrapper für Formularfelder mit Label und Hilfetexten
 */
export function FormField({ label, helperText, error, required, className, children, htmlFor }: FormFieldProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="ml-1 text-status-danger-text">*</span>}
        </label>
      )}
      {children}
      {(helperText || errorMessage) && <p className={cn('mt-1 text-sm', errorMessage ? 'text-status-danger-text' : 'text-text-muted')}>{errorMessage || helperText}</p>}
    </div>
  );
}
