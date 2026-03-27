import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OperativeRoleGuard } from '@/modules/auth/guards/operative-role.guard';
import { RequiresOperativeRole } from '@/modules/auth/decorators/operative-roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { BeitrittsanfrageResponseDto, ResolveBeitrittsanfrageDto } from '@/application/einsatz-beitritt/dto';
import { CreateBeitrittsanfrageCommand } from '@/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.command';
import { CreateBeitrittsanfrageHandler } from '@/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.handler';
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
