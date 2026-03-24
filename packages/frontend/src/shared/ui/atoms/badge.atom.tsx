import { cn } from '@/shared/ui/cn';
import { type ReactNode, memo } from 'react';

export type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
  dotColor?: 'green' | 'red' | 'yellow' | 'blue';
}

const VARIANT_CLASSES = {
  default: 'bg-surface-raised text-text-secondary',
  success: 'bg-status-success-surface text-status-success-text',
  error: 'bg-status-danger-surface text-status-danger-text',
  warning: 'bg-status-warning-surface text-status-warning-text',
  info: 'bg-status-info-surface text-status-info-text',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-xs',
};

const DOT_COLORS = {
  green: 'bg-status-success-text',
  red: 'bg-status-danger-text',
  yellow: 'bg-status-warning-text',
  blue: 'bg-status-info-text',
};

/**
 * Badge-Komponente für Status-Anzeigen und Labels
 *
 * Kann optional mit einem animierten Punkt versehen werden.
 */
export const Badge = memo(({ children, variant = 'default', size = 'md', className, dot = false, dotColor = 'green' }: BadgeProps) => {
  return (
    <div className={cn('inline-flex items-center rounded-pill font-medium', VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}>
      {dot && (
        <span className="relative mr-2 flex h-1.5 w-1.5">
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', DOT_COLORS[dotColor])} />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOT_COLORS[dotColor])} />
        </span>
      )}
      {children}
    </div>
  );
});

Badge.displayName = 'Badge';
