/**
 * Taktische Zeichen — Rettungsdienst
 *
 * Vereinfachte Symbole für Rettungsdienstliche Einrichtungen.
 */

import type { SymbolDefinition } from './symbol-registry';

export const SYMBOLS_RETTUNG: SymbolDefinition[] = [
  {
    id: 'rd-behandlungsplatz',
    category: 'rettung',
    label: 'Behandlungsplatz',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">BHP</text>
    </svg>`,
  },
  {
    id: 'rd-verletztensammelstelle',
    category: 'rettung',
    label: 'Verletztensammelstelle',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">VS</text>
    </svg>`,
  },
  {
    id: 'rd-rettungswache',
    category: 'rettung',
    label: 'Rettungswache',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="white" stroke="#15803d" stroke-width="2"/>
      <line x1="16" y1="9" x2="16" y2="23" stroke="#22c55e" stroke-width="3"/>
      <line x1="9" y1="16" x2="23" y2="16" stroke="#22c55e" stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'rd-hubschrauberlandeplatz',
    category: 'rettung',
    label: 'Hubschrauberlandeplatz',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="white" stroke="#0ea5e9" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="#0ea5e9" font-family="sans-serif">H</text>
    </svg>`,
  },
];
