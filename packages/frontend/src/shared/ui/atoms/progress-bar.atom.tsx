import { memo } from 'react';
import { cn } from '@/shared/ui/cn';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

const variantClasses = {
  default: 'bg-action-primary',
  success: 'bg-status-success-text',
  warning: 'bg-status-warning-text',
  error: 'bg-status-danger-text',
  info: 'bg-status-info-text',
};

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const backgroundClasses = {
  default: 'bg-surface-raised',
  success: 'bg-status-success-surface',
  warning: 'bg-status-warning-surface',
  error: 'bg-status-danger-surface',
  info: 'bg-status-info-surface',
};

/**
 * ProgressBar-Komponente für Fortschrittsanzeigen
 *
 * Zeigt einen animierten Fortschrittsbalken mit verschiedenen Varianten und Größen.
 */
export const ProgressBar = memo(function ProgressBarImpl({ value, max = 100, variant = 'default', size = 'md', label, showPercentage = false, animated = true, className }: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="text-sm font-medium text-text-secondary">{label}</span>}
          {showPercentage && <span className="text-sm font-medium text-text-secondary">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full', backgroundClasses[variant], sizeClasses[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={cn('h-full origin-left rounded-full', 'transition-all duration-500 ease-out', variantClasses[variant], animated && 'animate-pulse')} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
});
