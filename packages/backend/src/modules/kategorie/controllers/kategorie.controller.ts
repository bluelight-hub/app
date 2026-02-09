import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateKategorieHandler } from '@/application/kategorie/commands/create-kategorie/create-kategorie.handler';
import { DeleteKategorieHandler } from '@/application/kategorie/commands/delete-kategorie/delete-kategorie.handler';
import { DeleteKategorieCommand } from '@/application/kategorie/commands/delete-kategorie/delete-kategorie.command';
import { GetKategorienByEinsatzHandler } from '@/application/kategorie/queries/get-kategorien-by-einsatz/get-kategorien-by-einsatz.handler';
import { GetKategorienByEinsatzQuery } from '@/application/kategorie/queries/get-kategorien-by-einsatz/get-kategorien-by-einsatz.query';
import { CreateKategorieDto, KategorieResponseDto } from '@/application/kategorie/dto';
import { CreateKategorieCommand } from '@/application/kategorie/commands/create-kategorie/create-kategorie.command';
import { KATEGORIE_ERROR_CODES } from '@/application/kategorie/errors/kategorie-error.codes';

/**
 * Controller fuer Kategorien im Einsatz-Kontext (Story 8.1).
 *
 * Kategorien sind NICHT unter einsatz/:einsatzId sondern direkt unter /kategorien.
 * Die einsatzId wird als Query Parameter übergeben.
 */
@ApiTags('Kategorien')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungueltig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung fuer diese Aktion' })
@Controller({ path: 'kategorien', version: 'alpha' })
export class KategorieController {
  constructor(
    private readonly createHandler: CreateKategorieHandler,
    private readonly deleteHandler: DeleteKategorieHandler,
    private readonly getKategorienHandler: GetKategorienByEinsatzHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle Kategorien eines Einsatzes abrufen' })
  @ApiQuery({ name: 'einsatzId', description: 'ID des Einsatzes', type: String, required: true })
  @ApiWrappedResponse(KategorieResponseDto, { isArray: true, description: 'Liste aller Kategorien des Einsatzes' })
  async getByEinsatz(@Query('einsatzId') einsatzId: string, @CurrentUser() _user: ValidatedUser) {
    const queryResult = GetKategorienByEinsatzQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }

    const result = await this.getKategorienHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Post()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Neue Kategorie im Einsatz erstellen' })
  @ApiQuery({ name: 'einsatzId', description: 'ID des Einsatzes', type: String, required: true })
  @ApiWrappedCreatedResponse(KategorieResponseDto, { description: 'Kategorie erfolgreich erstellt' })
  @ApiConflictResponse({ description: 'Kategorie mit diesem Namen existiert bereits im Einsatz' })
  async create(@Query('einsatzId') einsatzId: string, @Body() dto: CreateKategorieDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateKategorieCommand.create({
      name: dto.name,
      farbe: dto.farbe,
      einsatzId,
      erstelltVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.createHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(KATEGORIE_ERROR_CODES.NAME_DUPLICATE)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Kategorie loeschen (Soft-Delete)' })
  @ApiResponse({ status: 204, description: 'Kategorie erfolgreich geloescht' })
  @ApiBadRequestResponse({ description: 'Ungueltige KategorieId oder UserId' })
  @ApiNotFoundResponse({ description: 'Kategorie nicht gefunden' })
  @ApiConflictResponse({ description: 'Kategorie bereits geloescht' })
  async delete(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const commandResult = DeleteKategorieCommand.create({
      kategorieId: id,
      geloeschtVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.deleteHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(KATEGORIE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(KATEGORIE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }
}
