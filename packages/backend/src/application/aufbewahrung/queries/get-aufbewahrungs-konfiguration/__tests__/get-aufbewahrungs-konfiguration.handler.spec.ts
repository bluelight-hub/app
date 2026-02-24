import { GetAufbewahrungsKonfigurationQueryHandler } from '../get-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsKonfigurationQuery } from '../get-aufbewahrungs-konfiguration.query';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { Result } from '@domain/common/result';

describe('GetAufbewahrungsKonfigurationQueryHandler', () => {
  let handler: GetAufbewahrungsKonfigurationQueryHandler;
  let mockRepository: { find: jest.Mock };

  beforeEach(() => {
    mockRepository = {
      find: jest.fn(),
    };

    handler = new GetAufbewahrungsKonfigurationQueryHandler(mockRepository as any);
  });

  describe('execute', () => {
    it('sollte gespeicherte Konfiguration zurueckgeben', async () => {
      const konfig = AufbewahrungsKonfiguration.create(5, 60, true).value!;
      mockRepository.find.mockResolvedValue(Result.ok(konfig));

      const result = await handler.execute(new GetAufbewahrungsKonfigurationQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value!.aufbewahrungsfristJahre).toBe(5);
      expect(result.value!.freigabeperiodeTage).toBe(60);
      expect(result.value!.automatischLoeschenAktiv).toBe(true);
    });

    it('sollte Default-Konfiguration zurueckgeben wenn keine gespeichert', async () => {
      mockRepository.find.mockResolvedValue(Result.ok(null));

      const result = await handler.execute(new GetAufbewahrungsKonfigurationQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value!.aufbewahrungsfristJahre).toBe(10);
      expect(result.value!.freigabeperiodeTage).toBe(30);
      expect(result.value!.automatischLoeschenAktiv).toBe(false);
    });

    it('sollte bei Repository-Fehler fehlschlagen', async () => {
      mockRepository.find.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(new GetAufbewahrungsKonfigurationQuery());

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB-Fehler');
    });
  });
});
