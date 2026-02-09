import { GetErinnerungTimelineQueryHandler } from '../get-erinnerung-timeline.handler';
import { GetErinnerungTimelineQuery } from '../get-erinnerung-timeline.query';
import { createValidTestId } from '../../__tests__/helpers/test-id.helper';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { ILogger } from '@domain/ports/i-logger.port';

// Mock cuid2 fuer deterministische Test-IDs
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
 * Unit Tests fuer GetErinnerungTimelineQueryHandler.
 *
 * Testet das Laden der Timeline einer Erinnerung mit allen ETB-Eintraegen,
 * die zu dieser Erinnerung gehoeren.
 *
 * **Story 5.5: ETB zeigt Erinnerungsverlauf (Timeline Widget)**
 *
 * Coverage Target: >90%
 */
describe('GetErinnerungTimelineQueryHandler', () => {
  let handler: GetErinnerungTimelineQueryHandler;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test-IDs (kurze Suffixe, da createValidTestId auf 5 Zeichen kuerzt)
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

    handler = new GetErinnerungTimelineQueryHandler(mockPrisma, mockLogger);
  });

  describe('Erfolgreiche Abfragen', () => {
    it('should return timeline events in chronological order (ASC by createdAt)', async () => {
      // Given: Erinnerung existiert und gehoert zum Einsatz
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
        einsatzId: einsatzId,
      };

      // ETB-Eintraege mit unterschiedlichen Timestamps (absichtlich nicht chronologisch)
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Prisma gibt bereits sortiert zurueck (ASC), aber wir mocken Reihenfolge
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
          text: 'Erinnerung ausgeloest',
          createdAt: oneHourAgo,
          sequenceNumber: 5,
          metadata: { eventType: 'ErinnerungAusgeloest', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
        {
          id: createValidTestId('entry003'),
          text: 'Erinnerung bestaetigt',
          createdAt: now,
          sequenceNumber: 10,
          metadata: { eventType: 'ErinnerungAcknowledged', erinnerungId },
          creator: { id: userId, username: 'max.mustermann' },
        },
      ];

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue(etbEntries);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.events).toHaveLength(3);

      // Chronologische Reihenfolge (aelteste zuerst)
      expect(result.value!.events[0].timestamp).toEqual(twoHoursAgo);
      expect(result.value!.events[1].timestamp).toEqual(oneHourAgo);
      expect(result.value!.events[2].timestamp).toEqual(now);

      // Verify orderBy ASC in Prisma-Call
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should filter by metadata.erinnerungId', async () => {
      // Given: Erinnerung existiert
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Verify metadata.erinnerungId Filter im Prisma-Call
      // Story 5.7: Query nutzt OR-Bedingung fuer metadata.erinnerungId und etbEntryId
      expect(mockPrisma.etbEintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                metadata: {
                  path: ['erinnerungId'],
                  equals: erinnerungId,
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should include user names via join (createdBy with username)', async () => {
      // Given: Erinnerung mit einem ETB-Eintrag und User-Daten
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
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

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: createdBy mit username ist enthalten
      expect(result.isSuccess).toBe(true);
      expect(result.value!.events[0].createdBy).toBeDefined();
      expect(result.value!.events[0].createdBy.id).toBe(userId);
      expect(result.value!.events[0].createdBy.username).toBe('max.mustermann');

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

    it('should return empty events array when no ETB entries exist (not an error)', async () => {
      // Given: Erinnerung existiert, aber keine ETB-Eintraege
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Leeres Array ist valide Response (KEIN FEHLER!)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.events).toEqual([]);
      expect(result.value!.totalCount).toBe(0);
      expect(result.value!.erinnerungId).toBe(erinnerungId);
      expect(result.value!.titel).toBe('Follow-up Leitstelle');
    });

    it('should extract eventType from metadata correctly', async () => {
      // Given: ETB-Eintraege mit verschiedenen eventTypes
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Test',
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

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: eventType wird korrekt aus metadata extrahiert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.events[0].eventType).toBe('ErinnerungErstellt');
      expect(result.value!.events[1].eventType).toBe('ErinnerungSnoozed');
      expect(result.value!.events[2].eventType).toBe('ErinnerungEskaliert');

      // Metadata wird vollstaendig uebernommen
      expect(result.value!.events[0].metadata).toEqual({
        eventType: 'ErinnerungErstellt',
        erinnerungId,
        faelligAm: '2024-01-15T14:00:00Z',
      });
    });

    it('should return Unknown eventType when metadata.eventType is missing', async () => {
      // Given: ETB-Eintrag ohne eventType in metadata
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Test',
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

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Fallback auf 'Unknown'
      expect(result.isSuccess).toBe(true);
      expect(result.value!.events[0].eventType).toBe('Unknown');
      expect(result.value!.events[1].eventType).toBe('Unknown');
    });
  });

  describe('Fehlerbehandlung', () => {
    it('should fail if erinnerung not found', async () => {
      // Given: Erinnerung existiert nicht
      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(null);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() mit passender Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Erinnerung nicht gefunden');

      // ETB-Query sollte nicht ausgefuehrt werden
      expect(mockPrisma.etbEintrag.findMany).not.toHaveBeenCalled();

      // Logger.warn sollte aufgerufen werden
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Erinnerung not found'), 'GetErinnerungTimelineQueryHandler');
    });

    it('should fail if erinnerung belongs to different einsatz (security check)', async () => {
      // Given: Erinnerung existiert, gehoert aber zu anderem Einsatz
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
        einsatzId: differentEinsatzId, // Anderer Einsatz!
      };

      (mockPrisma.erinnerung.findUnique as jest.Mock).mockResolvedValue(erinnerungData);
      // ETB-Query sollte nicht erreicht werden, aber fuer Sicherheit auch mocken
      (mockPrisma.etbEintrag.findMany as jest.Mock).mockResolvedValue([]);

      // Query mit falschem einsatzId
      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Security-Fehler (Cross-Einsatz-Zugriff verhindert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Erinnerung gehört nicht zu diesem Einsatz');

      // ETB-Query sollte nicht ausgefuehrt werden
      expect(mockPrisma.etbEintrag.findMany).not.toHaveBeenCalled();

      // Logger.warn sollte Security-Violation loggen
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Security violation'), 'GetErinnerungTimelineQueryHandler');
    });

    it('should handle unexpected database errors gracefully', async () => {
      // Given: Prisma wirft einen Fehler
      const dbError = new Error('Database connection failed');
      mockPrisma.erinnerung.findUnique = jest.fn().mockRejectedValue(dbError);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Result.fail() mit generischer Fehlermeldung
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Fehler beim Laden der Erinnerungs-Timeline');

      // Logger.error sollte mit Stack-Trace aufgerufen werden
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'), 'GetErinnerungTimelineQueryHandler');
    });
  });

  describe('Query Validierung', () => {
    it('should throw if erinnerungId is empty', () => {
      // Given: Leere erinnerungId
      const emptyErinnerungId = '';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetErinnerungTimelineQuery(emptyErinnerungId, einsatzId)).toThrow('erinnerungId is required');
    });

    it('should throw if einsatzId is empty', () => {
      // Given: Leere einsatzId
      const emptyEinsatzId = '';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetErinnerungTimelineQuery(erinnerungId, emptyEinsatzId)).toThrow('einsatzId is required');
    });

    it('should throw if erinnerungId has invalid CUID2 format', () => {
      // Given: Ungueltige erinnerungId (nicht CUID2 konform)
      const invalidErinnerungId = 'invalid-format';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetErinnerungTimelineQuery(invalidErinnerungId, einsatzId)).toThrow();
    });

    it('should throw if einsatzId has invalid CUID2 format', () => {
      // Given: Ungueltige einsatzId (nicht CUID2 konform)
      const invalidEinsatzId = 'invalid-format';

      // When/Then: Query-Konstruktor sollte Error werfen
      expect(() => new GetErinnerungTimelineQuery(erinnerungId, invalidEinsatzId)).toThrow();
    });
  });

  describe('DTO Mapping', () => {
    it('should map ETB entries to ErinnerungTimelineEventDto correctly', async () => {
      // Given: Vollstaendiger ETB-Eintrag
      const timestamp = new Date('2024-01-15T12:00:00.000Z');
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
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

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: DTO-Struktur verifizieren
      expect(result.isSuccess).toBe(true);

      const event = result.value!.events[0];
      expect(event.id).toBe(createValidTestId('entry010'));
      expect(event.eventType).toBe('ErinnerungErstellt');
      expect(event.timestamp).toEqual(timestamp);
      expect(event.sequenceNumber).toBe(42);
      expect(event.text).toContain('Follow-up Leitstelle');
      expect(event.createdBy.id).toBe(userId);
      expect(event.createdBy.username).toBe('max.mustermann');
      expect(event.createdBy.displayName).toBeNull();
      expect(event.metadata).toBeDefined();
    });

    it('should map ErinnerungTimelineDto correctly', async () => {
      // Given: Erinnerung mit mehreren Events
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Leitstelle',
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

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      const result = await handler.execute(query);

      // Then: Timeline-DTO Struktur
      expect(result.isSuccess).toBe(true);
      expect(result.value!.erinnerungId).toBe(erinnerungId);
      expect(result.value!.titel).toBe('Follow-up Leitstelle');
      expect(result.value!.events).toHaveLength(2);
      expect(result.value!.totalCount).toBe(2);
    });
  });

  describe('Logging', () => {
    it('should log when loading timeline', async () => {
      // Given: Erinnerung existiert
      const erinnerungData = {
        id: erinnerungId,
        titel: 'Follow-up Test',
        einsatzId: einsatzId,
      };

      mockPrisma.erinnerung.findUnique = jest.fn().mockResolvedValue(erinnerungData);
      (mockPrisma.einsatztagebuch.findUnique as jest.Mock).mockResolvedValue({ id: etbId });
      mockPrisma.etbEintrag.findMany = jest.fn().mockResolvedValue([]);

      const query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);

      // When
      await handler.execute(query);

      // Then: Logger.log sollte aufgerufen werden
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Loading timeline for erinnerungId=${erinnerungId}`), 'GetErinnerungTimelineQueryHandler');
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Timeline loaded'), 'GetErinnerungTimelineQueryHandler');
    });
  });
});
