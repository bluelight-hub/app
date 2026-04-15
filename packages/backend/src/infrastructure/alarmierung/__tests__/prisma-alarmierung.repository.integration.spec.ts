// @ts-nocheck
/**
 * Integration Tests für PrismaAlarmierungRepository gegen die echte PostgreSQL-DB.
 *
 * - save() mit Upsert Root + Diff der Empfänger
 * - findById / findByEinsatzId (mit status-/take-/skip-Optionen)
 * - findAktiveByFahrzeugId für FMS-Auto-Population
 * - Nachalarmierung (ursprungAlarmierungId-FK)
 * - Check-Constraint: genau eine Empfänger-Referenz
 *
 * Überspringt sich, wenn DATABASE_URL nicht erreichbar ist.
 */

jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]*$/.test(id);
  }),
}));

import type { PrismaClient } from '@/generated/prisma/client';
import { PrismaAlarmierungRepository } from '../prisma-alarmierung.repository';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { skipIfNoDatabase, createTestPrismaClient } from '@/infrastructure/__tests__/helpers/database-test.helper';

function cuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'c';
  for (let i = 0; i < 24; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

describe('PrismaAlarmierungRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repo: PrismaAlarmierungRepository;
  let databaseAvailable = false;
  const testRunId = Date.now();
  let testUserId: string;
  let testEinsatzId: string;
  let einsatzIdVO: EinsatzId;
  let fahrzeugtypId: string;
  let fahrzeugId: string;

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) return;
    prisma = createTestPrismaClient();
    repo = new PrismaAlarmierungRepository(prisma as unknown as never);

    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM alarmierung_empfaenger WHERE "alarmierung_id" IN (SELECT id FROM alarmierung WHERE "created_at" >= NOW() - INTERVAL '1 hour')`);
      await prisma.$executeRawUnsafe(`DELETE FROM alarmierung WHERE "created_at" >= NOW() - INTERVAL '1 hour'`);
      await prisma.$executeRawUnsafe(`DELETE FROM einsatz_fahrzeuge WHERE "created_at" >= NOW() - INTERVAL '1 hour'`);
      await prisma.$executeRawUnsafe(`DELETE FROM einsaetze WHERE "createdAt" >= NOW() - INTERVAL '1 hour'`);
      await prisma.$executeRawUnsafe(`DELETE FROM fahrzeugtypen WHERE "createdAt" >= NOW() - INTERVAL '1 hour'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'alarmierung-it-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    const u = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
      VALUES (${cuid()}, ${`alarmierung-it-user-${testRunId}`}, 'x', 'ADMIN', true, NOW(), NOW())
      RETURNING id
    `;
    testUserId = u[0].id;

    const e = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO einsaetze (id, "alarmstichwort", nummer, status, "createdAt", "updatedAt", "createdBy")
      VALUES (${cuid()}, 'Test-Alarmierung', ${`AL-${testRunId}-A`}, 'ANGELEGT', NOW(), NOW(), ${testUserId})
      RETURNING id
    `;
    testEinsatzId = e[0].id;
    einsatzIdVO = EinsatzId.create(testEinsatzId).value as EinsatzId;

    const ft = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO fahrzeugtypen (id, code, bezeichnung, kategorie, "istAktiv", "sortOrder", "createdAt", "updatedAt", "createdBy")
      VALUES (${cuid()}, ${`AL-FT-${testRunId}`}, 'Test-Fahrzeugtyp', 'TRANSPORT'::"FahrzeugtypKategorie", true, 0, NOW(), NOW(), ${testUserId})
      RETURNING id
    `;
    fahrzeugtypId = ft[0].id;

    const fz = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO einsatz_fahrzeuge (id, "einsatz_id", "fahrzeugtyp_id", funkrufname, "fms_status", "created_at", "updated_at", "created_by")
      VALUES (${cuid()}, ${testEinsatzId}, ${fahrzeugtypId}, ${`Florian ${testRunId}`}, 2, NOW(), NOW(), ${testUserId})
      RETURNING id
    `;
    fahrzeugId = fz[0].id;
  });

  afterAll(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM alarmierung_empfaenger WHERE "alarmierung_id" IN (SELECT id FROM alarmierung WHERE "einsatz_id" = $1)', testEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM alarmierung WHERE "einsatz_id" = $1', testEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM einsatz_fahrzeuge WHERE "einsatz_id" = $1', testEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM einsaetze WHERE id = $1', testEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM fahrzeugtypen WHERE id = $1', fahrzeugtypId);
      await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = $1', testUserId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    await prisma.$disconnect();
  });

  function makeAggregate(bezeichnung = 'Alarm A', opts: { alarmierungszeit?: Date; ursprung?: AlarmierungAggregate } = {}): AlarmierungAggregate {
    const r = AlarmierungAggregate.create({
      einsatzId: einsatzIdVO,
      bezeichnung,
      alarmierungszeit: opts.alarmierungszeit,
      ursprungAlarmierungId: opts.ursprung?.alarmierung.id,
      createdBy: testUserId,
    });
    if (r.isFailure) throw new Error(r.error as string);
    return r.value as AlarmierungAggregate;
  }

  it('save() persistiert Root + Empfänger, findById() rekonstruiert', async () => {
    if (!databaseAvailable) return;
    const agg = makeAggregate('Save-Test');
    agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId }, nameSnapshot: 'F1', createdBy: testUserId });
    await repo.save(agg);

    const loaded = await repo.findById(agg.alarmierung.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.bezeichnung).toBe('Save-Test');
    expect(loaded!.status).toBe('aktiv');
    expect(loaded!.empfaenger).toHaveLength(1);
    expect(loaded!.empfaenger[0].ref).toEqual({ kind: 'fahrzeug', fahrzeugId });
  });

  it('save() als Upsert: aktualisiert bestehende Root, fügt Empfänger hinzu, entfernt fehlende', async () => {
    if (!databaseAvailable) return;
    const alarmiertAm = new Date('2026-04-15T10:00:00Z');
    const agg = makeAggregate('Diff-Test', { alarmierungszeit: alarmiertAm });
    agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId }, nameSnapshot: 'F1', alarmiertAm, createdBy: testUserId });
    await repo.save(agg);

    // Korrigiere Zeitpunkt (update) — Wert nach alarmiertAm erforderlich.
    const empfaengerId = agg.empfaenger[0]!.id;
    agg.korrigiereZeitpunkt(empfaengerId, 'vorOrtAm', new Date('2026-04-15T10:30:00Z'), testUserId);
    await repo.save(agg);

    const afterUpdate = await repo.findById(agg.alarmierung.id);
    expect(afterUpdate!.empfaenger[0].vorOrtAm?.toISOString()).toBe('2026-04-15T10:30:00.000Z');

    // Entfernen → Diff-Delete
    agg.entferneEmpfaenger(empfaengerId, testUserId);
    await repo.save(agg);
    const afterRemove = await repo.findById(agg.alarmierung.id);
    expect(afterRemove!.empfaenger).toHaveLength(0);
  });

  it('findByEinsatzId() liefert alle, filtert nach status, respektiert take/skip', async () => {
    if (!databaseAvailable) return;
    const a1 = makeAggregate('Filter-A', { alarmierungszeit: new Date('2026-04-15T08:00:00Z') });
    const a2 = makeAggregate('Filter-B', { alarmierungszeit: new Date('2026-04-15T09:00:00Z') });
    a2.abschliessen(testUserId);
    await repo.save(a1);
    await repo.save(a2);

    const all = await repo.findByEinsatzId(einsatzIdVO);
    expect(all.length).toBeGreaterThanOrEqual(2);

    const aktiv = await repo.findByEinsatzId(einsatzIdVO, { status: 'aktiv' });
    expect(aktiv.every((a) => a.status === 'aktiv')).toBe(true);

    const abgeschlossen = await repo.findByEinsatzId(einsatzIdVO, { status: 'abgeschlossen' });
    expect(abgeschlossen.some((a) => a.alarmierung.id.value === a2.alarmierung.id.value)).toBe(true);

    const limited = await repo.findByEinsatzId(einsatzIdVO, { take: 1 });
    expect(limited).toHaveLength(1);
  });

  it('findAktiveByFahrzeugId() liefert nur aktive Alarmierungen mit dem Fahrzeug als Empfänger', async () => {
    if (!databaseAvailable) return;
    const agg = makeAggregate('FMS-Lookup');
    agg.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId }, nameSnapshot: 'F1', createdBy: testUserId });
    await repo.save(agg);

    const aggAbgeschlossen = makeAggregate('FMS-Lookup-Closed');
    aggAbgeschlossen.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId }, nameSnapshot: 'F1', createdBy: testUserId });
    aggAbgeschlossen.abschliessen(testUserId);
    await repo.save(aggAbgeschlossen);

    const aktive = await repo.findAktiveByFahrzeugId(einsatzIdVO, fahrzeugId);
    expect(aktive.some((a) => a.alarmierung.id.value === agg.alarmierung.id.value)).toBe(true);
    expect(aktive.every((a) => a.status === 'aktiv')).toBe(true);
    expect(aktive.every((a) => a.alarmierung.id.value !== aggAbgeschlossen.alarmierung.id.value)).toBe(true);

    // Unbekannte Fahrzeug-ID → leer
    const empty = await repo.findAktiveByFahrzeugId(einsatzIdVO, 'nope-fzg');
    expect(empty).toHaveLength(0);
  });

  it('Nachalarmierung-FK wird gespeichert und rekonstruiert', async () => {
    if (!databaseAvailable) return;
    const ursprung = makeAggregate('Ursprung');
    await repo.save(ursprung);
    const nach = makeAggregate('Nachalarm', { ursprung });
    await repo.save(nach);

    const loaded = await repo.findById(nach.alarmierung.id);
    expect(loaded!.istNachalarmierung).toBe(true);
    expect(loaded!.ursprungAlarmierungId?.value).toBe(ursprung.alarmierung.id.value);
  });

  it('Check-Constraint verhindert zwei gleichzeitig gesetzte Empfänger-FKs', async () => {
    if (!databaseAvailable) return;
    const agg = makeAggregate('Check-Constraint-Test');
    await repo.save(agg);

    const insertPromise = prisma.$executeRawUnsafe(
      `INSERT INTO alarmierung_empfaenger (id, "alarmierung_id", "fahrzeug_id", "person_id", "einheit_id", "name_snapshot", "alarmiert_am", "created_at", "updated_at", "created_by") VALUES ($1, $2, $3, $4, NULL, 'Double', NOW(), NOW(), NOW(), $5)`,
      cuid(),
      agg.alarmierung.id.value,
      'nope-fzg',
      'nope-person',
      testUserId,
    );
    await expect(insertPromise).rejects.toThrow();
  });
});
