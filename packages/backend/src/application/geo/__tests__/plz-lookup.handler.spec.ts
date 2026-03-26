// @ts-nocheck
/**
 * Unit Tests für PlzLookupHandler.
 *
 * Testet Input-Validierung und Delegation an den Port.
 *
 * @module application/geo/__tests__
 */

import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import type { IPlzLookupPort, PlzLookupErgebnis } from '@domain/ports/i-plz-lookup.port';
import { PlzLookupHandler } from '../queries/plz-lookup.handler';

const createMockPort = (): jest.Mocked<IPlzLookupPort> => ({
  lookup: jest.fn(),
});

const MUENCHEN_RESULT: PlzLookupErgebnis = {
  postleitzahl: '80331',
  land: 'Germany',
  landKuerzel: 'DE',
  orte: [
    {
      ortsname: 'München',
      bundesland: 'Bayern',
      bundeslandKuerzel: 'BY',
      laengengrad: '11.571',
      breitengrad: '48.1345',
    },
  ],
};

describe('PlzLookupHandler', () => {
  let handler: PlzLookupHandler;
  let mockPort: jest.Mocked<IPlzLookupPort>;

  beforeEach(() => {
    mockPort = createMockPort();
    handler = new PlzLookupHandler(mockPort);
  });

  describe('Input-Validierung', () => {
    it('sollte ungültigen Ländercode ablehnen (zu lang)', async () => {
      const result = await handler.execute('DEU', '80331');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
      expect(mockPort.lookup).not.toHaveBeenCalled();
    });

    it('sollte ungültigen Ländercode ablehnen (Ziffern)', async () => {
      const result = await handler.execute('12', '80331');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
    });

    it('sollte zu kurze PLZ ablehnen', async () => {
      const result = await handler.execute('DE', '12');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
    });

    it('sollte zu lange PLZ ablehnen', async () => {
      const result = await handler.execute('DE', '12345678901');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
    });
  });

  describe('Erfolgreicher Lookup', () => {
    it('sollte an Port delegieren und Ergebnis zurückgeben', async () => {
      mockPort.lookup.mockResolvedValueOnce(Result.ok(MUENCHEN_RESULT));

      const result = await handler.execute('DE', '80331');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(MUENCHEN_RESULT);
      expect(mockPort.lookup).toHaveBeenCalledWith('DE', '80331');
    });

    it('sollte Kleinbuchstaben-Input zu Großbuchstaben konvertieren', async () => {
      mockPort.lookup.mockResolvedValueOnce(Result.ok(MUENCHEN_RESULT));

      await handler.execute('de', '80331');

      expect(mockPort.lookup).toHaveBeenCalledWith('DE', '80331');
    });
  });

  describe('Port-Fehler', () => {
    it('sollte Port-Fehler durchreichen', async () => {
      mockPort.lookup.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.PLZ_NOT_FOUND, 'PLZ nicht gefunden')));

      const result = await handler.execute('DE', '00000');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.PLZ_NOT_FOUND)).toBe(true);
    });
  });
});
