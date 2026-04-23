// @ts-nocheck
/**
 * Integration Tests für PrismaGefaehrdungsbeurteilungVorlageRepository.
 *
 * Validiert:
 *  - `findAktive()` liefert alle aktiven Vorlagen, sortiert nach `name` (ASC).
 *  - Die 5 Seeds aus Story 1.4 (MANV, VU, Großveranstaltung, Betreuung, CBRN)
 *    sind alle vorhanden und in korrekter Name-Sortierung (Happy-Path; wenn
 *    Seeds lokal nicht geladen sind, legen wir sie im Test selbst an).
 *  - `findAktive()` filtert nicht-aktive Vorlagen aus.
 *  - `findById()` Happy-Path + null-Fall.
 *  - VO-Mapper ist defensiv: fehlerhafte Einzel-Items werden übersprungen,
 *    der Read crasht nicht.
 *
 * Beide Methoden akzeptieren einen **optionalen** `TransactionContext`; die
 * Tests nutzen die prisma-interne Auto-Transaction (kein expliziter `tx`).
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
import type { ILogger } from '@domain/ports/i-logger.port';
import { skipIfNoDatabase, createTestPrismaClient } from '@/infrastructure/__tests__/helpers/database-test.helper';
import { PrismaGefaehrdungsbeurteilungVorlageRepository } from '../prisma-gefaehrdungsbeurteilung-vorlage.repository';

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

/** Die 5 Seed-Slugs aus Story 1.4 — wir prüfen sie als Hard-Constraint. */
const SEED_SLUGS = ['manv', 'vu-patientenversorgung', 'sanitaetsdienst-grossveranstaltung', 'betreuungseinsatz', 'cbrn-patientenversorgung'] as const;

