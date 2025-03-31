import { logger } from '@/logger/consola.logger';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { CreateEtbDto } from './dto/create-etb.dto';
import { FilterEtbDto } from './dto/filter-etb.dto';
import { UpdateEtbDto } from './dto/update-etb.dto';
import { EtbAttachment } from './entities/etb-attachment.entity';
import { EtbEntry } from './entities/etb-entry.entity';
import { EtbService } from './etb.service';

// Erweiterte Request-Definition mit Benutzerinformationen
interface RequestWithUser extends Request {
    user?: {
        id: string;
        name: string;
        role: string;
    };
}

/**
 * Controller für das Einsatztagebuch (ETB).
 * Stellt Endpoints zum Erstellen, Abrufen, Aktualisieren und Abschließen von ETB-Einträgen bereit.
 */
@ApiTags('Einsatztagebuch')
@ApiBearerAuth()
@Controller('etb')
export class EtbController {
    /**
     * Konstruktor für den EtbController
     * 
     * @param etbService Service für ETB-Operationen
     */
    constructor(
        private readonly etbService: EtbService,
    ) { }

    /**
     * Erstellt einen neuen ETB-Eintrag
     * 
     * @param createEtbDto DTO mit den Daten für den neuen Eintrag
     * @param req Express Request Objekt für Benutzerinformationen
     * @returns Der erstellte ETB-Eintrag
     */
    @Post()
    @ApiOperation({ summary: 'Erstellt einen neuen ETB-Eintrag' })
    @ApiResponse({ status: 201, description: 'ETB-Eintrag wurde erstellt', type: EtbEntry })
    @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
    async create(@Body() createEtbDto: CreateEtbDto, @Req() req: RequestWithUser): Promise<EtbEntry> {
        // Hier würden normalerweise Benutzerinformationen aus dem Token extrahiert
        // Für dieses Beispiel verwenden wir Mock-Daten
        const userId = req.user?.id || 'mock-user-id';
        const userName = req.user?.name || 'Mock User';
        const userRole = req.user?.role || 'Einsatzleiter';

        logger.info(`HTTP POST /etb - Erstelle neuen ETB-Eintrag`);
        return this.etbService.createEintrag(createEtbDto, userId, userName, userRole);
    }

    /**
     * Findet alle ETB-Einträge mit optionaler Filterung
     * 
     * @param filterDto Filter für die Abfrage
     * @returns Eine Liste von ETB-Einträgen und die Gesamtzahl
     */
    @Get()
    @ApiOperation({ summary: 'Findet alle ETB-Einträge mit optionaler Filterung' })
    @ApiResponse({ status: 200, description: 'Liste von ETB-Einträgen', type: [EtbEntry] })
    async findAll(@Query() filterDto: FilterEtbDto): Promise<{ entries: EtbEntry[]; total: number }> {
        logger.info(`HTTP GET /etb - Abruf von ETB-Einträgen mit Filtern`);
        const [entries, total] = await this.etbService.findAll(filterDto);
        return { entries, total };
    }

    /**
     * Findet einen ETB-Eintrag anhand seiner ID
     * 
     * @param id ID des zu findenden ETB-Eintrags
     * @returns Der gefundene ETB-Eintrag
     */
    @Get(':id')
    @ApiOperation({ summary: 'Findet einen ETB-Eintrag anhand seiner ID' })
    @ApiResponse({ status: 200, description: 'ETB-Eintrag gefunden', type: EtbEntry })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EtbEntry> {
        logger.info(`HTTP GET /etb/${id} - Abruf eines spezifischen ETB-Eintrags`);
        return this.etbService.findOne(id);
    }

