import { ActivateFunkkanalCommand, ActivateFunkkanalHandler } from '@/application/funkkanal/commands/activate-funkkanal';
import { ArchiveFunkkanalCommand, ArchiveFunkkanalHandler } from '@/application/funkkanal/commands/archive-funkkanal';
import { ChangeFunkkanalDetailsCommand, ChangeFunkkanalDetailsHandler, type ChangeFunkkanalDetailsInput } from '@/application/funkkanal/commands/change-funkkanal-details';
import { CreateFunkkanalCommand, CreateFunkkanalHandler, type CreateFunkkanalCommandDetails } from '@/application/funkkanal/commands/create-funkkanal';
import { DeactivateFunkkanalCommand, DeactivateFunkkanalHandler } from '@/application/funkkanal/commands/deactivate-funkkanal';
import { RenameFunkkanalCommand, RenameFunkkanalHandler } from '@/application/funkkanal/commands/rename-funkkanal';
import { ReorderFunkkanaeleCommand, ReorderFunkkanaeleHandler } from '@/application/funkkanal/commands/reorder-funkkanaele';
import { SetFunkkanalSortIndexCommand, SetFunkkanalSortIndexHandler } from '@/application/funkkanal/commands/set-funkkanal-sort-index';
import { SetFunkkanalZweckCommand, SetFunkkanalZweckHandler } from '@/application/funkkanal/commands/set-funkkanal-zweck';
import { ApiKanalDetailsExtraModels, CreateFunkkanalDto, FunkkanalResponseDto, ReorderFunkkanaeleDto, UpdateFunkkanalDto } from '@/application/funkkanal/dto';
import { GetFunkkanalByIdQuery, GetFunkkanalByIdQueryHandler } from '@/application/funkkanal/queries/get-funkkanal-by-id';
import { GetKanalplanQuery, GetKanalplanQueryHandler } from '@/application/funkkanal/queries/get-kanalplan';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FunkkanalMapper } from './mappers/funkkanal.mapper';
import { toHttpError, unwrapOrThrow } from './helpers/funkkanal-error.helper';

/**
 * HTTP-Adapter für den Funkkanal-Bounded-Context.
 *
 * Alle Endpoints liegen unter `/einsatz/:einsatzId/funkkanaele`, um die
 * Einsatz-Nesting-Konvention einzuhalten.
 *
 * PATCH-Endpoint dispatcht gesetzte Felder des {@link UpdateFunkkanalDto} auf
 * die feingranularen Commands (Rename / ChangeDetails / SetZweck / SetSortIndex
 * / Activate / Deactivate) — es gibt kein einzelnes Update-Command im Aggregat.
 */
