// @ts-nocheck
/**
 * Unit Tests fuer RolleGeaendertEtbHandler.
 *
 * Story 5.4 AC4: ETB-Eintrag bei Einsatz-Rollenänderung.
 *
 * Testet den Application Layer Handler:
 * - Korrekte ETB-Eintraege fuer verschiedene Aenderungstypen
 * - Fire-and-Forget: Fehler werden geloggt, nicht propagiert
 * - Validierung der required Fields
 */

import { RolleGeaendertEvent } from '@domain/events/rolle-geaendert.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { RolleGeaendertEtbHandler } from '../rolle-geaendert.handler';
import { AddEintragHandler } from '@application/etb/commands';
import { AddEintragCommand } from '@application/etb/commands';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

describe('RolleGeaendertEtbHandler', () => {
  let handler: RolleGeaendertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAddEintragHandler = {
      execute: jest.fn().mockResolvedValue(Result.ok(undefined)),
    } as unknown as jest.Mocked<AddEintragHandler>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    handler = new RolleGeaendertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  describe('Rollenaenderung (alteRolle UND neueRolle vorhanden)', () => {
    it('sollte ETB-Eintrag mit korrektem Aenderungstext erstellen', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', 'Gruppenführer', 'Zugführer', 'admin-789', 'Admin User');

      const createSpy = jest.spyOn(AddEintragCommand, 'create');

      // When
      await handler.handle(event);

      // Then
      expect(createSpy).toHaveBeenCalledWith(
        'einsatz-123', // etbId
        'Rolle geändert: Max Mustermann von Gruppenführer zu Zugführer (durch Admin User)', // text
        'system', // quelle
        'PERSONAL', // kategorie
        'einsatz-123', // einsatzId
        undefined, // absender
        undefined, // empfaenger
        expect.objectContaining({
          eventType: 'RolleGeaendert',
          userId: 'user-456',
          alteRolle: 'Gruppenführer',
          neueRolle: 'Zugführer',
          aenderungDurch: 'admin-789',
        }),
        event.occurredAt, // timestamp
      );
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);

      createSpy.mockRestore();
    });
  });

  describe('Neue Zuweisung (alteRolle null)', () => {
    it('sollte ETB-Eintrag mit Zuweisungstext erstellen', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');

      const createSpy = jest.spyOn(AddEintragCommand, 'create');

      // When
      await handler.handle(event);

      // Then
      expect(createSpy).toHaveBeenCalledWith(
        'einsatz-123',
        'Rolle zugewiesen: Max Mustermann als Zugführer (durch Admin User)',
        'system',
        'PERSONAL',
        'einsatz-123',
        undefined,
        undefined,
        expect.objectContaining({
          eventType: 'RolleGeaendert',
          alteRolle: null,
          neueRolle: 'Zugführer',
        }),
        event.occurredAt,
      );

      createSpy.mockRestore();
    });
  });

  describe('Rollenentfernung (neueRolle null)', () => {
    it('sollte ETB-Eintrag mit Entfernungstext erstellen', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', 'Zugführer', null, 'admin-789', 'Admin User');

      const createSpy = jest.spyOn(AddEintragCommand, 'create');

      // When
      await handler.handle(event);

      // Then
      expect(createSpy).toHaveBeenCalledWith(
        'einsatz-123',
        'Rolle entfernt: Max Mustermann war Zugführer (durch Admin User)',
        'system',
        'PERSONAL',
        'einsatz-123',
        undefined,
        undefined,
        expect.objectContaining({
          eventType: 'RolleGeaendert',
          alteRolle: 'Zugführer',
          neueRolle: null,
        }),
        event.occurredAt,
      );

      createSpy.mockRestore();
    });
  });

  describe('Fire-and-Forget Error Handling', () => {
    it('sollte bei fehlenden required Fields loggen und zurueckkehren', async () => {
      // Given - Event mit leeren Feldern
      const event = new RolleGeaendertEvent('', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('missing required fields'), 'RolleGeaendertEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('sollte bei AddEintragCommand Failure loggen und nicht propagieren', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');
      const createSpy = jest.spyOn(AddEintragCommand, 'create').mockReturnValue(Result.fail('Validation error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create AddEintragCommand'), 'RolleGeaendertEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();

      createSpy.mockRestore();
    });

    it('sollte bei Handler-Execution Failure loggen und nicht propagieren', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'RolleGeaendertEtbHandler');
    });

    it('sollte bei unerwarteten Fehlern CRITICAL loggen und nicht propagieren', async () => {
      // Given
      const event = new RolleGeaendertEvent('einsatz-123', 'user-456', 'Max Mustermann', null, 'Zugführer', 'admin-789', 'Admin User');
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Unexpected DB crash'));

      // When - kein Fehler geworfen
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'RolleGeaendertEtbHandler');
    });
  });
});
