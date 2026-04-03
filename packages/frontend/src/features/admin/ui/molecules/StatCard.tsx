import { cn } from '@/shared/ui/cn';
import type { ComponentType } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * KPI-Karte für das Admin-Dashboard.
 *
 * Zeigt einen Zahlenwert mit Label, optionalem Icon und Beschreibungstext.
 */
export function StatCard({ label, value, subtext, icon: Icon }: StatCardProps) {
  return (
    <div className="border-border-primary bg-surface-primary rounded-panel border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          {subtext && <p className="mt-1 text-xs text-text-muted">{subtext}</p>}
        </div>
        {Icon && <Icon className="h-5 w-5 text-text-muted" />}
      </div>
    </div>
  );
}
