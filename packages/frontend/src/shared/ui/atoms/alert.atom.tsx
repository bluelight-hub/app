import { cn } from '@/shared/ui/cn';
import type * as React from 'react';
import { PiCheckCircleFill, PiInfoFill, PiWarningFill, PiXCircleFill } from 'react-icons/pi';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /**
   * Accessible role for the alert.
   * Defaults to 'alert' for error status, and 'status' for others.
   */
  role?: string;
}

/**
 * Alert Atom Component
 *
 * Komponente für Benachrichtigungen und Warnungen
 */
function Alert({ status = 'info', title, description, icon, className, children, role, ...props }: AlertProps) {
  const statusStyles = {
    info: 'bg-status-info-surface border-status-info-border text-status-info-text',
    warning: 'bg-status-warning-surface border-status-warning-border text-status-warning-text',
    error: 'bg-status-danger-surface border-status-danger-border text-status-danger-text',
    success: 'bg-status-success-surface border-status-success-border text-status-success-text',
  };

  const defaultIcons = {
    info: <PiInfoFill className="h-5 w-5" aria-hidden="true" />,
    warning: <PiWarningFill className="h-5 w-5" aria-hidden="true" />,
    error: <PiXCircleFill className="h-5 w-5" aria-hidden="true" />,
    success: <PiCheckCircleFill className="h-5 w-5" aria-hidden="true" />,
  };

  // Determine role based on status if not provided
  const defaultRole = status === 'error' ? 'alert' : 'status';

  return (
    <div role={role || defaultRole} className={cn('flex gap-3 rounded-panel border p-3', statusStyles[status], className)} {...props}>
      <div className="flex-shrink-0">{icon || defaultIcons[status]}</div>
      <div className="flex-1">
        {title && <h3 className="mb-1 text-sm font-medium">{title}</h3>}
        {description && <div className="text-sm">{description}</div>}
        {children}
      </div>
    </div>
  );
}

export { Alert };
