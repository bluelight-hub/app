import { PiClock, PiQuestion, PiXCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

/** Kritikalitaets-Badge-Typ */
export type KritikalitaetBadgeType = 'ueberfaellig' | 'nicht-verstanden' | 'rueckfrage';

interface KritikalitaetBadgeProps {
  type: KritikalitaetBadgeType;
  className?: string;
}

/** Konfiguration pro Badge-Typ */
const BADGE_CONFIG: Record<KritikalitaetBadgeType, { label: string; ariaLabel: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ueberfaellig: {
    label: 'Überfällig',
    ariaLabel: 'Befehl ist überfällig',
    bg: 'bg-status-danger-surface',
    text: 'text-status-danger-text',
    Icon: PiClock,
  },
  'nicht-verstanden': {
    label: 'Nicht verstanden',
    ariaLabel: 'Befehl wurde nicht verstanden',
    bg: 'bg-status-danger-surface',
    text: 'text-status-danger-text',
    Icon: PiXCircle,
  },
  rueckfrage: {
    label: 'Rückfrage',
    ariaLabel: 'Befehl hat offene Rückfrage',
    bg: 'bg-status-warning-surface',
    text: 'text-status-warning-text',
    Icon: PiQuestion,
  },
};

/**
 * Badge-Komponente fuer Befehl-Kritikalitaet.
 *
 * Zeigt immer Icon + Text (WCAG: Farbe nie einziger Indikator).
 * Kompaktes inline-flex Design mit gerundeten Ecken.
 */
export function KritikalitaetBadge({ type, className }: KritikalitaetBadgeProps) {
  const config = BADGE_CONFIG[type];

  return (
    <output className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.text, className)} title={config.ariaLabel} aria-label={config.ariaLabel}>
      <config.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </output>
  );
}
