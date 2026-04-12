// @ts-nocheck
import { BadRequestException } from '@nestjs/common';
import { TaktischeZeichenController } from '../taktische-zeichen.controller';
import { Result } from '@domain/common/result';

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
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/**
 * Unit Tests für TaktischeZeichenController.
 *
 * **Test Strategy:**
 * - Direct Instantiation Pattern (keine NestJS Test Module)
 * - Mocked Handler-Dependencies mit jest.fn()
 * - Focus: Controller-Orchestration, Result-Mapping, Exception-Handling
 *
 * **Test Groups:**
 * 1. findAll() - GET /einsatz/:einsatzId/taktische-zeichen
 * 2. create() - POST /einsatz/:einsatzId/taktische-zeichen
 * 3. remove() - DELETE /einsatz/:einsatzId/taktische-zeichen/:zeichenId
 */
describe('TaktischeZeichenController', () => {
  let controller: TaktischeZeichenController;
  let mockErstelleHandler: { execute: jest.Mock };
  let mockPlatziereHandler: { execute: jest.Mock };
  let mockAktualisiereHandler: { execute: jest.Mock };
  let mockEntferneHandler: { execute: jest.Mock };
  let mockFindeZeichenHandler: { execute: jest.Mock };
  let mockFindeKatalogHandler: { execute: jest.Mock };
  let mockFindeDefaultHandler: { execute: jest.Mock };

  const VALID_EINSATZ_ID = 'clw3h8x9y0000qwertyuiopas';
  const VALID_ZEICHEN_ID = 'clw3h8x9y0001qwertyuiopas';
  const VALID_USER_ID = 'clw3h8x9y0002qwertyuiopas';

  const mockUser = {
    userId: VALID_USER_ID,
    username: 'testuser',
    role: 'USER',
  };

  const mockZeichenDto = {
    id: VALID_ZEICHEN_ID,
    einsatzId: VALID_EINSATZ_ID,
    zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig' },
    istAusKatalog: false,
    istPlatziert: false,
    createdAt: '2026-04-10T10:00:00.000Z',
    createdBy: VALID_USER_ID,
    updatedAt: '2026-04-10T10:00:00.000Z',
  };

  beforeEach(() => {
    mockErstelleHandler = { execute: jest.fn() };
    mockPlatziereHandler = { execute: jest.fn() };
    mockAktualisiereHandler = { execute: jest.fn() };
    mockEntferneHandler = { execute: jest.fn() };
    mockFindeZeichenHandler = { execute: jest.fn() };
    mockFindeKatalogHandler = { execute: jest.fn() };
    mockFindeDefaultHandler = { execute: jest.fn() };

    controller = new TaktischeZeichenController(
      mockErstelleHandler as any,
      mockPlatziereHandler as any,
      mockAktualisiereHandler as any,
      mockEntferneHandler as any,
      mockFindeZeichenHandler as any,
      mockFindeKatalogHandler as any,
      mockFindeDefaultHandler as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===== findAll() =====

  describe('findAll()', () => {
    it('should return list of zeichen DTOs', async () => {
      // Given
      mockFindeZeichenHandler.execute.mockResolvedValue(Result.ok([mockZeichenDto]));

      // When
      const result = await controller.findAll(VALID_EINSATZ_ID);

      // Then
      expect(result).toEqual([mockZeichenDto]);
      expect(mockFindeZeichenHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when no zeichen exist', async () => {
      // Given
      mockFindeZeichenHandler.execute.mockResolvedValue(Result.ok([]));

      // When
      const result = await controller.findAll(VALID_EINSATZ_ID);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw BadRequestException when einsatzId is empty', async () => {
      // Given & When & Then
      await expect(controller.findAll('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when handler fails', async () => {
      // Given
      mockFindeZeichenHandler.execute.mockResolvedValue(Result.fail('ZEICHEN_LADEN_FAILED'));

      // When & Then
      await expect(controller.findAll(VALID_EINSATZ_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ===== create() =====

  describe('create()', () => {
    const validCreateDto = {
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig' },
      istAusKatalog: false,
    };

    it('should create zeichen and return DTO', async () => {
      // Given
      mockErstelleHandler.execute.mockResolvedValue(Result.ok(mockZeichenDto));

      // When
      const result = await controller.create(VALID_EINSATZ_ID, validCreateDto as any, mockUser as any);

      // Then
      expect(result).toEqual(mockZeichenDto);
      expect(mockErstelleHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when zeichenDefinition has no grundzeichen', async () => {
      // Given
      const invalidDto = { zeichenDefinition: { grundzeichen: '' } };

      // When & Then
      await expect(controller.create(VALID_EINSATZ_ID, invalidDto as any, mockUser as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when handler fails', async () => {
      // Given
      mockErstelleHandler.execute.mockResolvedValue(Result.fail('ZEICHEN_CREATION_FAILED'));

      // When & Then
      await expect(controller.create(VALID_EINSATZ_ID, validCreateDto as any, mockUser as any)).rejects.toThrow(BadRequestException);
    });

    it('should pass user ID as erstelltVon to handler', async () => {
      // Given
      mockErstelleHandler.execute.mockResolvedValue(Result.ok(mockZeichenDto));

      // When
      await controller.create(VALID_EINSATZ_ID, validCreateDto as any, mockUser as any);

      // Then
      const passedCommand = mockErstelleHandler.execute.mock.calls[0]?.[0];
      expect(passedCommand?.erstelltVon).toBe(VALID_USER_ID);
    });
  });

  // ===== remove() =====

  describe('remove()', () => {
    it('should remove zeichen successfully', async () => {
      // Given
      mockEntferneHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When & Then (kein Fehler = Erfolg, Result void)
      await expect(controller.remove(VALID_EINSATZ_ID, VALID_ZEICHEN_ID, mockUser as any)).resolves.not.toThrow();
      expect(mockEntferneHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when handler fails', async () => {
      // Given
      mockEntferneHandler.execute.mockResolvedValue(Result.fail('ZEICHEN_NOT_FOUND'));

      // When & Then
      await expect(controller.remove(VALID_EINSATZ_ID, VALID_ZEICHEN_ID, mockUser as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when zeichenId is empty', async () => {
      // Given & When & Then
      await expect(controller.remove(VALID_EINSATZ_ID, '', mockUser as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ===== getKatalog() =====

  describe('getKatalog()', () => {
    const mockKatalogEintrag = {
      id: 'clw3h8x9y0003qwertyuiopas',
      name: 'ELW 1',
      kategorie: 'FAHRZEUGE',
      zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', fachaufgabe: 'fuehrung' },
      tags: ['elw'],
      sortOrder: 20,
      istStandard: true,
    };

    it('should return katalog entries', async () => {
      // Given
      mockFindeKatalogHandler.execute.mockResolvedValue(Result.ok([mockKatalogEintrag]));

      // When
      const result = await controller.getKatalog(VALID_EINSATZ_ID);

      // Then
      expect(result).toEqual([mockKatalogEintrag]);
      expect(mockFindeKatalogHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass suche and kategorie filter to handler', async () => {
      // Given
      mockFindeKatalogHandler.execute.mockResolvedValue(Result.ok([]));

      // When
      await controller.getKatalog(VALID_EINSATZ_ID, 'elw', 'FAHRZEUGE');

      // Then
      const passedQuery = mockFindeKatalogHandler.execute.mock.calls[0]?.[0];
      expect(passedQuery?.suche).toBe('elw');
      expect(passedQuery?.kategorie).toBe('FAHRZEUGE');
    });

    it('should throw BadRequestException when handler fails', async () => {
      // Given
      mockFindeKatalogHandler.execute.mockResolvedValue(Result.fail('KATALOG_LADEN_FAILED'));

      // When & Then
      await expect(controller.getKatalog(VALID_EINSATZ_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ===== getDefaultsFahrzeugtypen() =====

  describe('getDefaultsFahrzeugtypen()', () => {
    it('should return fahrzeugtyp defaults', async () => {
      // Given
      const mockDefaults = [{ fahrzeugtypCode: 'RTW', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig' } }];
      mockFindeDefaultHandler.execute.mockResolvedValue(Result.ok(mockDefaults));

      // When
      const result = await controller.getDefaultsFahrzeugtypen();

      // Then
      expect(result).toEqual(mockDefaults);
      expect(mockFindeDefaultHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when handler fails', async () => {
      // Given
      mockFindeDefaultHandler.execute.mockResolvedValue(Result.fail('DEFAULTS_LADEN_FAILED'));

      // When & Then
      await expect(controller.getDefaultsFahrzeugtypen()).rejects.toThrow(BadRequestException);
    });
  });

  // ===== getDefaultsEinheitentypen() =====

  describe('getDefaultsEinheitentypen()', () => {
    it('should return einheitentyp defaults', async () => {
      // Given
      const mockDefaults = [{ einheitentyp: 'TRUPP', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'trupp' } }];
      mockFindeDefaultHandler.execute.mockResolvedValue(Result.ok(mockDefaults));

      // When
      const result = await controller.getDefaultsEinheitentypen();

      // Then
      expect(result).toEqual(mockDefaults);
    });
  });
});
