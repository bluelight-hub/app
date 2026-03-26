// @ts-nocheck
/**
 * Unit Tests für PlzLookupController.
 *
 * Testet HTTP-Mapping: Result → HTTP Response/Exception.
 *
 * @module modules/geo/__tests__
 */

import { NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import type { PlzLookupErgebnis } from '@domain/ports/i-plz-lookup.port';
import { PlzLookupController } from '../controllers/plz-lookup.controller';
import { PlzLookupHandler } from '@/application/geo/queries/plz-lookup.handler';

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

describe('PlzLookupController', () => {
  let controller: PlzLookupController;
  let mockHandler: jest.Mocked<PlzLookupHandler>;

  beforeEach(() => {
    mockHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PlzLookupHandler>;

    controller = new PlzLookupController(mockHandler);
  });

  describe('GET /geo/plz/:countryCode/:plz', () => {
    it('sollte PLZ-Ergebnis bei Erfolg zurückgeben', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.ok(MUENCHEN_RESULT));

      const result = await controller.lookup('DE', '80331');

      expect(result).toEqual(MUENCHEN_RESULT);
      expect(mockHandler.execute).toHaveBeenCalledWith('DE', '80331');
    });

    it('sollte NotFoundException bei PLZ nicht gefunden werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.PLZ_NOT_FOUND, 'PLZ nicht gefunden')));

      await expect(controller.lookup('DE', '00000')).rejects.toThrow(NotFoundException);
    });

    it('sollte BadRequestException bei nicht unterstütztem Land werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.COUNTRY_NOT_SUPPORTED, 'Land nicht unterstützt')));

      await expect(controller.lookup('XX', '12345')).rejects.toThrow(BadRequestException);
    });

    it('sollte ServiceUnavailableException bei API-Fehler werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, 'API nicht erreichbar')));

      await expect(controller.lookup('DE', '80331')).rejects.toThrow(ServiceUnavailableException);
    });

    it('sollte ServiceUnavailableException bei unbekanntem Fehler werfen', async () => {
      mockHandler.execute.mockResolvedValueOnce(Result.fail('Unbekannter Fehler'));

      await expect(controller.lookup('DE', '80331')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
