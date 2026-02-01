import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CreateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.handler';
import { GetAllVorlagenHandler } from '@/application/erinnerungsvorlage/queries/get-all-vorlagen/get-all-vorlagen.handler';
import { CreateErinnerungsvorlageDto, ErinnerungsvorlageResponseDto } from '@/application/erinnerungsvorlage/dto';
import { CreateErinnerungsvorlageCommand } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.command';

/**
 * Controller für Erinnerungsvorlagen (Story 6.1).
 * Eigenes Modul, NICHT in ErinnerungModule einhängen.
 */
@ApiTags('Erinnerungsvorlagen')
@Controller({ path: 'erinnerungsvorlagen', version: 'alpha' })
export class ErinnerungsvorlageController {
  constructor(
    private readonly createHandler: CreateErinnerungsvorlageHandler,
    private readonly getAllHandler: GetAllVorlagenHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Erinnerungsvorlagen abrufen' })
  @ApiWrappedResponse(ErinnerungsvorlageResponseDto, { isArray: true, description: 'Liste aller Vorlagen' })
  async getAll() {
    return this.getAllHandler.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Neue Erinnerungsvorlage erstellen' })
  @ApiWrappedCreatedResponse(ErinnerungsvorlageResponseDto, { description: 'Vorlage erfolgreich erstellt' })
  async create(@Body() dto: CreateErinnerungsvorlageDto, @Req() req: Request) {
    // biome-ignore lint/suspicious/noExplicitAny: Express Request user property from auth middleware
    const userId = (req as any).user?.sub ?? (req as any).user?.id;

    const commandResult = CreateErinnerungsvorlageCommand.create({
      titel: dto.titel,
      minuten: dto.minuten,
      beschreibung: dto.beschreibung,
      createdBy: userId as string,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new Error(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    return this.createHandler.execute(commandResult.value);
  }
}
