// @ts-nocheck
/**
 * Integration Tests für PrismaGefaehrdungsbeurteilungVersionRepository.
 *
 * Die Version-Zeile ist append-only (Story 2.1 schreibt nur die Initial-
 * version). Wir prüfen:
 *  - `saveInitialVersion` persistiert Zeile mit korrektem Shape.
 *  - `version = 1`, `changedFields = { created: true }`, `gueltigBis = null`.
 *  - JSONB-Items werden per Mapper als Array serialisiert.
 *  - `eventId` wird gesetzt (Unique-Constraint verhindert Outbox-Retry-Doppler).
 *
 * `saveInitialVersion` erwartet einen **verpflichtenden** `TransactionContext`
 * — wir wrappen daher jede Save-Operation in `prisma.$transaction(...)`.
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
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

import type { PrismaClient } from '@/generated/prisma/client';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import type { ILogger } from '@domain/ports/i-logger.port';
import { skipIfNoDatabase, createTestPrismaClient } from '@/infrastructure/__tests__/helpers/database-test.helper';
import { PrismaGefaehrdungsbeurteilungVersionRepository } from '../prisma-gefaehrdungsbeurteilung-version.repository';

function cuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'c';
  for (let i = 0; i < 24; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

function makeItem(title: string): GefaehrdungItem {
  const result = GefaehrdungItem.create({
    title,
    description: 'Test-Beschreibung',
    eintritt: 'OFT',
    schaden: 'MITTEL',
    risikoklasse: 'GELB',
    schutzmassnahmen: 'Handschuhe',
  });
  if (result.isFailure || !result.value) throw new Error(`Ungültiges Item: ${result.error}`);
  return result.value;
}

describe('PrismaGefaehrdungsbeurteilungVersionRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaGefaehrdungsbeurteilungVersionRepository;
  let databaseAvailable = false;
  const testRunId = Date.now();
  let testUserId: string;
  let testEinsatzId: string;
  let testEinheitId: string;

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) return;

    prisma = createTestPrismaClient();
    repository = new PrismaGefaehrdungsbeurteilungVersionRepository(createMockLogger());

    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM gefaehrdungsbeurteilung_versionen WHERE "gef_beurteilung_id" IN (SELECT id FROM gefaehrdungsbeurteilungen WHERE "erstellt_von_user_id" IN (SELECT id FROM "User" WHERE username LIKE 'gb-ver-it-user-%'))`,
      );
      await prisma.$executeRawUnsafe(`DELETE FROM gefaehrdungsbeurteilungen WHERE "erstellt_von_user_id" IN (SELECT id FROM "User" WHERE username LIKE 'gb-ver-it-user-%')`);
      await prisma.$executeRawUnsafe(`DELETE FROM einsatz_einheiten WHERE "created_by" IN (SELECT id FROM "User" WHERE username LIKE 'gb-ver-it-user-%')`);
      await prisma.$executeRawUnsafe(`DELETE FROM einsaetze WHERE "createdBy" IN (SELECT id FROM "User" WHERE username LIKE 'gb-ver-it-user-%')`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'gb-ver-it-user-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    testUserId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, 'x', 'ADMIN', true, NOW(), NOW())`,
      testUserId,
      `gb-ver-it-user-${testRunId}`,
    );

    testEinsatzId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO einsaetze (id, "alarmstichwort", nummer, status, "createdAt", "updatedAt", "createdBy") VALUES ($1, 'GB-Ver', $2, 'ANGELEGT', NOW(), NOW(), $3)`,
      testEinsatzId,
      `GBV-${testRunId}`,
      testUserId,
    );

    testEinheitId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO einsatz_einheiten (id, "einsatz_id", name, typ, status, "soll_staerke", "created_at", "updated_at", "created_by") VALUES ($1, $2, $3, 'GRUPPE', 'AUFGESTELLT', 0, NOW(), NOW(), $4)`,
      testEinheitId,
      testEinsatzId,
      `GBV-Einheit-${testRunId}`,
      testUserId,
    );
  });

  afterEach(async () => {
    if (!databaseAvailable) return;
    // Cascade-Delete über GB-Row räumt Versionen mit.
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM gefaehrdungsbeurteilungen WHERE einsatz_id = $1`, testEinsatzId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  afterAll(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe('DELETE FROM einsatz_einheiten WHERE id = $1', testEinheitId);
      await prisma.$executeRawUnsafe('DELETE FROM einsaetze WHERE id = $1', testEinsatzId);
      await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = $1', testUserId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    await prisma.$disconnect();
  });

  /**
   * Helper: Legt eine minimale Gefährdungsbeurteilungs-Row an, damit der FK
   * `gef_beurteilung_id` der Versions-Zeile bedient werden kann.
   */
  async function insertGefaehrdungsbeurteilung(): Promise<string> {
    const gbId = cuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO gefaehrdungsbeurteilungen (id, einsatz_id, einheit_id, items, version, erstellt_am, erstellt_von_user_id, aktualisiert_am, aktualisiert_von_user_id) VALUES ($1, $2, $3, $4::jsonb, 1, NOW(), $5, NOW(), $5)`,
      gbId,
      testEinsatzId,
      testEinheitId,
      JSON.stringify([{ title: 'State-Item' }]),
      testUserId,
    );
    return gbId;
  }

  describe('saveInitialVersion()', () => {
    it('sollte Zeile mit version=1, changedFields={created:true}, gueltigBis=null, items und eventId persistieren', async () => {
      if (!databaseAvailable) return;
      // Given
      const gbId = await insertGefaehrdungsbeurteilung();
      const gueltigVon = new Date('2026-04-22T10:15:00.000Z');
      const eventId = cuid();
      const items = [makeItem('Initial-Item'), makeItem('Zweites-Item')];

      // When
      const saveResult = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items,
            changedFields: { created: true },
            gueltigVon,
            changedByUserId: testUserId,
            eventId,
          },
          tx,
        ),
      );

      // Then
      expect(saveResult.isSuccess).toBe(true);

      // Raw-Read via Prisma (eventId @unique).
      const row = await prisma.gefaehrdungsbeurteilungVersion.findUnique({ where: { eventId } });
      expect(row).not.toBeNull();
      expect(row?.gefBeurteilungId).toBe(gbId);
      expect(row?.version).toBe(1);
      expect(row?.gueltigVon.toISOString()).toBe(gueltigVon.toISOString());
      expect(row?.gueltigBis).toBeNull();
      expect(row?.changedByUserId).toBe(testUserId);
      expect(row?.eventId).toBe(eventId);
      expect(row?.changedFields).toEqual({ created: true });

      const persisted = row?.items as unknown as Array<Record<string, unknown>>;
      expect(Array.isArray(persisted)).toBe(true);
      expect(persisted).toHaveLength(2);
      expect(persisted[0]?.title).toBe('Initial-Item');
      expect(persisted[1]?.title).toBe('Zweites-Item');
    });

    it('sollte leeres Items-Array korrekt als JSONB `[]` persistieren', async () => {
      if (!databaseAvailable) return;
      // Given
      const gbId = await insertGefaehrdungsbeurteilung();
      const eventId = cuid();

      // When
      const saveResult = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [],
            changedFields: { created: true },
            gueltigVon: new Date(),
            changedByUserId: testUserId,
            eventId,
          },
          tx,
        ),
      );

      // Then
      expect(saveResult.isSuccess).toBe(true);
      const row = await prisma.gefaehrdungsbeurteilungVersion.findUnique({ where: { eventId } });
      expect(Array.isArray(row?.items)).toBe(true);
      expect(row?.items as unknown as unknown[]).toHaveLength(0);
    });

    it('sollte bei doppeltem `eventId` Result.fail liefern (Unique-Constraint gegen Outbox-Doppler)', async () => {
      if (!databaseAvailable) return;
      // Given: Erste Version mit eventId X ist persistiert.
      const gbId = await insertGefaehrdungsbeurteilung();
      const eventId = cuid();

      const first = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('E1')],
            changedFields: { created: true },
            gueltigVon: new Date(),
            changedByUserId: testUserId,
            eventId,
          },
          tx,
        ),
      );
      expect(first.isSuccess).toBe(true);

      // When: Zweite Version mit SELBER eventId (Retry-Szenario).
      let secondResult;
      try {
        secondResult = await prisma.$transaction(async (tx) =>
          repository.saveInitialVersion(
            {
              gefBeurteilungId: gbId,
              version: 2,
              items: [makeItem('E2')],
              changedFields: { created: true },
              gueltigVon: new Date(),
              changedByUserId: testUserId,
              eventId,
            },
            tx,
          ),
        );
      } catch (err) {
        secondResult = { isSuccess: false, isFailure: true, error: (err as Error).message };
      }

      // Then: Kein Success — nur eine Version mit dieser eventId in der DB.
      expect(secondResult.isSuccess).toBe(false);
      const count = await prisma.gefaehrdungsbeurteilungVersion.count({ where: { eventId } });
      expect(count).toBe(1);
    });
  });

  // ========================================
  // saveNewVersion() — Story 2.2
  // ========================================

  describe('saveNewVersion()', () => {
    it('Happy-Path mit Chain-Closing: V1 offen → saveNewVersion(V2) schließt V1 und legt V2 an', async () => {
      if (!databaseAvailable) return;
      // Given: Initial-Version (V1) mit gueltigBis=null.
      const gbId = await insertGefaehrdungsbeurteilung();
      const gueltigVonV1 = new Date('2026-04-22T10:00:00.000Z');
      const gueltigVonV2 = new Date('2026-04-22T11:00:00.000Z');
      const eventIdV1 = cuid();
      const eventIdV2 = cuid();

      const initRes = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('V1-Item')],
            changedFields: { created: true },
            gueltigVon: gueltigVonV1,
            changedByUserId: testUserId,
            eventId: eventIdV1,
          },
          tx,
        ),
      );
      expect(initRes.isSuccess).toBe(true);

      // When: V2 anlegen — soll V1 schließen (gueltigBis = gueltigVonV2).
      const newRes = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 2,
            items: [makeItem('V2-Item-A'), makeItem('V2-Item-B')],
            changedFields: { added: 1, removed: 0, updated: 1 },
            gueltigVon: gueltigVonV2,
            changedByUserId: testUserId,
            eventId: eventIdV2,
          },
          tx,
        ),
      );

      // Then
      expect(newRes.isSuccess).toBe(true);

      const rows = await prisma.gefaehrdungsbeurteilungVersion.findMany({
        where: { gefBeurteilungId: gbId },
        orderBy: { version: 'asc' },
      });
      expect(rows).toHaveLength(2);

      // V1 geschlossen
      expect(rows[0].version).toBe(1);
      expect(rows[0].gueltigVon.toISOString()).toBe(gueltigVonV1.toISOString());
      expect(rows[0].gueltigBis).not.toBeNull();
      expect((rows[0].gueltigBis as Date).toISOString()).toBe(gueltigVonV2.toISOString());
      expect(rows[0].eventId).toBe(eventIdV1);

      // V2 offen
      expect(rows[1].version).toBe(2);
      expect(rows[1].gueltigVon.toISOString()).toBe(gueltigVonV2.toISOString());
      expect(rows[1].gueltigBis).toBeNull();
      expect(rows[1].eventId).toBe(eventIdV2);
      const v2Items = rows[1].items as unknown as Array<Record<string, unknown>>;
      expect(v2Items).toHaveLength(2);
      expect(v2Items[0]?.title).toBe('V2-Item-A');
    });

    it('Sequenzielle Updates bauen eine konsistente Chain auf (V1→V2→V3)', async () => {
      if (!databaseAvailable) return;
      // Given
      const gbId = await insertGefaehrdungsbeurteilung();
      const gueltigVonV1 = new Date('2026-04-22T09:00:00.000Z');
      const gueltigVonV2 = new Date('2026-04-22T10:00:00.000Z');
      const gueltigVonV3 = new Date('2026-04-22T11:00:00.000Z');
      const eventIdV1 = cuid();
      const eventIdV2 = cuid();
      const eventIdV3 = cuid();

      // V1 (initial)
      const r1 = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('V1')],
            changedFields: { created: true },
            gueltigVon: gueltigVonV1,
            changedByUserId: testUserId,
            eventId: eventIdV1,
          },
          tx,
        ),
      );
      expect(r1.isSuccess).toBe(true);

      // V2
      const r2 = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 2,
            items: [makeItem('V2')],
            changedFields: { added: 1, removed: 1, updated: 0 },
            gueltigVon: gueltigVonV2,
            changedByUserId: testUserId,
            eventId: eventIdV2,
          },
          tx,
        ),
      );
      expect(r2.isSuccess).toBe(true);

      // V3
      const r3 = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 3,
            items: [makeItem('V3')],
            changedFields: { added: 1, removed: 1, updated: 0 },
            gueltigVon: gueltigVonV3,
            changedByUserId: testUserId,
            eventId: eventIdV3,
          },
          tx,
        ),
      );
      expect(r3.isSuccess).toBe(true);

      // Then: 3 Zeilen mit kohärenter Chain.
      const rows = await prisma.gefaehrdungsbeurteilungVersion.findMany({
        where: { gefBeurteilungId: gbId },
        orderBy: { version: 'asc' },
      });
      expect(rows).toHaveLength(3);

      expect(rows[0].version).toBe(1);
      expect((rows[0].gueltigBis as Date).toISOString()).toBe(gueltigVonV2.toISOString());

      expect(rows[1].version).toBe(2);
      expect((rows[1].gueltigBis as Date).toISOString()).toBe(gueltigVonV3.toISOString());

      expect(rows[2].version).toBe(3);
      expect(rows[2].gueltigBis).toBeNull();
    });

    it('Unique eventId: zweiter saveNewVersion mit gleicher eventId ist idempotent (P2002 → Result.ok), DB hat nur eine Zeile', async () => {
      if (!databaseAvailable) return;
      // Given: V1 initial, dann V2 mit eventId X erfolgreich persistiert.
      const gbId = await insertGefaehrdungsbeurteilung();
      const eventIdV1 = cuid();
      const eventIdV2 = cuid();

      const initRes = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('V1')],
            changedFields: { created: true },
            gueltigVon: new Date('2026-04-22T09:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: eventIdV1,
          },
          tx,
        ),
      );
      expect(initRes.isSuccess).toBe(true);

      const firstV2 = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 2,
            items: [makeItem('V2-first')],
            changedFields: { added: 1, removed: 0, updated: 0 },
            gueltigVon: new Date('2026-04-22T10:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: eventIdV2,
          },
          tx,
        ),
      );
      expect(firstV2.isSuccess).toBe(true);

      // When: zweiter saveNewVersion mit GLEICHER eventIdV2 (Retry-Szenario).
      let secondV2Result;
      try {
        secondV2Result = await prisma.$transaction(async (tx) =>
          repository.saveNewVersion(
            {
              gefBeurteilungId: gbId,
              version: 3,
              items: [makeItem('V2-retry')],
              changedFields: { added: 0, removed: 0, updated: 1 },
              gueltigVon: new Date('2026-04-22T11:00:00.000Z'),
              changedByUserId: testUserId,
              eventId: eventIdV2,
            },
            tx,
          ),
        );
      } catch (err) {
        // Prisma kann beim TX-Rollback werfen — beide Enden akzeptabel.
        secondV2Result = { isSuccess: false, isFailure: true, error: (err as Error).message };
      }

      // Then (Review-Fix P8): idempotent — P2002 auf eventId wird als Erfolg
      // gemeldet, damit der Outbox-Retry-Pfad konvergiert, statt ein Event
      // pending zu lassen. In der DB bleibt exakt eine Zeile mit eventIdV2.
      expect(secondV2Result.isSuccess).toBe(true);
      const countWithEventId = await prisma.gefaehrdungsbeurteilungVersion.count({ where: { eventId: eventIdV2 } });
      expect(countWithEventId).toBe(1);
    });

    it('changedFields wird als JSONB-Struktur persistiert', async () => {
      if (!databaseAvailable) return;
      // Given: V1 initial.
      const gbId = await insertGefaehrdungsbeurteilung();
      const initEventId = cuid();
      const initRes = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('V1')],
            changedFields: { created: true },
            gueltigVon: new Date('2026-04-22T09:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: initEventId,
          },
          tx,
        ),
      );
      expect(initRes.isSuccess).toBe(true);

      // When: V2 mit konkretem Diff-Objekt.
      const v2EventId = cuid();
      const diff = { added: 2, removed: 1, updated: 0 };
      const newRes = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 2,
            items: [makeItem('V2-a'), makeItem('V2-b')],
            changedFields: diff,
            gueltigVon: new Date('2026-04-22T10:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: v2EventId,
          },
          tx,
        ),
      );
      expect(newRes.isSuccess).toBe(true);

      // Then
      const row = await prisma.gefaehrdungsbeurteilungVersion.findUnique({ where: { eventId: v2EventId } });
      expect(row).not.toBeNull();
      expect(row?.changedFields).toEqual(diff);
    });
  });
});
