import { GetAufbewahrungsVorschauQueryHandler } from '../get-aufbewahrungs-vorschau.handler';
import { GetAufbewahrungsVorschauQuery } from '../get-aufbewahrungs-vorschau.query';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { Result } from '@domain/common/result';

describe('GetAufbewahrungsVorschauQueryHandler', () => {
  let handler: GetAufbewahrungsVorschauQueryHandler;
  let mockPrisma: { einsatz: { findMany: jest.Mock } };
  let mockKonfigurationRepository: { find: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      einsatz: {
        findMany: jest.fn(),
      },
    };

    mockKonfigurationRepository = {
      find: jest.fn(),
    };

    handler = new GetAufbewahrungsVorschauQueryHandler(mockPrisma as any, mockKonfigurationRepository as any);
  });

  describe('execute', () => {
    it('sollte betroffene Einsaetze zurueckgeben', async () => {
      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrisma.einsatz.findMany.mockResolvedValue([
        {
          id: 'einsatz-1',
          nummer: 'E2016-abc123',
          archivedAt: new Date('2016-01-15'),
          _count: { befehle: 5 },
        },
      ]);

      const result = await handler.execute(new GetAufbewahrungsVorschauQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsaetze).toHaveLength(1);
      expect(result.value!.einsaetze[0].einsatzId).toBe('einsatz-1');
      expect(result.value!.einsaetze[0].befehlCount).toBe(5);
      expect(result.value!.gesamtBefehlCount).toBe(5);
    });

    it('sollte leere Vorschau zurueckgeben wenn keine betroffenen', async () => {
      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrisma.einsatz.findMany.mockResolvedValue([]);

      const result = await handler.execute(new GetAufbewahrungsVorschauQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsaetze).toEqual([]);
      expect(result.value!.gesamtBefehlCount).toBe(0);
    });

    it('sollte Default-Konfiguration verwenden wenn keine gespeichert', async () => {
      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(null));
      mockPrisma.einsatz.findMany.mockResolvedValue([]);

      const result = await handler.execute(new GetAufbewahrungsVorschauQuery());

      expect(result.isSuccess).toBe(true);
    });

    it('sollte bei Konfiguration-Ladefehler fehlschlagen', async () => {
      mockKonfigurationRepository.find.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(new GetAufbewahrungsVorschauQuery());

      expect(result.isFailure).toBe(true);
    });

    it('sollte Gesamtanzahl korrekt berechnen', async () => {
      mockKonfigurationRepository.find.mockResolvedValue(Result.ok(AufbewahrungsKonfiguration.default()));
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', nummer: 'E1', archivedAt: new Date('2015-01-01'), _count: { befehle: 3 } },
        { id: 'e2', nummer: 'E2', archivedAt: new Date('2014-01-01'), _count: { befehle: 7 } },
      ]);

      const result = await handler.execute(new GetAufbewahrungsVorschauQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value!.gesamtBefehlCount).toBe(10);
      expect(result.value!.einsaetze).toHaveLength(2);
    });
  });
});
