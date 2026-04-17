import type { WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

/**
 * MapGL-kompatible Paint-Objekte für die fünf Warnstufen.
 *
 * Die Werte werden zur Laufzeit aus den Ring-1-CSS-Custom-Properties gelesen — so
 * wirken Light-/Dark-Mode-Wechsel und zukünftige Token-Anpassungen ohne JS-Änderung.
 */
export interface WarnstufeMapStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeWidth: number;
  /** Nur für AKUT gesetzt — zusätzlicher Blur/Glow-Layer in MapGL. */
  glowColor?: string;
  /** Nur für AKUT gesetzt — Blur-Radius in Pixeln. */
  glowWidth?: number;
  /** Nur für KEINE — dashed Stroke, um "unbewertet" optisch abzugrenzen. */
  strokeDasharray?: number[];
}

/**
 * Tailwind-Klassenset für UI-Chips. Drei Signale (Ring-1-Regel): Farbe, Kürzel, Symbol.
 */
export interface WarnstufeChipStyle {
  /** Hintergrund-Utility (`bg-*`). */
  bg: string;
  /** Text-Utility (`text-*`). */
  text: string;
  /** Border-Utility (`border-*`). */
  border: string;
  /** Icon-Farb-Utility (`text-*`). */
  icon: string;
  /** 1-Zeichen-Kürzel für compact-Modus (— / N / M / H / A). */
  kuerzel: string;
}

const WARNSTUFE_CHIP_STYLES: Record<WarnstufeValue, WarnstufeChipStyle> = {
  KEINE: {
    bg: 'bg-surface-raised',
    text: 'text-warnstufe-keine-text',
    border: 'border-warnstufe-keine-stroke',
    icon: 'text-warnstufe-keine-stroke',
    kuerzel: '—',
  },
  NIEDRIG: {
    bg: 'bg-warnstufe-niedrig-fill',
    text: 'text-warnstufe-niedrig-text',
    border: 'border-warnstufe-niedrig-stroke',
    icon: 'text-warnstufe-niedrig-stroke',
    kuerzel: 'N',
  },
  MITTEL: {
    bg: 'bg-warnstufe-mittel-fill',
    text: 'text-warnstufe-mittel-text',
    border: 'border-warnstufe-mittel-stroke',
    icon: 'text-warnstufe-mittel-stroke',
    kuerzel: 'M',
  },
  HOCH: {
    bg: 'bg-warnstufe-hoch-fill',
    text: 'text-warnstufe-hoch-text',
    border: 'border-warnstufe-hoch-stroke',
    icon: 'text-warnstufe-hoch-stroke',
    kuerzel: 'H',
  },
  AKUT: {
    bg: 'bg-warnstufe-akut-fill',
    text: 'text-warnstufe-akut-text',
    border: 'border-warnstufe-akut-stroke',
    icon: 'text-warnstufe-akut-stroke',
    kuerzel: 'A',
  },
};

export { WARNSTUFE_CHIP_STYLES };

/**
 * Liest einen CSS-Custom-Property-Wert vom <html>-Element und trimmt Whitespace.
 * Fallback auf ein Hardcoded-Fallback, wenn die Property nicht gesetzt ist (z. B. SSR oder Jest).
 */
function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

/** Fallback-Farben falls die CSS-Props nicht aufgelöst werden können (z. B. initialer Paint). */
const FALLBACK_FILL: Record<WarnstufeValue, string> = {
  KEINE: 'rgba(144,160,184,0.15)',
  NIEDRIG: 'rgba(62,116,204,0.22)',
  MITTEL: 'rgba(209,138,0,0.35)',
  HOCH: 'rgba(208,100,24,0.45)',
  AKUT: 'rgba(176,32,32,0.55)',
};

const FALLBACK_STROKE: Record<WarnstufeValue, string> = {
  KEINE: '#90a0b8',
  NIEDRIG: '#3e74cc',
  MITTEL: '#d18a00',
  HOCH: '#d06418',
  AKUT: '#b02020',
};

const FALLBACK_AKUT_GLOW = 'rgba(224,64,64,0.55)';

/**
 * Liefert ein MapGL-kompatibles Paint-Objekt für die gegebene Warnstufe.
 *
 * Eskalationsregeln:
 * - KEINE → dashed Stroke (unbewertet / archiv-visualisierung).
 * - AKUT → zusätzlicher Glow-Layer (Blur) oberhalb des normalen Fills.
 * - Stroke-Breite wächst mit der Stufe (klare Hierarchie ohne ausschließliche Farb-Kodierung).
 */
export function getWarnstufeMapStyle(warnstufe: WarnstufeValue): WarnstufeMapStyle {
  const key = warnstufe.toLowerCase();
  const fillColor = readCssVar(`--ring-1-color-warnstufe-${key}-fill`, FALLBACK_FILL[warnstufe]);
  const strokeColor = readCssVar(`--ring-1-color-warnstufe-${key}-stroke`, FALLBACK_STROKE[warnstufe]);

  const base: WarnstufeMapStyle = {
    fillColor,
    strokeColor,
    fillOpacity: 1, // Alpha ist im Token eingebrannt — MapGL multipliziert mit diesem Wert.
    strokeWidth: warnstufe === 'AKUT' ? 3 : warnstufe === 'HOCH' ? 2.5 : 2,
  };

  if (warnstufe === 'KEINE') {
    base.strokeDasharray = [4, 4];
  }

  if (warnstufe === 'AKUT') {
    base.glowColor = readCssVar('--ring-1-color-warnstufe-akut-glow', FALLBACK_AKUT_GLOW);
    base.glowWidth = 12;
  }

  return base;
}
