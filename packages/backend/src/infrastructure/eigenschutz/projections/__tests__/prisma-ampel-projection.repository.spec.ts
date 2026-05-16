import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaAmpelProjectionRepository } from '../prisma-ampel-projection.repository';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06001';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui06002';
const USER_ID = 'clw3h8x9y0000qwertyui06003';
const CHANGED_AT = new Date('2026-05-07T10:00:00.000Z');

const createLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const buildPrisma = (overrides: Record<string, unknown> = {}) =>
  ({
    ampelProjection: {
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
      findMany: jest.fn().mockResolvedValue([]),
    },
    psaProfilZuweisung: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    gefaehrdungsbeurteilung: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    psaProfilQuittung: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    sicherheitsregel: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    sicherheitsregelQuittung: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    eigenschutzVorfall: {
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  }) as never;

describe('PrismaAmpelProjectionRepository.upsert()', () => {
  it('nutzt den Composite-PK-Where-Key einsatzId_einheitId', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.upsert({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      status: 'GELB',
      aktivePsaProfile: ['BASIS'],
      offeneGefaehrdungenHoch: 0,
      ausstehendePsaQuittungen: 1,
      ausstehendeRegelQuittungen: 0,
      offeneVorfaelle: 0,
      ungeloesteRueckmeldungen: 0,
      letzteAenderungAm: CHANGED_AT,
      letzteAenderungVonUserId: USER_ID,
    });

    expect(result.isSuccess).toBe(true);
    expect(prisma.ampelProjection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { einsatzId_einheitId: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID } },
      }),
    );
  });
});

describe('PrismaAmpelProjectionRepository.findByEinsatz()', () => {
  it('sortiert stabil nach letzter Änderung und Einheit', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    await repo.findByEinsatz(EINSATZ_ID);

    expect(prisma.ampelProjection.findMany).toHaveBeenCalledWith({
      where: { einsatzId: EINSATZ_ID },
      orderBy: [{ letzteAenderungAm: 'desc' }, { einheitId: 'asc' }],
    });
  });
});

describe('PrismaAmpelProjectionRepository.recalculateForEinheit()', () => {
  it('berechnet GRUEN, wenn keine offenen Indikatoren existieren', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({
      status: 'GRUEN',
      aktivePsaProfile: [],
      offeneGefaehrdungenHoch: 0,
      ausstehendePsaQuittungen: 0,
      ausstehendeRegelQuittungen: 0,
      offeneVorfaelle: 0,
      ungeloesteRueckmeldungen: 0,
    });
  });

  it('zählt aktive PSA-Profile und dedupliziert Propagation-Gruppen ohne Antwort', async () => {
    const prisma = buildPrisma({
      psaProfilZuweisung: { findMany: jest.fn().mockResolvedValue([{ profil: 'BASIS' }, { profil: 'CBRN_PATIENT' }]) },
      outboxEvent: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { payload: { payload: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, propagationGroupId: 'group-a' } } },
            { payload: { payload: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, propagationGroupId: 'group-a' } } },
            { payload: { payload: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, propagationGroupId: 'group-b' } } },
          ]),
      },
      psaProfilQuittung: {
        findMany: jest.fn().mockResolvedValue([{ propagationGroupId: 'group-b' }]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({
      status: 'GELB',
      aktivePsaProfile: ['BASIS', 'CBRN_PATIENT'],
      ausstehendePsaQuittungen: 1,
    });
    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith({
      where: {
        eventName: 'eigenschutz.psa_profil_geaendert',
        AND: [{ payload: { path: ['payload', 'einsatzId'], equals: EINSATZ_ID } }, { payload: { path: ['payload', 'einheitId'], equals: EINHEIT_ID } }],
      },
      select: { payload: true },
    });
  });

  it('behandelt Lückenmeldungen als Antwort und als ungelöste Rückmeldung', async () => {
    const prisma = buildPrisma({
      outboxEvent: { findMany: jest.fn().mockResolvedValue([{ payload: { payload: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, propagationGroupId: 'group-a' } } }]) },
      psaProfilQuittung: {
        findMany: jest.fn().mockResolvedValue([{ propagationGroupId: 'group-a' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ status: 'GELB', ausstehendePsaQuittungen: 0, ungeloesteRueckmeldungen: 1 });
  });

  it('zählt offene hohe Gefährdungen ohne Schutzmaßnahmen als ROT', async () => {
    const prisma = buildPrisma({
      gefaehrdungsbeurteilung: {
        findUnique: jest.fn().mockResolvedValue({
          items: [
            { title: 'Offen', risikoklasse: 'ROT' },
            { title: 'Geschützt', risikoklasse: 'ROT', schutzmassnahmen: 'Absperren' },
            { title: 'Gelb', risikoklasse: 'GELB' },
          ],
        }),
      },
    });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ status: 'ROT', offeneGefaehrdungenHoch: 1 });
  });

  it('zählt einsatzweite und einheitsspezifische Regel-Quittungen', async () => {
    const prisma = buildPrisma({
      sicherheitsregel: { findMany: jest.fn().mockResolvedValue([{ id: 'regel-global' }, { id: 'regel-unit' }]) },
      sicherheitsregelQuittung: { findMany: jest.fn().mockResolvedValue([{ regelId: 'regel-global' }]) },
    });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ status: 'GELB', ausstehendeRegelQuittungen: 1 });
    expect(prisma.sicherheitsregel.findMany).toHaveBeenCalledWith({
      where: {
        einsatzId: EINSATZ_ID,
        OR: [{ einheitId: EINHEIT_ID }, { einheitId: null }],
        versionen: { some: { gueltigBis: null } },
      },
      select: { id: true },
    });
  });

  it('zählt offene Vorfälle als ROT', async () => {
    const prisma = buildPrisma({ eigenschutzVorfall: { count: jest.fn().mockResolvedValue(2) } });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ status: 'ROT', offeneVorfaelle: 2 });
  });

  it('Issue #415: Vorfall-Count filtert `geschlossenAm: null` (geschlossene zählen nicht)', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const prisma = buildPrisma({ eigenschutzVorfall: { count } });
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());

    await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(count).toHaveBeenCalledWith({ where: { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, geschlossenAm: null } });
  });

  it('ist idempotent und schreibt bei identischen Quellen dieselbe Projection', async () => {
    const prisma = buildPrisma();
    const repo = new PrismaAmpelProjectionRepository(prisma, createLogger());
    const params = { einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID };

    const first = await repo.recalculateForEinheit(params);
    const second = await repo.recalculateForEinheit(params);

    expect(first.value).toEqual(second.value);
    expect(prisma.ampelProjection.upsert).toHaveBeenCalledTimes(2);
  });

  it('mappt Datenbankfehler auf InfrastructureError:AmpelProjection', async () => {
    const prisma = buildPrisma({
      psaProfilZuweisung: { findMany: jest.fn().mockRejectedValue(new Error('db-down')) },
    });
    const logger = createLogger();
    const repo = new PrismaAmpelProjectionRepository(prisma, logger);

    const result = await repo.recalculateForEinheit({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, letzteAenderungAm: CHANGED_AT, letzteAenderungVonUserId: USER_ID });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelProjection:Error');
    expect(logger.error).toHaveBeenCalled();
  });
});
