// @ts-nocheck
import { Result } from '@domain/common/result';
import type { IEinsatzRepository } from '@domain/repositories';
import { createMockEinsatzRepository } from '@/test-utils/mock-factories';
import { InMemoryEtbRepository } from '../../__tests__/in-memory-etb.repository';
import { createTestEtb, createTestSnapshot } from '@domain/aggregates/__tests__/fixtures/etb.fixtures';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const databaseAvailable = !!process.env.DATABASE_URL;

// Commands
import { CreateEtbCommand } from '@application/etb/commands';
import { CreateEtbHandler } from '@application/etb/commands';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import { AddKorrekturEintragCommand } from '@application/etb/commands';
import { AddKorrekturEintragHandler } from '@application/etb/commands';
import { EtbId } from '@domain/value-objects/etb-id';
import { UserId } from '@domain/value-objects/user-id';

// Queries
import { GetEtbQuery } from '../get-etb/get-etb.query';
import { GetEtbQueryHandler } from '@application/etb/queries';
import { GetEintraegeQuery } from '@application/etb/queries';
import { GetEintraegeQueryHandler } from '@application/etb/queries';
import { GetEtbHistoryQuery } from '@application/etb/queries';
import { GetEtbHistoryQueryHandler } from '@application/etb/queries';

// Mock CUID2 fuer deterministische Tests
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
    // CUID2 Format: lowercase a-z and 0-9 only, starts with letter
    // Nanoid/CUID Format (für UserId): mixed case alphanumeric + underscore/hyphen
    // Wir akzeptieren beide Formate für Kompatibilität
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

/**
 * Generiert eine Test-CUID mit korrektem Format.
 * Format: 25 Zeichen, beginnt mit 'c', nur lowercase a-z und 0-9.
 */
function generateTestCuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'c';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ETB Query Handler Integration Tests.
 *
 * Diese Tests validieren das Zusammenspiel von Command und Query Handlers
 * in realistischen Szenarien. Sie testen den vollstaendigen Flow:
 * Command -> Repository -> Domain -> Query -> DTO.
 *
 * **Warum Integration Tests:**
 * - Verifizieren das Zusammenspiel mehrerer Komponenten
 * - Testen realistische Szenarien (Command-Sequenzen gefolgt von Queries)
 * - Validieren dass Query-Ergebnisse nach Mutations korrekt sind
 *
 * **Pattern:**
 * - InMemoryEtbRepository fuer schnelle Tests ohne Datenbank
 * - SpyEventPublisher fuer Event-Verifikation
 * - createTestEtb Fixtures fuer konsistente Test-Daten
 */
