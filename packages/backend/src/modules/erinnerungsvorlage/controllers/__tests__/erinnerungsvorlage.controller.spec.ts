// @ts-nocheck
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErinnerungsvorlageController } from '@/modules/erinnerungsvorlage/controllers/erinnerungsvorlage.controller';
import { Result } from '@/domain/common/result';
import type { CreateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.handler';
import type { UpdateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/update-erinnerungsvorlage/update-erinnerungsvorlage.handler';
import type { DeleteErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/delete-erinnerungsvorlage/delete-erinnerungsvorlage.handler';
import type { GetAllVorlagenHandler } from '@/application/erinnerungsvorlage/queries/get-all-vorlagen/get-all-vorlagen.handler';
import type { ErinnerungsvorlageResponseDto } from '@/application/erinnerungsvorlage/dto/erinnerungsvorlage-response.dto';
import type { UpdateErinnerungsvorlageDto } from '@/application/erinnerungsvorlage/dto/update-erinnerungsvorlage.dto';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '@/application/erinnerungsvorlage/errors/erinnerungsvorlage-error.codes';

/**
 * Unit Tests fuer ErinnerungsvorlageController (PATCH + DELETE).
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler mit jest.fn()
 * - Focus: Controller-Orchestration, Command-Creation, Exception-Mapping
 *
 * **Test Groups:**
 * 1. update() - PATCH /erinnerungsvorlagen/:id
 *    - Success: Gibt ErinnerungsvorlageResponseDto zurueck
 *    - Failure: NotFoundException bei NOT_FOUND
 *    - Failure: ConflictException bei ALREADY_DELETED
 *    - Failure: BadRequestException bei Validierungsfehler
 *
 * 2. delete() - DELETE /erinnerungsvorlagen/:id
 *    - Success: Gibt void zurueck
 *    - Failure: NotFoundException bei NOT_FOUND
 *    - Failure: ConflictException bei ALREADY_DELETED
 */
describe('ErinnerungsvorlageController', () => {
  let controller: ErinnerungsvorlageController;
  let mockCreateHandler: jest.Mocked<CreateErinnerungsvorlageHandler>;
  let mockUpdateHandler: jest.Mocked<UpdateErinnerungsvorlageHandler>;
  let mockDeleteHandler: jest.Mocked<DeleteErinnerungsvorlageHandler>;
  let mockGetAllHandler: jest.Mocked<GetAllVorlagenHandler>;

  /** Standard-Erfolgsantwort fuer Mock */
  const mockResponseDto: ErinnerungsvorlageResponseDto = {
    id: 'clw3h8x9y0000qwertyuiopas',
    titel: 'Lagebesprechung',
    minuten: 30,
    beschreibung: 'Regelmäßige Lagebesprechung im ELW',
    createdBy: 'user_admin123',
    createdAt: '2026-01-19T15:30:00.000Z',
    updatedAt: '2026-01-19T16:00:00.000Z',
  };

  /** Mock-User (ValidatedUser) */
  const mockUser = {
    userId: 'user_admin123',
  };

  /** Standard vorlageId */
  const vorlageId = 'clw3h8x9y0000qwertyuiopas';

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockUpdateHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockDeleteHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockGetAllHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    controller = new ErinnerungsvorlageController(mockCreateHandler, mockUpdateHandler, mockDeleteHandler, mockGetAllHandler);
  });

  describe('update() - PATCH /erinnerungsvorlagen/:id', () => {
    describe('Success Cases', () => {
      it('sollte Vorlage erfolgreich aktualisieren und ResponseDto zurueckgeben', async () => {
        // Given
        const dto: UpdateErinnerungsvorlageDto = {
          titel: 'Lagebesprechung aktualisiert',
          minuten: 45,
        };

        mockUpdateHandler.execute.mockResolvedValue(Result.ok(mockResponseDto));

        // When
        const result = await controller.update(vorlageId, dto, mockUser);

        // Then
        expect(result).toEqual(mockResponseDto);
        expect(mockUpdateHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Partial Update mit nur Titel durchfuehren', async () => {
        // Given
        const dto: UpdateErinnerungsvorlageDto = {
          titel: 'Neuer Titel',
        };

        mockUpdateHandler.execute.mockResolvedValue(Result.ok(mockResponseDto));

        // When
        const result = await controller.update(vorlageId, dto, mockUser);

        // Then
        expect(result).toEqual(mockResponseDto);
        expect(mockUpdateHandler.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('Error Cases', () => {
      it('sollte NotFoundException werfen wenn Vorlage nicht gefunden', async () => {
        // Given
        const dto: UpdateErinnerungsvorlageDto = { titel: 'Neuer Titel' };
        mockUpdateHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND));

        // When & Then
        await expect(controller.update(vorlageId, dto, mockUser)).rejects.toThrow(NotFoundException);
      });

      it('sollte ConflictException werfen wenn Vorlage bereits geloescht', async () => {
        // Given
        const dto: UpdateErinnerungsvorlageDto = { titel: 'Neuer Titel' };
        mockUpdateHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.ALREADY_DELETED));

        // When & Then
        await expect(controller.update(vorlageId, dto, mockUser)).rejects.toThrow(ConflictException);
      });

      it('sollte BadRequestException werfen bei Command-Validierungsfehler (keine Aenderungen)', async () => {
        // Given - leeres DTO ohne Felder fuehrt zu NO_CHANGES im Command
        const dto: UpdateErinnerungsvorlageDto = {};

        // When & Then
        await expect(controller.update(vorlageId, dto, mockUser)).rejects.toThrow(BadRequestException);
        expect(mockUpdateHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen bei sonstigem Handler-Fehler', async () => {
        // Given
        const dto: UpdateErinnerungsvorlageDto = { titel: 'Neuer Titel' };
        mockUpdateHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.UPDATE_FAILED));

        // When & Then
        await expect(controller.update(vorlageId, dto, mockUser)).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('delete() - DELETE /erinnerungsvorlagen/:id', () => {
    describe('Success Cases', () => {
      it('sollte Vorlage erfolgreich loeschen (Soft-Delete)', async () => {
        // Given
        mockDeleteHandler.execute.mockResolvedValue(Result.ok(undefined as never));

        // When
        const result = await controller.delete(vorlageId, mockUser);

        // Then
        expect(result).toBeUndefined();
        expect(mockDeleteHandler.execute).toHaveBeenCalledTimes(1);
      });
    });

    describe('Error Cases', () => {
      it('sollte NotFoundException werfen wenn Vorlage nicht gefunden', async () => {
        // Given
        mockDeleteHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND));

        // When & Then
        await expect(controller.delete(vorlageId, mockUser)).rejects.toThrow(NotFoundException);
      });

      it('sollte ConflictException werfen wenn Vorlage bereits geloescht', async () => {
        // Given
        mockDeleteHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.ALREADY_DELETED));

        // When & Then
        await expect(controller.delete(vorlageId, mockUser)).rejects.toThrow(ConflictException);
      });

      it('sollte BadRequestException werfen bei sonstigem Handler-Fehler', async () => {
        // Given
        mockDeleteHandler.execute.mockResolvedValue(Result.fail(ERINNERUNGSVORLAGE_ERROR_CODES.DELETE_FAILED));

        // When & Then
        await expect(controller.delete(vorlageId, mockUser)).rejects.toThrow(BadRequestException);
      });
    });
  });
});
