/**
 * ContinuityStatusRail — Inline-Statusanzeige für ETB Save/Sync-Zustände
 *
 * Zeigt den aktuellen Sync-Status als Icon + Text + optionale Aktion inline
 * im Arbeitskontext an. KEIN Color-Only-Encoding (immer Text + Icon).
 *
 * Accessibility: aria-live="polite" + aria-atomic="true", role="alert" nur bei Fehlern.
 * UX-DR20/23/25: Inline-Status statt Toast-Notifications.
 */

import { cn } from '@/shared/ui/cn';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import type { SyncStatusInfo, EtbSyncStatus } from '../../types/sync-status.types';
import { useEffect, useRef, useState } from 'react';
import { PiCheckCircle, PiWarningCircle, PiXCircle, PiLock, PiWifiSlash, PiArrowsClockwise } from 'react-icons/pi';

interface ContinuityStatusRailProps {
  /** Sync-Status-Info vom useEtbSyncStatus Hook */
  syncStatus: SyncStatusInfo;
  /** Dauer in ms nach der der synced-Status ausgeblendet wird (Standard: 3000) */
  syncedFadeMs?: number;
}

/** Tone-Mapping: Status → Tailwind-Farbklassen */
const STATUS_TONE: Record<EtbSyncStatus, string> = {
  'local-draft': 'text-text-secondary',
  syncing: 'text-status-info-text',
  synced: 'text-status-success-text',
  failed: 'text-status-danger-text',
  'conflict-retry': 'text-status-warning-text',
  'degraded-connection': 'text-status-warning-text',
  'readonly-locked': 'text-text-secondary',
};

/** Status → Icon-Mapping */
function StatusIcon({ status }: { status: EtbSyncStatus }) {
  const iconClass = 'h-4 w-4 shrink-0';
  switch (status) {
    case 'syncing':
      return <Spinner type="ring" size="xs" className={cn(iconClass, 'text-status-info-text')} label="Synchronisierung läuft" />;
    case 'synced':
      return <PiCheckCircle className={cn(iconClass, 'text-status-success-text')} aria-hidden="true" />;
    case 'failed':
      return <PiXCircle className={cn(iconClass, 'text-status-danger-text')} aria-hidden="true" />;
    case 'conflict-retry':
      return <PiWarningCircle className={cn(iconClass, 'text-status-warning-text')} aria-hidden="true" />;
    case 'degraded-connection':
      return <PiWifiSlash className={cn(iconClass, 'text-status-warning-text')} aria-hidden="true" />;
    case 'readonly-locked':
      return <PiLock className={cn(iconClass, 'text-text-secondary')} aria-hidden="true" />;
    default:
      return null;
  }
}

/**
 * Inline-Statusanzeige für den ETB Composer Workspace
 *
 * Wird zwischen Header und EtbEntryForm platziert.
 * Blendet den synced-Status nach 3s automatisch aus.
 */
export function ContinuityStatusRail({ syncStatus, syncedFadeMs = 3000 }: ContinuityStatusRailProps) {
  const [visible, setVisible] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Sichtbarkeit steuern + synced-Ausblendung
  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (syncStatus.status === 'local-draft') {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (syncStatus.status === 'synced') {
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, syncedFadeMs);
    }

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [syncStatus.status, syncedFadeMs]);

  // Fokus-Management: Nach Retry → Fokus auf Rail für Status-Update
  const handleRetryClick = () => {
    syncStatus.nextAction?.handler?.();
    // Fokus auf Rail setzen für SR-Announcement des Status-Updates
    railRef.current?.focus();
  };

  if (!visible) {
    // Leere aria-live Region beibehalten für SR-Announcements
    return (
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {/* Leer wenn kein Status aktiv */}
      </div>
    );
  }

  // role="alert" nur für kritische Fehler-Zustände
  const isCritical = syncStatus.status === 'failed' || syncStatus.status === 'degraded-connection';

  return (
    <div
      ref={railRef}
      role={isCritical ? 'alert' : 'status'}
      aria-live={isCritical ? undefined : 'polite'}
      aria-atomic="true"
      tabIndex={-1}
      className={cn(
        'focus:outline-none focus-visible:shadow-focus-ring',
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-opacity duration-200',
        syncStatus.status === 'synced' && 'bg-status-success-surface',
        syncStatus.status === 'syncing' && 'bg-status-info-surface',
        syncStatus.status === 'failed' && 'bg-status-danger-surface',
        (syncStatus.status === 'degraded-connection' || syncStatus.status === 'conflict-retry') && 'bg-status-warning-surface',
        syncStatus.status === 'readonly-locked' && 'bg-gray-50 dark:bg-gray-800',
      )}
    >
      <StatusIcon status={syncStatus.status} />
      <span className={cn('flex-1', STATUS_TONE[syncStatus.status])}>{syncStatus.message}</span>

      {/* Next-Action: Interaktiver Button wenn Handler vorhanden (failed, conflict-retry) */}
      {syncStatus.nextAction?.handler && (
        <button
          type="button"
          onClick={handleRetryClick}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-xs focus:outline-none focus-visible:shadow-focus-ring',
            STATUS_TONE[syncStatus.status],
            syncStatus.status === 'failed' && 'hover:bg-status-danger-surface/80',
            syncStatus.status === 'conflict-retry' && 'hover:bg-status-warning-surface/80',
          )}
        >
          <PiArrowsClockwise className="h-3.5 w-3.5" aria-hidden="true" />
          {syncStatus.nextAction.label}
        </button>
      )}

      {/* Textuelle Hinweise für nicht-interaktive Zustände */}
      {syncStatus.nextAction && !syncStatus.nextAction.handler && <span className={cn('text-xs', STATUS_TONE[syncStatus.status])}>{syncStatus.nextAction.label}</span>}
    </div>
  );
}
