/**
 * Länderliste für AddressInput (DACH + nahe EU).
 *
 * DACH-Länder stehen an erster Stelle, gefolgt von alphabetisch sortierten EU-Nachbarn.
 */

import type { SelectOption } from '@/shared/ui/atoms/select.atom';

/** Unterstützte Länder für PLZ-Lookup (DACH + nahe EU). */
export const DACH_LAENDER: SelectOption[] = [
  // DACH (priorisiert)
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
  // Nahe EU / Nachbarländer (alphabetisch)
  { value: 'BE', label: 'Belgien' },
  { value: 'DK', label: 'Dänemark' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'HR', label: 'Kroatien' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'NL', label: 'Niederlande' },
  { value: 'PL', label: 'Polen' },
  { value: 'SK', label: 'Slowakei' },
  { value: 'SI', label: 'Slowenien' },
  { value: 'CZ', label: 'Tschechien' },
  { value: 'HU', label: 'Ungarn' },
  { value: 'IT', label: 'Italien' },
];
