/**
 * Styling-Definitionen für FunkPrioritaet.
 *
 * Wird von Atoms (FunkPrioritaetBadge) und Molecules (FunkspruchBubble,
 * FunkspruchCompactRow) gemeinsam konsumiert, damit ein einzelnes Feld
 * die visuelle Sprache festlegt.
 */

import type { FunkPrioritaetFilter } from '../stores/funkprotokoll-filter.store';

export interface PrioritaetStyle {
  /** Text-Farbklasse (tailwind). */
  text: string;
  /** Rand-Farbklasse (tailwind). */
  border: string;
  /** Hintergrund-Farbklasse (tailwind, dezent). */
  background: string;
  /** Deutsches Label für Screenreader + Chip-Text. */
  label: string;
  /** Symbol-Bezeichner (für Icon-Mapping im Badge). */
  icon: 'radio' | 'warning' | 'siren';
  /** Soll die Darstellung pulsieren (Notfall). */
  pulse?: boolean;
}

export const PRIORITAET_STYLES: Record<FunkPrioritaetFilter, PrioritaetStyle> = {
  routine: {
    text: 'text-slate-700 dark:text-slate-200',
    border: 'border-slate-300 dark:border-slate-600',
    background: 'bg-slate-100 dark:bg-slate-800/60',
    label: 'Routine',
    icon: 'radio',
  },
  prioritaet: {
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500 dark:border-amber-500',
    background: 'bg-amber-50 dark:bg-amber-900/30',
    label: 'Priorität',
    icon: 'warning',
  },
  notfall: {
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-600 dark:border-red-500',
    background: 'bg-red-50 dark:bg-red-900/30',
    label: 'Notfall',
    icon: 'siren',
    pulse: true,
  },
};
