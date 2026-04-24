import { cn } from '@/shared/ui/cn';
import type { ReactNode } from 'react';
import { PiArrowsClockwise, PiCheckCircleFill, PiCloudSlash, PiFloppyDiskLight, PiPencilSimpleLine, PiWarningFill, PiXCircleFill } from 'react-icons/pi';

export type SyncStatusBadgeStatus = 'idle' | 'dirty' | 'debouncing' | 'local-saved' | 'syncing' | 'synced' | 'offline-queued' | 'conflict' | 'error';

export interface SyncStatusBadgeProps {
  readonly status: SyncStatusBadgeStatus;
  readonly savedVersion?: number;
  readonly className?: string;
}

interface StatusView {
  readonly label: string;
  readonly icon: ReactNode;
  readonly className: string;
}

export function SyncStatusBadge({ status, savedVersion, className }: SyncStatusBadgeProps) {
  const views: Record<SyncStatusBadgeStatus, StatusView> = {
    idle: {
      label: 'Synchronisiert',
      icon: <PiCheckCircleFill className="h-4 w-4" aria-hidden="true" />,
      className: 'border-border-subtle bg-surface-panel text-text-muted',
    },
    dirty: {
      label: 'Änderungen offen',
      icon: <PiPencilSimpleLine className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    },
    debouncing: {
      label: 'Änderungen offen',
      icon: <PiPencilSimpleLine className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    },
    'local-saved': {
      label: 'Lokal gespeichert',
      icon: <PiFloppyDiskLight className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-info-border bg-status-info-surface text-status-info-text',
    },
    syncing: {
      label: 'Wird synchronisiert',
      icon: <PiArrowsClockwise className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-info-border bg-status-info-surface text-status-info-text',
    },
    synced: {
      label: savedVersion === undefined ? 'Synchronisiert' : `Version ${savedVersion} gespeichert`,
      icon: <PiCheckCircleFill className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-success-border bg-status-success-surface text-status-success-text',
    },
    'offline-queued': {
      label: 'Offline gespeichert',
      icon: <PiCloudSlash className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    },
    conflict: {
      label: 'Konflikt',
      icon: <PiWarningFill className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    },
    error: {
      label: 'Speichern fehlgeschlagen',
      icon: <PiXCircleFill className="h-4 w-4" aria-hidden="true" />,
      className: 'border-status-danger-border bg-status-danger-surface text-status-danger-text',
    },
  };

  const view = views[status];
  return (
    <span
      aria-live="polite"
      data-testid="sync-status-badge"
      className={cn('inline-flex min-h-[32px] items-center gap-2 rounded-control border px-2.5 py-1 text-body-sm font-medium', view.className, className)}
    >
      <span data-testid="sync-status-badge-icon" className="inline-flex shrink-0 items-center">
        {view.icon}
      </span>
      <span>{view.label}</span>
    </span>
  );
}
