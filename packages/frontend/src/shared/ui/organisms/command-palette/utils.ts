import { cn } from '@/shared/ui/cn';
import type { ModuleColor } from './types';

type ColorVariant = 'icon' | 'bg' | 'border';

const MODULE_COLOR_VARIANTS: Record<ModuleColor, Record<ColorVariant, string>> = {
  blue: {
    icon: 'text-status-info-text',
    bg: 'bg-status-info-surface',
    border: 'border-status-info-border',
  },
  purple: {
    icon: 'text-action-primary',
    bg: 'bg-action-secondary',
    border: 'border-action-primary/35',
  },
  green: {
    icon: 'text-status-success-text',
    bg: 'bg-status-success-surface',
    border: 'border-status-success-border',
  },
  orange: {
    icon: 'text-status-warning-text',
    bg: 'bg-status-warning-surface',
    border: 'border-status-warning-border',
  },
  red: {
    icon: 'text-status-danger-text',
    bg: 'bg-status-danger-surface',
    border: 'border-status-danger-border',
  },
  emerald: {
    icon: 'text-status-success-text',
    bg: 'bg-status-success-surface',
    border: 'border-status-success-border',
  },
  cyan: {
    icon: 'text-status-info-text',
    bg: 'bg-status-info-surface',
    border: 'border-status-info-border',
  },
  violet: {
    icon: 'text-action-primary',
    bg: 'bg-action-secondary',
    border: 'border-action-primary/35',
  },
  primary: {
    icon: 'text-action-primary',
    bg: 'bg-action-secondary',
    border: 'border-action-primary/35',
  },
  secondary: {
    icon: 'text-text-secondary',
    bg: 'bg-surface-raised',
    border: 'border-border-subtle',
  },
};

export function getModuleColorClass(color: ModuleColor, variant: ColorVariant = 'icon'): string {
  return MODULE_COLOR_VARIANTS[color]?.[variant] ?? MODULE_COLOR_VARIANTS.blue[variant];
}

export const commandItemClasses = {
  base: cn('group flex items-center gap-3 rounded-xl px-3 py-2.5', 'text-sm transition-all duration-150', 'cursor-pointer select-none', 'outline-none', 'data-[selected=true]:bg-action-secondary'),
  destructive: 'data-[selected=true]:bg-status-danger-surface',
  iconContainer: cn('flex items-center justify-center', 'h-8 w-8 flex-shrink-0 rounded-lg', 'transition-transform group-data-[selected=true]:scale-110'),
  badge: cn('inline-flex items-center rounded-full px-2 py-0.5', 'text-xs font-medium', 'bg-action-secondary text-action-primary'),
  kbd: cn(
    'inline-flex items-center justify-center',
    'h-6 min-w-[1.5rem] px-1.5',
    'text-xs font-medium',
    'bg-surface-raised',
    'text-text-secondary',
    'border border-border-subtle',
    'rounded-md shadow-sm',
  ),
} as const;
