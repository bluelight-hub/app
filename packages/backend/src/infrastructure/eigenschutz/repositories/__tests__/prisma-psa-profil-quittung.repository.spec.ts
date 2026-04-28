/**
 * Unit-Tests für `PrismaPsaProfilQuittungRepository` (Story 3.4).
 *
 * Mock-basiert — der echte Postgres-Idempotenz-Test (P2002 auf
 * `@@unique([propagationGroupId, einheitId])`) läuft via Test-Harness.
 * Hier prüfen wir das Branch-Verhalten deterministisch.
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaPsaProfilQuittungRepository } from '../prisma-psa-profil-quittung.repository';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00777';
const ROW_ID = 'clw3h8x9y0000qwertyuipsaack1';

function buildRow(
  overrides: Partial<{
    id: string;
    einsatzId: string;
    einheitId: string;
    propagationGroupId: string;
    quittiertAm: Date;
    quittiertVonUserId: string;
    lueckeGemeldet: boolean;
    lueckeNotiz: string | null;
  }> = {},
) {
  return {
    id: ROW_ID,
    propagationGroupId: PROPAGATION_GROUP_ID,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    quittiertAm: new Date('2026-04-24T10:30:00.000Z'),
    quittiertVonUserId: USER_ID,
    lueckeGemeldet: false,
    lueckeNotiz: null,
    ...overrides,
  };
}

describe('PrismaPsaProfilQuittungRepository.upsert()', () => {
  it('legt eine neue Quittung an und liefert created=true', async () => {
    const logger = createMockLogger();
    const created = buildRow();
    const create = jest.fn().mockResolvedValue(created);
    const findFirst = jest.fn();
    const tx = { psaProfilQuittung: { create, findFirst } };
    const repo = new PrismaPsaProfilQuittungRepository({} as never, logger);

    const result = await repo.upsert(tx as never, {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value!.created).toBe(true);
    expect(result.value!.row.id).toBe(ROW_ID);
    expect(result.value!.row.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    expect(create).toHaveBeenCalledWith({
      data: {
        propagationGroupId: PROPAGATION_GROUP_ID,
        einheitId: EINHEIT_ID,
        einsatzId: EINSATZ_ID,
        quittiertVonUserId: USER_ID,
      },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('mappt P2002 auf created=false und liefert die bestehende Row', async () => {
    const logger = createMockLogger();
    const existing = buildRow({ quittiertVonUserId: 'erster-user' });
    const create = jest.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['propagationGroupId', 'einheitId'] } });
    const findFirst = jest.fn().mockResolvedValue(existing);
    const tx = { psaProfilQuittung: { create, findFirst } };
    const repo = new PrismaPsaProfilQuittungRepository({} as never, logger);

    const result = await repo.upsert(tx as never, {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value!.created).toBe(false);
    expect(result.value!.row.quittiertVonUserId).toBe('erster-user');
    expect(findFirst).toHaveBeenCalledWith({
      where: { propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID },
    });
  });

  it('liefert InfrastructureError, wenn P2002 ohne nachladbare Row auftritt', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['propagationGroupId', 'einheitId'] } });
    const findFirst = jest.fn().mockResolvedValue(null);
    const tx = { psaProfilQuittung: { create, findFirst } };
    const repo = new PrismaPsaProfilQuittungRepository({} as never, logger);

    const result = await repo.upsert(tx as never, {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:PsaProfilQuittung:P2002-without-row');
    expect(logger.error).toHaveBeenCalled();
  });

  it('behandelt P2002 mit unbekanntem Constraint NICHT als idempotenten Re-Ack', async () => {
    // Defense-in-Depth: Wenn ein anderer Unique-Constraint einmal collidieren
    // sollte (z. B. Schema-Evolution mit zusätzlichem Index), darf das Repo
    // den Vorgang NICHT als „bereits quittiert" durchwinken.
    const logger = createMockLogger();
    const create = jest.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['some_other_constraint'] } });
    const findFirst = jest.fn();
    const tx = { psaProfilQuittung: { create, findFirst } };
    const repo = new PrismaPsaProfilQuittungRepository({} as never, logger);

    const result = await repo.upsert(tx as never, {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:PsaProfilQuittung/);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('verpackt sonstige DB-Fehler in InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const create = jest.fn().mockRejectedValue(new Error('connection-lost'));
    const findFirst = jest.fn();
    const tx = { psaProfilQuittung: { create, findFirst } };
    const repo = new PrismaPsaProfilQuittungRepository({} as never, logger);

    const result = await repo.upsert(tx as never, {
      propagationGroupId: PROPAGATION_GROUP_ID,
      einheitId: EINHEIT_ID,
      einsatzId: EINSATZ_ID,
      quittiertVonUserId: USER_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:PsaProfilQuittung');
    expect(result.error).toContain('connection-lost');
  });
});

describe('PrismaPsaProfilQuittungRepository.findByGroup()', () => {
  it('liefert alle Quittungen einer Bekanntgabe-Gruppe sortiert', async () => {
    const logger = createMockLogger();
    const rows = [buildRow({ id: 'r1' }), buildRow({ id: 'r2', einheitId: 'einheit-2' })];
    const findMany = jest.fn().mockResolvedValue(rows);
    const prisma = { psaProfilQuittung: { findMany } };
    const repo = new PrismaPsaProfilQuittungRepository(prisma as never, logger);

    const result = await repo.findByGroup(PROPAGATION_GROUP_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(findMany).toHaveBeenCalledWith({
      where: { propagationGroupId: PROPAGATION_GROUP_ID },
      orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
    });
  });
});

describe('PrismaPsaProfilQuittungRepository.findByEinsatzAndGroup()', () => {
  it('filtert zusätzlich auf einsatzId', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockResolvedValue([buildRow()]);
    const prisma = { psaProfilQuittung: { findMany } };
    const repo = new PrismaPsaProfilQuittungRepository(prisma as never, logger);

    const result = await repo.findByEinsatzAndGroup(EINSATZ_ID, PROPAGATION_GROUP_ID);

    expect(result.isSuccess).toBe(true);
    expect(findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID, propagationGroupId: PROPAGATION_GROUP_ID },
      orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
    });
  });

  it('verpackt DB-Fehler in InfrastructureError-Sentinel', async () => {
    const logger = createMockLogger();
    const findMany = jest.fn().mockRejectedValue(new Error('boom'));
    const prisma = { psaProfilQuittung: { findMany } };
    const repo = new PrismaPsaProfilQuittungRepository(prisma as never, logger);

    const result = await repo.findByEinsatzAndGroup(EINSATZ_ID, PROPAGATION_GROUP_ID);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('InfrastructureError:PsaProfilQuittung:boom');
  });
});
