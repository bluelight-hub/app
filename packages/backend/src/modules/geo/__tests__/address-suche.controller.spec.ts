// @ts-nocheck
/**
 * Unit Tests für AddressSucheController.
 *
 * Testet HTTP-Mapping: Result → HTTP Response/Exception.
 *
 * @module modules/geo/__tests__
 */

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import type { AddressSucheErgebnis } from '@domain/ports/i-address-suche.port';
import { AddressSucheController } from '../controllers/address-suche.controller';
import { AddressSucheHandler } from '@/application/geo/queries/address-suche.handler';

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

describe('AddressSucheController', () => {
  let controller: AddressSucheController;
  let mockHandler: jest.Mocked<AddressSucheHandler>;

  beforeEach(() => {
    mockHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddressSucheHandler>;

    controller = new AddressSucheController(mockHandler);
  });

  describe('GET /geo/address/search', () => {
    it('sollte Suchergebnisse bei Erfolg zurückgeben', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok(MARIENPLATZ_RESULTS));

      const result = await controller.search('Marienplatz München');

      expect(result).toEqual(MARIENPLATZ_RESULTS);
      expect(mockHandler.execute).toHaveBeenCalledWith('Marienplatz München', {
        lat: undefined,
        lon: undefined,
        lang: undefined,
        limit: undefined,
        countryCode: undefined,
      });
    });

    it('sollte optionale Parameter an Handler weiterleiten', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok(MARIENPLATZ_RESULTS));

      await controller.search('Marienplatz', '48.1372', '11.5761', 'de', '5', 'de');

      expect(mockHandler.execute).toHaveBeenCalledWith('Marienplatz', {
        lat: '48.1372',
        lon: '11.5761',
        lang: 'de',
        limit: 5,
        countryCode: 'de',
      });
    });

    it('sollte Limit auf maximal 10 begrenzen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok([]));

      await controller.search('Test', undefined, undefined, undefined, '50', undefined);

      expect(mockHandler.execute).toHaveBeenCalledWith('Test', expect.objectContaining({ limit: 10 }));
    });

    it('sollte Limit auf mindestens 1 setzen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok([]));

      await controller.search('Test', undefined, undefined, undefined, '0', undefined);

      expect(mockHandler.execute).toHaveBeenCalledWith('Test', expect.objectContaining({ limit: 1 }));
    });

    it('sollte BadRequestException bei ungültigem Input werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.INVALID_INPUT, 'Suchbegriff zu kurz')));

      await expect(controller.search('M')).rejects.toThrow(BadRequestException);
    });

    it('sollte ServiceUnavailableException bei API-Fehler werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, 'API nicht erreichbar')));

      await expect(controller.search('Marienplatz')).rejects.toThrow(ServiceUnavailableException);
    });

    it('sollte ServiceUnavailableException bei unbekanntem Fehler werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail('Unbekannter Fehler'));

      await expect(controller.search('Marienplatz')).rejects.toThrow(ServiceUnavailableException);
    });

    it('sollte ungültiges Limit als Standard behandeln', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok([]));

      await controller.search('Test', undefined, undefined, undefined, 'abc', undefined);

      expect(mockHandler.execute).toHaveBeenCalledWith('Test', expect.objectContaining({ limit: 5 }));
    });
  });
});
