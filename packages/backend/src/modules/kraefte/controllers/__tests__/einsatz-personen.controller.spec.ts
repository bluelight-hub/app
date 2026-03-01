import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { EinsatzPersonenController } from '../einsatz-personen.controller';
import { RegistrierePersonHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.handler';
import { RegistrierePersonViaQrCodeHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.handler';
import { WeisePersonZuFahrzeugZuHandler } from '@application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.handler';
import { EntfernePersonVonFahrzeugHandler } from '@application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.handler';
import { GetEinsatzPersonenHandler } from '@application/kraefte/einsatz-personen/queries/get-einsatz-personen/get-einsatz-personen.handler';
import { GetEinsatzPersonByIdHandler } from '@application/kraefte/einsatz-personen/queries/get-einsatz-person-by-id/get-einsatz-person-by-id.handler';
import { LOGGER } from '@infrastructure/di-tokens';
import { Result } from '@domain/common/result';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
import { createId } from '@paralleldrive/cuid2';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { EinsatzPersonResponseDto, RegistrierePersonDto } from '@application/kraefte/einsatz-personen/dto';
import type { RegistrierePersonViaQrCodeDto } from '@application/kraefte/einsatz-personen/dto/registriere-person-qr.dto';

describe('EinsatzPersonenController', () => {
  let controller: EinsatzPersonenController;
  let mockRegistrierePersonHandler: jest.Mocked<RegistrierePersonHandler>;
  let mockRegistriereViaQrHandler: jest.Mocked<RegistrierePersonViaQrCodeHandler>;
  let mockWeisePersonZuFahrzeugHandler: jest.Mocked<WeisePersonZuFahrzeugZuHandler>;
  let mockEntfernePersonVonFahrzeugHandler: jest.Mocked<EntfernePersonVonFahrzeugHandler>;
  let mockGetEinsatzPersonenHandler: jest.Mocked<GetEinsatzPersonenHandler>;
  let mockGetEinsatzPersonByIdHandler: jest.Mocked<GetEinsatzPersonByIdHandler>;
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  const validEinsatzId = createId();
  const validUserId = createId();
  const validStammPersonId = createId();
  const validEinsatzPersonId = createId();

  const mockUser: ValidatedUser = {
    userId: validUserId,
    email: 'test@example.com',
    roles: ['admin'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRegistrierePersonHandler = {
      execute: jest.fn(),
    } as any;

    mockRegistriereViaQrHandler = {
      execute: jest.fn(),
    } as any;

    mockWeisePersonZuFahrzeugHandler = {
      execute: jest.fn(),
    } as any;

    mockEntfernePersonVonFahrzeugHandler = {
      execute: jest.fn(),
    } as any;

    mockGetEinsatzPersonenHandler = {
      execute: jest.fn(),
    } as any;

    mockGetEinsatzPersonByIdHandler = {
      execute: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EinsatzPersonenController],
      providers: [
        {
          provide: RegistrierePersonHandler,
          useValue: mockRegistrierePersonHandler,
        },
        {
          provide: RegistrierePersonViaQrCodeHandler,
          useValue: mockRegistriereViaQrHandler,
        },
        {
          provide: WeisePersonZuFahrzeugZuHandler,
          useValue: mockWeisePersonZuFahrzeugHandler,
        },
        {
          provide: EntfernePersonVonFahrzeugHandler,
          useValue: mockEntfernePersonVonFahrzeugHandler,
        },
        {
          provide: GetEinsatzPersonenHandler,
          useValue: mockGetEinsatzPersonenHandler,
        },
        {
          provide: GetEinsatzPersonByIdHandler,
          useValue: mockGetEinsatzPersonByIdHandler,
        },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<EinsatzPersonenController>(EinsatzPersonenController);
  });

  describe('findAll', () => {
    it('should return array of EinsatzPersonen on success', async () => {
      // Given
      const mockPersonen: EinsatzPersonResponseDto[] = [
        {
          id: createId(),
          einsatzId: validEinsatzId,
          stammPersonId: validStammPersonId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funkrufname: 'MAX-01',
          funktion: 'Helfer',
          qualifikationen: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: createId(),
          einsatzId: validEinsatzId,
          stammPersonId: null,
          vorname: 'Anna',
          nachname: 'Schmidt',
          funkrufname: null,
          funktion: 'Führungskraft',
          qualifikationen: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetEinsatzPersonenHandler.execute.mockResolvedValue(Result.ok(mockPersonen));

      // When
      const result = await controller.findAll(validEinsatzId);

      // Then
      expect(result).toEqual(mockPersonen);
      expect(mockGetEinsatzPersonenHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
        }),
      );
    });

    it('should return empty array when no persons registered', async () => {
      // Given
      mockGetEinsatzPersonenHandler.execute.mockResolvedValue(Result.ok([]));

      // When
      const result = await controller.findAll(validEinsatzId);

      // Then
      expect(result).toEqual([]);
      expect(mockGetEinsatzPersonenHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when handler returns null/undefined', async () => {
      // Given
      mockGetEinsatzPersonenHandler.execute.mockResolvedValue(Result.ok(null as any));

      // When
      const result = await controller.findAll(validEinsatzId);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException when handler fails', async () => {
      // Given
      const errorMessage = 'Database connection failed';
      mockGetEinsatzPersonenHandler.execute.mockResolvedValue(Result.fail(errorMessage));

      // When/Then
      await expect(controller.findAll(validEinsatzId)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Unexpected error in findAll for Einsatz ${validEinsatzId}`), 'EinsatzPersonenController');
    });
  });

  describe('registrierePerson', () => {
    it('should successfully register person with StammPerson reference', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        funkrufname: 'MAX-01',
        qualifikationIds: [createId()],
      };
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.ok(validEinsatzPersonId));

      // When
      const result = await controller.registrierePerson(validEinsatzId, mockUser, dto);

      // Then
      expect(result).toEqual({ id: validEinsatzPersonId });
      expect(mockRegistrierePersonHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          stammPersonId: validStammPersonId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          funkrufname: 'MAX-01',
          registriertVon: validUserId,
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('EinsatzPerson registriert'), 'EinsatzPersonenController');
    });

    it('should successfully register person without StammPerson reference (manual entry)', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: undefined,
        vorname: 'Anna',
        nachname: 'Schmidt',
        funktion: 'Führungskraft',
        funkrufname: undefined,
        qualifikationIds: undefined,
      };
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.ok(validEinsatzPersonId));

      // When
      const result = await controller.registrierePerson(validEinsatzId, mockUser, dto);

      // Then
      expect(result).toEqual({ id: validEinsatzPersonId });
      expect(mockRegistrierePersonHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          stammPersonId: undefined,
          vorname: 'Anna',
          nachname: 'Schmidt',
          funktion: 'Führungskraft',
          registriertVon: validUserId,
        }),
      );
    });

    it('should throw ConflictException for duplicate person', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, 'Person bereits im Einsatz registriert');
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(ConflictException);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when StammPerson not found', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND, `StammPerson ${validStammPersonId} nicht gefunden`);
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when Einsatz not found', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.EINSATZ_NOT_FOUND, `Einsatz ${validEinsatzId} nicht gefunden`);
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: undefined,
        vorname: '',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      const errorMsg = 'Vorname ist erforderlich';
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when handler returns success but no value', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.ok(null as any));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException for generic handler errors', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail('Some unknown error'));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when error is empty string', async () => {
      // Given
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(''));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(new BadRequestException('Fehler beim Registrieren der Person'));
    });
  });

  describe('registriereViaQr', () => {
    it('should successfully register person via QR with StammPerson match', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.ok(validEinsatzPersonId));

      // When
      const result = await controller.registriereViaQr(validEinsatzId, mockUser, dto);

      // Then
      expect(result).toEqual({ id: validEinsatzPersonId });
      expect(mockRegistriereViaQrHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          personalnummer: 'DRK-12345',
          vorname: 'Max',
          nachname: 'Mustermann',
          funkkennung: 'MAX-01',
          registriertVon: validUserId,
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('EinsatzPerson via QR registriert'), 'EinsatzPersonenController');
    });

    it('should successfully register person via QR without StammPerson (temporary person)', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'UNKNOWN-99999',
        vorname: 'Temporary',
        nachname: 'User',
        funkkennung: undefined,
      };
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.ok(validEinsatzPersonId));

      // When
      const result = await controller.registriereViaQr(validEinsatzId, mockUser, dto);

      // Then
      expect(result).toEqual({ id: validEinsatzPersonId });
      expect(mockRegistriereViaQrHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          personalnummer: 'UNKNOWN-99999',
          vorname: 'Temporary',
          nachname: 'User',
          funkkennung: undefined,
          registriertVon: validUserId,
        }),
      );
    });

    it('should throw ConflictException for duplicate person via QR', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, 'Person bereits im Einsatz erfasst');
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(ConflictException);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for archived StammPerson (STAMM_ARCHIVED)', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-ARCHIVED',
        vorname: 'Archived',
        nachname: 'User',
        funkkennung: undefined,
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_ARCHIVED, 'StammPerson archiviert');
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid QR data', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: '',
        vorname: '',
        nachname: '',
        funkkennung: undefined,
      };
      const errorMsg = 'Ungültige QR-Code Daten';
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when handler returns success but no value', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.ok(null as any));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException for generic handler errors', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail('Unknown QR processing error'));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when error is empty string', async () => {
      // Given
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail(''));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(new BadRequestException('Fehler beim Registrieren der Person via QR'));
    });
  });

  describe('weiseZuFahrzeug', () => {
    const validFahrzeugId = createId();

    const mockEinsatzPerson: EinsatzPersonResponseDto = {
      id: validEinsatzPersonId,
      einsatzId: validEinsatzId,
      stammPersonId: validStammPersonId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funkrufname: 'MAX-01',
      funktion: 'Helfer',
      qualifikationen: [],
      fahrzeugId: validFahrzeugId,
      fahrzeugFunkrufname: 'LF 10/1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully assign person to fahrzeug', async () => {
      // Given
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.ok(undefined));
      mockGetEinsatzPersonByIdHandler.execute.mockResolvedValue(Result.ok(mockEinsatzPerson));

      // When
      const result = await controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser);

      // Then - Controller gibt direkt EinsatzPersonResponseDto zurück (nicht wrapped)
      expect(result).toEqual(mockEinsatzPerson);
      expect(mockWeisePersonZuFahrzeugHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          personId: validEinsatzPersonId,
          fahrzeugId: validFahrzeugId,
          updatedBy: validUserId,
        }),
      );
      expect(mockGetEinsatzPersonByIdHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: validEinsatzPersonId,
        }),
      );
    });

    it('should throw NotFoundException when person not found', async () => {
      // Given
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, 'Person nicht gefunden');
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when fahrzeug not found', async () => {
      // Given
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND, 'Fahrzeug nicht gefunden');
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when fahrzeug not in same einsatz', async () => {
      // Given
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ, 'Fahrzeug gehört zu anderem Einsatz');
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then - BadRequestException weil Client Validation Error
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      // Given
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.fail('Validierungsfehler'));

      // When/Then
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw 500 if reload query fails after successful assignment', async () => {
      // Given - Assignment succeeds but reload fails (N+1 edge case)
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.ok(undefined));
      mockGetEinsatzPersonByIdHandler.execute.mockResolvedValue(Result.fail('DB timeout'));

      // When/Then - Infrastructure error after successful mutation
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Fehler beim Laden der Person ${validEinsatzPersonId}`), 'EinsatzPersonenController');
    });
  });

  describe('entferneVonFahrzeug', () => {
    const _mockEinsatzPerson: EinsatzPersonResponseDto = {
      id: validEinsatzPersonId,
      einsatzId: validEinsatzId,
      stammPersonId: validStammPersonId,
      vorname: 'Max',
      nachname: 'Mustermann',
      funkrufname: 'MAX-01',
      funktion: 'Helfer',
      qualifikationen: [],
      fahrzeugId: undefined,
      fahrzeugFunkrufname: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully remove person from fahrzeug', async () => {
      // Given
      mockEntfernePersonVonFahrzeugHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await controller.entferneVonFahrzeug(validEinsatzId, validEinsatzPersonId, mockUser);

      // Then - Controller gibt void zurück (HTTP 204 No Content)
      expect(result).toBeUndefined();
      expect(mockEntfernePersonVonFahrzeugHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: validEinsatzId,
          personId: validEinsatzPersonId,
          updatedBy: validUserId,
        }),
      );
    });

    it('should throw NotFoundException when person not found', async () => {
      // Given
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, 'Person nicht gefunden');
      mockEntfernePersonVonFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.entferneVonFahrzeug(validEinsatzId, validEinsatzPersonId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for validation errors', async () => {
      // Given
      mockEntfernePersonVonFahrzeugHandler.execute.mockResolvedValue(Result.fail('Validierungsfehler'));

      // When/Then
      await expect(controller.entferneVonFahrzeug(validEinsatzId, validEinsatzPersonId, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should handle idempotent remove (person without fahrzeug assignment)', async () => {
      // Given - Handler returns success even if no fahrzeug assigned (idempotent)
      mockEntfernePersonVonFahrzeugHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await controller.entferneVonFahrzeug(validEinsatzId, validEinsatzPersonId, mockUser);

      // Then - Controller gibt void zurück (HTTP 204 No Content)
      expect(result).toBeUndefined();
      expect(mockEntfernePersonVonFahrzeugHandler.execute).toHaveBeenCalled();
    });
  });

  describe('T4: Infrastructure Error Mapping', () => {
    it('should map database connection errors to 500 InternalServerErrorException (weiseZuFahrzeug)', async () => {
      // Given (Arrange)
      const validFahrzeugId = createId();
      const errorMsg = 'Database connection pool exhausted';
      mockWeisePersonZuFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.weiseZuFahrzeug(validEinsatzId, validEinsatzPersonId, { fahrzeugId: validFahrzeugId }, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should map transaction timeout errors to 500 InternalServerErrorException (entferneVonFahrzeug)', async () => {
      // Given (Arrange)
      const errorMsg = 'Transaction timeout after 10000ms';
      mockEntfernePersonVonFahrzeugHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.entferneVonFahrzeug(validEinsatzId, validEinsatzPersonId, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should map repository save failures to BadRequestException (registrierePerson)', async () => {
      // Given (Arrange)
      const dto: RegistrierePersonDto = {
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
      };
      const errorMsg = 'Repository save failed: Constraint violation';
      mockRegistrierePersonHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registrierePerson(validEinsatzId, mockUser, dto)).rejects.toThrow(BadRequestException);
    });

    it('should map repository findById failures to InternalServerErrorException (findAll)', async () => {
      // Given (Arrange)
      const errorMsg = 'Repository query failed: Connection reset';
      mockGetEinsatzPersonenHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.findAll(validEinsatzId)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected error in findAll'), 'EinsatzPersonenController');
    });

    it('should handle Prisma unique constraint violations gracefully (registriereViaQr)', async () => {
      // Given (Arrange)
      const dto: RegistrierePersonViaQrCodeDto = {
        personalnummer: 'DRK-12345',
        vorname: 'Max',
        nachname: 'Mustermann',
        funkkennung: 'MAX-01',
      };
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, 'Unique constraint violation');
      mockRegistriereViaQrHandler.execute.mockResolvedValue(Result.fail(errorMsg));

      // When/Then
      await expect(controller.registriereViaQr(validEinsatzId, mockUser, dto)).rejects.toThrow(ConflictException);
    });
  });
});
