import { PaginatedResponse } from '@/common/interfaces/paginated-response.interface';
import { logger } from '@/logger/consola.logger';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UploadedFile,
    UseInterceptors,
    UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { EinsatzExistsGuard } from '../einsatz/guards/einsatz-exists.guard';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { CreateEtbDto } from './dto/create-etb.dto';
import {
    EtbAttachmentResponse,
    EtbAttachmentsResponse,
    EtbEntriesResponse,
    EtbEntryDto
} from './dto/etb-entry-response.dto';
import { FilterEtbDto } from './dto/filter-etb.dto';
import { UeberschreibeEtbDto } from './dto/ueberschreibe-etb.dto';
import { UpdateEtbDto } from './dto/update-etb.dto';
import { EtbAttachment } from './entities/etb-attachment.entity';
import { EtbEntry } from './entities/etb-entry.entity';
import { EtbService } from './etb.service';

/**
 * Erweitert den Express Request um Benutzerinformationen.
 * Wird für Authentifizierung und Autorisierung in den Controller-Methoden verwendet.
 */
interface RequestWithUser extends Request {
    /**
     * Benutzerinformationen aus dem JWT-Token oder einer anderen Authentifizierungsquelle.
     * Enthält grundlegende Identifikations- und Rolleninformationen für Berechtigungsprüfungen.
     * Kann null sein, wenn der Benutzer nicht authentifiziert ist.
     */
    user?: {
        /**
         * Eindeutige ID des Benutzers
         */
        id: string;

        /**
         * Anzeigename des Benutzers
         */
        name: string;

        /**
         * Rolle oder Position des Benutzers im System (z.B. 'admin', 'einsatzleiter')
         */
        role: string;
    };
}

/**
 * Controller für das Einsatztagebuch (ETB).
 * Stellt Endpoints zum Erstellen, Abrufen, Aktualisieren und Abschließen von ETB-Einträgen bereit.
 */