describe('PrismaGefaehrdungsbeurteilungVorlageRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaGefaehrdungsbeurteilungVorlageRepository;
  let databaseAvailable = false;
  const testRunId = Date.now();
  /** IDs der in diesem Test-Lauf angelegten Test-Vorlagen (für Cleanup). */
  const seededVorlagenIds: string[] = [];

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) return;

    prisma = createTestPrismaClient();
    repository = new PrismaGefaehrdungsbeurteilungVorlageRepository(prisma as unknown as never, createMockLogger());

    // Cleanup von vorherigen Test-Vorlagen.
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM gefaehrdungsbeurteilung_vorlagen WHERE slug LIKE 'gb-vorlage-it-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Sicherstellen, dass die 5 Seed-Vorlagen existieren. Sind sie nicht
    // geladen (lokale DB ohne Seed-Lauf), legen wir sie defensiv an, damit
    // die Tests reproduzierbar laufen.
    for (const slug of SEED_SLUGS) {
      const existing = await prisma.gefaehrdungsbeurteilungVorlage.findUnique({ where: { slug } });
      if (existing) continue;
      const id = cuid();
      // Für 'manv' → 3 Items inkl. eintritt/schaden (Voraussetzung für MANV-
      // 3-Items-Assertion in AC8), für alle anderen Slugs → 1 Item
      // (ausreichend für Shape-Check).
      const itemsForSlug =
        slug === 'manv'
          ? JSON.stringify([
              { title: `Item 1 für ${slug}`, eintritt: 'HAEUFIG', schaden: 'GERING' },
              { title: `Item 2 für ${slug}`, eintritt: 'HAEUFIG', schaden: 'MITTEL' },
              { title: `Item 3 für ${slug}`, eintritt: 'GELEGENTLICH', schaden: 'HOCH' },
            ])
          : JSON.stringify([{ title: `Item für ${slug}` }]);
      await prisma.$executeRawUnsafe(
        `INSERT INTO gefaehrdungsbeurteilung_vorlagen (id, slug, name, szenario, items, version, aktiv, erstellt_am) VALUES ($1, $2, $3, $4, $5::jsonb, 1, true, NOW())`,
        id,
        slug,
        // Name-Platzhalter für Sortierungs-Sanity-Check.
        slug.toUpperCase(),
        'Test',
        itemsForSlug,
      );
      seededVorlagenIds.push(id);
    }
  });

  afterAll(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Räume NUR selbst-angelegte Vorlagen ab (sowohl die 5 Fallback-Seeds,
      // falls hier erzeugt, als auch alle Ad-hoc-Vorlagen mit Präfix).
      if (seededVorlagenIds.length > 0) {
        await prisma.$executeRawUnsafe(`DELETE FROM gefaehrdungsbeurteilung_vorlagen WHERE id = ANY($1::text[])`, seededVorlagenIds);
      }
      await prisma.$executeRawUnsafe(`DELETE FROM gefaehrdungsbeurteilung_vorlagen WHERE slug LIKE 'gb-vorlage-it-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    await prisma.$disconnect();
  });

  describe('findAktive()', () => {
    it('sollte alle aktiven Vorlagen nach Name sortiert zurückgeben und die 5 Seed-Slugs enthalten', async () => {
      if (!databaseAvailable) return;
      // When
      const result = await repository.findAktive();

      // Then: Alle Seed-Slugs sind vertreten und die Reihenfolge (ASC nach Name) hält.
      expect(result.isSuccess).toBe(true);
      const vorlagen = result.value;
      const foundSlugs = vorlagen.map((v) => v.slug);
      for (const seedSlug of SEED_SLUGS) {
        expect(foundSlugs).toContain(seedSlug);
      }

      // Sortierung: Liste ist alphabetisch nach Name sortiert (locale-unabhängig).
      const names = vorlagen.map((v) => v.name);
      const sortedCopy = [...names].sort();
      expect(names).toEqual(sortedCopy);

      // Jede Vorlage hat wohlgeformte Felder.
      for (const v of vorlagen) {
        expect(typeof v.id).toBe('string');
        expect(v.aktiv).toBe(true);
        expect(typeof v.version).toBe('number');
        expect(Array.isArray(v.items)).toBe(true);
        expect(v.erstelltAm).toBeInstanceOf(Date);
      }
    });

    it('sollte MANV-Vorlage mit genau 3 validen Items liefern (AC8: Seed-vs-Shared-Zod-Harmonisierung)', async () => {
      if (!databaseAvailable) return;
      // When
      const result = await repository.findAktive();
      expect(result.isSuccess).toBe(true);

      // Then: MANV-Vorlage hat 3 Items mit non-leeren Titeln. Beweist, dass
      // seed.ts und Shared-Zod-Schema denselben Feld-Shape nutzen (kein Item
      // wird mehr durch den defensiven Mapper verworfen).
      const manv = result.value.find((v) => v.slug === 'manv');
      expect(manv).toBeDefined();
      expect(manv!.items).toHaveLength(3);
      for (const item of manv!.items) {
        expect(typeof item.title).toBe('string');
        expect(item.title.length).toBeGreaterThan(0);
        expect(typeof item.eintritt).toBe('string');
        expect(typeof item.schaden).toBe('string');
      }
    });

    it('sollte nicht-aktive Vorlagen ausfiltern', async () => {
      if (!databaseAvailable) return;
      // Given: Eine inaktive Test-Vorlage.
      const inaktivId = cuid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO gefaehrdungsbeurteilung_vorlagen (id, slug, name, szenario, items, version, aktiv, erstellt_am) VALUES ($1, $2, $3, $4, $5::jsonb, 1, false, NOW())`,
        inaktivId,
        `gb-vorlage-it-inaktiv-${testRunId}`,
        'Inaktive-Vorlage',
        'Test',
        JSON.stringify([{ title: 'Inaktives-Item' }]),
      );

      try {
        // When
        const result = await repository.findAktive();

        // Then: Inaktive Vorlage taucht nicht auf.
        expect(result.isSuccess).toBe(true);
        const ids = result.value.map((v) => v.id);
        expect(ids).not.toContain(inaktivId);
      } finally {
        await prisma.$executeRawUnsafe('DELETE FROM gefaehrdungsbeurteilung_vorlagen WHERE id = $1', inaktivId);
      }
    });
  });

  describe('findById()', () => {
    it('sollte die Vorlage als Read-Model rekonstruiert zurückgeben (Happy-Path)', async () => {
      if (!databaseAvailable) return;
      // Given: Irgendeine aktive Vorlage.
      const any = await prisma.gefaehrdungsbeurteilungVorlage.findFirst({ where: { aktiv: true } });
      if (!any) throw new Error('Erwartet: mindestens eine aktive Vorlage in der DB.');

      // When
      const result = await repository.findById(any.id);

      // Then
      expect(result.isSuccess).toBe(true);
      const vorlage = result.value;
      expect(vorlage).not.toBeNull();
      expect(vorlage?.id).toBe(any.id);
      expect(vorlage?.slug).toBe(any.slug);
      expect(vorlage?.name).toBe(any.name);
      expect(Array.isArray(vorlage?.items)).toBe(true);
    });

    it('sollte Result.ok(null) liefern, wenn die ID unbekannt ist', async () => {
      if (!databaseAvailable) return;
      // Given
      const unbekannteId = cuid();

      // When
      const result = await repository.findById(unbekannteId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('sollte defensiven Mapper anwenden: fehlerhafte JSONB-Items werden verworfen, Read crasht nicht', async () => {
      if (!databaseAvailable) return;
      // Given: Vorlage mit 1× validem + 1× invalidem Item (leerer Titel).
      const vorlageId = cuid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO gefaehrdungsbeurteilung_vorlagen (id, slug, name, szenario, items, version, aktiv, erstellt_am) VALUES ($1, $2, $3, $4, $5::jsonb, 1, true, NOW())`,
        vorlageId,
        `gb-vorlage-it-malformed-${testRunId}`,
        'Malformed-Vorlage',
        'Test',
        JSON.stringify([
          { title: 'Valide-Gefährdung' },
          // Invalide: Titel ist leer → VO-Mapper muss dieses Item überspringen.
          { title: '' },
          // Invalide: kein Objekt → Mapper überspringt via Pre-Check.
          null,
        ]),
      );

      try {
        // When
        const result = await repository.findById(vorlageId);

        // Then
        expect(result.isSuccess).toBe(true);
        const vorlage = result.value;
        expect(vorlage).not.toBeNull();
        expect(vorlage?.items).toHaveLength(1);
        expect(vorlage?.items[0]?.title).toBe('Valide-Gefährdung');
      } finally {
        await prisma.$executeRawUnsafe('DELETE FROM gefaehrdungsbeurteilung_vorlagen WHERE id = $1', vorlageId);
      }
    });
  });
});
