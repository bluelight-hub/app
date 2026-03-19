import { cn } from '@/shared/ui/cn';
import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';

type WorkspaceStatusTone = 'neutral' | 'info' | 'active' | 'loading' | 'warning' | 'blocked' | 'readonly';

export interface StatusRailAction {
  label: string;
  onClick: () => void;
  autoFocus?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface StatusRailItem {
  id: string;
  label: string;
  description?: string;
  tone: WorkspaceStatusTone;
  icon?: ComponentType<{ className?: string }>;
  value?: ReactNode;
  nextActionLabel?: string;
  nextActionDescription?: string;
  primaryAction?: StatusRailAction;
  role?: 'status' | 'alert';
}

const TONE_CLASSES: Record<WorkspaceStatusTone, string> = {
  neutral: 'border-border-subtle bg-surface-panel text-text-secondary',
  info: 'border-status-info-border bg-status-info-surface text-status-info-text',
  active: 'border-action-primary/35 bg-primary-50 text-action-primary dark:bg-primary-950/40 dark:text-primary-300',
  loading: 'border-status-info-border bg-status-info-surface text-status-info-text',
  warning: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
  blocked: 'border-status-danger-border bg-status-danger-surface text-status-danger-text',
  readonly: 'border-border-subtle bg-surface-raised text-text-secondary',
};

export interface StatusRailProps {
  items?: StatusRailItem[];
  className?: string;
  title?: string;
}

function StatusRailActionButton({ action }: { action: StatusRailAction }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!action.autoFocus || action.disabled) {
      return;
    }

    buttonRef.current?.focus();
  }, [action.autoFocus, action.disabled]);

  return (
    <button
      type="button"
      ref={buttonRef}
      aria-label={action.ariaLabel}
      disabled={action.disabled}
      onClick={action.onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-control border border-action-primary/35 bg-action-primary px-3 py-1.5 font-medium text-body-sm text-text-inverse shadow-button-primary transition-colors',
        'hover:bg-action-primary-hover focus:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {action.label}
    </button>
  );
}

export function StatusRail({ items = [], className, title = 'Workspace-Status' }: StatusRailProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-label={title} className={cn('space-y-1.5', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const role = item.role ?? 'status';
        const liveMode = role === 'alert' ? 'assertive' : 'polite';

        return (
          <div key={item.id} role={role} aria-live={liveMode} aria-atomic="true" className={cn('block rounded-panel border px-2.5 py-1.5 shadow-panel', TONE_CLASSES[item.tone])}>
            <div className="flex items-start gap-3">
              {Icon ? <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-body-sm">{item.label}</span>
                  {item.value ? <span className="text-body-xs">{item.value}</span> : null}
                </div>
                {item.description ? <p className="mt-0.5 text-body-xs opacity-90">{item.description}</p> : null}
                {item.nextActionDescription ? (
                  <p className="mt-1 font-medium text-body-xs opacity-90">
                    {item.nextActionLabel ?? 'Nächster Schritt'}: {item.nextActionDescription}
                  </p>
                ) : null}
                {item.primaryAction ? (
                  <div className="mt-2">
                    <StatusRailActionButton action={item.primaryAction} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
