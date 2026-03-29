import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OperativeRoleGuard } from '@/modules/auth/guards/operative-role.guard';
import { RequiresOperativeRole } from '@/modules/auth/decorators/operative-roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { BeitrittsanfrageResponseDto, InviteExterneDto, ResolveBeitrittsanfrageDto } from '@/application/einsatz-beitritt/dto';
import { CreateBeitrittsanfrageCommand } from '@/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.command';
import { CreateBeitrittsanfrageHandler } from '@/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.handler';
import { InviteExterneCommand } from '@/application/einsatz-beitritt/commands/invite-externe/invite-externe.command';
import { InviteExterneHandler } from '@/application/einsatz-beitritt/commands/invite-externe/invite-externe.handler';
import { ResolveBeitrittsanfrageCommand } from '@/application/einsatz-beitritt/commands/resolve-beitrittsanfrage/resolve-beitrittsanfrage.command';
import { ResolveBeitrittsanfrageHandler } from '@/application/einsatz-beitritt/commands/resolve-beitrittsanfrage/resolve-beitrittsanfrage.handler';
import { GetBeitrittsanfragenQuery } from '@/application/einsatz-beitritt/queries/get-beitrittsanfragen/get-beitrittsanfragen.query';
import { GetBeitrittsanfragenHandler } from '@/application/einsatz-beitritt/queries/get-beitrittsanfragen/get-beitrittsanfragen.handler';

/**
 * Controller für Einsatz-Beitrittsanfragen.
 *
 * Einsatzkräfte können Beitrittsanfragen für Einsätze stellen.
 * Führungskräfte können diese genehmigen oder ablehnen.
 */
@ApiTags('Einsatz Beitritt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung - operative Rolle fehlt oder unzureichend' })
@Controller({
  path: 'einsatz/:einsatzId/beitrittsanfragen',
  version: ['alpha', '1'],
})
export class EinsatzBeitrittController {
  constructor(
    private readonly createHandler: CreateBeitrittsanfrageHandler,
    private readonly inviteHandler: InviteExterneHandler,
    private readonly resolveHandler: ResolveBeitrittsanfrageHandler,
    private readonly getHandler: GetBeitrittsanfragenHandler,
  ) {}

