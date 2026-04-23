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

    it('sollte bei doppeltem `eventId` idempotent Result.ok liefern (Outbox-Retry, Story 2.3 AC8)', async () => {
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

      // When: Zweite Version mit SELBER eventId (Retry-Szenario). Story 2.3
      // fordert: P2002 auf `event_id` ist ein idempotenter Erfolg.
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

      // Then: idempotent erfolgreich, DB enthält weiterhin nur eine Zeile mit
      // dieser eventId (V1 bleibt, V2 wurde nicht persistiert).
      expect(secondResult.isSuccess).toBe(true);
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
            changedFields: { added: ['itm-new'], removed: [], updated: [{ id: 'itm-upd', fields: ['title'] }], unchanged: 0 },
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
            changedFields: { added: ['itm-new'], removed: ['itm-rem'], updated: [], unchanged: 0 },
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
            changedFields: { added: ['itm-new'], removed: ['itm-rem'], updated: [], unchanged: 0 },
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
            changedFields: { added: ['itm-new'], removed: [], updated: [], unchanged: 0 },
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
              changedFields: { added: [], removed: [], updated: [{ id: 'itm-upd', fields: ['title'] }], unchanged: 0 },
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

    it('saveNewVersion: P2002 auf `(gefBeurteilungId, version)` bleibt Result.fail (echter Concurrency-Bug, Story 2.3 AC8)', async () => {
      if (!databaseAvailable) return;
      // Given: V1 initial, dann V2 mit einer version ist persistiert. Jetzt
      // versuchen wir, eine weitere V2 mit ANDERER eventId anzulegen — das
      // verletzt das `(gefBeurteilungId, version)`-Unique und MUSS als Fehler
      // sichtbar bleiben (nicht als idempotenter Erfolg getarnt).
      const gbId = await insertGefaehrdungsbeurteilung();

      const init = await prisma.$transaction(async (tx) =>
        repository.saveInitialVersion(
          {
            gefBeurteilungId: gbId,
            version: 1,
            items: [makeItem('V1')],
            changedFields: { created: true },
            gueltigVon: new Date('2026-04-22T09:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: cuid(),
          },
          tx,
        ),
      );
      expect(init.isSuccess).toBe(true);

      const firstV2 = await prisma.$transaction(async (tx) =>
        repository.saveNewVersion(
          {
            gefBeurteilungId: gbId,
            version: 2,
            items: [makeItem('V2-first')],
            changedFields: { added: ['itm-new'], removed: [], updated: [], unchanged: 0 },
            gueltigVon: new Date('2026-04-22T10:00:00.000Z'),
            changedByUserId: testUserId,
            eventId: cuid(),
          },
          tx,
        ),
      );
      expect(firstV2.isSuccess).toBe(true);

      // When: Zweiter V2-Write mit anderer eventId aber gleicher `version`.
      let secondV2Result;
      try {
        secondV2Result = await prisma.$transaction(async (tx) =>
          repository.saveNewVersion(
            {
              gefBeurteilungId: gbId,
              version: 2,
              items: [makeItem('V2-second')],
              changedFields: { added: ['itm-new'], removed: [], updated: [], unchanged: 0 },
              gueltigVon: new Date('2026-04-22T11:00:00.000Z'),
              changedByUserId: testUserId,
              eventId: cuid(),
            },
            tx,
          ),
        );
      } catch (err) {
        secondV2Result = { isSuccess: false, isFailure: true, error: (err as Error).message };
      }

      // Then: Kein Success — echter Concurrency-Bug, nicht als Idempotenz-
      // Erfolg verschluckt. Genau eine V2-Zeile für dieses gbId in der DB.
      expect(secondV2Result.isSuccess).toBe(false);
      const v2Count = await prisma.gefaehrdungsbeurteilungVersion.count({
        where: { gefBeurteilungId: gbId, version: 2 },
      });
      expect(v2Count).toBe(1);
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

// ========================================
// Mock-basierte Unit-Tests für P2002-Target-Narrowing (Story 2.3 AC8)
// ========================================
//
// Hintergrund: Der Outbox-Retry-Pfad darf nur idempotent auf einen
// `event_id`-Unique-Conflict reagieren. Ein Unique-Conflict auf
// `(gefBeurteilungId, version)` ist ein echter Concurrency-Bug (zwei parallele
// Writes auf dieselbe Versionsnummer) und MUSS als `Result.fail` bleiben,
// damit der Fehler nicht verschluckt wird.
//
// Der Integration-Test oben deckt die `event_id`-Idempotenz über Postgres ab,
// aber das `(gefBeurteilungId, version)`-Ende ist über echte DB-Wege schwer
// gezielt auszulösen, ohne `event_id` gleichzeitig zu kollidieren. Deswegen
// mocken wir hier den Prisma-Client deterministisch mit den exakten
// `meta.target`-Shapes, die Prisma in Produktion liefert.
describe('PrismaGefaehrdungsbeurteilungVersionRepository — P2002-Target-Narrowing (Mock)', () => {
  const createMockLoggerUnit = (): ILogger => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  /**
   * Baut einen P2002-Mock mit klassischem `meta.target`-Shape (ältere Prisma-
   * Versionen / Nicht-Driver-Adapter-Treiber). `isPrismaP2002` prüft nur
   * `code === 'P2002'`, kein instanceof-Check — daher reicht duck-typed
   * Object.assign.
   */
  const buildP2002 = (target: unknown): Error =>
    Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      clientVersion: 'mock',
      meta: { target },
    });

  /**
   * Baut einen P2002-Mock im Prisma-7-Driver-Adapter-Shape. Die relevanten
   * Felder liegen tief in `meta.driverAdapterError.cause.*` — das ist der
   * Shape, den der PostgreSQL-Treiber in Produktion tatsächlich liefert.
   */
  const buildP2002DriverAdapter = (cause: { fields?: string[]; originalMessage?: string }): Error =>
    Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      clientVersion: 'mock',
      meta: {
        modelName: 'GefaehrdungsbeurteilungVersion',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            originalCode: '23505',
            kind: 'UniqueConstraintViolation',
            originalMessage: cause.originalMessage,
            constraint: cause.fields ? { fields: cause.fields } : undefined,
          },
        },
      },
    });

  /**
   * Mock-TransactionClient für `saveInitialVersion`-Pfad: `create` wirft den
   * konfigurierten Error.
   */
  const mockTxInitialReject = (error: unknown) =>
    ({
      gefaehrdungsbeurteilungVersion: {
        create: jest.fn().mockRejectedValue(error),
      },
    }) as never;

  /**
   * Mock-TransactionClient für `saveNewVersion`-Pfad: `updateMany` passt
   * erfolgreich (Chain-Closing), `create` wirft den konfigurierten Error.
   */
  const mockTxNewVersionReject = (error: unknown) =>
    ({
      gefaehrdungsbeurteilungVersion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockRejectedValue(error),
      },
    }) as never;

  const baseArgs = () => ({
    gefBeurteilungId: 'clw3h8x9y0000qwertyui00001',
    version: 2,
    items: [makeItem('Mock-Item')],
    changedFields: { added: [], removed: [], updated: [{ id: 'itm-upd', fields: ['title'] }], unchanged: 0 },
    gueltigVon: new Date('2026-04-22T12:00:00.000Z'),
    changedByUserId: 'clw3h8x9y0000qwertyui00099',
    eventId: 'clw3h8x9y0000qwertyui00999',
  });

  describe('saveNewVersion', () => {
    it('P2002 mit target=["gefaehrdungsbeurteilung_versionen_event_id_key"] → Result.ok (idempotent)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002(['gefaehrdungsbeurteilung_versionen_event_id_key']);

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Idempotenter Retry'), expect.objectContaining({ eventId: baseArgs().eventId }));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('P2002 mit target als bare String "event_id" → Result.ok (defensive Prisma-Version-Abdeckung)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002('event_id');

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('P2002 mit target=["gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key"] → Result.fail (echter Concurrency-Bug)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002(['gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key']);

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Unique constraint failed');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Fehler beim Speichern der neuen Version'), expect.objectContaining({ eventId: baseArgs().eventId }));
    });

    it('P2002 mit target=undefined (kein meta) → Result.fail (konservativ, kein Silent-Success)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002(undefined);

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });

    it('Nicht-Prisma-Error (z. B. Connection-Error) → Result.fail', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(new Error('Connection reset')));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Connection reset');
      expect(logger.error).toHaveBeenCalled();
    });

    it('Driver-Adapter-Shape P2002 mit constraint.fields=["event_id"] → Result.ok (Produktions-Shape)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002DriverAdapter({
        fields: ['event_id'],
        originalMessage: 'duplicate key value violates unique constraint "gefaehrdungsbeurteilung_versionen_event_id_key"',
      });

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('Driver-Adapter-Shape P2002 mit constraint.fields=["gef_beurteilung_id","version"] → Result.fail (Produktions-Shape)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002DriverAdapter({
        fields: ['gef_beurteilung_id', 'version'],
        originalMessage: 'duplicate key value violates unique constraint "gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key"',
      });

      const result = await repo.saveNewVersion(baseArgs(), mockTxNewVersionReject(err));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Unique constraint failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('saveInitialVersion', () => {
    it('P2002 mit target=["gefaehrdungsbeurteilung_versionen_event_id_key"] → Result.ok (idempotent)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002(['gefaehrdungsbeurteilung_versionen_event_id_key']);

      const result = await repo.saveInitialVersion({ ...baseArgs(), version: 1 }, mockTxInitialReject(err));

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Idempotenter Retry'), expect.objectContaining({ eventId: baseArgs().eventId }));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('P2002 mit target=["gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key"] → Result.fail (echter Concurrency-Bug)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002(['gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key']);

      const result = await repo.saveInitialVersion({ ...baseArgs(), version: 1 }, mockTxInitialReject(err));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Unique constraint failed');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Fehler beim Speichern der Initial-Version'), expect.objectContaining({ eventId: baseArgs().eventId }));
    });

    it('Nicht-Prisma-Error → Result.fail (kein Idempotenz-Fang)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);

      const result = await repo.saveInitialVersion({ ...baseArgs(), version: 1 }, mockTxInitialReject(new Error('Connection reset')));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Connection reset');
      expect(logger.error).toHaveBeenCalled();
    });

    it('Driver-Adapter-Shape P2002 mit constraint.fields=["event_id"] → Result.ok (Produktions-Shape)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002DriverAdapter({
        fields: ['event_id'],
        originalMessage: 'duplicate key value violates unique constraint "gefaehrdungsbeurteilung_versionen_event_id_key"',
      });

      const result = await repo.saveInitialVersion({ ...baseArgs(), version: 1 }, mockTxInitialReject(err));

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('Driver-Adapter-Shape P2002 mit constraint.fields=["gef_beurteilung_id","version"] → Result.fail (Produktions-Shape)', async () => {
      const logger = createMockLoggerUnit();
      const repo = new PrismaGefaehrdungsbeurteilungVersionRepository(logger);
      const err = buildP2002DriverAdapter({
        fields: ['gef_beurteilung_id', 'version'],
        originalMessage: 'duplicate key value violates unique constraint "gefaehrdungsbeurteilung_versionen_gefBeurteilungId_version_key"',
      });

      const result = await repo.saveInitialVersion({ ...baseArgs(), version: 1 }, mockTxInitialReject(err));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Unique constraint failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
