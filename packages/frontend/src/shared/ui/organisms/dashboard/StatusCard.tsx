import { cn } from '@/shared/ui/cn';
import type { ReactNode } from 'react';

interface StatusCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'blue' | 'yellow' | 'green' | 'gray';
  trendIcon?: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'bg-surface-raised',
  blue: 'bg-status-info-surface',
  yellow: 'bg-status-warning-surface',
  green: 'bg-status-success-surface',
  gray: 'bg-surface-raised',
};

const textStyles = {
  default: {
    label: 'text-text-secondary',
    value: 'text-text-primary',
  },
  blue: {
    label: 'text-status-info-text',
    value: 'text-status-info-text',
  },
  yellow: {
    label: 'text-status-warning-text',
    value: 'text-status-warning-text',
  },
  green: {
    label: 'text-status-success-text',
    value: 'text-status-success-text',
  },
  gray: {
    label: 'text-text-secondary',
    value: 'text-text-primary',
  },
};

export const StatusCard = ({ label, value, variant = 'default', trendIcon, className }: StatusCardProps) => {
  return (
    <div className={cn('rounded-lg p-3', variantStyles[variant], className)}>
      <div className="flex items-center justify-between">
        <p className={cn('text-sm font-medium', textStyles[variant].label)}>{label}</p>
        {trendIcon}
      </div>
      <p className={cn('text-2xl font-bold', textStyles[variant].value)}>{value}</p>
    </div>
  );
};
