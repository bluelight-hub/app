import { describe, it, expect } from 'vitest';
import { truncateAbloesezeitenForTooltip } from '../abloesezeiten';

/**
 * Unit-Tests für die Ablösezeiten-Tooltip-Truncation (Story 4.2 / Vorbereitung
 * für Story 4.3 MapGL-Marker-Tooltip). Reine Funktion — keine Side Effects.
 */
describe('truncateAbloesezeitenForTooltip', () => {
  it('liefert einen Leerstring bei null', () => {
    expect(truncateAbloesezeitenForTooltip(null)).toBe('');
  });

  it('liefert einen Leerstring bei undefined', () => {
    expect(truncateAbloesezeitenForTooltip(undefined)).toBe('');
  });

  it('liefert einen Leerstring bei leerem String', () => {
    expect(truncateAbloesezeitenForTooltip('')).toBe('');
  });

  it('lässt Texte mit exakt 120 Zeichen unverändert (kein Suffix)', () => {
    const text = 'a'.repeat(120);
    const result = truncateAbloesezeitenForTooltip(text);

    expect(result).toBe(text);
    expect(result).toHaveLength(120);
    expect(result.endsWith('…')).toBe(false);
  });

  it('kürzt Texte mit 121 Zeichen auf 120 Zeichen inkl. Ellipsen-Suffix', () => {
    const text = 'a'.repeat(121);
    const result = truncateAbloesezeitenForTooltip(text);

    expect(result).toHaveLength(120);
    expect(result.endsWith('…')).toBe(true);
    // 119 Inhalts-Zeichen + 1 Ellipsen-Zeichen = 120 Zeichen total.
    expect(result.slice(0, -1)).toBe('a'.repeat(119));
  });

  it('kollabiert Whitespace inkl. Zeilenumbrüchen und Tabs zu einem Leerzeichen', () => {
    const input = '08:00\n\n12:00\t\tTrupp 1';

    expect(truncateAbloesezeitenForTooltip(input)).toBe('08:00 12:00 Trupp 1');
  });

  it('kollabiert mehrere aufeinanderfolgende Spaces zu einem Space', () => {
    expect(truncateAbloesezeitenForTooltip('A   B')).toBe('A B');
  });

  it('greift mit Standardwert maxChars=120 und respektiert custom maxChars=10', () => {
    const longText = 'Der frühe Vogel fängt den Wurm — mit ÄÖÜß';

    // Standardwert greift (Text < 120 Zeichen, keine Kürzung).
    expect(truncateAbloesezeitenForTooltip(longText)).toBe(longText);

    // Custom maxChars=10 → 9 Inhalts-Zeichen + „…" = 10 Zeichen total.
    const result = truncateAbloesezeitenForTooltip(longText, 10);
    expect(result).toHaveLength(10);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('Der frühe…');
  });
});
