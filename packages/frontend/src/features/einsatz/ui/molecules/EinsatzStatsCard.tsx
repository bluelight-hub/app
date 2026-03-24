import { cn } from '@/shared/ui/cn';
import type { ReactNode } from 'react';

interface EinsatzStatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function EinsatzStatsCard({ title, value, icon, trend, description, className, variant = 'default' }: EinsatzStatsCardProps) {
  const variantClasses = {
    default: 'border-border-subtle bg-surface-panel',
    success: 'border-status-success-border bg-status-success-surface',
    warning: 'border-status-warning-border bg-status-warning-surface',
    danger: 'border-status-danger-border bg-status-danger-surface',
  };

  const iconColors = {
    default: 'text-text-muted',
    success: 'text-status-success-text',
    warning: 'text-status-warning-text',
    danger: 'text-status-danger-text',
  };

  return (
    <div className={cn('rounded-panel border p-6 shadow-sm transition-all hover:shadow-md', variantClasses[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-text-muted text-sm">{title}</p>
          <p className="mt-2 font-bold text-3xl text-text-primary">{value}</p>
          {description && <p className="mt-1 text-text-muted text-xs">{description}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn('font-medium text-sm', trend.isPositive ? 'text-status-success-text' : 'text-status-danger-text')}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-text-muted text-xs">seit letzter Stunde</span>
            </div>
          )}
        </div>
        <div className={cn('ml-4', iconColors[variant])}>{icon}</div>
      </div>
    </div>
  );
}
