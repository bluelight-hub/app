/**
 * Taktische Zeichen — Infrastruktur
 *
 * Symbole für Infrastruktur-Einrichtungen und Logistik.
 */

import type { SymbolDefinition } from './symbol-registry';

export const SYMBOLS_INFRASTRUKTUR: SymbolDefinition[] = [
  {
    id: 'if-strassensperre',
    category: 'infrastruktur',
    label: 'Straßensperre',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="10" width="28" height="12" rx="2" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>
      <line x1="6" y1="22" x2="26" y2="10" stroke="white" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'if-sammelplatz',
    category: 'infrastruktur',
    label: 'Sammelplatz',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">SP</text>
    </svg>`,
  },
  {
    id: 'if-versorgung',
    category: 'infrastruktur',
    label: 'Versorgungsstelle',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">VE</text>
    </svg>`,
  },
  {
    id: 'if-pressestelle',
    category: 'infrastruktur',
    label: 'Pressestelle',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="6" width="28" height="20" rx="2" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">PR</text>
    </svg>`,
  },
  {
    id: 'if-lotsenpunkt',
    category: 'infrastruktur',
    label: 'Lotsenpunkt',
    width: 32,
    height: 32,
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="#f97316" stroke="#c2410c" stroke-width="1.5"/>
      <text x="16" y="21" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="sans-serif">LP</text>
    </svg>`,
  },
];
