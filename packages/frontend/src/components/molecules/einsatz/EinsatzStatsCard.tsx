import { cn } from '@/utils/cn';
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
    default: 'bg-white dark:bg-gray-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const iconColors = {
    default: 'text-gray-400 dark:text-gray-500',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-amber-500 dark:text-amber-400',
    danger: 'text-red-500 dark:text-red-400',
  };

  return (
    <div className={cn('rounded-lg border p-6 shadow-sm transition-all hover:shadow-md', variantClasses[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-600 text-sm dark:text-gray-400">{title}</p>
          <p className="mt-2 font-bold text-3xl text-gray-900 dark:text-gray-100">{value}</p>
          {description && <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">{description}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn('font-medium text-sm', trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500 text-xs dark:text-gray-400">seit letzter Stunde</span>
            </div>
          )}
        </div>
        <div className={cn('ml-4', iconColors[variant])}>{icon}</div>
      </div>
    </div>
  );
}
