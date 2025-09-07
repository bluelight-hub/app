import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface StatusCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'blue' | 'yellow' | 'green' | 'gray';
  trendIcon?: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-50 dark:bg-gray-700',
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
  green: 'bg-green-50 dark:bg-green-900/20',
  gray: 'bg-gray-50 dark:bg-gray-700',
};

const textStyles = {
  default: {
    label: 'text-gray-600 dark:text-gray-300',
    value: 'text-gray-900 dark:text-white',
  },
  blue: {
    label: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-900 dark:text-blue-300',
  },
  yellow: {
    label: 'text-yellow-600 dark:text-yellow-400',
    value: 'text-yellow-900 dark:text-yellow-300',
  },
  green: {
    label: 'text-green-600 dark:text-green-400',
    value: 'text-green-900 dark:text-green-300',
  },
  gray: {
    label: 'text-gray-600 dark:text-gray-300',
    value: 'text-gray-900 dark:text-white',
  },
};

export const StatusCard = ({ label, value, variant = 'default', trendIcon, className }: StatusCardProps) => {
  return (
    <div className={cn('rounded-lg p-3', variantStyles[variant], className)}>
      <div className="flex items-center justify-between">
        <p className={cn('font-medium text-sm', textStyles[variant].label)}>{label}</p>
        {trendIcon}
      </div>
      <p className={cn('font-bold text-2xl', textStyles[variant].value)}>{value}</p>
    </div>
  );
};
