import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateHazardZoneCommand } from '@/application/hazard-zone/commands/create-hazard-zone/create-hazard-zone.command';
import { CreateHazardZoneHandler } from '@/application/hazard-zone/commands/create-hazard-zone/create-hazard-zone.handler';
import { UpdateHazardZoneCommand } from '@/application/hazard-zone/commands/update-hazard-zone/update-hazard-zone.command';
import { UpdateHazardZoneHandler } from '@/application/hazard-zone/commands/update-hazard-zone/update-hazard-zone.handler';
import { DeleteHazardZoneCommand } from '@/application/hazard-zone/commands/delete-hazard-zone/delete-hazard-zone.command';
import { DeleteHazardZoneHandler } from '@/application/hazard-zone/commands/delete-hazard-zone/delete-hazard-zone.handler';
import { ListHazardZonesQuery } from '@/application/hazard-zone/queries/list-hazard-zones/list-hazard-zones.query';
import { ListHazardZonesHandler } from '@/application/hazard-zone/queries/list-hazard-zones/list-hazard-zones.handler';
import { CreateHazardZoneDto, HazardZoneDto, HazardZoneListResponseDto, UpdateHazardZoneDto } from '@/application/hazard-zone/dto';
import { HAZARD_ZONE_ERROR_CODES } from '@/application/hazard-zone/errors/hazard-zone-error.codes';

/**
 * REST-Controller für Gefahrenzonen auf der Lagekarte (Issue #627).
 *
 * Endpunkte sind einsatz-gescoped (`/einsatz/:einsatzId/hazard-zones`).
 * Alle Schreib-Operationen emittieren Domain-Events, die über den
 * Transactional-Outbox an den WebSocket-Adapter broadcast werden.
 */
@ApiTags('HazardZones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({ path: 'einsatz/:einsatzId/hazard-zones', version: 'alpha' })
export class HazardZoneController {
  constructor(
    private readonly listHandler: ListHazardZonesHandler,
    private readonly createHandler: CreateHazardZoneHandler,
    private readonly updateHandler: UpdateHazardZoneHandler,
    private readonly deleteHandler: DeleteHazardZoneHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle Gefahrenzonen eines Einsatzes auflisten' })
  @ApiWrappedResponse(HazardZoneListResponseDto, { description: 'Liste aller Gefahrenzonen' })
  async list(@Param('einsatzId') einsatzId: string) {
    const queryResult = ListHazardZonesQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }

    const result = await this.listHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Post()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Neue Gefahrenzone anlegen' })
  @ApiWrappedCreatedResponse(HazardZoneDto, { description: 'Erstellte Gefahrenzone' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateHazardZoneDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateHazardZoneCommand.create({
      einsatzId,
      gefahrentyp: dto.gefahrentyp,
      geometryType: dto.geometryType,
      geometry: dto.geometry,
      radiusMeters: dto.radiusMeters ?? null,
      label: dto.label,
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

  @Patch(':zoneId')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Gefahrenzone aktualisieren' })
  @ApiWrappedResponse(HazardZoneDto, { description: 'Aktualisierte Gefahrenzone' })
  async update(@Param('einsatzId') einsatzId: string, @Param('zoneId') zoneId: string, @Body() dto: UpdateHazardZoneDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = UpdateHazardZoneCommand.create({
      einsatzId,
      zoneId,
      gefahrentyp: dto.gefahrentyp,
      geometryType: dto.geometryType,
      geometry: dto.geometry,
      radiusMeters: dto.radiusMeters,
      label: dto.label,
      beschreibung: dto.beschreibung,
      updatedBy: user.userId,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error === HAZARD_ZONE_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Delete(':zoneId')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gefahrenzone löschen' })
  @ApiNoContentResponse({ description: 'Zone wurde gelöscht' })
  async delete(@Param('einsatzId') einsatzId: string, @Param('zoneId') zoneId: string, @CurrentUser() user: ValidatedUser) {
    const commandResult = DeleteHazardZoneCommand.create({
      einsatzId,
      zoneId,
      deletedBy: user.userId,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.deleteHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error === HAZARD_ZONE_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }
}
