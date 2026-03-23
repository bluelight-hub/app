import { cn } from '@/shared/ui/cn';
import { memo } from 'react';
import { PiX } from 'react-icons/pi';

export interface InlineConfirmationProps {
  message: string;
  variant: 'success' | 'error' | 'warning';
  onDismiss?: () => void;
}

const VARIANT_CLASSES = {
  success: 'bg-status-success-surface text-status-success-text border border-status-success-border',
  error: 'bg-status-danger-surface text-status-danger-text border border-status-danger-border',
  warning: 'bg-status-warning-surface text-status-warning-text border border-status-warning-border',
} as const;

/**
 * InlineConfirmation Atom Component
 *
 * Kompakte Inline-Bestätigung für Erfolgs-, Fehler- und Warnmeldungen.
 * Wird zusammen mit dem `useInlineConfirmation` Hook verwendet,
 * der die Auto-Dismiss-Logik steuert.
 */
export const InlineConfirmation = memo(({ message, variant, onDismiss }: InlineConfirmationProps) => {
  return (
    <div
      aria-live="polite"
      role="status"
      className={cn('flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm', 'fade-in slide-in-from-top-1 animate-in duration-200', VARIANT_CLASSES[variant])}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded p-0.5',
            'opacity-70 transition-opacity hover:opacity-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1',
          )}
          aria-label="Meldung schließen"
        >
          <PiX className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

InlineConfirmation.displayName = 'InlineConfirmation';