    /**
     * Aktualisiert einen ETB-Eintrag
     * 
     * @param id ID des zu aktualisierenden ETB-Eintrags
     * @param updateEtbDto Daten für die Aktualisierung
     * @returns Der aktualisierte ETB-Eintrag
     */
    @Patch(':id')
    @ApiOperation({ summary: 'Aktualisiert einen ETB-Eintrag' })
    @ApiResponse({ status: 200, description: 'ETB-Eintrag aktualisiert', type: EtbEntry })
    @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten oder Eintrag bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateEtbDto: UpdateEtbDto,
    ): Promise<EtbEntry> {
        logger.info(`HTTP PATCH /etb/${id} - Aktualisiere ETB-Eintrag`);
        return this.etbService.updateEintrag(id, updateEtbDto);
    }

    /**
     * Schließt einen ETB-Eintrag ab
     * 
     * @param id ID des abzuschließenden ETB-Eintrags
     * @param req Express Request Objekt für Benutzerinformationen
     * @returns Der abgeschlossene ETB-Eintrag
     */
    @Patch(':id/schliessen')
    @ApiOperation({ summary: 'Schließt einen ETB-Eintrag ab' })
    @ApiResponse({ status: 200, description: 'ETB-Eintrag abgeschlossen', type: EtbEntry })
    @ApiResponse({ status: 400, description: 'Eintrag bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    async closeEntry(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: RequestWithUser,
    ): Promise<EtbEntry> {
        const userId = req.user?.id || 'mock-user-id';

        logger.info(`HTTP PATCH /etb/${id}/schliessen - Schließe ETB-Eintrag ab`);
        return this.etbService.closeEintrag(id, userId);
    }

    /**
     * Fügt eine Anlage zu einem ETB-Eintrag hinzu
     * 
     * @param id ID des ETB-Eintrags
     * @param file Die hochgeladene Datei
     * @param beschreibung Optionale Beschreibung der Anlage
     * @returns Die erstellte ETB-Anlage
     */
    @Post(':id/anlage')
    @ApiOperation({ summary: 'Fügt eine Anlage zu einem ETB-Eintrag hinzu' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Datei und optionale Beschreibung',
        type: AddAttachmentDto,
    })
    @ApiResponse({ status: 201, description: 'Anlage hinzugefügt', type: EtbAttachment })
    @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten oder Eintrag bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    @UseInterceptors(FileInterceptor('file'))
    async addAttachment(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: any,
        @Body('beschreibung') beschreibung?: string,
    ): Promise<EtbAttachment> {
        if (!file) {
            logger.error(`Keine Datei gefunden beim Anlegen einer Anlage für ETB-Eintrag ${id}`);
            throw new BadRequestException('Keine Datei gefunden');
        }

        logger.info(`HTTP POST /etb/${id}/anlage - Füge Anlage zu ETB-Eintrag hinzu`);
        return this.etbService.addAttachment(id, file, beschreibung);
    }

    /**
     * Findet alle Anlagen zu einem ETB-Eintrag
     * 
     * @param id ID des ETB-Eintrags
     * @returns Eine Liste von ETB-Anlagen
     */
    @Get(':id/anlagen')
    @ApiOperation({ summary: 'Findet alle Anlagen zu einem ETB-Eintrag' })
    @ApiResponse({ status: 200, description: 'Liste von Anlagen', type: [EtbAttachment] })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    async findAttachments(@Param('id', ParseUUIDPipe) id: string): Promise<EtbAttachment[]> {
        // Prüfe, ob der ETB-Eintrag existiert
        await this.etbService.findOne(id);

        logger.info(`HTTP GET /etb/${id}/anlagen - Abruf aller Anlagen zu ETB-Eintrag`);
        return this.etbService.findAttachmentsByEtbEntryId(id);
    }

    /**
     * Findet eine Anlage anhand ihrer ID
     * 
     * @param id ID der zu findenden Anlage
     * @returns Die gefundene ETB-Anlage
     */
    @Get('anlage/:id')
    @ApiOperation({ summary: 'Findet eine Anlage anhand ihrer ID' })
    @ApiResponse({ status: 200, description: 'Anlage gefunden', type: EtbAttachment })
    @ApiResponse({ status: 404, description: 'Anlage nicht gefunden' })
    async findAttachment(@Param('id', ParseUUIDPipe) id: string): Promise<EtbAttachment> {
        logger.info(`HTTP GET /etb/anlage/${id} - Abruf einer spezifischen Anlage`);
        return this.etbService.findAttachmentById(id);
    }
} 