@ApiTags('Einsatztagebuch')
@ApiBearerAuth()
@Controller('einsatz/:einsatzId/etb')
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
     * @param createEtbDto DTO mit den Daten für den neuen ETB-Eintrag
     * @param req Request-Objekt mit authentifizierten Benutzerinformationen
     * @returns Der erstellte ETB-Eintrag als Entity-Objekt
     * @throws BadRequestException Wenn die Eingabedaten ungültig sind
     */
    @Post()
    @ApiOperation({ summary: 'Erstellt einen neuen ETB-Eintrag' })
    @ApiResponse({
        status: 201,
        description: 'Der ETB-Eintrag wurde erstellt',
        type: EtbEntry
    })
    async create(
        @Body() createEtbDto: CreateEtbDto,
        @Req() req: RequestWithUser
    ): Promise<EtbEntry> {
        logger.info(`ETB-Controller: POST /etb mit DTO ${JSON.stringify(createEtbDto)}`);
        const userId = req.user?.id || 'mock-user-id';
        const userName = req.user?.name || 'Mock User';
        const userRole = req.user?.role || 'Einsatzleiter';

        const result = await this.etbService.createEintrag(createEtbDto, userId, userName, userRole);

        // Erweitere das Resultat mit leeren Arrays/Objekten, um den EtbEntry-Typ zu erfüllen

        return {
            ...result,
            ueberschriebenDurch: null,
            ueberschriebeneEintraege: [],
            anlagen: []
        } as EtbEntry;
    }

    /**
     * Findet alle ETB-Einträge mit optionaler Filterung
     * 
     * @param filterDto Filter für die Abfrage
     * @returns Eine paginierte Liste von ETB-Einträgen
     */
    @Get()
    @ApiOperation({ summary: 'Findet alle ETB-Einträge mit optionaler Filterung' })
    @ApiOkResponse({
        description: 'Liste von ETB-Einträgen',
        type: EtbEntriesResponse
    })
    @ApiResponse({ status: 400, description: 'Ungültige Filterparameter' })
    @ApiResponse({ status: 401, description: 'Nicht autorisiert' })
    @ApiResponse({ status: 403, description: 'Keine Berechtigung' })
    @ApiResponse({ status: 500, description: 'Interner Serverfehler' })
    @ApiResponse({ status: 200, description: 'Gefilterte Liste von ETB-Einträgen', type: EtbEntriesResponse })
    @ApiResponse({ status: 200, description: 'Filter: kategorie', schema: { type: 'string' } })
    @ApiResponse({ status: 200, description: 'Filter: autorId', schema: { type: 'string' } })
    @ApiResponse({ status: 200, description: 'Filter: vonZeitstempel', schema: { type: 'string', format: 'date-time' } })
    @ApiResponse({ status: 200, description: 'Filter: bisZeitstempel', schema: { type: 'string', format: 'date-time' } })
    @ApiResponse({ status: 200, description: 'Filter: search', schema: { type: 'string' } })
    async findAll(
        @Query() filterDto: FilterEtbDto
    ): Promise<PaginatedResponse<EtbEntryDto>> {
        logger.info(`HTTP GET /etb - Abruf von ETB-Einträgen mit Filtern`);
        const paginatedResult = await this.etbService.findAll(filterDto);

        // Mapping von EtbEntry zu EtbEntryDto
        const mappedEntries = plainToInstance(EtbEntryDto, paginatedResult.items);

        // Standard PaginatedResponse zurückgeben
        return {
            items: mappedEntries,
            pagination: paginatedResult.pagination
        };
    }

    /**
     * Findet einen ETB-Eintrag anhand seiner ID
     * 
     * @param id Eindeutige ID des ETB-Eintrags
     * @returns Der gefundene ETB-Eintrag als Entity-Objekt
     * @throws NotFoundException Wenn der ETB-Eintrag mit der angegebenen ID nicht gefunden wurde
     */
    @Get(':id')
    @ApiOperation({ summary: 'Findet einen ETB-Eintrag anhand seiner ID' })
    @ApiParam({ name: 'id', description: 'ID des ETB-Eintrags' })
    @ApiResponse({
        status: 200,
        description: 'Der ETB-Eintrag wurde gefunden',
        type: EtbEntry
    })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag wurde nicht gefunden' })
    async findOne(
        @Param('id') id: string
    ): Promise<EtbEntry> {
        logger.info(`HTTP GET /etb/${id} - Finde ETB-Eintrag mit ID ${id}`);

        const result = await this.etbService.findOne(id);

        // Erweitere das Resultat, falls nötig, um den EtbEntry-Typ zu erfüllen
        return {
            ...result,
            ueberschriebenDurch: null,
            ueberschriebeneEintraege: [],
            anlagen: []
        } as EtbEntry;
    }

    /**
     * Aktualisiert einen ETB-Eintrag
     * 
     * @param id Eindeutige ID des zu aktualisierenden ETB-Eintrags
     * @param updateEtbDto DTO mit den zu aktualisierenden Daten
     * @returns Der aktualisierte ETB-Eintrag als Entity-Objekt
     * @throws NotFoundException Wenn der ETB-Eintrag mit der angegebenen ID nicht gefunden wurde
     * @throws BadRequestException Wenn der Eintrag bereits abgeschlossen ist oder die Eingabedaten ungültig sind
     */
    @Put(':id')
    @ApiOperation({ summary: 'Aktualisiert einen ETB-Eintrag' })
    @ApiParam({ name: 'id', description: 'ID des zu aktualisierenden ETB-Eintrags' })
    @ApiResponse({
        status: 200,
        description: 'Der ETB-Eintrag wurde aktualisiert',
        type: EtbEntry
    })
    @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten oder Eintrag bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag wurde nicht gefunden' })
    async update(
        @Param('id') id: string,
        @Body() updateEtbDto: UpdateEtbDto
    ): Promise<EtbEntry> {
        logger.info(`HTTP PUT /etb/${id} - Aktualisiere ETB-Eintrag`);

        const result = await this.etbService.updateEintrag(id, updateEtbDto);

        // Erweitere das Resultat, falls nötig, um den EtbEntry-Typ zu erfüllen
        return {
            ...result,
            ueberschriebenDurch: null,
            ueberschriebeneEintraege: [],
            anlagen: []
        } as EtbEntry;
    }

    /**
     * Schließt einen ETB-Eintrag ab
     */
    @Patch(':id/close')
    @ApiOperation({ summary: 'Schließt einen ETB-Eintrag ab' })
    @ApiParam({ name: 'id', description: 'ID des abzuschließenden ETB-Eintrags' })
    @ApiResponse({
        status: 200,
        description: 'Der ETB-Eintrag wurde abgeschlossen',
        type: EtbEntry
    })
    @ApiResponse({ status: 400, description: 'Eintrag ist bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag wurde nicht gefunden' })
    async closeEntry(
        @Param('id') id: string,
        @Req() req: RequestWithUser
    ): Promise<EtbEntry> {
        logger.info(`HTTP PATCH /etb/${id}/close - Schließe ETB-Eintrag ab`);
        const userId = req.user?.id || 'mock-user-id';

        const result = await this.etbService.closeEintrag(id, userId);

        // Erweitere das Resultat, falls nötig, um den EtbEntry-Typ zu erfüllen
        return {
            ...result,
            ueberschriebenDurch: null,
            ueberschriebeneEintraege: [],
            anlagen: []
        } as EtbEntry;
    }

    /**
     * Fügt eine Anlage zu einem ETB-Eintrag hinzu
     * 
     * @param id ID des ETB-Eintrags
     * @param file Die hochgeladene Datei
     * @param addAttachmentDto DTO mit Informationen zur Anlage
     * @returns Die erstellte ETB-Anlage
     */
    @Post(':id/anlage')
    @ApiOperation({ summary: 'Fügt eine Anlage zu einem ETB-Eintrag hinzu' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Datei und optionale Beschreibung',
        type: AddAttachmentDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Anlage hinzugefügt',
        type: EtbAttachmentResponse
    })
    @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten oder Eintrag bereits abgeschlossen' })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    @UseInterceptors(FileInterceptor('file'))
    async addAttachment(
        @Param('id') id: string,
        @UploadedFile() file: any,
        @Body() addAttachmentDto: AddAttachmentDto,
    ): Promise<EtbAttachment> {
        if (!file) {
            logger.error(
                `Keine Datei gefunden beim Anlegen einer Anlage für ETB-Eintrag ${id}`,
            );
            throw new BadRequestException('Keine Datei gefunden');
        }

        logger.info(`HTTP POST /etb/${id}/anlage - Füge Anlage zu ETB-Eintrag hinzu`);
        const created = await this.etbService.addAttachment(
            id,
            file,
            addAttachmentDto,
        );
        return EtbAttachment.fromPrisma(created);
    }

    /**
     * Findet alle Anlagen zu einem ETB-Eintrag
     * 
     * @param id ID des ETB-Eintrags
     * @returns Eine Liste von ETB-Anlagen
     */
    @Get(':id/anlagen')
    @ApiOperation({ summary: 'Findet alle Anlagen zu einem ETB-Eintrag' })
    @ApiOkResponse({
        description: 'Liste von Anlagen',
        type: EtbAttachmentsResponse
    })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag nicht gefunden' })
    async findAttachments(
        @Param('id') id: string
    ): Promise<EtbAttachment[]> {
        // Prüfe, ob der ETB-Eintrag existiert
        await this.etbService.findOne(id);

        logger.info(`HTTP GET /etb/${id}/anlagen - Abruf aller Anlagen zu ETB-Eintrag`);
        const anlagen = await this.etbService.findAttachmentsByEtbEntryId(id);
        return anlagen.map(anlage => EtbAttachment.fromPrisma(anlage));
    }

    /**
     * Findet eine Anlage anhand ihrer ID
     * 
     * @param id ID der zu findenden Anlage
     * @returns Die gefundene ETB-Anlage
     */
    @Get('anlage/:id')
    @ApiOperation({ summary: 'Findet eine Anlage anhand ihrer ID' })
    @ApiOkResponse({
        description: 'Anlage gefunden',
        type: EtbAttachmentResponse
    })
    @ApiResponse({ status: 404, description: 'Anlage nicht gefunden' })
    async findAttachment(
        @Param('id') id: string
    ): Promise<EtbAttachment> {
        logger.info(`HTTP GET /etb/anlage/${id} - Abruf einer spezifischen Anlage`);
        const anlage = await this.etbService.findAttachmentById(id);
        return EtbAttachment.fromPrisma(anlage);
    }

    /**
     * Überschreibt einen ETB-Eintrag mit einer neuen Version
     * 
     * @param id Eindeutige ID des zu überschreibenden ETB-Eintrags
     * @param ueberschreibeEtbDto DTO mit den Daten für den neuen überschreibenden Eintrag
     * @param req Request-Objekt mit authentifizierten Benutzerinformationen
     * @returns Der neu erstellte überschreibende ETB-Eintrag als Entity-Objekt
     * @throws NotFoundException Wenn der ETB-Eintrag mit der angegebenen ID nicht gefunden wurde
     * @throws BadRequestException Wenn die Eingabedaten ungültig sind
     */
    @Post(':id/ueberschreiben')
    @ApiOperation({ summary: 'Überschreibt einen ETB-Eintrag mit einer neuen Version' })
    @ApiParam({ name: 'id', description: 'ID des zu überschreibenden ETB-Eintrags' })
    @ApiResponse({
        status: 201,
        description: 'Der ETB-Eintrag wurde überschrieben',
        type: EtbEntry
    })
    @ApiResponse({ status: 404, description: 'ETB-Eintrag wurde nicht gefunden' })
    async ueberschreibeEintrag(
        @Param('id') id: string,
        @Body() ueberschreibeEtbDto: UeberschreibeEtbDto,
        @Req() req: RequestWithUser,
    ): Promise<EtbEntry> {
        logger.info(`HTTP POST /etb/${id}/ueberschreiben - Überschreibe ETB-Eintrag`);
        const userId = req.user?.id || 'mock-user-id';
        const userName = req.user?.name || 'Mock User';
        const userRole = req.user?.role || 'Einsatzleiter';

        const result = await this.etbService.ueberschreibeEintrag(id, ueberschreibeEtbDto, userId, userName, userRole);

        // Erweitere das Resultat, falls nötig, um den EtbEntry-Typ zu erfüllen
        return {
            ...result,
            ueberschriebenDurch: null,
            ueberschriebeneEintraege: [],
            anlagen: []
        } as EtbEntry;
    }
} 