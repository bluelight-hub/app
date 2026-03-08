// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UpdateFunkStatusConfigHandler } from '../update-funk-status-config.handler';
import { UpdateFunkStatusConfigCommand } from '../update-funk-status-config.command';
import { FUNKSTATUS_ERROR_CODES } from '@domain/kraefte/common/error-codes';

describe('UpdateFunkStatusConfigHandler', () => {
  let handler: UpdateFunkStatusConfigHandler;
  let editableStatusId: string;
  let readOnlyStatusId: string;
  let mockRepository: {
    update: jest.Mock;
    findByCode: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  const createMockFunkStatusConfig = (
    code: number,
    overrides: Partial<{
      id: string;
      standardLabel: string;
      customLabel: string;
      farbe: string;
      istAlarmierbar: boolean;
      beschreibung: string;
    }> = {},
  ) => {
    const standardLabels: Record<number, string> = {
      0: 'Einsatzbereit (FMS)',
      1: 'Einsatzbereit Funk',
      2: 'Einsatz übernommen',
      3: 'Ankunft Einsatzstelle',
      4: 'Am Sprechwunsch',
      5: 'Sprechwunsch',
      6: 'Nicht einsatzbereit',
      7: 'Frei wählbar 1',
      8: 'Frei wählbar 2',
      9: 'Frei wählbar 3',
    };

    return FunkStatusConfig.reconstitute({
      id: overrides.id ?? createId(),
      code,
      standardLabel: overrides.standardLabel ?? standardLabels[code] ?? `Status ${code}`,
      customLabel: overrides.customLabel,
      farbe: overrides.farbe,
      istAlarmierbar: overrides.istAlarmierbar ?? (code === 0 || code === 1),
      beschreibung: overrides.beschreibung,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'cm1111111111abcdef11111',
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    editableStatusId = createId();
    readOnlyStatusId = createId();

    mockRepository = {
      update: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateFunkStatusConfigHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateFunkStatusConfigHandler>(UpdateFunkStatusConfigHandler);
  });

  describe('execute', () => {
    it('sollte editierbare FunkStatusConfig (Code 7) erfolgreich aktualisieren', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Anfahrt',
        farbe: '#FF5733',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.code).toBe(7);
      expect(result.value?.customLabel).toBe('Anfahrt');
      expect(result.value?.displayLabel).toBe('Anfahrt'); // customLabel überschreibt standardLabel
      expect(result.value?.farbe).toBe('#FF5733');
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('sollte mehrere Felder gleichzeitig aktualisieren', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(8, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 8,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Auf Rückfahrt',
        farbe: '#00FF00',
        istAlarmierbar: false,
        beschreibung: 'Fahrzeug ist auf Rückfahrt zur Wache',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
      expect(savedAggregate.customLabel).toBe('Auf Rückfahrt');
      expect(savedAggregate.farbe).toBe('#00FF00');
      expect(savedAggregate.istAlarmierbar).toBe(false);
      expect(savedAggregate.beschreibung).toBe('Fahrzeug ist auf Rückfahrt zur Wache');
    });

    it('sollte fehlschlagen wenn FunkStatusConfig nicht gefunden wird', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.ok(null));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(FUNKSTATUS_ERROR_CODES.NOT_FOUND);
      expect(result.error).toContain("Code '7' nicht gefunden");
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Status nicht editierbar ist (Code 0-6)', async () => {
      // Given (Arrange)
      const readOnlyStatus = createMockFunkStatusConfig(0, { id: readOnlyStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(readOnlyStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 0,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Verfügbar',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY);
      expect(result.error).toContain('system-definiert');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei findByCode auftritt', async () => {
      // Given (Arrange)
      mockRepository.findByCode.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte fehlschlagen wenn Repository.update fehlschlägt', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));
      mockRepository.update.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte istAlarmierbar auf true setzen können', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(9, { id: editableStatusId, istAlarmierbar: false });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 9,
        updatedBy: 'cm9999999999abcdef99999',
        istAlarmierbar: true,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
      expect(savedAggregate.istAlarmierbar).toBe(true);
    });

    it('sollte customLabel auf undefined setzen bei leerem String nach trim', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, {
        id: editableStatusId,
        customLabel: 'Alte Bezeichnung',
      });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: '   ', // Nur Whitespace
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
      expect(savedAggregate.customLabel).toBeUndefined();
      // displayLabel fällt zurück auf standardLabel
      expect(savedAggregate.displayLabel).toBe('Frei wählbar 1');
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne updatedBy', () => {
      // Given (Arrange)
      const commandResult = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: '',
        customLabel: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('updatedBy ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültigem Code (-1)', () => {
      // Given (Arrange)
      const commandResult = UpdateFunkStatusConfigCommand.create({
        code: -1,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('zwischen 0 und 9 liegen');
    });

    it('sollte fehlschlagen mit ungültigem Code (10)', () => {
      // Given (Arrange)
      const commandResult = UpdateFunkStatusConfigCommand.create({
        code: 10,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('zwischen 0 und 9 liegen');
    });

    it('sollte fehlschlagen mit nicht-integer Code (7.5)', () => {
      // Given (Arrange)
      const commandResult = UpdateFunkStatusConfigCommand.create({
        code: 7.5,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ganze Zahl');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    describe('Farbe Validation', () => {
      it('sollte gültige Hex-Farbe (#RRGGBB) akzeptieren', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          farbe: '#00FF00',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
        expect(savedAggregate.farbe).toBe('#00FF00');
      });

      it('sollte fehlschlagen mit ungültigem Farb-Format (ohne #)', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          farbe: 'FF0000', // Fehlendes #
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT);
      });

      it('sollte fehlschlagen mit zu kurzem Hex-Code (#FFF)', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          farbe: '#FFF',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT);
      });

      it('sollte farbe auf undefined setzen bei leerem String nach trim', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, {
          id: editableStatusId,
          farbe: '#FF0000',
        });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          farbe: '   ', // Nur Whitespace
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
        expect(savedAggregate.farbe).toBeUndefined();
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte führende und nachfolgende Whitespaces in customLabel trimmen', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          customLabel: '   Anfahrt   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
        expect(savedAggregate.customLabel).toBe('Anfahrt');
      });

      it('sollte Whitespaces in Beschreibung trimmen', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: '   Neue Beschreibung   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
        expect(savedAggregate.beschreibung).toBe('Neue Beschreibung');
      });

      it('sollte leere Beschreibung nach Trim als undefined speichern', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, {
          id: editableStatusId,
          beschreibung: 'Alte Beschreibung',
        });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          beschreibung: '   ',
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const savedAggregate = mockRepository.update.mock.calls[0]?.[0]! as FunkStatusConfig;
        expect(savedAggregate.beschreibung).toBeUndefined();
      });
    });

    describe('No-Op Updates', () => {
      it('sollte Update ohne Änderungen akzeptieren', async () => {
        // Given (Arrange)
        const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
        mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

        const command = UpdateFunkStatusConfigCommand.create({
          code: 7,
          updatedBy: 'cm9999999999abcdef99999',
          // Keine Felder geändert
        }).value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        // update() wird trotzdem aufgerufen (auch ohne Änderungen)
        expect(mockRepository.update).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte FunkStatusConfigUpdatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(7, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 7,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Anfahrt',
        farbe: '#00FF00',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('FunkStatusConfigUpdatedEvent');
      expect(event.code).toBe(7);
      expect(event.changes).toMatchObject({
        customLabel: 'Anfahrt',
        farbe: '#00FF00',
      });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte FunkStatusConfigUpdatedEvent nur mit geänderten Feldern emittieren', async () => {
      // Given (Arrange)
      const existingStatus = createMockFunkStatusConfig(8, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(existingStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code: 8,
        updatedBy: 'cm9999999999abcdef99999',
        istAlarmierbar: false, // Nur dieses Feld ändern
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.changes).toEqual({ istAlarmierbar: false });
      // Sicherstellen dass andere Felder NICHT im changes-Objekt sind
      expect(event.changes.customLabel).toBeUndefined();
      expect(event.changes.farbe).toBeUndefined();
    });
  });

  describe('Read-Only Status Tests (0-6)', () => {
    it.each([0, 1, 2, 3, 4, 5, 6])('sollte Code %i als read-only ablehnen', async (code) => {
      // Given (Arrange)
      const readOnlyStatus = createMockFunkStatusConfig(code, { id: readOnlyStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(readOnlyStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: 'Test',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Editable Status Tests (7-9)', () => {
    it.each([7, 8, 9])('sollte Code %i erfolgreich aktualisieren', async (code) => {
      // Given (Arrange)
      const editableStatus = createMockFunkStatusConfig(code, { id: editableStatusId });
      mockRepository.findByCode.mockResolvedValue(Result.ok(editableStatus));

      const command = UpdateFunkStatusConfigCommand.create({
        code,
        updatedBy: 'cm9999999999abcdef99999',
        customLabel: `Custom Label ${code}`,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.code).toBe(code);
      expect(result.value?.customLabel).toBe(`Custom Label ${code}`);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
