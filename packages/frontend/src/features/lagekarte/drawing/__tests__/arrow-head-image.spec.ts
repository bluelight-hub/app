/**
 * Unit Tests für arrow-head-image.ts
 *
 * Verifiziert:
 * - registerArrowHeadImage: Idempotenz, SDF-Registration
 * - ARROW_HEAD_IMAGE: Konstante
 * - SDF-Datenstruktur (Dimensionen, RGBA-Format)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerArrowHeadImage, ARROW_HEAD_IMAGE } from '../arrow-head-image';

describe('arrow-head-image', () => {
  let mockMap: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = {
      hasImage: vi.fn().mockReturnValue(false),
      addImage: vi.fn(),
    };
  });

  describe('ARROW_HEAD_IMAGE', () => {
    it('sollte den erwarteten Image-Namen haben', () => {
      expect(ARROW_HEAD_IMAGE).toBe('arrow-head');
    });
  });

  describe('registerArrowHeadImage', () => {
    it('sollte SDF-Image auf der Map registrieren', () => {
      registerArrowHeadImage(mockMap as any);

      expect(mockMap.addImage).toHaveBeenCalledWith(
        'arrow-head',
        expect.objectContaining({
          width: 48,
          height: 48,
          data: expect.any(Uint8Array),
        }),
        { sdf: true },
      );
    });

    it('sollte korrekte Datengröße (48x48x4 RGBA) erzeugen', () => {
      registerArrowHeadImage(mockMap as any);

      const imageData = mockMap.addImage.mock.calls[0][1];
      // 48 * 48 * 4 = 9216 Bytes (RGBA)
      expect(imageData.data.length).toBe(48 * 48 * 4);
    });

    it('sollte idempotent sein — kein erneutes Registrieren', () => {
      mockMap.hasImage.mockReturnValue(true);

      registerArrowHeadImage(mockMap as any);

      expect(mockMap.addImage).not.toHaveBeenCalled();
    });

    it('sollte RGB-Kanäle auf 0 setzen (SDF nutzt nur Alpha)', () => {
      registerArrowHeadImage(mockMap as any);

      const data: Uint8Array = mockMap.addImage.mock.calls[0][1].data;

      // Stichprobe: Mehrere Pixel prüfen, dass R=0, G=0, B=0
      for (let i = 0; i < 20; i++) {
        const offset = i * 4;
        expect(data[offset]).toBe(0); // R
        expect(data[offset + 1]).toBe(0); // G
        expect(data[offset + 2]).toBe(0); // B
      }
    });

    it('sollte SDF-Werte im gültigen Bereich 0–255 haben', () => {
      registerArrowHeadImage(mockMap as any);

      const data: Uint8Array = mockMap.addImage.mock.calls[0][1].data;

      for (let i = 3; i < data.length; i += 4) {
        expect(data[i]).toBeGreaterThanOrEqual(0);
        expect(data[i]).toBeLessThanOrEqual(255);
      }
    });

    it('sollte hohe Alpha-Werte im Dreieck-Inneren haben (Mitte)', () => {
      registerArrowHeadImage(mockMap as any);

      const data: Uint8Array = mockMap.addImage.mock.calls[0][1].data;

      // Mittelpunkt (24, 28) — sicher im Dreieck-Inneren
      const centerX = 24;
      const centerY = 28;
      const offset = (centerY * 48 + centerX) * 4;
      // SDF-Wert im Inneren > 192 (Kante)
      expect(data[offset + 3]).toBeGreaterThan(192);
    });

    it('sollte niedrige Alpha-Werte außerhalb des Dreiecks haben', () => {
      registerArrowHeadImage(mockMap as any);

      const data: Uint8Array = mockMap.addImage.mock.calls[0][1].data;

      // Ecke (0, 0) — sicher außerhalb des Dreiecks
      const offset = 0 * 4;
      // SDF-Wert außen < 192
      expect(data[offset + 3]).toBeLessThan(192);
    });
  });
});