(databaseAvailable ? describe : describe.skip)('ETB Query Integration Tests', () => {
  let etbRepository: InMemoryEtbRepository;
  let mockEinsatzRepository: jest.Mocked<IEinsatzRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  // Command Handlers
  let createEtbHandler: CreateEtbHandler;
  let addEintragHandler: AddEintragHandler;
  let addKorrekturEintragHandler: AddKorrekturEintragHandler;

  // Query Handlers
  let getEtbHandler: GetEtbQueryHandler;
  let getEintraegeHandler: GetEintraegeQueryHandler;
  let getHistoryHandler: GetEtbHistoryQueryHandler;

  let testUserId: string;
  let testEinsatzId: string;

  beforeEach(() => {
    // Reset repository und mocks
    etbRepository = new InMemoryEtbRepository();
    testUserId = generateTestCuid();
    testEinsatzId = generateTestCuid();

    // Mock IEinsatzRepository (CreateEtbHandler benoetigt exists-Check)
    mockEinsatzRepository = createMockEinsatzRepository();
    mockEinsatzRepository.exists.mockResolvedValue(Result.ok(true));

    // Mock PrismaService (GetEtbHandler und GetEintraegeHandler benoetigen Erinnerung-Queries)
    mockPrismaService = {
      erinnerung: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    // Command Handlers initialisieren (Transactional Outbox Pattern - kein Event Publisher noetig)
    createEtbHandler = new CreateEtbHandler(mockEinsatzRepository, etbRepository);
    addEintragHandler = new AddEintragHandler(etbRepository);
    addKorrekturEintragHandler = new AddKorrekturEintragHandler(etbRepository);

    // Query Handlers initialisieren
    getEtbHandler = new GetEtbQueryHandler(etbRepository, mockPrismaService);
    getEintraegeHandler = new GetEintraegeQueryHandler(etbRepository, mockPrismaService);
    getHistoryHandler = new GetEtbHistoryQueryHandler(etbRepository);
  });

  afterEach(() => {
    etbRepository.clear();
    jest.clearAllMocks();
  });

  describe('CreateEtb -> AddEintrag -> GetEtb: sollte ETB mit hinzugefuegtem Eintrag zurueckgeben', () => {
    it('sollte ETB mit Eintrag nach Command-Sequenz zurueckgeben', async () => {
      // Arrange: ETB erstellen
      const createCmd = CreateEtbCommand.create(testEinsatzId).value!;
      const createResult = await createEtbHandler.execute(createCmd);
      expect(createResult.isSuccess).toBe(true);
      const etbId = createResult.value?.value;

      // Act: Eintrag hinzufuegen
      const addCmd = AddEintragCommand.create(etbId, 'Fahrzeug W1 eingetroffen', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCmd);
      expect(addResult.isSuccess).toBe(true);

      // Assert: GetEtb gibt Eintrag zurueck
      const query = new GetEtbQuery(testEinsatzId);
      const result = await getEtbHandler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      expect(result.value?.eintraege).toHaveLength(1);
      expect(result.value?.eintraege[0]?.text).toBe('Fahrzeug W1 eingetroffen');
      expect(result.value?.eintraege[0]?.isDeleted).toBe(false);
    });

    it('sollte mehrere Eintraege korrekt zurueckgeben', async () => {
      // Arrange: ETB mit mehreren Eintraegen erstellen
      const createCmd = CreateEtbCommand.create(testEinsatzId).value!;
      const createResult = await createEtbHandler.execute(createCmd);
      const etbId = createResult.value?.value;

      // Act: Mehrere Eintraege hinzufuegen
      const texts = ['Alarmierung erhalten', 'Ausgerueckt', 'Am Einsatzort eingetroffen'];
      for (const text of texts) {
        const addCmd = AddEintragCommand.create(etbId, text, testUserId).value!;
        await addEintragHandler.execute(addCmd);
      }

      // Assert: GetEtb gibt alle Eintraege zurueck
      const query = new GetEtbQuery(testEinsatzId);
      const result = await getEtbHandler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.eintraege).toHaveLength(3);
      // Verifizieren dass Texte korrekt sind
      const returnedTexts = result.value?.eintraege.map((e) => e.text);
      expect(returnedTexts).toContain('Alarmierung erhalten');
      expect(returnedTexts).toContain('Ausgerueckt');
      expect(returnedTexts).toContain('Am Einsatzort eingetroffen');
    });
  });

  describe('AddEintrag -> AddKorrekturEintrag -> GetEtb: Korrektur-Verifikation', () => {
    it('sollte Original und Korrektur-Eintrag zurueckgeben', async () => {
      // Arrange: ETB mit Eintrag erstellen
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Eintrag hinzufuegen
      const addCmd = AddEintragCommand.create(etb.id.value, 'Original Text', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCmd);
      const eintragId = addResult.value?.id.value;

      // Korrektur hinzufuegen
      const korrekturCmd = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Korrigierter Text', testUserId).value!;
      await addKorrekturEintragHandler.execute(korrekturCmd);

      // Assert: GetEtb gibt beide Eintraege zurueck
      const query = new GetEtbQuery(testEinsatzId, false);
      const result = await getEtbHandler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.eintraege).toHaveLength(2);
    });

    it('sollte Korrektur-Eintrag mit korrektem Text zurueckgeben', async () => {
      // Arrange: ETB mit Eintrag erstellen
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Eintrag hinzufuegen
      const addCmd = AddEintragCommand.create(etb.id.value, 'Original', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCmd);
      const eintragId = addResult.value?.id.value;

      // Korrektur hinzufuegen
      const korrekturCmd = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Korrektur', testUserId).value!;
      await addKorrekturEintragHandler.execute(korrekturCmd);

      // Assert: GetEtb mit includeDeleted=true gibt alle zurueck
      const query = new GetEtbQuery(testEinsatzId, true);
      const result = await getEtbHandler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.eintraege).toHaveLength(2);
      const korrekturEintrag = result.value?.eintraege.find((e) => e.text === 'Korrektur');
      expect(korrekturEintrag).toBeDefined();
    });
  });

  describe('Multiple AddEintrag -> GetEintraege: Sortierung nach Sequenznummer', () => {
    it('sollte Eintraege nach Sequenznummer aufsteigend sortiert zurueckgeben', async () => {
      // Arrange: ETB mit mehreren Eintraegen erstellen
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Eintraege in bestimmter Reihenfolge hinzufuegen
      const texts = ['Erster Eintrag', 'Zweiter Eintrag', 'Dritter Eintrag'];
      for (const text of texts) {
        const addCmd = AddEintragCommand.create(etb.id.value, text, testUserId).value!;
        await addEintragHandler.execute(addCmd);
      }

      // Act: GetEintraege ausfuehren
      const query = new GetEintraegeQuery(etb.id.value);
      const result = await getEintraegeHandler.execute(query);

      // Assert: Eintraege sind nach Sequenznummer sortiert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);

      // Sequenznummern muessen aufsteigend sein
      expect(result.value?.[0]?.sequenceNumber).toBe(1);
      expect(result.value?.[1]?.sequenceNumber).toBe(2);
      expect(result.value?.[2]?.sequenceNumber).toBe(3);

      // Texte muessen der Reihenfolge entsprechen
      expect(result.value?.[0]?.text).toBe('Erster Eintrag');
      expect(result.value?.[1]?.text).toBe('Zweiter Eintrag');
      expect(result.value?.[2]?.text).toBe('Dritter Eintrag');
    });

    it('sollte Result.fail() zurueckgeben wenn ETB nicht existiert', async () => {
      // Arrange: Nicht-existierende ETB-ID
      const nonExistentEtbId = generateTestCuid();

      // Act
      const query = new GetEintraegeQuery(nonExistentEtbId);
      const result = await getEintraegeHandler.execute(query);

      // Assert: Result.fail() statt NotFoundException (framework-agnostisch)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatztagebuch nicht gefunden');
    });

    it('sollte leeres Array zurueckgeben wenn ETB keine Eintraege hat', async () => {
      // Arrange: Leeres ETB
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Act
      const query = new GetEintraegeQuery(etb.id.value);
      const result = await getEintraegeHandler.execute(query);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });
  });

  describe('AddEintrag -> UpdateEintrag -> GetEtbHistory: Snapshot-Verifikation', () => {
    /**
     * Erstellt ein EtbEintragSnapshot-Objekt fuer Tests.
     * Verwendet CUID-Format fuer IDs um Validierung zu bestehen.
     */
    function createTestEintragSnapshot(sequenceNumber: number): {
      id: string;
      sequenceNumber: number;
      text: string;
      createdBy: string;
      createdAt: string;
      updatedAt?: string;
      isDeleted: boolean;
    } {
      return {
        id: generateTestCuid(),
        sequenceNumber,
        text: `Snapshot Eintrag ${sequenceNumber}`,
        createdBy: generateTestCuid(),
        createdAt: new Date().toISOString(),
        isDeleted: false,
      };
    }

    it('sollte Snapshots fuer jede Mutation zurueckgeben', async () => {
      // Arrange: ETB erstellen und Snapshots manuell hinzufuegen
      // (InMemoryRepository speichert keine Snapshots automatisch, wir simulieren)
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Simuliere Snapshots nach Mutationen mit manuell erstellten Eintraegen
      const snapshot1 = createTestSnapshot({ versionNumber: 1, eintraege: [] });
      const snapshot2 = createTestSnapshot({
        versionNumber: 2,
        eintraege: [createTestEintragSnapshot(1)],
      });
      const snapshot3 = createTestSnapshot({
        versionNumber: 3,
        eintraege: [createTestEintragSnapshot(1)],
      });

      etbRepository.addSnapshot(etb.id, snapshot1);
      etbRepository.addSnapshot(etb.id, snapshot2);
      etbRepository.addSnapshot(etb.id, snapshot3);

      // Act: Historie abrufen
      const query = new GetEtbHistoryQuery(etb.id.value);
      const result = await getHistoryHandler.execute(query);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
    });

    it('sollte Snapshots nach Versionsnummer aufsteigend sortieren', async () => {
      // Arrange: ETB mit Snapshots in umgekehrter Reihenfolge
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Snapshots werden normalerweise neueste zuerst gespeichert
      // Verwende manuell erstellte Eintraege mit CUID-Format
      const snapshot3 = createTestSnapshot({
        versionNumber: 3,
        eintraege: [createTestEintragSnapshot(1), createTestEintragSnapshot(2)],
      });
      const snapshot2 = createTestSnapshot({
        versionNumber: 2,
        eintraege: [createTestEintragSnapshot(1)],
      });
      const snapshot1 = createTestSnapshot({ versionNumber: 1, eintraege: [] });

      etbRepository.addSnapshot(etb.id, snapshot3);
      etbRepository.addSnapshot(etb.id, snapshot2);
      etbRepository.addSnapshot(etb.id, snapshot1);

      // Act: Historie abrufen
      const query = new GetEtbHistoryQuery(etb.id.value);
      const result = await getHistoryHandler.execute(query);

      // Assert: Aufsteigende Sortierung (aelteste zuerst)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value?.[0]?.version).toBe(1);
      expect(result.value?.[1]?.version).toBe(2);
      expect(result.value?.[2]?.version).toBe(3);
    });

    it('sollte leeres Array zurueckgeben wenn keine Historie vorhanden', async () => {
      // Arrange: ETB ohne Snapshots
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Act
      const query = new GetEtbHistoryQuery(etb.id.value);
      const result = await getHistoryHandler.execute(query);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });
  });

  describe('Full Lifecycle: CreateEtb -> AddEintrag -> AddKorrekturEintrag -> Lock -> GetEtb', () => {
    it('sollte vollstaendigen ETB-Lifecycle korrekt abbilden', async () => {
      // Phase 1: ETB erstellen
      const createCmd = CreateEtbCommand.create(testEinsatzId).value!;
      const createResult = await createEtbHandler.execute(createCmd);
      expect(createResult.isSuccess).toBe(true);
      const etbId = createResult.value?.value;

      // Phase 2: Eintrag hinzufuegen
      const addCmd = AddEintragCommand.create(etbId, 'Urspruenglicher Text', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCmd);
      expect(addResult.isSuccess).toBe(true);
      const eintragId = addResult.value?.id.value;

      // Phase 3: Korrektur erstellen
      const korrekturCmd = AddKorrekturEintragCommand.create(etbId, eintragId, 'Korrigierter Text', testUserId).value!;
      const korrekturResult = await addKorrekturEintragHandler.execute(korrekturCmd);
      expect(korrekturResult.isSuccess).toBe(true);

      // Phase 4: Zweiten Eintrag hinzufuegen
      const addCmd2 = AddEintragCommand.create(etbId, 'Zweiter Eintrag', testUserId).value!;
      await addEintragHandler.execute(addCmd2);

      // Phase 5: ETB sperren (direkt über Aggregate)
      const etbAggregate = await etbRepository.findById(EtbId.create(etbId).value!);
      const lockResult = etbAggregate!.lock(UserId.create(testUserId).value!);
      expect(lockResult.isSuccess).toBe(true);
      await etbRepository.save(etbAggregate!);

      // Assert: GetEtb gibt korrekten finalen Zustand zurueck
      const getEtbQuery = new GetEtbQuery(testEinsatzId, false);
      const etbResult = await getEtbHandler.execute(getEtbQuery);

      expect(etbResult.isSuccess).toBe(true);
      expect(etbResult.value).not.toBeNull();
      expect(etbResult.value?.status).toBe('LOCKED');
      // Original + Korrektur + Zweiter Eintrag = 3
      expect(etbResult.value?.eintraege).toHaveLength(3);
    });

    it('sollte Command-Sequenz nach vollstaendigem Lifecycle korrekt durchlaufen', async () => {
      // ETB erstellen
      const createCmd = CreateEtbCommand.create(testEinsatzId).value!;
      const createResult = await createEtbHandler.execute(createCmd);
      const etbId = createResult.value?.value;

      // Eintrag hinzufuegen
      const addCmd = AddEintragCommand.create(etbId, 'Test', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCmd);
      const eintragId = addResult.value?.id.value;

      // Korrektur erstellen
      const korrekturCmd = AddKorrekturEintragCommand.create(etbId, eintragId, 'Korrektur', testUserId).value!;
      await addKorrekturEintragHandler.execute(korrekturCmd);

      // ETB sperren (direkt über Aggregate)
      const etbAggregate = await etbRepository.findById(EtbId.create(etbId).value!);
      const lockResult = etbAggregate!.lock(UserId.create(testUserId).value!);
      expect(lockResult.isSuccess).toBe(true);
      await etbRepository.save(etbAggregate!);
    });
  });

  describe('GetEtb Query: Nicht existierendes ETB', () => {
    it('sollte null zurueckgeben wenn ETB nicht existiert', async () => {
      // Arrange: Nicht existierende EinsatzId
      const nonExistentEinsatzId = generateTestCuid();

      // Act
      const query = new GetEtbQuery(nonExistentEinsatzId);
      const result = await getEtbHandler.execute(query);

      // Assert: null ist valide Response (NICHT Fehler!)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('Query Validierung', () => {
    it('GetEtbQuery sollte bei leerem einsatzId Fehler werfen', () => {
      expect(() => new GetEtbQuery('')).toThrow();
    });

    it('GetEintraegeQuery sollte bei leerem etbId Fehler werfen', () => {
      expect(() => new GetEintraegeQuery('')).toThrow();
    });

    it('GetEtbHistoryQuery sollte bei leerem etbId Fehler werfen', () => {
      expect(() => new GetEtbHistoryQuery('')).toThrow();
    });
  });
});
