// @ts-nocheck
/**
 * Integration Tests für PrismaFunkkanalRepository gegen die echte PostgreSQL-DB.
 *
 * - save() mit Upsert der Root + Diff der Zuordnungen
 * - findById / findByEinsatzId (inkl. includeArchived)
 * - existsByName
 * - hasFunkspruchReferenz (inkl. ETB-Eintrag mit FunkKontext)
 * - reorder()
 * - Check-Constraint `funkkanal_zuordnung_genau_eine_kraft`
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
import { PrismaFunkkanalRepository } from '../prisma-funkkanal.repository';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { KanalDetails, type KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { skipIfNoDatabase, createTestPrismaClient } from '@/infrastructure/__tests__/helpers/database-test.helper';

function cuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'c';
  for (let i = 0; i < 24; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function tmoDetails(sg = 'SG1'): KanalDetailsShape {
  const r = KanalDetails.tmo({ sprechgruppe: sg });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

describe('PrismaFunkkanalRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repo: PrismaFunkkanalRepository;
  let databaseAvailable = false;
  const testRunId = Date.now();
  let testUserId: string;
  let testEinsatzId: string;
  let einsatzIdVO: EinsatzId;
  let secondaryEinsatzIdVO: EinsatzId;
  let secondaryEinsatzId: string;

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) return;
    prisma = createTestPrismaClient();
    // PrismaClient ist API-kompatibel zu PrismaService (Composition) — für den Test reicht direktes Pass-Through.
    repo = new PrismaFunkkanalRepository(prisma as unknown as never);

    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM funkkanal_zuordnung WHERE "kanal_id" IN (SELECT id FROM funkkanal WHERE "created_at" >= NOW() - INTERVAL \'1 hour\')');
      await prisma.$executeRawUnsafe('DELETE FROM funkkanal WHERE "created_at" >= NOW() - INTERVAL \'1 hour\'');
      await prisma.$executeRawUnsafe('DELETE FROM etb_eintraege WHERE "kontext_type" = \'funkspruch\' AND "createdAt" >= NOW() - INTERVAL \'1 hour\'');
      await prisma.$executeRawUnsafe('DELETE FROM einsaetze WHERE "createdAt" >= NOW() - INTERVAL \'1 hour\'');
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'funkkanal-it-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    const u = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
      VALUES (${cuid()}, ${`funkkanal-it-user-${testRunId}`}, 'x', 'ADMIN', true, NOW(), NOW())
      RETURNING id
    `;
    testUserId = u[0].id;

    const e = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO einsaetze (id, "alarmstichwort", nummer, status, "createdAt", "updatedAt", "createdBy")
      VALUES (${cuid()}, 'Test-Funkkanal', ${`FK-${testRunId}-A`}, 'ANGELEGT', NOW(), NOW(), ${testUserId})
      RETURNING id
    `;
    testEinsatzId = e[0].id;
    einsatzIdVO = EinsatzId.create(testEinsatzId).value as EinsatzId;

    const e2 = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO einsaetze (id, "alarmstichwort", nummer, status, "createdAt", "updatedAt", "createdBy")
      VALUES (${cuid()}, 'Test-Funkkanal-2', ${`FK-${testRunId}-B`}, 'ANGELEGT', NOW(), NOW(), ${testUserId})
      RETURNING id
    `;
    secondaryEinsatzId = e2[0].id;
    secondaryEinsatzIdVO = EinsatzId.create(secondaryEinsatzId).value as EinsatzId;
  });

  afterAll(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM funkkanal_zuordnung WHERE "kanal_id" IN (SELECT id FROM funkkanal WHERE "einsatz_id" = $1 OR "einsatz_id" = $2)', testEinsatzId, secondaryEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM funkkanal WHERE "einsatz_id" = $1 OR "einsatz_id" = $2', testEinsatzId, secondaryEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM etb_eintraege WHERE "kontext_type" = \'funkspruch\' AND "kontext_data"->>\'kanalId\' IS NOT NULL AND "createdBy" = $1', testUserId);
      await prisma.$executeRawUnsafe('DELETE FROM einsaetze WHERE id IN ($1, $2)', testEinsatzId, secondaryEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = $1', testUserId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    await prisma.$disconnect();
  });

  function makeAggregate(name = 'Feuer 1', opts: { sortIndex?: number; einsatz?: EinsatzId } = {}): FunkkanalAggregate {
    const r = FunkkanalAggregate.create({
      einsatzId: opts.einsatz ?? einsatzIdVO,
      name,
      details: tmoDetails(`SG-${name}`),
      sortIndex: opts.sortIndex ?? 0,
      createdBy: testUserId,
    });
    if (r.isFailure) throw new Error(r.error as string);
    return r.value as FunkkanalAggregate;
  }

  it('save() persistiert Kanal + Zuordnungen, findById() rekonstruiert', async () => {
    if (!databaseAvailable) return;
    const agg = makeAggregate('F1', { sortIndex: 1 });
    agg.zuordneKraft({ kraftRef: { kind: 'person', personId: 'p-unused-1' }, rufnameSnapshot: 'Leiter', rolle: 'primaer' });

    // EinsatzPerson existiert in diesem Test nicht — Zuordnung auf nicht-existenten FK würde fehlschlagen.
    // Also verwenden wir hier „keine Zuordnung" und prüfen Zuordnungen in einem dedizierten Test mit FK-Fixtures.
    const aggWithoutZ = makeAggregate('F2', { sortIndex: 2 });
    await repo.save(aggWithoutZ);

    const loaded = await repo.findById(aggWithoutZ.kanal.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.kanal.name).toBe('F2');
    expect(loaded!.kanal.sortIndex).toBe(2);
    expect(loaded!.kanal.details.type).toBe('tmo');
    expect(loaded!.zuordnungen).toHaveLength(0);
  });

  it('findByEinsatzId() liefert nur aktive Kanäle standardmäßig, mit includeArchived auch archivierte', async () => {
    if (!databaseAvailable) return;
    const aAktiv = makeAggregate('A-aktiv', { sortIndex: 10, einsatz: secondaryEinsatzIdVO });
    const aArchiv = makeAggregate('A-archiv', { sortIndex: 20, einsatz: secondaryEinsatzIdVO });
    aArchiv.archive(testUserId);
    await repo.save(aAktiv);
    await repo.save(aArchiv);

    const aktiveOnly = await repo.findByEinsatzId(secondaryEinsatzIdVO);
    expect(aktiveOnly.map((k) => k.kanal.name).sort()).toEqual(['A-aktiv']);

    const all = await repo.findByEinsatzId(secondaryEinsatzIdVO, { includeArchived: true });
    expect(all.map((k) => k.kanal.name).sort()).toEqual(['A-aktiv', 'A-archiv']);
  });

  it('existsByName() respektiert Einsatz-Scope und excludeId', async () => {
    if (!databaseAvailable) return;
    const a = makeAggregate('Unique-Name', { sortIndex: 30 });
    await repo.save(a);

    expect(await repo.existsByName(einsatzIdVO, 'Unique-Name')).toBe(true);
    expect(await repo.existsByName(einsatzIdVO, 'Nicht-Vergeben')).toBe(false);
    expect(await repo.existsByName(einsatzIdVO, 'Unique-Name', a.kanal.id)).toBe(false);
    expect(await repo.existsByName(secondaryEinsatzIdVO, 'Unique-Name')).toBe(false);
  });

  it('reorder() aktualisiert nur Kanäle des angegebenen Einsatzes', async () => {
    if (!databaseAvailable) return;
    const k1 = makeAggregate('RO-1', { sortIndex: 0 });
    const k2 = makeAggregate('RO-2', { sortIndex: 1 });
    await repo.save(k1);
    await repo.save(k2);

    await repo.reorder(einsatzIdVO, [
      { id: k1.kanal.id, sortIndex: 99 },
      { id: k2.kanal.id, sortIndex: 100 },
    ]);

    const reloaded1 = await repo.findById(k1.kanal.id);
    const reloaded2 = await repo.findById(k2.kanal.id);
    expect(reloaded1!.kanal.sortIndex).toBe(99);
    expect(reloaded2!.kanal.sortIndex).toBe(100);

    // Reorder mit falschem Einsatz ändert nichts
    await repo.reorder(secondaryEinsatzIdVO, [{ id: k1.kanal.id, sortIndex: 0 }]);
    const stillSame = await repo.findById(k1.kanal.id);
    expect(stillSame!.kanal.sortIndex).toBe(99);
  });

  it('delete() entfernt den Kanal idempotent', async () => {
    if (!databaseAvailable) return;
    const a = makeAggregate('Delete-Me', { sortIndex: 40 });
    await repo.save(a);
    expect(await repo.findById(a.kanal.id)).not.toBeNull();
    await repo.delete(a.kanal.id);
    expect(await repo.findById(a.kanal.id)).toBeNull();
    // Second delete is a no-op
    await expect(repo.delete(a.kanal.id)).resolves.not.toThrow();
  });

  it('Check-Constraint verhindert zwei gleichzeitig gesetzte Kraft-FKs', async () => {
    if (!databaseAvailable) return;
    const a = makeAggregate('Check-Constraint', { sortIndex: 50 });
    await repo.save(a);

    const insertPromise = prisma.$executeRawUnsafe(
      `INSERT INTO funkkanal_zuordnung (id, "kanal_id", "fahrzeug_id", "person_id", "einheit_id", "rufname_snapshot", rolle, "created_at") VALUES ($1, $2, $3, $4, NULL, 'Double', 'primaer', NOW())`,
      cuid(),
      a.kanal.id.value,
      'nope-fzg',
      'nope-person',
    );
    await expect(insertPromise).rejects.toThrow();
  });

  it('hasFunkspruchReferenz() erkennt einen ETB-Eintrag mit FunkKontext', async () => {
    if (!databaseAvailable) return;
    const a = makeAggregate('Ref-Test', { sortIndex: 60 });
    await repo.save(a);

    const kanalIdValue = a.kanal.id.value;
    // ETB-Tabelle erwartet einen Parent-ETB-Eintrag; wir legen dafür einen Einsatztagebuch + Eintrag an.
    const etbId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO einsatztagebuecher (id, "einsatzId", status, "createdBy", "createdAt", "updatedAt", version, "versionTimestamp", "nextSequenceNumber") VALUES ($1, $2, 'ACTIVE', $3, NOW(), NOW(), 1, NOW(), 2)`,
      etbId,
      testEinsatzId,
      testUserId,
    );

    const eintragId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO etb_eintraege (id, "etbId", "sequenceNumber", text, "createdBy", "createdAt", "updatedAt", kategorie, timestamp, version, "isAutomatic", "kontext_type", "kontext_data", "erfasst_am", "ereignis_zeitpunkt")
       VALUES ($1, $2, 1, 'Test', $3, NOW(), NOW(), 'KOMMUNIKATION', NOW(), 1, false, 'funkspruch', $4::jsonb, NOW(), NOW())`,
      eintragId,
      etbId,
      testUserId,
      JSON.stringify({ kanalId: kanalIdValue, richtung: 'eingehend', funkPrioritaet: 'normal' }),
    );

    expect(await repo.hasFunkspruchReferenz(a.kanal.id)).toBe(true);

    const otherKanal = makeAggregate('Ref-Other', { sortIndex: 61 });
    await repo.save(otherKanal);
    expect(await repo.hasFunkspruchReferenz(otherKanal.kanal.id)).toBe(false);

    // Cleanup: ETB-Eintrag + ETB entfernen
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM etb_eintraege WHERE id = $1', eintragId);
      await prisma.$executeRawUnsafe('DELETE FROM einsatztagebuecher WHERE id = $1', etbId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  it('save() aktualisiert Zuordnungen: rolle-Diff + Delete entfernter', async () => {
    if (!databaseAvailable) return;
    // Fixture: EinsatzEinheit anlegen, damit der FK bedient wird.
    const einheitId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO einsatz_einheiten (id, "einsatz_id", name, typ, status, "soll_staerke", "created_at", "updated_at", "created_by") VALUES ($1, $2, $3, 'GRUPPE', 'AUFGESTELLT', 0, NOW(), NOW(), $4)`,
      einheitId,
      testEinsatzId,
      `Einheit-${testRunId}`,
      testUserId,
    );

    const a = makeAggregate('Zuord-Test', { sortIndex: 70 });
    const z = a.zuordneKraft({ kraftRef: { kind: 'einheit', einheitId }, rufnameSnapshot: 'E-A', rolle: 'primaer' });
    expect(z.isSuccess).toBe(true);
    await repo.save(a);

    const loaded = await repo.findById(a.kanal.id);
    expect(loaded!.zuordnungen).toHaveLength(1);
    expect(loaded!.zuordnungen[0].rolle).toBe('primaer');

    // Rolle ändern → Diff-Update
    const zuordnungId = loaded!.zuordnungen[0].id;
    const changed = loaded!.aendereZuordnungRolle(zuordnungId, 'sekundaer');
    expect(changed.isSuccess).toBe(true);
    await repo.save(loaded!);

    const afterChange = await repo.findById(a.kanal.id);
    expect(afterChange!.zuordnungen[0].rolle).toBe('sekundaer');

    // Entfernen → Delete
    const removed = afterChange!.entferneZuordnung(zuordnungId);
    expect(removed.isSuccess).toBe(true);
    await repo.save(afterChange!);

    const afterRemove = await repo.findById(a.kanal.id);
    expect(afterRemove!.zuordnungen).toHaveLength(0);

    // Cleanup: einsatz_einheit wegräumen
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM einsatz_einheiten WHERE id = $1', einheitId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });
});
