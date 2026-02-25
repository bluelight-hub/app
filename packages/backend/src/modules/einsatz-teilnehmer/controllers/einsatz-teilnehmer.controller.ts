import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { EinsatzTeilnehmerResponseDto, JoinEinsatzDto } from '@/application/einsatz-teilnehmer/dto';
import { JoinEinsatzCommand } from '@/application/einsatz-teilnehmer/commands/join-einsatz/join-einsatz.command';
import { JoinEinsatzHandler } from '@/application/einsatz-teilnehmer/commands/join-einsatz/join-einsatz.handler';
import { GetMyTeilnahmeQuery } from '@/application/einsatz-teilnehmer/queries/get-my-teilnahme/get-my-teilnahme.query';
import { GetMyTeilnahmeHandler } from '@/application/einsatz-teilnehmer/queries/get-my-teilnahme/get-my-teilnahme.handler';
import { GetAllTeilnehmerQuery } from '@/application/einsatz-teilnehmer/queries/get-all-teilnehmer/get-all-teilnehmer.query';
import { GetAllTeilnehmerHandler } from '@/application/einsatz-teilnehmer/queries/get-all-teilnehmer/get-all-teilnehmer.handler';

/**
 * Controller für Einsatz-Teilnehmer Management.
 *
 * Ermöglicht Usern das Beitreten zu Einsätzen mit einer EinsatzPerson.
 * Person-Daten werden für ETB-Absender Auto-Fill verwendet.
 */
@ApiTags('Einsatz Teilnehmer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@Controller({
  path: 'einsatz/:einsatzId/teilnahme',
  version: 'alpha',
})
export class EinsatzTeilnehmerController {
  constructor(
    private readonly joinHandler: JoinEinsatzHandler,
    private readonly getMyTeilnahmeHandler: GetMyTeilnahmeHandler,
    private readonly getAllTeilnehmerHandler: GetAllTeilnehmerHandler,
  ) {}

  /**
   * Alle aktiven Teilnehmer eines Einsatzes abrufen.
   *
   * Gibt die Liste aller aktiven Teilnehmer mit ihren Person-Daten zurück.
   * Wird für ETB-Absender/Empfänger Autocomplete-Vorschläge verwendet.
   */
  @Get()
  @ApiOperation({
    summary: 'Alle Einsatz-Teilnehmer abrufen',
    description: 'Gibt alle aktiven Teilnehmer des Einsatzes zurück. Inkl. Person-Daten für ETB-Autocomplete.',
  })
  @ApiWrappedResponse(EinsatzTeilnehmerResponseDto, {
    isArray: true,
    description: 'Liste aller aktiven Teilnehmer',
  })
  async getAllTeilnehmer(@Param('einsatzId') einsatzId: string): Promise<EinsatzTeilnehmerResponseDto[]> {
    const query = new GetAllTeilnehmerQuery(einsatzId);
    const result = await this.getAllTeilnehmerHandler.execute(query);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value ?? [];
  }

  /**
   * Eigene Teilnahme an einem Einsatz abrufen.
   *
   * Gibt die Teilnahme des aktuellen Users zurück, inkl. Person-Daten.
   * Wird für ETB-Absender Auto-Fill verwendet.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Eigene Einsatz-Teilnahme abrufen',
    description: 'Gibt die aktive Teilnahme des aktuellen Users am Einsatz zurück. Inkl. Person-Daten für ETB Auto-Fill.',
  })
  @ApiWrappedResponse(EinsatzTeilnehmerResponseDto, {
    description: 'Teilnahme erfolgreich abgerufen',
  })
  @ApiNotFoundResponse({ description: 'User hat den Einsatz noch nicht beigetreten' })
  async getMyTeilnahme(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser): Promise<EinsatzTeilnehmerResponseDto> {
    const query = new GetMyTeilnahmeQuery(einsatzId, user.userId);
    const result = await this.getMyTeilnahmeHandler.execute(query);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new NotFoundException('Sie sind diesem Einsatz noch nicht beigetreten');
    }

    return result.value;
  }

  /**
   * Einem Einsatz beitreten.
   *
   * Erstellt eine Teilnahme mit der gewählten EinsatzPerson.
   * Falls bereits beigetreten, wird die verknüpfte Person aktualisiert.
   */
  @Post()
  @ApiOperation({
    summary: 'Einsatz beitreten',
    description: 'Tritt dem Einsatz mit einer EinsatzPerson bei. Bei erneutem Aufruf wird die verknüpfte Person aktualisiert.',
  })
  @ApiWrappedCreatedResponse(EinsatzTeilnehmerResponseDto, {
    description: 'Einsatz erfolgreich beigetreten',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  async joinEinsatz(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: JoinEinsatzDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzTeilnehmerResponseDto> {
    const commandResult = JoinEinsatzCommand.create(einsatzId, user.userId, dto.einsatzPersonId);

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.joinHandler.execute(commandResult.value);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Beitritt fehlgeschlagen');
    }

    return result.value;
  }
}