@ApiTags('Funkkanal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiKanalDetailsExtraModels()
@Controller({ path: 'einsatz/:einsatzId/funkkanaele', version: 'alpha' })
export class FunkkanalController {
  constructor(
    private readonly createHandler: CreateFunkkanalHandler,
    private readonly renameHandler: RenameFunkkanalHandler,
    private readonly changeDetailsHandler: ChangeFunkkanalDetailsHandler,
    private readonly setZweckHandler: SetFunkkanalZweckHandler,
    private readonly setSortIndexHandler: SetFunkkanalSortIndexHandler,
    private readonly activateHandler: ActivateFunkkanalHandler,
    private readonly deactivateHandler: DeactivateFunkkanalHandler,
    private readonly archiveHandler: ArchiveFunkkanalHandler,
    private readonly reorderHandler: ReorderFunkkanaeleHandler,
    private readonly getKanalplanHandler: GetKanalplanQueryHandler,
    private readonly getByIdHandler: GetFunkkanalByIdQueryHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Kanalplan für Einsatz abrufen' })
  @ApiWrappedResponse(FunkkanalResponseDto, { isArray: true, description: 'Alle Funkkanäle eines Einsatzes (sortiert nach sortIndex)' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  async list(@Param('einsatzId') einsatzId: string, @Query('includeArchived') includeArchived?: string): Promise<FunkkanalResponseDto[]> {
    const query = unwrapOrThrow(
      GetKanalplanQuery.create({
        einsatzId,
        includeArchived: includeArchived === 'true',
      }),
    );
    const aggregates = unwrapOrThrow(await this.getKanalplanHandler.execute(query));
    return aggregates.map((a) => FunkkanalMapper.toResponseDto(a));
  }

  @Get(':kanalId')
  @ApiOperation({ summary: 'Einzelnen Funkkanal abrufen' })
  @ApiWrappedResponse(FunkkanalResponseDto, { description: 'Funkkanal inkl. Zuordnungen' })
  @ApiNotFoundResponse({ description: 'Funkkanal nicht gefunden' })
  async getById(@Param('einsatzId') _einsatzId: string, @Param('kanalId') kanalId: string): Promise<FunkkanalResponseDto> {
    const query = unwrapOrThrow(GetFunkkanalByIdQuery.create({ kanalId }));
    const aggregate = unwrapOrThrow(await this.getByIdHandler.execute(query));
    if (!aggregate) {
      throw new NotFoundException(`Funkkanal ${kanalId} nicht gefunden`);
    }
    return FunkkanalMapper.toResponseDto(aggregate);
  }

  @Post()
  @ApiOperation({ summary: 'Funkkanal anlegen' })
  @ApiWrappedCreatedResponse(FunkkanalResponseDto, { description: 'Funkkanal erstellt' })
  async create(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateFunkkanalDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<FunkkanalResponseDto> {
    const command = unwrapOrThrow(
      CreateFunkkanalCommand.create({
        einsatzId,
        name: dto.name,
        details: dto.details as CreateFunkkanalCommandDetails,
        zweck: dto.zweck,
        sortIndex: dto.sortIndex,
        userId: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.createHandler.execute(command));
    return FunkkanalMapper.toResponseDto(aggregate);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reihenfolge aller Kanäle ändern' })
  @ApiWrappedResponse(FunkkanalResponseDto, { isArray: true, description: 'Neue Reihenfolge nach Reorder' })
  @HttpCode(200)
  async reorder(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ReorderFunkkanaeleDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<FunkkanalResponseDto[]> {
    const command = unwrapOrThrow(
      ReorderFunkkanaeleCommand.create({
        einsatzId,
        ordering: dto.ordering.map((entry) => ({ kanalId: entry.id, sortIndex: entry.sortIndex })),
        userId: user.userId,
      }),
    );
    unwrapOrThrow(await this.reorderHandler.execute(command));

    const query = unwrapOrThrow(GetKanalplanQuery.create({ einsatzId, includeArchived: false }));
    const aggregates = unwrapOrThrow(await this.getKanalplanHandler.execute(query));
    return aggregates.map((a) => FunkkanalMapper.toResponseDto(a));
  }

  @Patch(':kanalId')
  @ApiOperation({ summary: 'Funkkanal-Stammdaten aktualisieren' })
  @ApiWrappedResponse(FunkkanalResponseDto, { description: 'Aktualisierter Funkkanal' })
  async update(
    @Param('einsatzId') _einsatzId: string,
    @Param('kanalId') kanalId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateFunkkanalDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<FunkkanalResponseDto> {
    const userId = user.userId;

    if (dto.name !== undefined) {
      const cmd = unwrapOrThrow(RenameFunkkanalCommand.create({ kanalId, name: dto.name, userId }));
      unwrapOrThrow(await this.renameHandler.execute(cmd));
    }

    if (dto.details !== undefined) {
      const cmd = unwrapOrThrow(ChangeFunkkanalDetailsCommand.create({ kanalId, details: dto.details as ChangeFunkkanalDetailsInput, userId }));
      unwrapOrThrow(await this.changeDetailsHandler.execute(cmd));
    }

    if (dto.zweck !== undefined) {
      const cmd = unwrapOrThrow(SetFunkkanalZweckCommand.create({ kanalId, zweck: dto.zweck, userId }));
      unwrapOrThrow(await this.setZweckHandler.execute(cmd));
    }

    if (dto.sortIndex !== undefined) {
      const cmd = unwrapOrThrow(SetFunkkanalSortIndexCommand.create({ kanalId, sortIndex: dto.sortIndex, userId }));
      unwrapOrThrow(await this.setSortIndexHandler.execute(cmd));
    }

    if (dto.status === 'aktiv') {
      const cmd = unwrapOrThrow(ActivateFunkkanalCommand.create({ kanalId, userId }));
      unwrapOrThrow(await this.activateHandler.execute(cmd));
    } else if (dto.status === 'inaktiv') {
      const cmd = unwrapOrThrow(DeactivateFunkkanalCommand.create({ kanalId, userId }));
      unwrapOrThrow(await this.deactivateHandler.execute(cmd));
    }

    const query = unwrapOrThrow(GetFunkkanalByIdQuery.create({ kanalId }));
    const aggregate = unwrapOrThrow(await this.getByIdHandler.execute(query));
    if (!aggregate) {
      throw toHttpError(`Funkkanal ${kanalId} nicht gefunden`);
    }
    return FunkkanalMapper.toResponseDto(aggregate);
  }

  @Delete(':kanalId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Funkkanal archivieren (soft-delete)' })
  @ApiNoContentResponse({ description: 'Funkkanal archiviert' })
  async archive(@Param('einsatzId') _einsatzId: string, @Param('kanalId') kanalId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const command = unwrapOrThrow(ArchiveFunkkanalCommand.create({ kanalId, userId: user.userId }));
    unwrapOrThrow(await this.archiveHandler.execute(command));
  }
}
