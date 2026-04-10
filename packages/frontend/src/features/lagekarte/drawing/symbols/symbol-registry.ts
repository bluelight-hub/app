/**
 * Symbolbibliothek-Registry für taktische Zeichen
 *
 * Verwaltet vordefinierte SVG-Symbole für die Lagekarte.
 * Symbole werden als MapLibre-Images registriert und als Point-Features platziert.
 */

import { SYMBOLS_FEUERWEHR } from './feuerwehr';
import { SYMBOLS_RETTUNG } from './rettung';
import { SYMBOLS_GEFAHREN } from './gefahren';
import { SYMBOLS_INFRASTRUKTUR } from './infrastruktur';

/** Kategorien für taktische Symbole */
export type SymbolCategory = 'feuerwehr' | 'rettung' | 'gefahren' | 'infrastruktur';

/** Definition eines Symbols in der Bibliothek */
export interface SymbolDefinition {
  /** Eindeutige Symbol-ID */
  id: string;
  /** Kategorie */
  category: SymbolCategory;
  /** Anzeigename */
  label: string;
  /** SVG-Inhalt als String */
  svgContent: string;
  /** Breite in Pixel für map.addImage */
  width: number;
  /** Höhe in Pixel für map.addImage */
  height: number;
}

/** Anzeigenamen für Kategorien */
export const SYMBOL_CATEGORY_LABELS: Record<SymbolCategory, string> = {
  feuerwehr: 'Feuerwehr',
  rettung: 'Rettungsdienst',
  gefahren: 'Gefahren',
  infrastruktur: 'Infrastruktur',
};

/** Alle Kategorien in Anzeigereihenfolge */
export const SYMBOL_CATEGORIES: SymbolCategory[] = ['feuerwehr', 'rettung', 'gefahren', 'infrastruktur'];

/** Alle registrierten Symbole */
export const SYMBOL_LIBRARY: SymbolDefinition[] = [...SYMBOLS_FEUERWEHR, ...SYMBOLS_RETTUNG, ...SYMBOLS_GEFAHREN, ...SYMBOLS_INFRASTRUKTUR];

/** Symbol nach ID suchen */
export function getSymbolById(id: string): SymbolDefinition | undefined {
  return SYMBOL_LIBRARY.find((s) => s.id === id);
}

/** Symbole nach Kategorie filtern */
export function getSymbolsByCategory(category: SymbolCategory): SymbolDefinition[] {
  return SYMBOL_LIBRARY.filter((s) => s.category === category);
}

/** MapLibre Image-Name für ein Symbol */
export function getSymbolImageName(symbolId: string): string {
  return `symbol-${symbolId}`;
}
