// @ts-nocheck
import { GetEinsatzRollenQueryHandler } from '../get-einsatz-rollen.handler';
import { GetEinsatzRollenQuery } from '../get-einsatz-rollen.query';

describe('GetEinsatzRollenQueryHandler', () => {
  let handler: GetEinsatzRollenQueryHandler;
  let mockPrisma: any;

  const einsatzId = 'einsatz-123';

  beforeEach(() => {
    mockPrisma = {
      einsatz: {
        findUnique: jest.fn(),
      },
      einsatzRollenzuweisung: {
        findMany: jest.fn(),
      },
    };

    handler = new GetEinsatzRollenQueryHandler(mockPrisma);
  });

  describe('Happy Path', () => {
    it('should return rollen for einsatz', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });
      mockPrisma.einsatzRollenzuweisung.findMany.mockResolvedValue([
        {
          id: 'z-1',
          einsatzId,
          userId: 'user-1',
          rolle: 'BEFEHLSGEBER',
          zugewiesenAm: new Date('2026-01-15T10:00:00Z'),
          user: { id: 'user-1', username: 'einsatzleiter' },
        },
        {
          id: 'z-2',
          einsatzId,
          userId: 'user-2',
          rolle: 'EMPFAENGER',
          zugewiesenAm: new Date('2026-01-15T10:01:00Z'),
          user: { id: 'user-2', username: 'gruppenfuehrer' },
        },
      ]);

      const query = new GetEinsatzRollenQuery(einsatzId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value?.[0]).toEqual({
        userId: 'user-1',
        userName: 'einsatzleiter',
        rolle: 'BEFEHLSGEBER',
      });
      expect(result.value?.[1]).toEqual({
        userId: 'user-2',
        userName: 'gruppenfuehrer',
        rolle: 'EMPFAENGER',
      });
    });

    it('should return empty array when no rollen assigned', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });
      mockPrisma.einsatzRollenzuweisung.findMany.mockResolvedValue([]);

      const query = new GetEinsatzRollenQuery(einsatzId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should fail when einsatz not found', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue(null);

      const query = new GetEinsatzRollenQuery('non-existent');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
    });
  });

  describe('Error Handling', () => {
    it('should handle prisma errors', async () => {
      mockPrisma.einsatz.findUnique.mockRejectedValue(new Error('DB error'));

      const query = new GetEinsatzRollenQuery(einsatzId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Rollen-Abfrage fehlgeschlagen');
    });
  });
});
