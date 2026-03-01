import { UpdateEinsatzRollenHandler } from '../update-einsatz-rollen.handler';
import { UpdateEinsatzRollenCommand } from '../update-einsatz-rollen.command';

describe('UpdateEinsatzRollenHandler', () => {
  let handler: UpdateEinsatzRollenHandler;
  let mockPrisma: unknown;
  let mockTx: unknown;

  const einsatzId = 'einsatz-123';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  beforeEach(() => {
    mockTx = {
      user: {
        findMany: jest.fn(),
      },
      einsatzRollenzuweisung: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockPrisma = {
      einsatz: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      einsatzRollenzuweisung: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<void>) => fn(mockTx)),
    };

    handler = new UpdateEinsatzRollenHandler(mockPrisma);
  });

  describe('Happy Path', () => {
    it('should update rollen for einsatz with all 4 rolle types', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });
      mockTx.user.findMany.mockResolvedValue([{ id: userId1 }, { id: userId2 }, { id: 'user-3' }, { id: 'user-4' }]);

      const command = new UpdateEinsatzRollenCommand(einsatzId, [
        { userId: userId1, rolle: 'BEFEHLSGEBER' },
        { userId: userId2, rolle: 'ERSTELLER' },
        { userId: 'user-3', rolle: 'EMPFAENGER' },
        { userId: 'user-4', rolle: 'BEOBACHTER' },
      ]);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockTx.einsatzRollenzuweisung.deleteMany).toHaveBeenCalledWith({
        where: { einsatzId },
      });
      expect(mockTx.einsatzRollenzuweisung.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ einsatzId, userId: userId1, rolle: 'BEFEHLSGEBER' }), expect.objectContaining({ einsatzId, userId: userId2, rolle: 'ERSTELLER' })]),
      });
    });

    it('should remove all rollen when empty array', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });

      const command = new UpdateEinsatzRollenCommand(einsatzId, []);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockTx.einsatzRollenzuweisung.deleteMany).toHaveBeenCalledWith({
        where: { einsatzId },
      });
      expect(mockTx.einsatzRollenzuweisung.createMany).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should fail when einsatz not found', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue(null);

      const command = new UpdateEinsatzRollenCommand(einsatzId, [{ userId: userId1, rolle: 'BEFEHLSGEBER' }]);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
    });

    it('should fail with invalid rolle', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });

      const command = new UpdateEinsatzRollenCommand(einsatzId, [{ userId: userId1, rolle: 'INVALID' }]);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungueltige Rolle');
    });

    it('should fail with user not found', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });
      mockTx.user.findMany.mockResolvedValue([{ id: userId1 }]);

      const command = new UpdateEinsatzRollenCommand(einsatzId, [
        { userId: userId1, rolle: 'BEFEHLSGEBER' },
        { userId: 'non-existent', rolle: 'ERSTELLER' },
      ]);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('User nicht gefunden');
      expect(result.error).toContain('non-existent');
    });

    it('should fail with duplicate user IDs', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });

      const command = new UpdateEinsatzRollenCommand(einsatzId, [
        { userId: userId1, rolle: 'BEFEHLSGEBER' },
        { userId: userId1, rolle: 'ERSTELLER' },
      ]);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Doppelte User-IDs');
    });
  });

  describe('Error Handling', () => {
    it('should handle prisma transaction errors', async () => {
      mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId });
      mockTx.user.findMany.mockResolvedValue([{ id: userId1 }]);
      mockPrisma.$transaction.mockRejectedValue(new Error('DB connection lost'));

      const command = new UpdateEinsatzRollenCommand(einsatzId, [{ userId: userId1, rolle: 'BEFEHLSGEBER' }]);

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Rollen-Update fehlgeschlagen');
    });
  });
});
