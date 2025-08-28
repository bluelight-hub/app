import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { CreateEinsatzDto, EinsatzResponseDto, UpdateEinsatzDto } from '@/einsatz/dto';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EinsatzStatus } from '@prisma/client';
import { EinsatzService } from './einsatz.service';

@ApiTags('Einsatz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/einsatz')
export class EinsatzController {
  constructor(private readonly einsatzService: EinsatzService) {}

  @Post()
  @ApiOperation({
    summary: 'Neuen Einsatz erstellen',
    description: 'Erstellt einen neuen Einsatz mit automatisch generiertem Namen. Alle Felder sind optional.',
  })
  @ApiCreatedResponse({
    description: 'Einsatz erfolgreich erstellt',
    type: EinsatzResponseDto,
  })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createEinsatzDto: CreateEinsatzDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzResponseDto> {
    return this.einsatzService.create(createEinsatzDto, user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Alle Einsätze abrufen',
    description: 'Gibt eine Liste aller Einsätze zurück, optional gefiltert nach Status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EinsatzStatus,
    description: 'Filter nach Einsatz-Status',
  })
  @ApiQuery({
    name: 'includeCompleteness',
    required: false,
    type: Boolean,
    description: 'Vollständigkeits-Information einschließen',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Seitennummer für Pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Anzahl Einträge pro Seite',
  })
  @ApiOkResponse({
    description: 'Liste aller Einsätze',
    type: [EinsatzResponseDto],
  })
  async findAll(
    @Query('status') status?: EinsatzStatus,
    @Query('includeCompleteness') includeCompleteness?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<EinsatzResponseDto[]> {
    return this.einsatzService.findAll({
      status,
      includeCompleteness: includeCompleteness === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Einzelnen Einsatz abrufen',
    description: 'Gibt einen einzelnen Einsatz mit allen Details zurück.',
  })
  @ApiOkResponse({
    description: 'Einsatz gefunden',
    type: EinsatzResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  async findOne(@Param('id') id: string): Promise<EinsatzResponseDto> {
    return this.einsatzService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Einsatz aktualisieren',
    description: 'Aktualisiert einen bestehenden Einsatz. Der Name wird automatisch neu generiert.',
  })
  @ApiOkResponse({
    description: 'Einsatz erfolgreich aktualisiert',
    type: EinsatzResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateEinsatzDto: UpdateEinsatzDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzResponseDto> {
    return this.einsatzService.update(id, updateEinsatzDto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Einsatz löschen',
    description: 'Löscht einen Einsatz permanent aus dem System.',
  })
  @ApiNoContentResponse({
    description: 'Einsatz erfolgreich gelöscht',
  })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    return this.einsatzService.remove(id, user.userId);
  }

  @Get(':id/completeness')
  @ApiOperation({
    summary: 'Vollständigkeits-Check für Einsatz',
    description: 'Berechnet und gibt die Vollständigkeit eines Einsatzes zurück.',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Cache umgehen und neu berechnen',
  })
  @ApiOkResponse({
    description: 'Vollständigkeits-Information',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', example: 75 },
        isComplete: { type: 'boolean', example: false },
        missingFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              fieldPath: { type: 'string' },
              priority: { type: 'string', enum: ['critical', 'important', 'optional'] },
              message: { type: 'string' },
              suggestedAction: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  async getCompleteness(@Param('id') id: string, @Query('refresh') refresh?: string) {
    return this.einsatzService.getCompleteness(id, refresh === 'true');
  }
}
