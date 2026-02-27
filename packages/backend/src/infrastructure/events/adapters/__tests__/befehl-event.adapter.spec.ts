/**
 * Unit Tests fuer BefehlEventAdapter.
 *
 * Story 1.3: WebSocket Event Adapter fuer Befehl Domain Events.
 *
 * Testet den Adapter, der Domain Events empfaengt und WebSocket Events emittiert:
 * - onBefehlErstellt: Emittiert befehl.erstellt via Gateway (inkl. DB-Lookup)
 * - onBefehlZugestellt: Emittiert befehl.zugestellt via Gateway (inkl. DB-Lookup fuer einsatzId)
 * - onBefehlStatusGeaendert: Emittiert befehl.statusGeaendert via Gateway
 * - onBefehlKommentarHinzugefuegt: Emittiert befehl.kommentarHinzugefuegt via Gateway
 *
 * **Test Coverage (AC9):**
 * - Fire-and-Forget Pattern: Fehler werden geloggt, nicht propagiert
 * - Gateway ist immer verfügbar (kein @Optional())
 * - 50ms Delay zur Race Condition Prevention
 */

import { BefehlEventAdapter } from '../befehl-event.adapter';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { BefehlGateway } from '@/modules/befehl/gateways/befehl.gateway';
import type { PrismaService } from '@/infrastructure/database/prisma.service';

