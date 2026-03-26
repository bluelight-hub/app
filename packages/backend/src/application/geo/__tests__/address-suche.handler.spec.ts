// @ts-nocheck
/**
 * Unit Tests für AddressSucheHandler.
 *
 * Testet Input-Validierung und Delegation an den Port.
 *
 * @module application/geo/__tests__
 */

import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import type { IAddressSuchePort, AddressSucheErgebnis } from '@domain/ports/i-address-suche.port';
import { AddressSucheHandler } from '../queries/address-suche.handler';

const createMockPort = (): jest.Mocked<IAddressSuchePort> => ({
  search: jest.fn(),
});

const MARIENPLATZ_RESULTS: AddressSucheErgebnis[] = [
  {
    strasse: 'Marienplatz',
    hausnummer: '1',
    ort: 'München',
    plz: '80331',
    bundesland: 'Bayern',
    land: 'Germany',
    laengengrad: '11.5761',
    breitengrad: '48.1372',
  },
];

describe('AddressSucheHandler', () => {
  let handler: AddressSucheHandler;
  let mockPort: jest.Mocked<IAddressSuchePort>;

  beforeEach(() => {
    mockPort = createMockPort();
    handler = new AddressSucheHandler(mockPort);
  });

  describe('Input-Validierung', () => {
    it('sollte zu kurzen Suchbegriff ablehnen (1 Zeichen)', async () => {
      const result = await handler.execute('M');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
      expect(mockPort.search).not.toHaveBeenCalled();
    });

    it('sollte leeren Suchbegriff ablehnen', async () => {
      const result = await handler.execute('');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
    });

    it('sollte zu langen Suchbegriff ablehnen (>100 Zeichen)', async () => {
      const longQuery = 'A'.repeat(101);
      const result = await handler.execute(longQuery);

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.INVALID_INPUT)).toBe(true);
    });

    it('sollte genau 2 Zeichen akzeptieren', async () => {
      mockPort.search.mockResolvedValueOnce(Result.ok([]));

      const result = await handler.execute('Mü');

      expect(result.isSuccess).toBe(true);
      expect(mockPort.search).toHaveBeenCalled();
    });

    it('sollte genau 100 Zeichen akzeptieren', async () => {
      mockPort.search.mockResolvedValueOnce(Result.ok([]));

      const result = await handler.execute('A'.repeat(100));

      expect(result.isSuccess).toBe(true);
      expect(mockPort.search).toHaveBeenCalled();
    });
  });

  describe('Erfolgreiche Suche', () => {
    it('sollte an Port delegieren und Ergebnisse zurückgeben', async () => {
      mockPort.search.mockResolvedValueOnce(Result.ok(MARIENPLATZ_RESULTS));

      const result = await handler.execute('Marienplatz München');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(MARIENPLATZ_RESULTS);
      expect(mockPort.search).toHaveBeenCalledWith('Marienplatz München', undefined);
    });

    it('sollte Optionen an Port weiterleiten', async () => {
      mockPort.search.mockResolvedValueOnce(Result.ok(MARIENPLATZ_RESULTS));

      const options = { lat: '48.1372', lon: '11.5761', lang: 'de', limit: 5, countryCode: 'de' };
      await handler.execute('Marienplatz', options);

      expect(mockPort.search).toHaveBeenCalledWith('Marienplatz', options);
    });
  });

  describe('Port-Fehler', () => {
    it('sollte Port-Fehler durchreichen', async () => {
      mockPort.search.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, 'API nicht erreichbar')));

      const result = await handler.execute('Marienplatz');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.SERVICE_UNAVAILABLE)).toBe(true);
    });
  });
});
