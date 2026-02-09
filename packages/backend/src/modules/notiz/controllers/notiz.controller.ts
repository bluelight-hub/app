import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateNotizHandler } from '@/application/notiz/commands/create-notiz/create-notiz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { UpdateNotizHandler } from '@/application/notiz/commands/update-notiz/update-notiz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { DeleteNotizHandler } from '@/application/notiz/commands/delete-notiz/delete-notiz.handler';
import { DeleteNotizCommand } from '@/application/notiz/commands/delete-notiz/delete-notiz.command';
import { GetNotizenByEinsatzHandler } from '@/application/notiz/queries/get-notizen-by-einsatz/get-notizen-by-einsatz.handler';
import { GetNotizenByEinsatzQuery } from '@/application/notiz/queries/get-notizen-by-einsatz/get-notizen-by-einsatz.query';
import { CreateNotizDto, UpdateNotizDto, NotizResponseDto } from '@/application/notiz/dto';
import { CreateNotizCommand } from '@/application/notiz/commands/create-notiz/create-notiz.command';
import { UpdateNotizCommand } from '@/application/notiz/commands/update-notiz/update-notiz.command';
import { NOTIZ_ERROR_CODES } from '@/application/notiz/errors/notiz-error.codes';

/**
 * Controller fuer Notizen im Einsatz-Kontext (Story 7.1 + 7.3).
 * Eigenes Modul, NICHT in ErinnerungModule einhaengen.
 */
@ApiTags('Notizen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungueltig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung fuer diese Aktion' })
@Controller({ path: 'einsatz/:einsatzId/notizen', version: 'alpha' })
export class NotizController {
  constructor(
    private readonly createHandler: CreateNotizHandler,
    private readonly updateHandler: UpdateNotizHandler,
    private readonly deleteHandler: DeleteNotizHandler,
    private readonly getNotizenHandler: GetNotizenByEinsatzHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle Notizen eines Einsatzes abrufen' })
  @ApiWrappedResponse(NotizResponseDto, { isArray: true, description: 'Liste aller Notizen des Einsatzes' })
  async getByEinsatz(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser) {
    const queryResult = GetNotizenByEinsatzQuery.create({ einsatzId, userId: user.userId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }

    const result = await this.getNotizenHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Post()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Neue Notiz im Einsatz erstellen' })
  @ApiWrappedCreatedResponse(NotizResponseDto, { description: 'Notiz erfolgreich erstellt' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateNotizDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateNotizCommand.create({
      titel: dto.titel,
      inhalt: dto.inhalt,
      kategorie: dto.kategorie,
      istTeamsichtbar: dto.istTeamsichtbar,
      einsatzId,
      erstelltVon: user.userId,
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

  @Patch(':notizId')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Notiz aktualisieren' })
  @ApiWrappedResponse(NotizResponseDto, { description: 'Notiz erfolgreich aktualisiert' })
  async update(
    @Param('einsatzId') _einsatzId: string,
    @Param('notizId') notizId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateNotizDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    const commandResult = UpdateNotizCommand.create({
      notizId,
      titel: dto.titel,
      inhalt: dto.inhalt,
      kategorie: dto.kategorie,
      istTeamsichtbar: dto.istTeamsichtbar,
      aktualisiertVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(NOTIZ_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(NOTIZ_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Delete(':notizId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Notiz loeschen (Soft-Delete)' })
  @ApiResponse({ status: 204, description: 'Notiz erfolgreich geloescht' })
  @ApiBadRequestResponse({ description: 'Ungueltige NotizId oder UserId' })
  @ApiNotFoundResponse({ description: 'Notiz nicht gefunden' })
  @ApiConflictResponse({ description: 'Notiz bereits geloescht' })
  async delete(@Param('einsatzId') _einsatzId: string, @Param('notizId') notizId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const commandResult = DeleteNotizCommand.create({
      notizId,
      geloeschtVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.deleteHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(NOTIZ_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(NOTIZ_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }
}
