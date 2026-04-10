/**
 * Taktische Zeichen — Gefahren
 *
 * Warnsymbole für Gefahrenstellen und -stoffe.
 */

import type { SymbolDefinition } from './symbol-registry';

export const SYMBOLS_GEFAHREN: SymbolDefinition[] = [
  {
    id: 'gf-gefahrstoff',
    category: 'gefahren',
    label: 'Gefahrstoff',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 30,28 2,28" fill="#eab308" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="16" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b" font-family="sans-serif">!</text>
    </svg>`,
  },
  {
    id: 'gf-brand',
    category: 'gefahren',
    label: 'Brandstelle',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 30,28 2,28" fill="#ef4444" stroke="#991b1b" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="16" y="23" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="sans-serif">🔥</text>
    </svg>`,
  },
  {
    id: 'gf-explosion',
    category: 'gefahren',
    label: 'Explosionsgefahr',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 30,28 2,28" fill="#f97316" stroke="#c2410c" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="16" y="24" text-anchor="middle" font-size="12" font-weight="bold" fill="white" font-family="sans-serif">EX</text>
    </svg>`,
  },
  {
    id: 'gf-strahlung',
    category: 'gefahren',
    label: 'Strahlungsgefahr',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="#eab308" stroke="#a16207" stroke-width="1.5"/>
      <text x="16" y="21" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b" font-family="sans-serif">☢</text>
    </svg>`,
  },
  {
    id: 'gf-einsturz',
    category: 'gefahren',
    label: 'Einsturzgefahr',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 30,28 2,28" fill="#eab308" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="16" y="23" text-anchor="middle" font-size="8" font-weight="bold" fill="#1e293b" font-family="sans-serif">EST</text>
    </svg>`,
  },
];
