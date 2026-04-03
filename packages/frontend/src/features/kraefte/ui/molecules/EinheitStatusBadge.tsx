/**
 * Badge-Komponente für den Status einer taktischen Einheit.
 *
 * Farbkodierung nach Einheiten-Status:
 * - AUFGESTELLT: blau (info) - Einheit wurde aufgestellt
 * - EINSATZBEREIT: grün (success) - Einheit ist bereit
 * - IM_EINSATZ: gelb/orange (warning) - Einheit ist aktiv im Einsatz
 * - IN_RESERVE: grau (neutral) - Einheit wartet in Reserve
 * - AUFGELOEST: rot (danger) - Einheit wurde aufgelöst
 */

import { cn } from '@/shared/ui/cn';

/** Status-zu-Style Mapping */
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  AUFGESTELLT: {
    bg: 'bg-status-info-surface',
    text: 'text-status-info-text',
    label: 'Aufgestellt',
  },
  EINSATZBEREIT: {
    bg: 'bg-status-success-surface',
    text: 'text-status-success-text',
    label: 'Einsatzbereit',
  },
  IM_EINSATZ: {
    bg: 'bg-status-warning-surface',
    text: 'text-status-warning-text',
    label: 'Im Einsatz',
  },
  IN_RESERVE: {
    bg: 'bg-surface-raised',
    text: 'text-text-secondary',
    label: 'In Reserve',
  },
  AUFGELOEST: {
    bg: 'bg-status-danger-surface',
    text: 'text-status-danger-text',
    label: 'Aufgelöst',
  },
};

/** Fallback für unbekannte Status */
const DEFAULT_STYLE = {
  bg: 'bg-surface-raised',
  text: 'text-text-muted',
  label: 'Unbekannt',
};

interface EinheitStatusBadgeProps {
  /** Der Status-Wert (z.B. 'EINSATZBEREIT', 'IM_EINSATZ') */
  status: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Badge zur Anzeige des aktuellen Einheiten-Status.
 *
 * Nutzt die gleichen Status-Farben wie die Personal-Badges (bg-status-*-surface / text-status-*-text).
 */
export function EinheitStatusBadge({ status, className }: EinheitStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;

  return <span className={cn('inline-flex rounded-pill px-2.5 py-0.5 text-xs font-medium', style.bg, style.text, className)}>{style.label}</span>;
}