  /**
   * Erstellt eine Beitrittsanfrage für einen Einsatz.
   *
   * Nur Einsatzkräfte dürfen Beitrittsanfragen stellen.
   */
  @Post()
  @RequiresOperativeRole('EINSATZKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiOperation({
    summary: 'Beitrittsanfrage erstellen',
    description: 'Einsatzkraft stellt eine Anfrage, einem laufenden Einsatz beizutreten.',
  })
  @ApiWrappedCreatedResponse(BeitrittsanfrageResponseDto, {
    description: 'Beitrittsanfrage erfolgreich erstellt',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Duplikat' })
  async create(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser): Promise<BeitrittsanfrageResponseDto> {
    const commandResult = CreateBeitrittsanfrageCommand.create(einsatzId, user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.createHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Beitrittsanfrage konnte nicht erstellt werden');
    }

    return result.value;
  }

  /**
   * Lädt eine externe Person zu einem Einsatz ein.
   *
   * Nur Führungskräfte dürfen EXTERNE einladen.
   * Die Beitrittsanfrage wird direkt mit Status GENEHMIGT erstellt.
   */
  @Post('einladen')
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiOperation({
    summary: 'Externe Person einladen',
    description: 'Führungskraft lädt eine externe Person zu einem Einsatz ein (erstellt genehmigte Beitrittsanfrage).',
  })
  @ApiWrappedCreatedResponse(BeitrittsanfrageResponseDto, {
    description: 'Einladung erfolgreich erstellt',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder User ist keine Externe' })
  async invite(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: InviteExterneDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<BeitrittsanfrageResponseDto> {
    const commandResult = InviteExterneCommand.create(einsatzId, dto.userId, user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.inviteHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    // Einladung wurde erstellt – lade die Beitrittsanfrage zurück
    const queryResult = GetBeitrittsanfragenQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const anfragen = await this.getHandler.execute(queryResult.value);
    if (anfragen.isFailure) {
      throw new BadRequestException(anfragen.error);
    }

    const matchingAnfrage = anfragen.value?.find((a) => a.userId === dto.userId);
    if (!matchingAnfrage) {
      throw new NotFoundException('Erstellte Einladung konnte nicht gefunden werden');
    }

    return matchingAnfrage;
  }

  /**
   * Widerruft eine Einladung (genehmigte Beitrittsanfrage) für einen User.
   *
   * Nur Führungskräfte dürfen Einladungen widerrufen.
   */
  @Delete(':userId')
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiOperation({
    summary: 'Einladung widerrufen',
    description: 'Führungskraft widerruft eine genehmigte Beitrittsanfrage (Einladung) für einen User.',
  })
  @ApiWrappedResponse(BeitrittsanfrageResponseDto, {
    description: 'Einladung erfolgreich widerrufen',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Anfrage bereits abgelehnt' })
  @ApiNotFoundResponse({ description: 'Keine genehmigte Beitrittsanfrage gefunden' })
  async revokeInvitation(@Param('einsatzId') einsatzId: string, @Param('userId') userId: string, @CurrentUser() user: ValidatedUser): Promise<BeitrittsanfrageResponseDto> {
    // 1. Alle Beitrittsanfragen für diesen Einsatz laden
    const queryResult = GetBeitrittsanfragenQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const anfragen = await this.getHandler.execute(queryResult.value);
    if (anfragen.isFailure) {
      throw new BadRequestException(anfragen.error);
    }

    // 2. Genehmigte Anfrage für den User finden
    const anfrage = anfragen.value?.find((a) => a.userId === userId && a.status === 'GENEHMIGT');
    if (!anfrage) {
      throw new NotFoundException('Keine genehmigte Beitrittsanfrage für diesen User gefunden');
    }

    // 3. Anfrage auf ABGELEHNT setzen (widerrufen)
    const commandResult = ResolveBeitrittsanfrageCommand.create(anfrage.id, 'ABGELEHNT', user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.resolveHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Einladung konnte nicht widerrufen werden');
    }

    return result.value;
  }

  /**
   * Listet alle Beitrittsanfragen für einen Einsatz.
   *
   * Nur Führungskräfte dürfen Beitrittsanfragen einsehen.
   */
  @Get()
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiOperation({
    summary: 'Beitrittsanfragen auflisten',
    description: 'Führungskraft sieht alle Beitrittsanfragen für einen Einsatz.',
  })
  @ApiWrappedResponse(BeitrittsanfrageResponseDto, {
    isArray: true,
    description: 'Liste aller Beitrittsanfragen',
  })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId') einsatzId: string): Promise<BeitrittsanfrageResponseDto[]> {
    const queryResult = GetBeitrittsanfragenQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value ?? [];
  }

  /**
   * Entscheidet eine Beitrittsanfrage (genehmigen oder ablehnen).
   *
   * Nur Führungskräfte dürfen Beitrittsanfragen entscheiden.
   */
  @Patch(':anfrageId')
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiOperation({
    summary: 'Beitrittsanfrage entscheiden',
    description: 'Führungskraft genehmigt oder lehnt eine Beitrittsanfrage ab.',
  })
  @ApiWrappedResponse(BeitrittsanfrageResponseDto, {
    description: 'Beitrittsanfrage erfolgreich entschieden',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder bereits entschieden' })
  @ApiNotFoundResponse({ description: 'Beitrittsanfrage nicht gefunden' })
  async resolve(
    @Param('anfrageId') anfrageId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ResolveBeitrittsanfrageDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<BeitrittsanfrageResponseDto> {
    const commandResult = ResolveBeitrittsanfrageCommand.create(anfrageId, dto.decision, user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.resolveHandler.execute(commandResult.value);
    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Beitrittsanfrage konnte nicht entschieden werden');
    }

    return result.value;
  }
}
