import { cn } from '@/shared/ui/cn';
import type { ComponentType, ReactNode } from 'react';

export type PriorityPanelTone = 'neutral' | 'active' | 'warning' | 'critical' | 'observing';

export interface PriorityPanelProps {
  title: ReactNode;
  description: ReactNode;
  ariaLabel?: string;
  marker?: ReactNode;
  meta?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: PriorityPanelTone;
  children?: ReactNode;
  className?: string;
}

const PANEL_TONE_CLASSES: Record<PriorityPanelTone, string> = {
  neutral: 'border-border-subtle bg-surface-panel text-text-primary',
  active: 'border-status-info-border bg-status-info-surface text-status-info-text',
  warning: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
  critical: 'border-status-danger-border bg-status-danger-surface text-status-danger-text',
  observing: 'border-border-subtle bg-surface-raised text-text-primary',
};

const MARKER_TONE_CLASSES: Record<PriorityPanelTone, string> = {
  neutral: 'border-border-subtle bg-surface-canvas text-text-secondary',
  active: 'border-status-info-border bg-surface-panel text-status-info-text',
  warning: 'border-status-warning-border bg-surface-panel text-status-warning-text',
  critical: 'border-status-danger-border bg-surface-panel text-status-danger-text',
  observing: 'border-border-subtle bg-surface-panel text-text-secondary',
};

export function PriorityPanel({ title, description, ariaLabel = 'Prioritätsfläche', marker, meta, icon: Icon, tone = 'neutral', children, className }: PriorityPanelProps) {
  return (
    <section aria-label={ariaLabel} className={cn('rounded-panel border shadow-panel', PANEL_TONE_CLASSES[tone], className)}>
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            {marker ? (
              <div>
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-body-xs font-medium tracking-[0.05em] uppercase', MARKER_TONE_CLASSES[tone])}>{marker}</span>
              </div>
            ) : null}

            <div className="flex items-start gap-3">
              {Icon ? <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" /> : null}
              <div className="min-w-0">
                <h2 className="text-title-md font-semibold">{title}</h2>
                <p className="mt-1 max-w-3xl text-body-sm opacity-90">{description}</p>
              </div>
            </div>
          </div>

          {meta ? <div className="w-full max-w-sm">{meta}</div> : null}
        </div>

        {children ? <div className="space-y-2">{children}</div> : null}
      </div>
    </section>
  );
}
