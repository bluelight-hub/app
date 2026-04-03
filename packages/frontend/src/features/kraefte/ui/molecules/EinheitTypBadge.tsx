/**
 * Badge-Komponente für den Typ einer taktischen Einheit.
 *
 * Zeigt den Einheiten-Typ (z.B. TRUPP, STAFFEL, GRUPPE, ZUG)
 * als dezentes Badge mit neutralem Styling.
 */

import { cn } from '@/shared/ui/cn';

/** Typ-zu-Label Mapping für benutzerfreundliche Anzeige */
const TYP_LABELS: Record<string, string> = {
  TRUPP: 'Trupp',
  STAFFEL: 'Staffel',
  GRUPPE: 'Gruppe',
  ZUG: 'Zug',
  VERBAND: 'Verband',
  ABSCHNITT: 'Abschnitt',
  SONSTIGE: 'Sonstige',
};

interface EinheitTypBadgeProps {
  /** Der Typ-Wert (z.B. 'TRUPP', 'STAFFEL') */
  typ: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Dezentes Badge zur Anzeige des Einheiten-Typs.
 *
 * Nutzt neutrales Styling (surface-raised) um den Status-Badge nicht zu überlagern.
 */
export function EinheitTypBadge({ typ, className }: EinheitTypBadgeProps) {
  const label = TYP_LABELS[typ] ?? typ;

  return <span className={cn('inline-flex rounded-control bg-surface-raised px-2 py-0.5 text-xs text-text-secondary', className)}>{label}</span>;
}
