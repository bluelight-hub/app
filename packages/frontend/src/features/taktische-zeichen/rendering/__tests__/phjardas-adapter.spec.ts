/**
 * Unit Tests für PhjardasRenderer.
 *
 * Verifiziert:
 * - renderSvg gibt validen SVG-String zurück
 * - renderDataUrl gibt Data-URL zurück
 * - getSize gibt Tupel [Breite, Höhe] zurück
 * - Optionale Felder werden korrekt weitergegeben
 * - Verschiedene Grundzeichen werden unterstützt
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PhjardasRenderer } from '../phjardas-adapter';

// Mock der taktische-zeichen-core Bibliothek
const mockZeichen = {
  toString: vi.fn(() => '<svg xmlns="http://www.w3.org/2000/svg" width="75" height="75"></svg>'),
  dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
  size: [75, 75] as [number, number],
};

vi.mock('taktische-zeichen-core', () => ({
  erzeugeTaktischesZeichen: vi.fn(() => mockZeichen),
}));

import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';

describe('PhjardasRenderer', () => {
  let renderer: PhjardasRenderer;

  beforeEach(() => {
    renderer = new PhjardasRenderer();
    vi.clearAllMocks();
    // Zurücksetzen auf Standard-Mock-Werte
    mockZeichen.toString.mockReturnValue('<svg xmlns="http://www.w3.org/2000/svg" width="75" height="75"></svg>');
    mockZeichen.dataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    mockZeichen.size = [75, 75];
  });

  describe('renderSvg()', () => {
    it('gibt einen SVG-String zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };

      // When
      const result = renderer.renderSvg(definition);

      // Then
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('ruft erzeugeTaktischesZeichen mit korrektem grundzeichen auf', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };

      // When
      renderer.renderSvg(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledWith(expect.objectContaining({ grundzeichen: 'kraftfahrzeug-gelaendegaengig' }));
    });

    it('übergibt optionale Felder (organisation, fachaufgabe, einheit)', () => {
      // Given
      const definition = {
        grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const,
        organisation: 'feuerwehr' as const,
        fachaufgabe: 'brandbekaempfung' as const,
        einheit: 'gruppe' as const,
      };

      // When
      renderer.renderSvg(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledWith({
        grundzeichen: 'kraftfahrzeug-gelaendegaengig',
        organisation: 'feuerwehr',
        fachaufgabe: 'brandbekaempfung',
        einheit: 'gruppe',
        verwaltungsstufe: undefined,
        symbol: undefined,
        text: undefined,
      });
    });

    it('übergibt verwaltungsstufe und symbol', () => {
      // Given
      const definition = {
        grundzeichen: 'taktische-formation' as const,
        verwaltungsstufe: 'gruppe' as const,
        symbol: 'arzt' as const,
      };

      // When
      renderer.renderSvg(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledWith(
        expect.objectContaining({
          verwaltungsstufe: 'gruppe',
          symbol: 'arzt',
        }),
      );
    });

    it('übergibt text-Feld', () => {
      // Given
      const definition = {
        grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const,
        text: 'RTW 1',
      };

      // When
      renderer.renderSvg(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledWith(expect.objectContaining({ text: 'RTW 1' }));
    });

    it('funktioniert ohne optionale Felder (nur grundzeichen)', () => {
      // Given
      const definition = { grundzeichen: 'taktische-formation' as const };

      // When
      const result = renderer.renderSvg(definition);

      // Then
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('renderDataUrl()', () => {
    it('gibt eine Data-URL zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };

      // When
      const result = renderer.renderDataUrl(definition);

      // Then
      expect(result).toMatch(/^data:/);
    });

    it('gibt den dataUrl-Wert des erzeugten Zeichens zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };
      const expectedUrl = 'data:image/svg+xml;base64,ABC123==';
      mockZeichen.dataUrl = expectedUrl;

      // When
      const result = renderer.renderDataUrl(definition);

      // Then
      expect(result).toBe(expectedUrl);
    });

    it('ruft erzeugeTaktischesZeichen auf', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };

      // When
      renderer.renderDataUrl(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledTimes(1);
    });

    it('übergibt alle Felder der Definition', () => {
      // Given
      const definition = {
        grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const,
        organisation: 'feuerwehr' as const,
      };

      // When
      renderer.renderDataUrl(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledWith(
        expect.objectContaining({
          grundzeichen: 'kraftfahrzeug-gelaendegaengig',
          organisation: 'feuerwehr',
        }),
      );
    });
  });

  describe('getSize()', () => {
    it('gibt ein Tupel [Breite, Höhe] zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };

      // When
      const result = renderer.getSize(definition);

      // Then
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
    });

    it('gibt die Größe des erzeugten Zeichens zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };
      mockZeichen.size = [100, 80];

      // When
      const [width, height] = renderer.getSize(definition);

      // Then
      expect(width).toBe(100);
      expect(height).toBe(80);
    });

    it('ruft erzeugeTaktischesZeichen auf', () => {
      // Given
      const definition = { grundzeichen: 'taktische-formation' as const };

      // When
      renderer.getSize(definition);

      // Then
      expect(erzeugeTaktischesZeichen).toHaveBeenCalledTimes(1);
    });

    it('gibt positive Maße zurück', () => {
      // Given
      const definition = { grundzeichen: 'kraftfahrzeug-gelaendegaengig' as const };
      mockZeichen.size = [75, 75];

      // When
      const [width, height] = renderer.getSize(definition);

      // Then
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });
  });

  describe('Singleton-Export', () => {
    it('renderer ist eine PhjardasRenderer-Instanz', async () => {
      // Given & When
      const { renderer: singletonRenderer } = await import('../phjardas-adapter');

      // Then
      expect(singletonRenderer).toBeInstanceOf(PhjardasRenderer);
    });
  });
});
