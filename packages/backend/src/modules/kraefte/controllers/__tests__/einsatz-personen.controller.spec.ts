import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { EinsatzPersonenController } from '../einsatz-personen.controller';
import { RegistrierePersonHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.handler';
import { RegistrierePersonViaQrCodeHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.handler';
import { WeisePersonZuFahrzeugZuHandler } from '@application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.handler';
import { EntfernePersonVonFahrzeugHandler } from '@application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.handler';
import { GetEinsatzPersonenHandler } from '@application/kraefte/einsatz-personen/queries/get-einsatz-personen/get-einsatz-personen.handler';
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

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EinsatzPersonenController],
      providers: [
        { provide: RegistrierePersonHandler, useValue: mockRegistrierePersonHandler },
        { provide: RegistrierePersonViaQrCodeHandler, useValue: mockRegistriereViaQrHandler },
        { provide: WeisePersonZuFahrzeugZuHandler, useValue: mockWeisePersonZuFahrzeugHandler },
        { provide: EntfernePersonVonFahrzeugHandler, useValue: mockEntfernePersonVonFahrzeugHandler },
        { provide: GetEinsatzPersonenHandler, useValue: mockGetEinsatzPersonenHandler },
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
});
