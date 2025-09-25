import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { FilterPaginationDto } from '@/common/dto/pagination.dto';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEtbEintragDto } from './dto/create-etb-eintrag.dto';
import { CreateEtbDto } from './dto/create-etb.dto';
import { CreateEtbEintragResponse, CreateEtbResponse, GetEtbResponse, TextbausteinListResponse, UpdateEtbEintragResponse } from './dto/etb-response.dto';
import { UpdateEtbEintragDto } from './dto/update-etb-eintrag.dto';
import { EtbService } from './etb.service';

/**
 * Controller für die Verwaltung von Einsatztagebüchern (ETB)
 *
 * Dieser Controller stellt Endpunkte zur Verfügung für:
 * - Erstellung und Verwaltung von ETBs
 * - Verwaltung von ETB-Einträgen
 * - Abruf von Textbausteinen
 */
@ApiTags('ETB')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('etb')
export class EtbController {
  constructor(private readonly etbService: EtbService) {}

  /**
   * Erstellt ein neues ETB für einen Einsatz
   *
   * @param createEtbDto - DTO mit den Daten für das neue ETB
   * @param user - Der authentifizierte Benutzer
   * @returns Das erstellte ETB
   */
  @Post()
  @ApiOperation({ summary: 'Create new ETB for an Einsatz' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'ETB created successfully',
    type: CreateEtbResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'ETB already exists for this Einsatz' })
  async createEtb(@Body() createEtbDto: CreateEtbDto, @CurrentUser() user: ValidatedUser): Promise<CreateEtbResponse> {
    return this.etbService.createEtb(createEtbDto, user);
  }

  /**
   * Ruft ein ETB anhand der Einsatz-ID ab
   *
   * @param einsatzId - Die ID des Einsatzes
   * @param paginationQuery - Query-Parameter für Paginierung
   * @returns Das ETB mit paginierten Einträgen
   */
  @Get(':einsatzId')
  @ApiOperation({ summary: 'Get ETB by Einsatz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ETB found',
    type: GetEtbResponse,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'ETB not found' })
  async getEtbByEinsatzId(@Param('einsatzId') einsatzId: string, @Query() paginationQuery: FilterPaginationDto): Promise<GetEtbResponse> {
    return this.etbService.getEtbByEinsatzId(einsatzId, paginationQuery.limit, paginationQuery.page);
  }

  /**
   * Erstellt einen neuen Eintrag in einem ETB
   *
   * @param etbId - Die ID des ETB
   * @param createEintragDto - DTO mit den Daten für den neuen Eintrag
   * @param user - Der authentifizierte Benutzer
   * @returns Der erstellte ETB-Eintrag
   */
  @Post(':id/eintraege')
  @ApiOperation({ summary: 'Create new ETB entry' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Entry created successfully',
    type: CreateEtbEintragResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'ETB not found' })
  async createEintrag(@Param('id') etbId: string, @Body() createEintragDto: CreateEtbEintragDto, @CurrentUser() user: ValidatedUser): Promise<CreateEtbEintragResponse> {
    return this.etbService.createEintrag(etbId, createEintragDto, user);
  }

  /**
   * Aktualisiert einen bestehenden ETB-Eintrag
   *
   * @param eintragId - Die ID des zu aktualisierenden Eintrags
   * @param updateEintragDto - DTO mit den aktualisierten Daten
   * @param user - Der authentifizierte Benutzer
   * @returns Der aktualisierte ETB-Eintrag
   */
  @Put('eintraege/:id')
  @ApiOperation({ summary: 'Update ETB entry' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entry updated successfully',
    type: UpdateEtbEintragResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async updateEintrag(@Param('id') eintragId: string, @Body() updateEintragDto: UpdateEtbEintragDto, @CurrentUser() user: ValidatedUser): Promise<UpdateEtbEintragResponse> {
    return this.etbService.updateEintrag(eintragId, updateEintragDto, user);
  }

  /**
   * Soft-löscht einen ETB-Eintrag
   *
   * @param eintragId - Die ID des zu löschenden Eintrags
   * @param user - Der authentifizierte Benutzer
   */
  @Delete('eintraege/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete ETB entry' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Entry deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async deleteEintrag(@Param('id') eintragId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    await this.etbService.deleteEintrag(eintragId, user);
  }

  /**
   * Ruft alle verfügbaren Textbausteine ab
   *
   * @returns Liste aller aktiven Textbausteine
   */
  @Get('textbausteine')
  @ApiOperation({ summary: 'Get all text templates' })
  @ApiOkResponse({
    description: 'Text templates retrieved',
    type: TextbausteinListResponse,
  })
  async getTextbausteine(): Promise<TextbausteinListResponse> {
    return this.etbService.getTextbausteine();
  }
}
