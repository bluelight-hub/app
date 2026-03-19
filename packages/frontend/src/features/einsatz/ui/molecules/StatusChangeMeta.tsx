/**
 * StatusChangeMeta — Inline-Komponente für Zeitbezug + Herkunft
 *
 * Zeigt relative Zeit ("vor X Min.") und Herkunft-Label (Absender/System/Nutzer)
 * direkt am Übersichtselement an. Semantisches <time>-Element für Accessibility.
 *
 * Story 2.3 AC1: Zeitpunkt und Herkunft bei Statusänderungen sichtbar
 */

import { formatDisplayDateTime } from '@/shared/lib/dateFormatter';
import { cn } from '@/shared/ui/cn';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { ComponentType } from 'react';
import { PiQuestion, PiRadio, PiRobot, PiUser } from 'react-icons/pi';
import type { StatusChangeMetadata, StatusChangeSource } from '../../utils/status-change-meta';

const SOURCE_ICONS: Record<StatusChangeSource, ComponentType<{ className?: string }>> = {
  system: PiRobot,
  funk: PiRadio,
  user: PiUser,
  unknown: PiQuestion,
};

const SOURCE_ARIA_LABELS: Record<StatusChangeSource, string> = {
  system: 'Automatisch erzeugt',
  funk: 'Per Funk gemeldet',
  user: 'Von Nutzer erfasst',
  unknown: 'Herkunft unbekannt',
};

interface StatusChangeMetaProps {
  meta: StatusChangeMetadata;
  /** Neuester Eintrag wird visuell hervorgehoben */
  isNewest?: boolean;
  /** Lade-Zustand: zeigt Skeleton-Placeholder */
  isLoading?: boolean;
  className?: string;
}

export function StatusChangeMeta({ meta, isNewest = false, isLoading = false, className }: StatusChangeMetaProps) {
  if (isLoading) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)} aria-busy="true">
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-text-muted/30" />
        <span className="h-3 w-16 animate-pulse rounded bg-text-muted/30" />
        <span className="h-3 w-12 animate-pulse rounded bg-text-muted/30" />
      </span>
    );
  }

  const Icon = SOURCE_ICONS[meta.source];
  const ariaLabel = SOURCE_ARIA_LABELS[meta.source];

  const timeDisplay = meta.timestamp ? formatDistanceToNow(meta.timestamp, { locale: de, addSuffix: true }) : null;

  const fullTime = meta.timestamp ? formatDisplayDateTime(meta.timestamp) : undefined;

  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      className={cn('inline-flex items-center gap-1.5 text-body-xs', isNewest ? 'font-semibold text-text-secondary' : 'text-text-muted opacity-70', className)}
    >
      <span className="sr-only">{`${ariaLabel}: ${meta.sourceDisplay}, ${timeDisplay ?? 'Zeitpunkt nicht verfügbar'}`}</span>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{meta.sourceDisplay}</span>
      <span aria-hidden="true" className="text-text-muted">
        ·
      </span>
      {meta.timestamp ? (
        <time dateTime={meta.timestamp.toISOString()} title={fullTime} className="whitespace-nowrap">
          {timeDisplay}
        </time>
      ) : (
        <span className="text-text-muted italic" title="Zeitpunkt nicht verfügbar">
          –
        </span>
      )}
      {meta.version > 1 ? (
        <span
          className="inline-flex items-center rounded-full border border-status-warning-border bg-status-warning-surface px-2 py-0.5 font-medium text-body-xs text-status-warning-text dark:bg-status-warning-surface dark:text-status-warning-text"
          title={`Version ${meta.version} — aktualisiert`}
        >
          v{meta.version}
        </span>
      ) : null}
    </output>
  );
}
