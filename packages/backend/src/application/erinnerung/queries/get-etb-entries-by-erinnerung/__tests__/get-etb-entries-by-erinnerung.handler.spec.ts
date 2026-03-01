import { GetEtbEntriesByErinnerungHandler } from '../get-etb-entries-by-erinnerung.handler';
import { GetEtbEntriesByErinnerungQuery } from '../get-etb-entries-by-erinnerung.query';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { ILogger } from '@domain/ports/i-logger.port';

// Mock cuid2 für deterministische Test-IDs
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
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/**
 * Test-ID Helper für deterministische Tests.
 * Erstellt gültige CUID2-Format Test-IDs.
 */
function createValidTestId(suffix = ''): string {
  const base = 'clw3h8x9y0000qwertyui';
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, '0')
    .slice(0, 5);
  return base + safeSuffix;
}

/**
 * Unit Tests für GetEtbEntriesByErinnerungHandler.
 *
 * Testet das Laden der ETB-History einer Erinnerung mit allen ETB-Einträgen,
 * die zu dieser Erinnerung gehören.
 *
 * **Story 5.7: Bidirektionale Verknüpfung - Erinnerung zu ETB-Einträgen Query**
 *
 * Coverage Target: >90%
 */
describe('GetEtbEntriesByErinnerungHandler', () => {
  let handler: GetEtbEntriesByErinnerungHandler;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test-IDs (kurze Suffixe, da createValidTestId auf 5 Zeichen kürzt)
  const einsatzId = createValidTestId('eins1');
  const erinnerungId = createValidTestId('erin1');
  const userId = createValidTestId('user1');
  const differentEinsatzId = createValidTestId('eins2');
  const etbId = createValidTestId('etb01');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Mock PrismaService
    mockPrisma = {
      erinnerung: {
        findUnique: jest.fn(),
      },
      einsatztagebuch: {
        findUnique: jest.fn(),
      },
      etbEintrag: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    handler = new GetEtbEntriesByErinnerungHandler(mockPrisma, mockLogger);
  });

  describe('Erfolgsfall mit mehreren Einträgen', () => {
    it('should return ETB entries in chronological order (ASC by createdAt)', async () => {
      // Given: Erinnerung existiert und gehört zum Einsatz
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      // ETB-Einträge mit unterschiedlichen Timestamps
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Prisma gibt bereits sortiert zurück (ASC)
      const etbEntries = [
        {
          id: createValidTestId('entry001'),
          text: 'Erinnerung erstellt',
          createdAt: twoHoursAgo,
          sequenceNumber: 1,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
        {
          id: createValidTestId('entry002'),
          text: 'Erinnerung ausgelöst',
          createdAt: oneHourAgo,
          sequenceNumber: 5,
          metadata: { eventType: 'ErinnerungAusgeloest', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
        {
          id: createValidTestId('entry003'),
          text: 'Erinnerung bestätigt',
          createdAt: now,
          sequenceNumber: 10,
          metadata: { eventType: 'ErinnerungAcknowledged', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.entries).toHaveLength(3);
      expect(result.value?.totalCount).toBe(3);

      // Chronologische Reihenfolge (älteste zuerst)
      expect(result.value?.entries[0].timestamp).toEqual(twoHoursAgo);
      expect(result.value?.entries[1].timestamp).toEqual(oneHourAgo);
      expect(result.value?.entries[2].timestamp).toEqual(now);

      // Verify orderBy ASC in Prisma-Call
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should include user names via join (createdBy with username)', async () => {
      // Given: Erinnerung mit einem ETB-Eintrag und User-Daten
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      const etbEntries = [
        {
          id: createValidTestId('entry004'),
          text: 'Erinnerung erstellt',
          createdAt: new Date(),
          sequenceNumber: 1,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: createdBy mit username ist enthalten
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries[0].createdBy).toBeDefined();
      expect(result.value?.entries[0].createdBy.id).toBe(userId);
      expect(result.value?.entries[0].createdBy.username).toBe('max.mustermann');

      // Verify include in Prisma-Call
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            creator: expect.objectContaining({
              select: { id: true, username: true },
            }),
          }),
        }),
      );
    });
  });

  describe('Leere Ergebnisse', () => {
    it('should return empty entries array when no ETB entries exist (not an error)', async () => {
      // Given: Erinnerung existiert, aber keine ETB-Einträge
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Leeres Array ist valide Response (KEIN FEHLER!)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.entries).toEqual([]);
      expect(result.value?.totalCount).toBe(0);
    });
  });

  describe('Erinnerung nicht gefunden', () => {
    it('should fail if erinnerung not found', async () => {
      // Given: Erinnerung existiert nicht
      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(null);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() mit passender Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Erinnerung nicht gefunden');

      // ETB-Query sollte nicht ausgeführt werden
      expect(mockPrisma.etbEintrag.findMany).not.toHaveBeenCalled();

      // Logger.warn sollte aufgerufen werden
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Erinnerung not found'), 'GetEtbEntriesByErinnerungHandler');
    });
  });

  describe('Security: Cross-Einsatz-Zugriff verhindert', () => {
    it('should fail if erinnerung belongs to different einsatz (security check)', async () => {
      // Given: Erinnerung existiert, gehört aber zu anderem Einsatz
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: differentEinsatzId, // Anderer Einsatz!
      };

      (mockPrisma.erinnerung.findUnique as jest.Mock).mockResolvedValue(erinnerungData);

      // Query mit falschem einsatzId
      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Security-Fehler (Cross-Einsatz-Zugriff verhindert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Erinnerung gehört nicht zu diesem Einsatz');

      // ETB-Query sollte nicht ausgeführt werden
      expect(mockPrisma.etbEintrag.findMany).not.toHaveBeenCalled();

      // Logger.warn sollte Security-Violation loggen
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Security violation'), 'GetEtbEntriesByErinnerungHandler');
    });
  });

  describe('eventType-Extraktion aus metadata', () => {
    it('should extract eventType from metadata correctly', async () => {
      // Given: ETB-Einträge mit verschiedenen eventTypes
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      const etbEntries = [
        {
          id: createValidTestId('entry005'),
          text: 'Erinnerung erstellt',
          createdAt: new Date(),
          sequenceNumber: 1,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId, faelligAm: '2024-01-15T14:00:00Z' },
          creator: { id: userId, username: 'user1' },
        },
        {
          id: createValidTestId('entry006'),
          text: 'Erinnerung snoozed',
          createdAt: new Date(),
          sequenceNumber: 2,
          metadata: { eventType: 'ErinnerungSnoozed', erinnerungId, snoozeMinuten: 15 },
          creator: { id: userId, username: 'user1' },
        },
        {
          id: createValidTestId('entry007'),
          text: 'Erinnerung eskaliert',
          createdAt: new Date(),
          sequenceNumber: 3,
          metadata: { eventType: 'ErinnerungEskaliert', erinnerungId, grund: 'Keine Reaktion' },
          creator: { id: userId, username: 'user1' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: eventType wird korrekt aus metadata extrahiert
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries[0].eventType).toBe('ErinnerungErstellt');
      expect(result.value?.entries[1].eventType).toBe('ErinnerungSnoozed');
      expect(result.value?.entries[2].eventType).toBe('ErinnerungEskaliert');
    });

    it('should return Unknown eventType when metadata.eventType is missing', async () => {
      // Given: ETB-Eintrag ohne eventType in metadata
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      const etbEntries = [
        {
          id: createValidTestId('entry008'),
          text: 'Legacy Eintrag',
          createdAt: new Date(),
          sequenceNumber: 1,
          metadata: { erinnerungId }, // Kein eventType!
          creator: { id: userId, username: 'user1' },
        },
        {
          id: createValidTestId('entry009'),
          text: 'Eintrag ohne metadata',
          createdAt: new Date(),
          sequenceNumber: 2,
          metadata: null, // Keine metadata!
          creator: { id: userId, username: 'user1' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Fallback auf 'Unknown'
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries[0].eventType).toBe('Unknown');
      expect(result.value?.entries[1].eventType).toBe('Unknown');
    });
  });

  describe('Fehlerbehandlung', () => {
    it('should handle unexpected database errors gracefully', async () => {
      // Given: Prisma wirft einen Fehler
      const dbError = new Error('Database connection failed');
      mockPrisma.erinnerung.findUnique = jest.fn().mockRejectedValue(dbError);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() mit generischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Fehler beim Laden der ETB-History');

      // Logger.error sollte mit Stack-Trace aufgerufen werden
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'), 'GetEtbEntriesByErinnerungHandler');
    });

    it('should fail if ETB not found for einsatz', async () => {
      // Given: Erinnerung existiert, aber ETB nicht gefunden
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue(null);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() mit passender Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('ETB nicht gefunden');

      // Logger.warn sollte aufgerufen werden
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ETB not found'), 'GetEtbEntriesByErinnerungHandler');
    });
  });

  describe('Query Validierung', () => {
    it('should throw if erinnerungId is empty', () => {
      // Given: Leere erinnerungId
      const emptyErinnerungId = '';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEtbEntriesByErinnerungQuery(emptyErinnerungId, einsatzId)).toThrow('erinnerungId is required');
    });

    it('should throw if einsatzId is empty', () => {
      // Given: Leere einsatzId
      const emptyEinsatzId = '';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEtbEntriesByErinnerungQuery(erinnerungId, emptyEinsatzId)).toThrow('einsatzId is required');
    });

    it('should throw if erinnerungId has invalid CUID2 format', () => {
      // Given: Ungültige erinnerungId (nicht CUID2 konform)
      const invalidErinnerungId = 'invalid-format';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEtbEntriesByErinnerungQuery(invalidErinnerungId, einsatzId)).toThrow();
    });

    it('should throw if einsatzId has invalid CUID2 format', () => {
      // Given: Ungültige einsatzId (nicht CUID2 konform)
      const invalidEinsatzId = 'invalid-format';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetEtbEntriesByErinnerungQuery(erinnerungId, invalidEinsatzId)).toThrow();
    });
  });

  describe('DTO Mapping', () => {
    it('should map ETB entries to EtbEntryPreviewDto correctly', async () => {
      // Given: Vollständiger ETB-Eintrag
      const timestamp = new Date('2024-01-15T12:00:00.000Z');
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      const etbEntries = [
        {
          id: createValidTestId('entry010'),
          text: "Erinnerung 'Follow-up Leitstelle' erstellt, fällig um 15.01.2024, 14:00",
          createdAt: timestamp,
          sequenceNumber: 42,
          metadata: {
            eventType: 'ErinnerungErstellt',
            erinnerungId,
            faelligAm: '2024-01-15T14:00:00.000Z',
          },
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: DTO-Struktur verifizieren
      expect(result.isSuccess).toBe(true);

      const entry = result.value?.entries[0];
      expect(entry.id).toBe(createValidTestId('entry010'));
      expect(entry.eventType).toBe('ErinnerungErstellt');
      expect(entry.timestamp).toEqual(timestamp);
      expect(entry.sequenceNumber).toBe(42);
      expect(entry.text).toContain('Follow-up Leitstelle');
      expect(entry.createdBy.id).toBe(userId);
      expect(entry.createdBy.username).toBe('max.mustermann');
    });

    it('should map ErinnerungEtbHistoryDto correctly', async () => {
      // Given: Erinnerung mit mehreren Entries
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      const etbEntries = [
        {
          id: createValidTestId('entry011'),
          text: 'Event 1',
          createdAt: new Date(),
          sequenceNumber: 1,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId },
          creator: { id: userId, username: 'user1' },
        },
        {
          id: createValidTestId('entry012'),
          text: 'Event 2',
          createdAt: new Date(),
          sequenceNumber: 2,
          metadata: { eventType: 'ErinnerungAusgeloest', erinnerungId },
          creator: { id: userId, username: 'user1' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: History-DTO Struktur
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries).toHaveLength(2);
      expect(result.value?.totalCount).toBe(2);
    });
  });

  describe('Logging', () => {
    it('should log when loading ETB history', async () => {
      // Given: Erinnerung existiert
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Logger.log sollte aufgerufen werden
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Loading ETB history for erinnerungId=${erinnerungId}`), 'GetEtbEntriesByErinnerungHandler');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('ETB history loaded'), 'GetEtbEntriesByErinnerungHandler');
    });
  });

  describe('Metadata Filter', () => {
    it('should filter by metadata.erinnerungId using OR condition', async () => {
      // Given: Erinnerung existiert (ohne etbEntryId)
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: null,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Verify OR-Condition mit metadata Filter im Prisma-Call
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              expect.objectContaining({
                metadata: {
                  path: ['erinnerungId'],
                  equals: erinnerungId,
                },
              }),
            ]),
          },
        }),
      );
    });

    it('should apply safety limit of 100 entries', async () => {
      // Given: Erinnerung existiert
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: null,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Verify take limit in Prisma-Call
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('Story 5.7: etbEntryId Verknüpfung (Original-Eintrag)', () => {
    const originalEntryId = createValidTestId('origi');

    it('should include etbEntryId in OR condition when present', async () => {
      // Given: Erinnerung mit etbEntryId (wurde von einem ETB-Eintrag aus erstellt)
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: originalEntryId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: OR-Condition enthält beide Filter (metadata.erinnerungId UND etbEntryId)
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              // Filter für automatisch erstellte Einträge
              expect.objectContaining({
                metadata: {
                  path: ['erinnerungId'],
                  equals: erinnerungId,
                },
              }),
              // Filter für den Original-Eintrag
              expect.objectContaining({
                id: originalEntryId,
              }),
            ]),
          },
        }),
      );
    });

    it('should assign eventType UrsprungsEintrag to the original entry', async () => {
      // Given: Erinnerung mit etbEntryId
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: originalEntryId,
      };

      // ETB-Einträge: Original-Entry (ohne eventType in metadata) + automatischer Entry
      const etbEntries = [
        {
          id: originalEntryId,
          text: 'Original-Eintrag von dem die Erinnerung erstellt wurde',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          sequenceNumber: 1,
          metadata: { someOtherField: 'value' }, // Kein eventType!
          creator: { id: userId, username: 'max.mustermann' },
        },
        {
          id: createValidTestId('auto1'),
          text: 'Erinnerung erstellt',
          createdAt: new Date('2024-01-15T10:05:00Z'),
          sequenceNumber: 2,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Original-Entry bekommt 'UrsprungsEintrag' als eventType
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries).toHaveLength(2);

      const originalEntry = result.value?.entries.find((e) => e.id === originalEntryId);
      expect(originalEntry).toBeDefined();
      expect(originalEntry?.eventType).toBe('UrsprungsEintrag');

      // Automatischer Entry behält seinen eventType
      const autoEntry = result.value?.entries.find((e) => e.eventType === 'ErinnerungErstellt');
      expect(autoEntry).toBeDefined();
    });

    it('should deduplicate when entry matches both conditions (etbEntryId AND metadata.erinnerungId)', async () => {
      // Given: Erinnerung mit etbEntryId
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: originalEntryId,
      };

      // Edge Case: Entry ist SOWOHL der Original-Eintrag ALS AUCH hat metadata.erinnerungId
      // Prisma gibt diesen nur einmal zurück (OR-Semantik = Vereinigung)
      // Der Handler sollte ihn als 'UrsprungsEintrag' behandeln
      const etbEntries = [
        {
          id: originalEntryId,
          text: 'Eintrag der beide Bedingungen erfüllt',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          sequenceNumber: 1,
          metadata: { eventType: 'ErinnerungErstellt', erinnerungId }, // Hat auch erinnerungId!
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Nur ein Entry (keine Duplikate)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.entries).toHaveLength(1);
      expect(result.value?.totalCount).toBe(1);

      // Da metadata.eventType existiert UND id === etbEntryId:
      // Der Handler prüft ZUERST metadata.eventType, daher wird 'ErinnerungErstellt' verwendet
      // (Reihenfolge der if-Bedingungen im Handler: metadata.eventType hat Priorität)
      const entry = result.value?.entries[0];
      expect(entry.id).toBe(originalEntryId);
      // eventType aus metadata hat Priorität über etbEntryId-Check
      expect(entry.eventType).toBe('ErinnerungErstellt');
    });

    it('should not include etbEntryId condition when etbEntryId is null', async () => {
      // Given: Erinnerung ohne etbEntryId (wurde nicht von einem ETB-Eintrag aus erstellt)
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: null,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: OR-Condition enthält NUR den metadata Filter (kein id Filter)
      const call = (mockPrisma.etbEintrag.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.OR).toHaveLength(1);
      expect(call.where.OR[0]).toEqual(
        expect.objectContaining({
          metadata: {
            path: ['erinnerungId'],
            equals: erinnerungId,
          },
        }),
      );
    });

    it('should load etbEntryId in erinnerung select', async () => {
      // Given: Erinnerung
      const erinnerungData = {
        id: erinnerungId,
        einsatzId: einsatzId,
        etbEntryId: originalEntryId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Erinnerung-Query muss etbEntryId im select haben
      expect(mockPrisma.erinnerung.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            etbEntryId: true,
          }),
        }),
      );
    });
  });
});
