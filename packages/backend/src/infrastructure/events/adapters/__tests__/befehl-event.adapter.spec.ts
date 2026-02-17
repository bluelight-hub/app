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
 * - Graceful Degradation: Adapter funktioniert ohne Gateway
 * - 50ms Delay zur Race Condition Prevention
 */

import { BefehlEventAdapter } from '../befehl-event.adapter';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
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
      const empfaengerIds = [generateValidUserId().value, generateValidUserId().value];
      const erteiltAm = new Date('2026-02-17T10:00:00.000Z');

      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Einsatzabschnitt Nord absichern', 'B-001', empfaengerIds, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({
        befehlsgeberId: 'befehlsgeber-123',
        erstellerId: 'ersteller-456',
        status: 'ERTEILT',
        erteiltAm,
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
        erstellerId: 'ersteller-456',
        empfaengerIds,
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
        befehlsgeberId: '',
        erstellerId: '',
        status: 'ERTEILT',
        erteiltAm: new Date(),
      });

      // When: setTimeout aufrufen
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      await adapter.onBefehlErstellt(event);

      // Then: setTimeout wurde mit 50ms aufgerufen
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
      setTimeoutSpy.mockRestore();
    });

    it('should handle missing gateway gracefully (Graceful Degradation)', async () => {
      // Given: Gateway ist undefined
      const adapterWithoutGateway = new BefehlEventAdapter(undefined, mockLogger, mockPrisma as unknown as PrismaService);

      const event = new BefehlErstelltEvent(generateValidBefehlId(), generateValidEinsatzId(), 'Test', 'B-003', []);

      // When: Handler aufgerufen
      await adapterWithoutGateway.onBefehlErstellt(event);

      // Then: Kein Crash, logger.error aufgerufen, DB nicht abgefragt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('BefehlGateway not available'), 'BefehlEventAdapter');
      expect(mockPrisma.befehl.findUnique).not.toHaveBeenCalled();
    });

    it('should log and not propagate gateway emit errors (Fire-and-Forget)', async () => {
      // Given: Gateway emit wirft Fehler
      const befehlId = generateValidBefehlId();
      const event = new BefehlErstelltEvent(befehlId, generateValidEinsatzId(), 'Test', 'B-004', []);

      mockPrisma.befehl.findUnique.mockResolvedValue({
        befehlsgeberId: '',
        erstellerId: '',
        status: 'ERTEILT',
        erteiltAm: new Date(),
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

    it('should use fallback values when DB-lookup returns null', async () => {
      // Given: Befehl nicht in DB gefunden
      const befehlId = generateValidBefehlId();
      const einsatzId = generateValidEinsatzId();
      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Fallback Test', 'B-006', []);

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlErstellt(event);

      // Then: Fallback-Werte werden verwendet
      expect(mockGateway.emitBefehlErstellt).toHaveBeenCalledWith(
        expect.objectContaining({
          befehlsgeberId: '',
          erstellerId: '',
          status: 'ERTEILT',
          erteiltAm: expect.any(String),
        }),
      );
    });
  });

  describe('onBefehlZugestellt', () => {
    it('should emit WebSocket event with einsatzId from DB-lookup', async () => {
      // Given: BefehlZugestelltEvent und DB liefert einsatzId
      const befehlId = generateValidBefehlId();
      const empfaengerId = generateValidUserId().value;
      const zugestelltAm = new Date('2026-02-17T10:05:00.000Z');

      const event = new BefehlZugestelltEvent(befehlId, empfaengerId, zugestelltAm, befehlId.value);

      const einsatzId = generateValidEinsatzId().value;
      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId });

      // When: onBefehlZugestellt aufgerufen
      await adapter.onBefehlZugestellt(event);

      // Then: gateway.emitBefehlZugestellt mit korrektem Payload aufgerufen
      expect(mockGateway.emitBefehlZugestellt).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlZugestellt).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId,
        empfaengerId,
        zugestelltAm: zugestelltAm.toISOString(),
      });
    });

    it('should log error and return when befehl not found in DB', async () => {
      // Given: Befehl nicht in DB
      const befehlId = generateValidBefehlId();
      const event = new BefehlZugestelltEvent(befehlId, 'empfaenger-1', new Date(), befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlZugestellt(event);

      // Then: logger.error aufgerufen, gateway nicht aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Befehl not found'), 'BefehlEventAdapter');
      expect(mockGateway.emitBefehlZugestellt).not.toHaveBeenCalled();
    });

    it('should handle missing gateway gracefully (Graceful Degradation)', async () => {
      // Given: Adapter ohne Gateway
      const adapterWithoutGateway = new BefehlEventAdapter(undefined, mockLogger, mockPrisma as unknown as PrismaService);

      const event = new BefehlZugestelltEvent(generateValidBefehlId(), 'empfaenger-1', new Date());

      // When: Handler aufgerufen
      await adapterWithoutGateway.onBefehlZugestellt(event);

      // Then: Kein Crash, logger.error aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('BefehlGateway not available'), 'BefehlEventAdapter');
      expect(mockPrisma.befehl.findUnique).not.toHaveBeenCalled();
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: DB-Query wirft Fehler
      const event = new BefehlZugestelltEvent(generateValidBefehlId(), 'empfaenger-1', new Date());

      mockPrisma.befehl.findUnique.mockRejectedValue(new Error('DB error'));

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlZugestellt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlZugestellt'), 'BefehlEventAdapter');
    });
  });

  describe('onBefehlStatusGeaendert', () => {
    it('should emit WebSocket event with correct status fields', async () => {
      // Given: BefehlStatusGeaendertEvent und DB liefert einsatzId
      const befehlId = generateValidBefehlId();
      const oldStatus = BefehlStatus.ERTEILT();
      const newStatus = BefehlStatus.ZUGESTELLT();

      const event = new BefehlStatusGeaendertEvent(befehlId, oldStatus, newStatus, befehlId.value);

      const einsatzId = generateValidEinsatzId().value;
      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId });

      // When: onBefehlStatusGeaendert aufgerufen
      await adapter.onBefehlStatusGeaendert(event);

      // Then: gateway.emitBefehlStatusGeaendert mit korrekten Feldern aufgerufen
      expect(mockGateway.emitBefehlStatusGeaendert).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitBefehlStatusGeaendert).toHaveBeenCalledWith({
        befehlId: befehlId.value,
        einsatzId,
        oldStatus: 'ERTEILT',
        newStatus: 'ZUGESTELLT',
        timestamp: expect.any(String),
      });
    });

    it('should handle missing gateway gracefully (Graceful Degradation)', async () => {
      // Given: Adapter ohne Gateway
      const adapterWithoutGateway = new BefehlEventAdapter(undefined, mockLogger, mockPrisma as unknown as PrismaService);

      const event = new BefehlStatusGeaendertEvent(generateValidBefehlId(), BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());

      // When: Handler aufgerufen
      await adapterWithoutGateway.onBefehlStatusGeaendert(event);

      // Then: Kein Crash, logger.error aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('BefehlGateway not available'), 'BefehlEventAdapter');
    });

    it('should log error and return when befehl not found in DB', async () => {
      // Given: Befehl nicht in DB
      const event = new BefehlStatusGeaendertEvent(generateValidBefehlId(), BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlStatusGeaendert(event);

      // Then: logger.error aufgerufen, gateway nicht aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Befehl not found'), 'BefehlEventAdapter');
      expect(mockGateway.emitBefehlStatusGeaendert).not.toHaveBeenCalled();
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: DB-Query wirft Fehler
      const event = new BefehlStatusGeaendertEvent(generateValidBefehlId(), BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());

      mockPrisma.befehl.findUnique.mockRejectedValue(new Error('DB error'));

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlStatusGeaendert(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlStatusGeaendert'), 'BefehlEventAdapter');
    });
  });

  describe('onBefehlKommentarHinzugefuegt', () => {
    it('should emit WebSocket event with kommentar lookup data', async () => {
      // Given: BefehlKommentarHinzugefuegtEvent und DB liefert einsatzId + Kommentar-Daten
      const befehlId = generateValidBefehlId();
      const authorId = generateValidUserId();
      const einsatzId = generateValidEinsatzId().value;
      const kommentarCreatedAt = new Date('2026-02-17T10:10:00.000Z');

      const event = new BefehlKommentarHinzugefuegtEvent(befehlId, authorId, 'Einsatzabschnitt ist gesperrt', true, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId });
      mockPrisma.befehlKommentar.findFirst.mockResolvedValue({
        id: 'kommentar-abc',
        parentId: 'parent-xyz',
        createdAt: kommentarCreatedAt,
      });

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
        timestamp: kommentarCreatedAt.toISOString(),
      });
    });

    it('should query befehlKommentar with correct filter criteria', async () => {
      // Given: Valides Event
      const befehlId = generateValidBefehlId();
      const authorId = generateValidUserId();

      const event = new BefehlKommentarHinzugefuegtEvent(befehlId, authorId, 'Test Kommentar', false, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId: 'einsatz-1' });
      mockPrisma.befehlKommentar.findFirst.mockResolvedValue({
        id: 'kommentar-1',
        parentId: null,
        createdAt: new Date(),
      });

      // When: Handler aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: befehlKommentar.findFirst mit korrekten Filtern aufgerufen
      expect(mockPrisma.befehlKommentar.findFirst).toHaveBeenCalledWith({
        where: {
          befehlId: befehlId.value,
          authorId: authorId.value,
          text: 'Test Kommentar',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, parentId: true, createdAt: true },
      });
    });

    it('should handle missing gateway gracefully (Graceful Degradation)', async () => {
      // Given: Adapter ohne Gateway
      const adapterWithoutGateway = new BefehlEventAdapter(undefined, mockLogger, mockPrisma as unknown as PrismaService);

      const event = new BefehlKommentarHinzugefuegtEvent(generateValidBefehlId(), generateValidUserId(), 'Test', false);

      // When: Handler aufgerufen
      await adapterWithoutGateway.onBefehlKommentarHinzugefuegt(event);

      // Then: Kein Crash, logger.error aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('BefehlGateway not available'), 'BefehlEventAdapter');
    });

    it('should log error and return when befehl not found in DB', async () => {
      // Given: Befehl nicht in DB
      const event = new BefehlKommentarHinzugefuegtEvent(generateValidBefehlId(), generateValidUserId(), 'Test', false);

      mockPrisma.befehl.findUnique.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: logger.error aufgerufen, gateway nicht aufgerufen
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Befehl not found'), 'BefehlEventAdapter');
      expect(mockGateway.emitBefehlKommentarHinzugefuegt).not.toHaveBeenCalled();
    });

    it('should use fallback values when kommentar not found in DB', async () => {
      // Given: Befehl gefunden, aber Kommentar nicht
      const befehlId = generateValidBefehlId();
      const authorId = generateValidUserId();
      const event = new BefehlKommentarHinzugefuegtEvent(befehlId, authorId, 'Test', true, befehlId.value);

      mockPrisma.befehl.findUnique.mockResolvedValue({ einsatzId: 'einsatz-1' });
      mockPrisma.befehlKommentar.findFirst.mockResolvedValue(null);

      // When: Handler aufgerufen
      await adapter.onBefehlKommentarHinzugefuegt(event);

      // Then: Fallback-Werte verwendet
      expect(mockGateway.emitBefehlKommentarHinzugefuegt).toHaveBeenCalledWith(
        expect.objectContaining({
          kommentarId: '',
          parentId: undefined,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should log and not propagate errors (Fire-and-Forget)', async () => {
      // Given: DB-Query wirft Fehler
      const event = new BefehlKommentarHinzugefuegtEvent(generateValidBefehlId(), generateValidUserId(), 'Test', false);

      mockPrisma.befehl.findUnique.mockRejectedValue(new Error('DB error'));

      // When: Handler aufgerufen - sollte nicht throwen
      await expect(adapter.onBefehlKommentarHinzugefuegt(event)).resolves.not.toThrow();

      // Then: Fehler wird geloggt
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to emit WebSocket event for BefehlKommentarHinzugefuegt'), 'BefehlEventAdapter');
    });
  });
});
