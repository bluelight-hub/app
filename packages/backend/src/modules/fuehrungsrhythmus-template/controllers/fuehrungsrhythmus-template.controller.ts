import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { CreateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { GetAllFuehrungsrhythmusTemplatesHandler } from '@/application/fuehrungsrhythmus-template/queries/get-all-fuehrungsrhythmus-templates/get-all-fuehrungsrhythmus-templates.handler';
import { CreateFuehrungsrhythmusTemplateDto } from '@/application/fuehrungsrhythmus-template/dto/create-fuehrungsrhythmus-template.dto';
import { FuehrungsrhythmusTemplateResponseDto } from '@/application/fuehrungsrhythmus-template/dto/fuehrungsrhythmus-template-response.dto';
import { CreateFuehrungsrhythmusTemplateCommand } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.command';

/**
 * Controller fuer Fuehrungsrhythmus-Templates (Story 6.6).
 * Eigenes Modul, NICHT in ErinnerungModule oder ErinnerungsvorlageModule einhaengen.
 */
@ApiTags('Fuehrungsrhythmus-Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungueltig' })
@Controller({ path: 'fuehrungsrhythmus-templates', version: 'alpha' })
export class FuehrungsrhythmusTemplateController {
  constructor(
    private readonly createHandler: CreateFuehrungsrhythmusTemplateHandler,
    private readonly getAllHandler: GetAllFuehrungsrhythmusTemplatesHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Fuehrungsrhythmus-Templates abrufen' })
  @ApiWrappedResponse(FuehrungsrhythmusTemplateResponseDto, { isArray: true, description: 'Alle Fuehrungsrhythmus-Templates' })
  async getAll() {
    return this.getAllHandler.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Neues Fuehrungsrhythmus-Template erstellen' })
  @ApiWrappedCreatedResponse(FuehrungsrhythmusTemplateResponseDto, { description: 'Template erstellt' })
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
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new Error(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    return this.createHandler.execute(commandResult.value);
  }
}
