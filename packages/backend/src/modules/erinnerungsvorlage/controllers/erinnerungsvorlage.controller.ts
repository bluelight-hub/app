import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.handler';
import { GetAllVorlagenHandler } from '@/application/erinnerungsvorlage/queries/get-all-vorlagen/get-all-vorlagen.handler';
import { CreateErinnerungsvorlageDto, ErinnerungsvorlageResponseDto, UpdateErinnerungsvorlageDto } from '@/application/erinnerungsvorlage/dto';
import { CreateErinnerungsvorlageCommand } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.command';
import { UpdateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/update-erinnerungsvorlage/update-erinnerungsvorlage.handler';
import { DeleteErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/delete-erinnerungsvorlage/delete-erinnerungsvorlage.handler';
import { UpdateErinnerungsvorlageCommand } from '@/application/erinnerungsvorlage/commands/update-erinnerungsvorlage/update-erinnerungsvorlage.command';
import { DeleteErinnerungsvorlageCommand } from '@/application/erinnerungsvorlage/commands/delete-erinnerungsvorlage/delete-erinnerungsvorlage.command';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '@/application/erinnerungsvorlage/errors/erinnerungsvorlage-error.codes';

/**
 * Controller für Erinnerungsvorlagen (Story 6.1).
 * Eigenes Modul, NICHT in ErinnerungModule einhängen.
 */
@ApiTags('Erinnerungsvorlagen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@Controller({ path: 'erinnerungsvorlagen', version: 'alpha' })
export class ErinnerungsvorlageController {
  constructor(
    private readonly createHandler: CreateErinnerungsvorlageHandler,
    private readonly updateHandler: UpdateErinnerungsvorlageHandler,
    private readonly deleteHandler: DeleteErinnerungsvorlageHandler,
    private readonly getAllHandler: GetAllVorlagenHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Erinnerungsvorlagen abrufen' })
  @ApiWrappedResponse(ErinnerungsvorlageResponseDto, { isArray: true, description: 'Liste aller Vorlagen' })
  async getAll() {
    return this.getAllHandler.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Neue Erinnerungsvorlage erstellen' })
  @ApiWrappedCreatedResponse(ErinnerungsvorlageResponseDto, { description: 'Vorlage erfolgreich erstellt' })
  async create(@Body() dto: CreateErinnerungsvorlageDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateErinnerungsvorlageCommand.create({
      titel: dto.titel,
      minuten: dto.minuten,
      beschreibung: dto.beschreibung,
      createdBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.createHandler.execute(commandResult.value);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Erinnerungsvorlage aktualisieren' })
  @ApiWrappedResponse(ErinnerungsvorlageResponseDto, { description: 'Vorlage erfolgreich aktualisiert' })
  async update(@Param('id') id: string, @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateErinnerungsvorlageDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = UpdateErinnerungsvorlageCommand.create({
      vorlageId: id,
      titel: dto.titel,
      minuten: dto.minuten,
      beschreibung: dto.beschreibung,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(ERINNERUNGSVORLAGE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Erinnerungsvorlage löschen (Soft-Delete)' })
  @ApiResponse({ status: 204, description: 'Vorlage erfolgreich gelöscht (Soft-Delete)' })
  @ApiBadRequestResponse({ description: 'Ungültige VorlageId' })
  @ApiNotFoundResponse({ description: 'Vorlage nicht gefunden' })
  @ApiConflictResponse({ description: 'Vorlage bereits gelöscht' })
  async delete(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const commandResult = DeleteErinnerungsvorlageCommand.create({
      vorlageId: id,
      deletedBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.deleteHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(ERINNERUNGSVORLAGE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }
}
