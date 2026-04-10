/**
 * Taktische Zeichen — Feuerwehr
 *
 * Vereinfachte Symbole nach DIN 14034 (Grundformen).
 * Jedes SVG ist 32x32px mit transparentem Hintergrund.
 */

import type { SymbolDefinition } from './symbol-registry';

export const SYMBOLS_FEUERWEHR: SymbolDefinition[] = [
  {
    id: 'fw-einsatzleitung',
    category: 'feuerwehr',
    label: 'Einsatzleitung',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="sans-serif">EL</text>
    </svg>`,
  },
  {
    id: 'fw-bereitstellungsraum',
    category: 'feuerwehr',
    label: 'Bereitstellungsraum',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#f97316" stroke="#c2410c" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">BR</text>
    </svg>`,
  },
  {
    id: 'fw-loeschgruppe',
    category: 'feuerwehr',
    label: 'Löschgruppe',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">LG</text>
    </svg>`,
  },
  {
    id: 'fw-wasserentnahme',
    category: 'feuerwehr',
    label: 'Wasserentnahmestelle',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="#0ea5e9" stroke="#0369a1" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="sans-serif">W</text>
    </svg>`,
  },
  {
    id: 'fw-atemschutz',
    category: 'feuerwehr',
    label: 'Atemschutz-Sammelplatz',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#eab308" stroke="#a16207" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="#1e293b" font-family="sans-serif">AS</text>
    </svg>`,
  },
];
