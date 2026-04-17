import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateGefahrenzoneCommand } from '@/application/gefahr/commands/create-gefahrenzone/create-gefahrenzone.command';
import { CreateGefahrenzoneHandler } from '@/application/gefahr/commands/create-gefahrenzone/create-gefahrenzone.handler';
import { UpdateGefahrenzoneGeometryCommand } from '@/application/gefahr/commands/update-gefahrenzone-geometry/update-gefahrenzone-geometry.command';
import { UpdateGefahrenzoneGeometryHandler } from '@/application/gefahr/commands/update-gefahrenzone-geometry/update-gefahrenzone-geometry.handler';
import { DeleteGefahrenzoneCommand } from '@/application/gefahr/commands/delete-gefahrenzone/delete-gefahrenzone.command';
import { DeleteGefahrenzoneHandler } from '@/application/gefahr/commands/delete-gefahrenzone/delete-gefahrenzone.handler';
import { GetGefahrenzonenByEinsatzQuery } from '@/application/gefahr/queries/get-gefahrenzonen-by-einsatz/get-gefahrenzonen-by-einsatz.query';
import { GetGefahrenzonenByEinsatzHandler } from '@/application/gefahr/queries/get-gefahrenzonen-by-einsatz/get-gefahrenzonen-by-einsatz.handler';
import { CreateGefahrenzoneDto, GefahrenzoneDto, GefahrenzoneListResponseDto, UpdateGefahrenzoneGeometryDto } from '@/application/gefahr/dto';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '@/application/gefahr/errors/gefahrenzone-error.codes';

/**
 * Controller für Gefahrenzonen eines Einsatzes (Issue #627).
 *
 * Routen nested unter `/einsatz/:einsatzId/...` (Projekt-Konvention: Einsatz-bezogene
 * Endpoints immer einsatz-scoped, siehe Memory-Regel Route-Nesting).
 */
@ApiTags('Gefahrenzonen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({ path: 'einsatz/:einsatzId/gefahrenzonen', version: 'alpha' })
export class GefahrenzoneController {
  constructor(
    private readonly createHandler: CreateGefahrenzoneHandler,
    private readonly updateGeometryHandler: UpdateGefahrenzoneGeometryHandler,
    private readonly deleteHandler: DeleteGefahrenzoneHandler,
    private readonly getHandler: GetGefahrenzonenByEinsatzHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle Gefahrenzonen eines Einsatzes abrufen' })
  @ApiWrappedResponse(GefahrenzoneListResponseDto, { description: 'Liste aller Zonen inkl. abgeleiteter Matrix-Warnstufe' })
  async list(@Param('einsatzId') einsatzId: string) {
    const queryResult = GetGefahrenzonenByEinsatzQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }
    const result = await this.getHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Post()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Neue Gefahrenzone anlegen und mit Matrix-Zelle verknüpfen' })
  @ApiWrappedCreatedResponse(GefahrenzoneDto, { description: 'Die neu angelegte Zone' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateGefahrenzoneDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateGefahrenzoneCommand.create({
      einsatzId,
      gefahrentyp: dto.gefahrentyp,
      schutzobjekt: dto.schutzobjekt,
      geometryType: dto.geometryType,
      geometry: dto.geometry,
      bezeichnung: dto.bezeichnung,
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

  @Patch(':zoneId/geometry')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Geometrie einer bestehenden Zone aktualisieren' })
  @ApiWrappedResponse(GefahrenzoneDto, { description: 'Die aktualisierte Zone' })
  async updateGeometry(@Param('einsatzId') einsatzId: string, @Param('zoneId') zoneId: string, @Body() dto: UpdateGefahrenzoneGeometryDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = UpdateGefahrenzoneGeometryCommand.create({
      einsatzId,
      zoneId,
      geometryType: dto.geometryType,
      geometry: dto.geometry,
      aktualisiertVon: user.userId,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }
    const result = await this.updateGeometryHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error === GEFAHRENZONE_APPLICATION_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Delete(':zoneId')
  @HttpCode(204)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Gefahrenzone löschen' })
  @ApiNoContentResponse({ description: 'Zone wurde gelöscht' })
  async delete(@Param('einsatzId') einsatzId: string, @Param('zoneId') zoneId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const commandResult = DeleteGefahrenzoneCommand.create({
      einsatzId,
      zoneId,
      geloeschtVon: user.userId,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }
    const result = await this.deleteHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error === GEFAHRENZONE_APPLICATION_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }
}
