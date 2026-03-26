import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
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
import { ActivateFuehrungsrhythmusTemplateResponseDto } from '@/application/fuehrungsrhythmus-template/dto';
import { UpdateFuehrungsrhythmusTemplateDto } from '@/application/fuehrungsrhythmus-template/dto/update-fuehrungsrhythmus-template.dto';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '@/application/fuehrungsrhythmus-template/errors/fuehrungsrhythmus-template-error.codes';

/**
 * Controller fuer Einsatz-spezifische Fuehrungsrhythmus-Templates.
 * Jeder authentifizierte User darf Einsatz-Templates verwalten.
 */
@ApiTags('Einsatz Fuehrungsrhythmus-Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungueltig' })
@Controller({ path: 'einsaetze/:einsatzId/fuehrungsrhythmus-templates', version: 'alpha' })
export class EinsatzFuehrungsrhythmusTemplateController {
  constructor(
    private readonly createHandler: CreateFuehrungsrhythmusTemplateHandler,
    private readonly getAllHandler: GetAllFuehrungsrhythmusTemplatesHandler,
    private readonly activateHandler: ActivateFuehrungsrhythmusTemplateHandler,
    private readonly updateHandler: UpdateFuehrungsrhythmusTemplateHandler,
    private readonly deleteHandler: DeleteFuehrungsrhythmusTemplateHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Fuehrungsrhythmus-Templates eines Einsatzes abrufen' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { isArray: true, description: 'Einsatz-spezifische Fuehrungsrhythmus-Templates' })
  async getAll(@Param('einsatzId') einsatzId: string) {
    return this.getAllHandler.execute({ einsatzId, includeGlobal: true });
  }

  @Post()
  @ApiOperation({ summary: 'Neues Fuehrungsrhythmus-Template fuer einen Einsatz erstellen' })
  @ApiWrappedCreatedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Einsatz-Template erstellt' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateFuehrungsrhythmusTemplateDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = CreateFuehrungsrhythmusTemplateCommand.create({
      name: dto.name,
      beschreibung: dto.beschreibung,
      eintraege: dto.eintraege.map((e) => ({
        titel: e.titel,
        intervallMinuten: e.intervallMinuten,
        offsetMinuten: e.offsetMinuten,
      })),
      createdBy: user.userId,
      scope: 'EINSATZ',
      einsatzId,
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
  @ApiOperation({ summary: 'Einsatz-Fuehrungsrhythmus-Template aktualisieren' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Einsatz-Template aktualisiert' })
  async update(@Param('einsatzId') _einsatzId: string, @Param('id') id: string, @Body() dto: UpdateFuehrungsrhythmusTemplateDto, @CurrentUser() user: ValidatedUser) {
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
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Einsatz-Fuehrungsrhythmus-Template loeschen (Soft-Delete)' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Einsatz-Template gelöscht (Soft-Delete)' })
  async remove(@Param('einsatzId') _einsatzId: string, @Param('id') id: string, @CurrentUser() user: ValidatedUser) {
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
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Einsatz-Fuehrungsrhythmus-Template aktivieren' })
  @ApiWrappedCreatedResponse(ActivateFuehrungsrhythmusTemplateResponseDto, {
    description: 'Einsatz-Template aktiviert - alle Erinnerungen erstellt',
  })
  async activate(@Param('einsatzId') einsatzId: string, @Param('id') id: string, @CurrentUser() user: ValidatedUser) {
    const commandResult = ActivateFuehrungsrhythmusTemplateCommand.create({
      templateId: id,
      einsatzId,
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
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return result.value;
  }
}
