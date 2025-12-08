import { cn } from '@/shared/ui/cn';
import type { ModuleColor } from './types';

type ColorVariant = 'icon' | 'bg' | 'border';

const MODULE_COLOR_VARIANTS: Record<ModuleColor, Record<ColorVariant, string>> = {
  blue: {
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  purple: {
    icon: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
  },
  green: {
    icon: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  orange: {
    icon: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
  },
  red: {
    icon: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  cyan: {
    icon: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800',
  },
  primary: {
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  secondary: {
    icon: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

export function getModuleColorClass(color: ModuleColor, variant: ColorVariant = 'icon'): string {
  return MODULE_COLOR_VARIANTS[color]?.[variant] ?? MODULE_COLOR_VARIANTS.blue[variant];
}

export const commandItemClasses = {
  base: cn(
    'group flex items-center gap-3 rounded-xl px-3 py-2.5',
    'text-sm transition-all duration-150',
    'cursor-pointer select-none',
    'outline-none',
    'data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-gray-800',
  ),
  destructive: 'data-[selected=true]:bg-red-50 dark:data-[selected=true]:bg-red-900/20',
  iconContainer: cn('flex items-center justify-center', 'h-8 w-8 flex-shrink-0 rounded-lg', 'transition-transform group-data-[selected=true]:scale-110'),
  badge: cn('inline-flex items-center rounded-full px-2 py-0.5', 'font-medium text-xs', 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'),
  kbd: cn(
    'inline-flex items-center justify-center',
    'h-6 min-w-[1.5rem] px-1.5',
    'font-medium text-xs',
    'bg-gray-100 dark:bg-gray-800',
    'text-gray-600 dark:text-gray-400',
    'border border-gray-200 dark:border-gray-700',
    'rounded-md shadow-sm',
  ),
} as const;
