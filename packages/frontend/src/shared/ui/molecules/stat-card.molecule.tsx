import { cn } from '@/shared/ui/cn';
import type { ComponentType, ReactNode } from 'react';

type StatCardVariant = 'default' | 'info' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ComponentType<{ className?: string }>;
  variant?: StatCardVariant;
  description?: string;
  className?: string;
}

const VARIANT_STYLES: Record<StatCardVariant, { bg: string; icon: string; label: string; value: string }> = {
  default: {
    bg: 'bg-surface-raised',
    icon: 'text-text-muted',
    label: 'text-text-secondary',
    value: 'text-text-primary',
  },
  info: {
    bg: 'bg-status-info-surface',
    icon: 'text-status-info-text',
    label: 'text-status-info-text',
    value: 'text-status-info-text',
  },
  success: {
    bg: 'bg-status-success-surface',
    icon: 'text-status-success-text',
    label: 'text-status-success-text',
    value: 'text-status-success-text',
  },
  warning: {
    bg: 'bg-status-warning-surface',
    icon: 'text-status-warning-text',
    label: 'text-status-warning-text',
    value: 'text-status-warning-text',
  },
  danger: {
    bg: 'bg-status-danger-surface',
    icon: 'text-status-danger-text',
    label: 'text-status-danger-text',
    value: 'text-status-danger-text',
  },
};

/**
 * StatCard-Komponente für KPI-Anzeigen.
 *
 * Zeigt einen Zahlenwert mit Label, optionalem Icon und Beschreibung.
 */
export function StatCard({ label, value, icon: Icon, variant = 'default', description, className }: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={cn('rounded-panel border border-border-subtle p-4', styles.bg, className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('text-sm font-medium', styles.label)}>{label}</p>
          <p className={cn('mt-1 text-2xl font-bold', styles.value)}>{value}</p>
          {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', styles.bg)}>
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
        )}
      </div>
    </div>
  );
}