describe('BefehlEventAdapter', () => {
  let adapter: BefehlEventAdapter;
  let mockGateway: jest.Mocked<BefehlGateway>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockPrisma: {
    befehl: { findUnique: jest.Mock };
    befehlKommentar: { findFirst: jest.Mock };
  };

  const generateValidBefehlId = () => BefehlId.create().value!;
  const generateValidEinsatzId = () => EinsatzId.create().value!;
  const generateValidUserId = () => UserId.create().value!;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGateway = {
      emitBefehlErstellt: jest.fn(),
      emitBefehlZugestellt: jest.fn(),
      emitBefehlStatusGeaendert: jest.fn(),
      emitBefehlKommentarHinzugefuegt: jest.fn(),
      emitBefehlQuittiert: jest.fn(),
    } as unknown as jest.Mocked<BefehlGateway>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockPrisma = {
      befehl: { findUnique: jest.fn() },
      befehlKommentar: { findFirst: jest.fn() },
    };

    adapter = new BefehlEventAdapter(mockGateway, mockLogger, mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onBefehlErstellt', () => {
    it('should emit WebSocket event with correct payload including DB-lookup data', async () => {
      // Given: BefehlErstelltEvent mit gueltigen Daten und DB liefert zusaetzliche Felder
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const empfaenger = ['ZF Nord', 'ZF Süd'];
      const erteiltAm = new Date('2026-02-17T10:00:00.000Z');

      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Einsatzabschnitt Nord absichern', 'B-001', empfaenger, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({
        befehlsgeberName: 'Max Mustermann',
        befehlsgeberId: 'befehlsgeber-123',
        erstellerId: 'ersteller-456',
        status: 'ERTEILT',
        erteiltAm,
        befehlsgeber: { username: 'Max Mustermann' },
      });

      // When: onBefehlErstellt aufgerufen
      await adapter.onBefehlErstellt(event);

      // Then: gateway.emitBefehlErstellt mit korrektem Payload aufgerufen
      expect(mockGateway.emitBefehlErstellt).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlErstellt).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId: einsatzId.value,
        nummer: 'B-001',
        auftrag: 'Einsatzabschnitt Nord absichern',
        befehlsgeberId: 'befehlsgeber-123',
        befehlsgeberName: 'Max Mustermann',
        erstellerId: 'ersteller-456',
        empfaenger,
        empfaengerIds: expect.any(Array),
        status: 'ERTEILT',
        erteiltAm: erteiltAm.toISOString(),
      });
    });

    it('should wait 50ms before processing (Race Condition Prevention)', async () => {
      // Given: Ein valides Event
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Test', 'B-002', [], befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({
        befehlsgeberName: 'Test User',
        befehlsgeberId: '',
        erstellerId: '',
        status: 'ERTEILT',
        erteiltAm: new Date(),
        befehlsgeber: { username: 'Test User' },
      });

      // When: setTimeout aufrufen
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      await adapter.onBefehlErstellt(event);

      // Then: setTimeout wurde mit 50ms aufgerufen
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
      setTimeoutSpy.mockRestore();
    });

    it('should log and not propagate gateway emit errors (Fire-and-Forget)', async () => {
      // Given: Gateway emit wirft Fehler
      const befehlId = generateValidBefehlId();
      const event = new BefehlErstelltEvent(befehlId, generateValidEinsatzId(), 'Test', 'B-004', []);

      mockPrisma.befehl.findUnique.mockResolvedValue({
        befehlsgeberName: 'Test User',
        befehlsgeberId: '',
        erstellerId: '',
        status: 'ERTEILT',
        erteiltAm: new Date(),
        befehlsgeber: { username: 'Test User' },
      });
      mockGateway.emitBefehlErstellt.mockImplementation(() => {
        throw new Error('Socket connection closed');
      });

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlErstellt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlErstellt'), 'BefehlEventAdapter');
    });

    it('should log and not propagate DB-lookup errors (Fire-and-Forget)', async () => {
      // Given: DB-Query wirft Fehler
      const befehlId = generateValidBefehlId();
      const event = new BefehlErstelltEvent(befehlId, generateValidEinsatzId(), 'Test', 'B-005', []);

      mockPrisma.befehl.findUnique.mockRejectedValue(new Error('Database connection lost'));

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlErstellt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlErstellt'), 'BefehlEventAdapter');
    });

    it('should log error and return when DB-lookup returns null', async () => {
      // Given: Befehl nicht in DB gefunden
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Fallback Test', 'B-006', []);

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlErstellt(event);

      // Then: Early-return mit Error-Log, gateway nicht aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Befehl not found'), 'BefehlEventAdapter');
      expect(mockGateway.emitBefehlErstellt).not.toHaveBeenCalled();
    });
  });

  describe('onBefehlZugestellt', () => {
    it('should emit WebSocket event with einsatzId from enriched event', async () => {
      // Given: BefehlZugestelltEvent mit enriched data (kein DB-Lookup noetig)
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const empfaengerId = generateValidUserId().value;
      const zugestelltAm = new Date('2026-02-17T10:05:00.000Z');

      const event = new BefehlZugestelltEvent(befehlId, empfaengerId, zugestelltAm, einsatzId, 'ZF Nord', 'B-001', befehlId.value);

      // When: onBefehlZugestellt aufgerufen
      await adapter.onBefehlZugestellt(event);

      // Then: gateway.emitBefehlZugestellt mit korrektem Payload aufgerufen
      expect(mockGateway.emitBefehlZugestellt).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlZugestellt).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId: einsatzId.value,
        empfaengerId,
        zugestelltAm: zugestelltAm.toISOString(),
      });
      // Kein DB-Lookup mehr noetig
      expect(mockPrisma.befehl.findUnique).not.toHaveBeenCalled();
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: Gateway emit wirft Fehler
      const einsatzId = generateValidEinsatzId();
      const event = new BefehlZugestelltEvent(generateValidBefehlId(), 'empfaenger-1', new Date(), einsatzId, 'ZF Nord', 'B-001');

      mockGateway.emitBefehlZugestellt.mockImplementation(() => {
        throw new Error('Socket error');
      });

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlZugestellt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlZugestellt'), 'BefehlEventAdapter');
    });
  });

  describe('onBefehlStatusGeaendert', () => {
    it('should emit WebSocket event with correct status fields from enriched event', async () => {
      // Given: BefehlStatusGeaendertEvent mit enriched data (kein DB-Lookup noetig)
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const oldStatus = BefehlStatus.ERTEILT();
      const newStatus = BefehlStatus.ZUGESTELLT();

      const event = new BefehlStatusGeaendertEvent(befehlId, oldStatus, newStatus, einsatzId, 'B-001', befehlId.value);

      // When: onBefehlStatusGeaendert aufgerufen
      await adapter.onBefehlStatusGeaendert(event);

      // Then: gateway.emitBefehlStatusGeaendert mit korrekten Feldern aufgerufen
      expect(mockGateway.emitBefehlStatusGeaendert).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlStatusGeaendert).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId: einsatzId.value,
        oldStatus: 'ERTEILT',
        newStatus: 'ZUGESTELLT',
        timestamp: expect.any(String),
        nummer: 'B-001',
        erstellerId: undefined,
        befehlsgeberId: undefined,
        empfaengerIds: undefined,
      });
      // Kein DB-Lookup mehr noetig
      expect(mockPrisma.befehl.findUnique).not.toHaveBeenCalled();
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: Gateway emit wirft Fehler
      const einsatzId = generateValidEinsatzId();
      const event = new BefehlStatusGeaendertEvent(generateValidBefehlId(), BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT(), einsatzId, 'B-001');

      mockGateway.emitBefehlStatusGeaendert.mockImplementation(() => {
        throw new Error('Socket error');
      });

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlStatusGeaendert(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlStatusGeaendert'), 'BefehlEventAdapter');
    });
  });

  describe('onBefehlKommentarHinzugefuegt', () => {
    it('should emit WebSocket event with kommentarId from domain event', async () => {
      // Given: BefehlKommentarHinzugefuegtEvent mit kommentarId und parentId direkt im Event
      const befehlId = generateValidBefehlId();
      const authorId = generateValidUserId();
      const einsatzId = generateValidEinsatzId().value;

      const event = new BefehlKommentarHinzugefuegtEvent(befehlId, 'kommentar-abc', authorId, 'Einsatzabschnitt ist gesperrt', true, 'parent-xyz', befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId });

      // When: onBefehlKommentarHinzugefuegt aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: gateway.emitBefehlKommentarHinzugefuegt mit korrektem Payload aufgerufen
      expect(mockGateway.emitBefehlKommentarHinzugefuegt).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlKommentarHinzugefuegt).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId,
        kommentarId: 'kommentar-abc',
        authorId: authorId.value,
        text: 'Einsatzabschnitt ist gesperrt',
        isRueckfrage: true,
        parentId: 'parent-xyz',
        timestamp: expect.any(String),
      });
      // Kein findFirst-Lookup mehr noetig
      expect(mockPrisma.befehlKommentar.findFirst).not.toHaveBeenCalled();
    });

    it('should not perform DB lookup for kommentar data (kommentarId comes from event)', async () => {
      // Given: Valides Event mit kommentarId direkt
      const befehlId = generateValidBefehlId();
      const authorId = generateValidUserId();

      const event = new BefehlKommentarHinzugefuegtEvent(befehlId, 'kommentar-1', authorId, 'Test Kommentar', false, undefined, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId: 'einsatz-1' });

      // When: Handler aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: Kein befehlKommentar.findFirst aufgerufen
      expect(mockPrisma.befehlKommentar.findFirst).not.toHaveBeenCalled();
      // Aber befehl.findUnique fuer einsatzId wird weiterhin aufgerufen
      expect(mockPrisma.befehl.findUnique).toHaveBeenCalled();
    });

    it('should log error and return when befehl not found in DB', async () => {
      // Given: Befehl nicht in DB
      const event = new BefehlKommentarHinzugefuegtEvent(generateValidBefehlId(), 'kommentar-1', generateValidUserId(), 'Test', false, undefined);

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: logger.error aufgerufen, gateway nicht aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Befehl not found'), 'BefehlEventAdapter');
      expect(mockGateway.emitBefehlKommentarHinzugefuegt).not.toHaveBeenCalled();
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: DB-Query wirft Fehler
      const event = new BefehlKommentarHinzugefuegtEvent(generateValidBefehlId(), 'kommentar-1', generateValidUserId(), 'Test', false, undefined);

      mockPrisma.befehl.findUnique.mockRejectedValue(new Error('DB error'));

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlKommentarHinzugefuegt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlKommentarHinzugefuegt'), 'BefehlEventAdapter');
    });
  });

  describe('onBefehlQuittiert', () => {
    it('should emit WebSocket event with correct payload (Event-Carried State Transfer)', async () => {
      // Given: BefehlQuittiertEvent mit Rich Data (kein DB-Lookup noetig)
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const empfaengerId = generateValidUserId();
      const quittiertAm = new Date('2026-02-18T10:00:00.000Z');

      const event = new BefehlQuittiertEvent(befehlId, einsatzId, empfaengerId, 'VERSTANDEN', 'B-001', quittiertAm, undefined, undefined, undefined, befehlId.value);

      // When: onBefehlQuittiert aufgerufen
      await adapter.onBefehlQuittiert(event);

      // Then: gateway.emitBefehlQuittiert mit korrektem Payload aufgerufen
      expect(mockGateway.emitBefehlQuittiert).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlQuittiert).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId: einsatzId.value,
        empfaengerId: empfaengerId.value,
        quittierungArt: 'VERSTANDEN',
        nummer: 'B-001',
        quittiertAm: quittiertAm.toISOString(),
        quittierungKommentar: undefined,
      });
      // Kein DB-Lookup noetig (Event-Carried State Transfer)
      expect(mockPrisma.befehl.findUnique).not.toHaveBeenCalled();
    });

    it('should wait 50ms before processing (Race Condition Prevention)', async () => {
      // Given: Ein valides Event
      const event = new BefehlQuittiertEvent(generateValidBefehlId(), generateValidEinsatzId(), generateValidUserId(), 'VERSTANDEN', 'B-003', new Date());

      // When: setTimeout aufrufen
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      await adapter.onBefehlQuittiert(event);

      // Then: setTimeout wurde mit 50ms aufgerufen
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
      setTimeoutSpy.mockRestore();
    });

    it('should log and not propagate gateway emit errors (Fire-and-Forget)', async () => {
      // Given: Gateway emit wirft Fehler
      const befehlId = generateValidBefehlId();
      const event = new BefehlQuittiertEvent(befehlId, generateValidEinsatzId(), generateValidUserId(), 'NICHT_VERSTANDEN', 'B-004', new Date());

      mockGateway.emitBefehlQuittiert.mockImplementation(() => {
        throw new Error('Socket connection closed');
      });

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlQuittiert(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlQuittiert'), 'BefehlEventAdapter');
    });
  });
});
