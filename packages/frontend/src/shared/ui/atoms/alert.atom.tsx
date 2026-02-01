import { cn } from '@/shared/ui/cn';
import { memo } from 'react';
import type * as React from 'react';
import { PiCheckCircleFill, PiInfoFill, PiWarningFill, PiXCircleFill } from 'react-icons/pi';

interface AlertProps {
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

const STATUS_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
};

const DEFAULT_ICONS = {
  info: <PiInfoFill className="h-5 w-5" aria-hidden="true" />,
  warning: <PiWarningFill className="h-5 w-5" aria-hidden="true" />,
  error: <PiXCircleFill className="h-5 w-5" aria-hidden="true" />,
  success: <PiCheckCircleFill className="h-5 w-5" aria-hidden="true" />,
};

/**
 * Alert Atom Component
 *
 * Komponente für Benachrichtigungen und Warnungen
 */
const Alert = memo(({ status = 'info', title, description, icon, className, children, role }: AlertProps) => {
  // Determine role based on status if not provided
  const defaultRole = status === 'error' ? 'alert' : 'status';

  return (
    <div role={role || defaultRole} className={cn('flex gap-3 rounded-lg border p-4', STATUS_STYLES[status], className)}>
      <div className="flex-shrink-0">{icon || DEFAULT_ICONS[status]}</div>
      <div className="flex-1">
        {title && <h3 className="mb-1 font-medium text-sm">{title}</h3>}
        {description && <div className="text-sm">{description}</div>}
        {children}
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';

export { Alert };
