import { CanMutateEinsatzQueryHandler } from '../can-mutate-einsatz.handler';
import { CanMutateEinsatzQuery } from '../can-mutate-einsatz.query';

describe('CanMutateEinsatzQueryHandler', () => {
  let handler: CanMutateEinsatzQueryHandler;
  let mockPrisma: {
    einsatz: { findUnique: jest.Mock };
    einsatzTeilnehmer: { findFirst: jest.Mock };
    einsatzRollenzuweisung: { findUnique: jest.Mock };
  };

  const einsatzId = 'einsatz-123';
  const userId = 'user-123';

  beforeEach(() => {
    mockPrisma = {
      einsatz: {
        findUnique: jest.fn(),
      },
      einsatzTeilnehmer: {
        findFirst: jest.fn(),
      },
      einsatzRollenzuweisung: {
        findUnique: jest.fn(),
      },
    };

    handler = new CanMutateEinsatzQueryHandler(mockPrisma);
  });

  it('should fail when einsatz does not exist', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue(null);

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
  });

  it('should allow ADMIN regardless of ownership/membership', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId, createdBy: 'other-user' });

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'ADMIN'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(true);
    expect(mockPrisma.einsatzTeilnehmer.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.einsatzRollenzuweisung.findUnique).not.toHaveBeenCalled();
  });

  it('should allow creator', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId, createdBy: userId });

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(true);
  });

  it('should allow active teilnehmer', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId, createdBy: 'other-user' });
    mockPrisma.einsatzTeilnehmer.findFirst.mockResolvedValue({ id: 'teilnehmer-1' });

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(true);
    expect(mockPrisma.einsatzRollenzuweisung.findUnique).not.toHaveBeenCalled();
  });

  it('should allow ERSTELLER role assignment', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId, createdBy: 'other-user' });
    mockPrisma.einsatzTeilnehmer.findFirst.mockResolvedValue(null);
    mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue({ rolle: 'ERSTELLER' });

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(true);
  });

  it('should deny unrelated user', async () => {
    mockPrisma.einsatz.findUnique.mockResolvedValue({ id: einsatzId, createdBy: 'other-user' });
    mockPrisma.einsatzTeilnehmer.findFirst.mockResolvedValue(null);
    mockPrisma.einsatzRollenzuweisung.findUnique.mockResolvedValue(null);

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(false);
  });

  it('should return failure on prisma error', async () => {
    mockPrisma.einsatz.findUnique.mockRejectedValue(new Error('DB down'));

    const result = await handler.execute(new CanMutateEinsatzQuery(einsatzId, userId, 'USER'));

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Autorisierungspruefung fehlgeschlagen');
  });
});
