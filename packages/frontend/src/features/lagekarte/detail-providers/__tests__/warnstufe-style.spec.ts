import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWarnstufeMapStyle } from '../warnstufe-style';

describe('getWarnstufeMapStyle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liest Fill + Stroke aus den CSS-Custom-Properties', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue: (name: string) => {
            if (name === '--ring-1-color-warnstufe-mittel-fill') return ' rgba(1, 2, 3, 0.4) ';
            if (name === '--ring-1-color-warnstufe-mittel-stroke') return '#abcdef';
            return '';
          },
        }) as unknown as CSSStyleDeclaration,
    );

    const style = getWarnstufeMapStyle('MITTEL');
    expect(style.fillColor).toBe('rgba(1, 2, 3, 0.4)');
    expect(style.strokeColor).toBe('#abcdef');
    expect(style.strokeDasharray).toBeUndefined();
    expect(style.glowColor).toBeUndefined();
  });

  it('greift auf Fallback-Farben zurück, wenn CSS-Props leer sind', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue: () => '',
        }) as unknown as CSSStyleDeclaration,
    );

    const style = getWarnstufeMapStyle('NIEDRIG');
    expect(style.fillColor).toBe('rgba(62,116,204,0.22)');
    expect(style.strokeColor).toBe('#3e74cc');
  });

  it('liefert dashed Stroke für KEINE', () => {
    const style = getWarnstufeMapStyle('KEINE');
    expect(style.strokeDasharray).toEqual([4, 4]);
  });

  it('liefert Glow-Konfiguration für AKUT', () => {
    const style = getWarnstufeMapStyle('AKUT');
    expect(style.glowColor).toBeDefined();
    expect(style.glowWidth).toBeGreaterThan(0);
    expect(style.strokeWidth).toBeGreaterThan(2);
  });

  it('skaliert Stroke-Breite monoton: NIEDRIG < HOCH < AKUT', () => {
    const niedrig = getWarnstufeMapStyle('NIEDRIG').strokeWidth;
    const hoch = getWarnstufeMapStyle('HOCH').strokeWidth;
    const akut = getWarnstufeMapStyle('AKUT').strokeWidth;
    expect(niedrig).toBeLessThan(hoch);
    expect(hoch).toBeLessThan(akut);
  });
});
