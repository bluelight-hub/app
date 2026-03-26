import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/generated/prisma/client';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.handler';
import { GetAllFuehrungsrhythmusTemplatesHandler } from '@/application/fuehrungsrhythmus-template/queries/get-all-fuehrungsrhythmus-templates/get-all-fuehrungsrhythmus-templates.handler';
import { ActivateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/activate-fuehrungsrhythmus-template/activate-fuehrungsrhythmus-template.handler';
import { UpdateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/update-fuehrungsrhythmus-template/update-fuehrungsrhythmus-template.handler';
import { DeleteFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/delete-fuehrungsrhythmus-template/delete-fuehrungsrhythmus-template.handler';
import { CreateFuehrungsrhythmusTemplateDto } from '@/application/fuehrungsrhythmus-template/dto/create-fuehrungsrhythmus-template.dto';
import { FuehrungsrhythmusTemplateResponseDto } from '@/application/fuehrungsrhythmus-template/dto/fuehrungsrhythmus-template-response.dto';
import { CreateFuehrungsrhythmusTemplateCommand } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.command';
import { UpdateFuehrungsrhythmusTemplateCommand } from '@/application/fuehrungsrhythmus-template/commands/update-fuehrungsrhythmus-template/update-fuehrungsrhythmus-template.command';
import { DeleteFuehrungsrhythmusTemplateCommand } from '@/application/fuehrungsrhythmus-template/commands/delete-fuehrungsrhythmus-template/delete-fuehrungsrhythmus-template.command';
import { ActivateFuehrungsrhythmusTemplateCommand } from '@/application/fuehrungsrhythmus-template/commands/activate-fuehrungsrhythmus-template/activate-fuehrungsrhythmus-template.command';
import { ActivateFuehrungsrhythmusTemplateDto, ActivateFuehrungsrhythmusTemplateResponseDto } from '@/application/fuehrungsrhythmus-template/dto';
import { UpdateFuehrungsrhythmusTemplateDto } from '@/application/fuehrungsrhythmus-template/dto/update-fuehrungsrhythmus-template.dto';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '@/application/fuehrungsrhythmus-template/errors/fuehrungsrhythmus-template-error.codes';

/**
 * Controller fuer Fuehrungsrhythmus-Templates (Story 6.6 + 6.7).
 * Eigenes Modul, NICHT in ErinnerungModule oder ErinnerungsvorlageModule einhaengen.
 */
@ApiTags('Fuehrungsrhythmus-Templates (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert oder nicht berechtigt' })
@Controller({ path: 'fuehrungsrhythmus-templates', version: 'alpha' })
export class FuehrungsrhythmusTemplateController {
  constructor(
    private readonly createHandler: CreateFuehrungsrhythmusTemplateHandler,
    private readonly getAllHandler: GetAllFuehrungsrhythmusTemplatesHandler,
    private readonly activateHandler: ActivateFuehrungsrhythmusTemplateHandler,
    private readonly updateHandler: UpdateFuehrungsrhythmusTemplateHandler,
    private readonly deleteHandler: DeleteFuehrungsrhythmusTemplateHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle globalen Fuehrungsrhythmus-Templates abrufen (Admin)' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { isArray: true, description: 'Alle globalen Fuehrungsrhythmus-Templates' })
  async getAll() {
    return this.getAllHandler.execute({ scope: FuehrungsrhythmusTemplateScope.GLOBAL });
  }

  @Post()
  @ApiOperation({ summary: 'Neues globales Fuehrungsrhythmus-Template erstellen (Admin)' })
  @ApiWrappedCreatedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Globales Template erstellt' })
  async create(@Body() dto: CreateFuehrungsrhythmusTemplateDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateFuehrungsrhythmusTemplateCommand.create({
      name: dto.name,
      beschreibung: dto.beschreibung,
      eintraege: dto.eintraege.map((e) => ({
        titel: e.titel,
        intervallMinuten: e.intervallMinuten,
        offsetMinuten: e.offsetMinuten,
      })),
      createdBy: user.userId,
      scope: 'GLOBAL',
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

  @Patch(':id')
  @ApiOperation({ summary: 'Fuehrungsrhythmus-Template aktualisieren' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Fuehrungsrhythmus-Template aktualisiert' })
  async update(@Param('id') id: string, @Body() dto: UpdateFuehrungsrhythmusTemplateDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
      templateId: id,
      name: dto.name,
      beschreibung: dto.beschreibung,
      eintraege: dto.eintraege.map((e) => ({
        titel: e.titel,
        intervallMinuten: e.intervallMinuten,
        offsetMinuten: e.offsetMinuten,
      })),
      aktualisiertVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Fuehrungsrhythmus-Template loeschen (Soft-Delete)' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Fuehrungsrhythmus-Template gelöscht (Soft-Delete)' })
  async remove(@Param('id') id: string, @CurrentUser() user: ValidatedUser) {
    const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
      templateId: id,
      geloeschtVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.deleteHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Fuehrungsrhythmus-Template aktivieren - erstellt alle wiederkehrenden Erinnerungen' })
  @ApiWrappedCreatedResponse(ActivateFuehrungsrhythmusTemplateResponseDto, {
    description: 'Fuehrungsrhythmus-Template aktiviert - alle Erinnerungen erstellt',
  })
  async activate(@Param('id') id: string, @Body() dto: ActivateFuehrungsrhythmusTemplateDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = ActivateFuehrungsrhythmusTemplateCommand.create({
      templateId: id,
      einsatzId: dto.einsatzId,
      aktiviertVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.activateHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED)) {
        throw new ConflictException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }
}
