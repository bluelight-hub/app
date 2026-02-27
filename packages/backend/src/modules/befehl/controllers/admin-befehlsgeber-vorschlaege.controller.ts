import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ValidationPipe, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

import { CreateBefehlsgeberVorschlagHandler } from '@application/befehlsgeber-vorschlag/commands/create-befehlsgeber-vorschlag/create-befehlsgeber-vorschlag.handler';
import { UpdateBefehlsgeberVorschlagHandler } from '@application/befehlsgeber-vorschlag/commands/update-befehlsgeber-vorschlag/update-befehlsgeber-vorschlag.handler';
import { DeleteBefehlsgeberVorschlagHandler } from '@application/befehlsgeber-vorschlag/commands/deactivate-befehlsgeber-vorschlag/deactivate-befehlsgeber-vorschlag.handler';
import { GetAllBefehlsgeberVorschlaegeHandler } from '@application/befehlsgeber-vorschlag/queries/get-all-befehlsgeber-vorschlaege/get-all-befehlsgeber-vorschlaege.handler';

import { CreateBefehlsgeberVorschlagCommand } from '@application/befehlsgeber-vorschlag/commands/create-befehlsgeber-vorschlag/create-befehlsgeber-vorschlag.command';
import { UpdateBefehlsgeberVorschlagCommand } from '@application/befehlsgeber-vorschlag/commands/update-befehlsgeber-vorschlag/update-befehlsgeber-vorschlag.command';
import { DeleteBefehlsgeberVorschlagCommand } from '@application/befehlsgeber-vorschlag/commands/deactivate-befehlsgeber-vorschlag/deactivate-befehlsgeber-vorschlag.command';
import { GetAllBefehlsgeberVorschlaegeQuery } from '@application/befehlsgeber-vorschlag/queries/get-all-befehlsgeber-vorschlaege/get-all-befehlsgeber-vorschlaege.query';

import { BefehlsgeberVorschlagDto } from '@application/befehlsgeber-vorschlag/dto/befehlsgeber-vorschlag.dto';
import { CreateBefehlsgeberVorschlagDto } from '@application/befehlsgeber-vorschlag/dto/create-befehlsgeber-vorschlag.dto';
import { UpdateBefehlsgeberVorschlagDto } from '@application/befehlsgeber-vorschlag/dto/update-befehlsgeber-vorschlag.dto';

@ApiTags('admin-befehle-befehlsgeber-vorschlaege')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gueltige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit ueberschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung fuer diese Operation' })
@Controller({ path: 'admin/befehle/befehlsgeber-vorschlaege', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminBefehlsgeberVorschlaegeController {
  constructor(
    private readonly createHandler: CreateBefehlsgeberVorschlagHandler,
    private readonly updateHandler: UpdateBefehlsgeberVorschlagHandler,
    private readonly deleteHandler: DeleteBefehlsgeberVorschlagHandler,
    private readonly getAllHandler: GetAllBefehlsgeberVorschlaegeHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Befehlsgeber-Vorschlaege auflisten' })
  @ApiWrappedResponse(BefehlsgeberVorschlagDto, { isArray: true, description: 'Liste aller Befehlsgeber-Vorschlaege' })
  @ApiQuery({ name: 'istAktiv', required: false, type: Boolean })
  @ApiBadRequestResponse({ description: 'Ungueltiger Query-Parameter' })
  async findAll(@Query('istAktiv') istAktiv?: string): Promise<BefehlsgeberVorschlagDto[]> {
    let istAktivFilter: boolean | undefined;
    if (istAktiv === 'true') istAktivFilter = true;
    if (istAktiv === 'false') istAktivFilter = false;

    const query = new GetAllBefehlsgeberVorschlaegeQuery(istAktivFilter);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value ?? [];
  }

  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neuen Befehlsgeber-Vorschlag erstellen' })
  @ApiWrappedCreatedResponse(BefehlsgeberVorschlagDto, { description: 'Befehlsgeber-Vorschlag erfolgreich erstellt' })
  @ApiConflictResponse({ description: 'Kuerzel bereits vergeben' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  async create(@CurrentUser() user: ValidatedUser, @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateBefehlsgeberVorschlagDto): Promise<BefehlsgeberVorschlagDto> {
    const command = new CreateBefehlsgeberVorschlagCommand(dto.kuerzel, dto.label, user.userId, dto.sortOrder);
    const result = await this.createHandler.execute(command);

    if (result.isFailure) {
      if (result.error?.includes('bereits vergeben')) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Befehlsgeber-Vorschlag konnte nicht erstellt werden');
    }

    return result.value;
  }

  @Delete(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Befehlsgeber-Vorschlag loeschen' })
  @ApiNotFoundResponse({ description: 'Befehlsgeber-Vorschlag nicht gefunden' })
  async remove(@Param('id', ParseCuidPipe) id: string): Promise<void> {
    const command = new DeleteBefehlsgeberVorschlagCommand(id);
    const result = await this.deleteHandler.execute(command);

    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
  }

  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Befehlsgeber-Vorschlag aktualisieren' })
  @ApiWrappedResponse(BefehlsgeberVorschlagDto, { description: 'Befehlsgeber-Vorschlag erfolgreich aktualisiert' })
  @ApiNotFoundResponse({ description: 'Befehlsgeber-Vorschlag nicht gefunden' })
  @ApiConflictResponse({ description: 'Kuerzel bereits vergeben' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateBefehlsgeberVorschlagDto,
  ): Promise<BefehlsgeberVorschlagDto> {
    const command = new UpdateBefehlsgeberVorschlagCommand(id, user.userId, dto.kuerzel, dto.label, dto.sortOrder, dto.istAktiv);
    const result = await this.updateHandler.execute(command);

    if (result.isFailure) {
      if (result.error?.includes('nicht gefunden')) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes('bereits vergeben')) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Befehlsgeber-Vorschlag konnte nicht aktualisiert werden');
    }

    return result.value;
  }
}
