import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { SkipTransform } from '@/modules/common/decorators/skip-transform.decorator';
import { EinsatzTeilnehmerResponseDto, JoinEinsatzDto } from '@/application/einsatz-teilnehmer/dto';
import { JoinEinsatzCommand } from '@/application/einsatz-teilnehmer/commands/join-einsatz/join-einsatz.command';
import { JoinEinsatzHandler } from '@/application/einsatz-teilnehmer/commands/join-einsatz/join-einsatz.handler';
import { GetMyTeilnahmeQuery } from '@/application/einsatz-teilnehmer/queries/get-my-teilnahme/get-my-teilnahme.query';
import { GetMyTeilnahmeHandler } from '@/application/einsatz-teilnehmer/queries/get-my-teilnahme/get-my-teilnahme.handler';

/**
 * Controller für Einsatz-Teilnehmer Management.
 *
 * Ermöglicht Usern das Beitreten zu Einsätzen mit einem Funkrufnamen.
 * Der Funkrufname wird für ETB-Absender Auto-Fill verwendet.
 */
@ApiTags('Einsatz Teilnehmer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@SkipTransform()
@Controller({
  path: 'einsatz/:einsatzId/teilnahme',
  version: 'alpha',
})
export class EinsatzTeilnehmerController {
  constructor(
    private readonly joinHandler: JoinEinsatzHandler,
    private readonly getMyTeilnahmeHandler: GetMyTeilnahmeHandler,
  ) {}

  /**
   * Eigene Teilnahme an einem Einsatz abrufen.
   *
   * Gibt die Teilnahme des aktuellen Users zurück, inkl. Funkrufname.
   * Wird für ETB-Absender Auto-Fill verwendet.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Eigene Einsatz-Teilnahme abrufen',
    description: 'Gibt die aktive Teilnahme des aktuellen Users am Einsatz zurück. Inkl. Funkrufname für ETB Auto-Fill.',
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
   * Erstellt eine Teilnahme mit dem gewählten Funkrufnamen.
   * Falls bereits beigetreten, wird der Funkrufname aktualisiert.
   */
  @Post()
  @ApiOperation({
    summary: 'Einsatz beitreten',
    description: 'Tritt dem Einsatz mit einem Funkrufnamen bei. Bei erneutem Aufruf wird der Funkrufname aktualisiert.',
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
    const commandResult = JoinEinsatzCommand.create(einsatzId, user.userId, dto.funkrufname);

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
