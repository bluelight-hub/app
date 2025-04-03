import { logger } from '@/logger/consola.logger';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateEtbDto } from './dto/create-etb.dto';
import { FilterEtbDto } from './dto/filter-etb.dto';
import { UeberschreibeEtbDto } from './dto/ueberschreibe-etb.dto';
import { UpdateEtbDto } from './dto/update-etb.dto';
import { EtbAttachment } from './entities/etb-attachment.entity';
import { EtbEntry, EtbEntryStatus } from './entities/etb-entry.entity';

// Multer-Typ für Dateien
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination?: string;
    filename?: string;
    path?: string;
    buffer: Buffer;
}

/**
 * Service für die Verwaltung von Einsatztagebuch-Einträgen.
 */
@Injectable()
export class EtbService {
    /**
     * Konstruktor für den EtbService
     * 
     * @param etbRepository Repository für ETB-Einträge
     * @param attachmentRepository Repository für ETB-Anlagen
     */
    constructor(
        @InjectRepository(EtbEntry)
        private etbRepository: Repository<EtbEntry>,
        @InjectRepository(EtbAttachment)
        private attachmentRepository: Repository<EtbAttachment>,
    ) { }

    /**
     * Generiert die nächste verfügbare laufende Nummer für ETB-Einträge
     * 
     * @returns Die nächste verfügbare laufende Nummer
     */
    private async getNextLaufendeNummer(): Promise<number> {
        const result = await this.etbRepository
            .createQueryBuilder('etbEntry')
            .select('MAX(etbEntry.laufendeNummer)', 'maxNumber')
            .getRawOne();

        return (result.maxNumber || 0) + 1;
    }

    /**
     * Erstellt einen neuen ETB-Eintrag
     * 
     * @param createEtbDto DTO mit den Daten für den neuen Eintrag
     * @param userId ID des Benutzers, der den Eintrag erstellt
     * @param userName Name des Benutzers, der den Eintrag erstellt
     * @param userRole Rolle des Benutzers, der den Eintrag erstellt
     * @returns Der erstellte ETB-Eintrag
     */
    async createEintrag(
        createEtbDto: CreateEtbDto,
        userId: string,
        userName?: string,
        userRole?: string,
    ): Promise<EtbEntry> {
        logger.info(`ETB-Eintrag wird erstellt von Benutzer ${userId}`);

        const etbEntry = this.etbRepository.create({
            ...createEtbDto,
            timestampErstellung: new Date(),
            timestampEreignis: new Date(createEtbDto.timestampEreignis),
            autorId: userId,
            autorName: userName,
            autorRolle: userRole,
            version: 1,
            istAbgeschlossen: false,
            laufendeNummer: await this.getNextLaufendeNummer(),
        });

        return this.etbRepository.save(etbEntry);
    }

    /**
     * Erstellt einen automatischen ETB-Eintrag
     * 
     * @param data Daten für den automatischen Eintrag
     * @param systemQuelle Quelle des automatischen Eintrags
     * @returns Der erstellte ETB-Eintrag
     */
    async createAutomaticEintrag(
        data: {
            timestampEreignis: Date;
            kategorie: string;
            titel?: string;
            beschreibung: string;
            referenzEinsatzId?: string;
            referenzPatientId?: string;
            referenzEinsatzmittelId?: string;
        },
        systemQuelle: string,
    ): Promise<EtbEntry> {
        logger.info(`Automatischer ETB-Eintrag wird erstellt durch ${systemQuelle}`);

        const etbEntry = this.etbRepository.create({
            ...data,
            timestampErstellung: new Date(),
            autorId: 'system',
            autorName: 'System',
            autorRolle: 'Automatisierung',
            systemQuelle,
            version: 1,
            istAbgeschlossen: false,
            laufendeNummer: await this.getNextLaufendeNummer(),
        });

        return this.etbRepository.save(etbEntry);
    }

    /**
     * Findet alle ETB-Einträge mit optionaler Filterung
     * 
     * @param filterDto Filter für die Abfrage
     * @returns Eine Liste von ETB-Einträgen
     */
    async findAll(filterDto: FilterEtbDto): Promise<[EtbEntry[], number]> {
        const {
            referenzEinsatzId,
            referenzPatientId,
            referenzEinsatzmittelId,
            kategorie,
            vonZeitstempel,
            bisZeitstempel,
            autorId,
            includeUeberschrieben,
            page = 1,
            limit = 10
        } = filterDto;

        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<EtbEntry> = {};

        if (referenzEinsatzId) {
            where.referenzEinsatzId = referenzEinsatzId;
        }

        if (referenzPatientId) {
            where.referenzPatientId = referenzPatientId;
        }

        if (referenzEinsatzmittelId) {
            where.referenzEinsatzmittelId = referenzEinsatzmittelId;
        }

        if (kategorie) {
            where.kategorie = kategorie;
        }

        if (autorId) {
            where.autorId = autorId;
        }

        // Vereinfachte Filter-Logik: 
        // Nur den includeUeberschrieben-Parameter berücksichtigen
        if (!includeUeberschrieben) {
            // Standardmäßig nur aktive Einträge anzeigen
            where.status = EtbEntryStatus.AKTIV;
        }

        if (vonZeitstempel && bisZeitstempel) {
            where.timestampEreignis = Between(
                new Date(vonZeitstempel),
                new Date(bisZeitstempel),
            );
        } else if (vonZeitstempel) {
            where.timestampEreignis = MoreThanOrEqual(new Date(vonZeitstempel));
        } else if (bisZeitstempel) {
            where.timestampEreignis = LessThanOrEqual(new Date(bisZeitstempel));
        }

        logger.info(`Suche ETB-Einträge mit Filtern: ${JSON.stringify(filterDto)}`);

        return this.etbRepository.findAndCount({
            where,
            order: { timestampEreignis: 'DESC' },
            skip,
            take: limit,
            relations: ['anlagen', 'ueberschriebenDurch', 'ueberschriebeneEintraege'],
        });
    }

    /**
     * Findet einen ETB-Eintrag anhand seiner ID
     * 
     * @param id ID des zu findenden ETB-Eintrags
     * @returns Der gefundene ETB-Eintrag
     * @throws NotFoundException wenn der Eintrag nicht gefunden wurde
     */
    async findOne(id: string): Promise<EtbEntry> {
        const etbEntry = await this.etbRepository.findOne({
            where: { id },
            relations: ['anlagen'],
        });

        if (!etbEntry) {
            logger.error(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`);
            throw new NotFoundException(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`);
        }

        return etbEntry;
    }

    /**
     * Aktualisiert einen ETB-Eintrag
     * 
     * @param id ID des zu aktualisierenden ETB-Eintrags
     * @param updateEtbDto Daten für die Aktualisierung
     * @returns Der aktualisierte ETB-Eintrag
     * @throws NotFoundException wenn der Eintrag nicht gefunden wurde
     * @throws BadRequestException wenn der Eintrag bereits abgeschlossen ist
     */
    async updateEintrag(id: string, updateEtbDto: UpdateEtbDto): Promise<EtbEntry> {
        const etbEntry = await this.findOne(id);

        if (etbEntry.istAbgeschlossen) {
            logger.error(`ETB-Eintrag mit ID ${id} kann nicht aktualisiert werden, da er bereits abgeschlossen ist`);
            throw new BadRequestException(`ETB-Eintrag kann nicht aktualisiert werden, da er bereits abgeschlossen ist`);
        }

        // Erstelle ein neues Objekt mit aktualisierten Werten
        const updatedEntry = {
            ...etbEntry,
            ...updateEtbDto,
            version: etbEntry.version + 1,
        };

        // Konvertiere timestampEreignis zu Date, falls es angegeben wurde
        if (updateEtbDto.timestampEreignis) {
            updatedEntry.timestampEreignis = new Date(updateEtbDto.timestampEreignis);
        }

        logger.info(`ETB-Eintrag mit ID ${id} wird aktualisiert, neue Version: ${updatedEntry.version}`);

        // Speichere die Aktualisierung
        return this.etbRepository.save(updatedEntry);
    }

    /**
     * Schließt einen ETB-Eintrag ab, sodass er nicht mehr bearbeitet werden kann
     * 
     * @param id ID des abzuschließenden ETB-Eintrags
     * @param userId ID des Benutzers, der den Eintrag abschließt
     * @returns Der abgeschlossene ETB-Eintrag
     * @throws NotFoundException wenn der Eintrag nicht gefunden wurde
     * @throws BadRequestException wenn der Eintrag bereits abgeschlossen ist
     */
    async closeEintrag(id: string, userId: string): Promise<EtbEntry> {
        const etbEntry = await this.findOne(id);

        if (etbEntry.istAbgeschlossen) {
            logger.error(`ETB-Eintrag mit ID ${id} ist bereits abgeschlossen`);
            throw new BadRequestException(`ETB-Eintrag ist bereits abgeschlossen`);
        }

        etbEntry.istAbgeschlossen = true;
        etbEntry.timestampAbschluss = new Date();
        etbEntry.abgeschlossenVon = userId;

        logger.info(`ETB-Eintrag mit ID ${id} wird abgeschlossen von Benutzer ${userId}`);

        return this.etbRepository.save(etbEntry);
    }

    /**
     * Fügt eine Anlage zu einem ETB-Eintrag hinzu
     * 
     * @param etbEntryId ID des ETB-Eintrags
     * @param file Die hochgeladene Datei
     * @param beschreibung Optionale Beschreibung der Anlage
     * @returns Die erstellte ETB-Anlage
     * @throws NotFoundException wenn der ETB-Eintrag nicht gefunden wurde
     * @throws BadRequestException wenn der ETB-Eintrag bereits abgeschlossen ist
     */
    async addAttachment(
        etbEntryId: string,
        file: MulterFile,
        beschreibung?: string,
    ): Promise<EtbAttachment> {
        const etbEntry = await this.findOne(etbEntryId);

        if (etbEntry.istAbgeschlossen) {
            logger.error(`Anlage kann nicht hinzugefügt werden, da der ETB-Eintrag mit ID ${etbEntryId} bereits abgeschlossen ist`);
            throw new BadRequestException(`Anlage kann nicht hinzugefügt werden, da der ETB-Eintrag bereits abgeschlossen ist`);
        }

        // Erstelle den Upload-Ordner, falls er nicht existiert
        const uploadDir = path.join(process.cwd(), 'uploads', 'etb-attachments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // TODO: Dateien sollten nicht direkt hochgeladen werden, stattdessen über minio - und nur vielleicht.
        //      -> ist eher ein Beispiel, als eine vernünftige Implementierung. || BLH-108
        // Sanitize den Dateinamen, um Path Traversal Angriffe zu verhindern
        const sanitizedFilename = sanitize(file.originalname);

        // Generiere einen eindeutigen Dateinamen
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${sanitizedFilename}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Speichere die Datei
        fs.writeFileSync(filePath, file.buffer);

        logger.info(`Anlage wird hinzugefügt zu ETB-Eintrag mit ID ${etbEntryId}`);

        // Erstelle den Datenbankeintrag für die Anlage
        const attachment = this.attachmentRepository.create({
            etbEntryId,
            dateiname: sanitizedFilename,
            dateityp: file.mimetype,
            speicherOrt: `uploads/etb-attachments/${uniqueFilename}`,
            beschreibung,
        });

        return this.attachmentRepository.save(attachment);
    }

    /**
     * Findet alle Anlagen zu einem ETB-Eintrag
     * 
     * @param etbEntryId ID des ETB-Eintrags
     * @returns Eine Liste von ETB-Anlagen
     */
    async findAttachmentsByEtbEntryId(etbEntryId: string): Promise<EtbAttachment[]> {
        return this.attachmentRepository.find({
            where: { etbEntryId },
        });
    }

    /**
     * Findet eine Anlage anhand ihrer ID
     * 
     * @param id ID der zu findenden Anlage
     * @returns Die gefundene ETB-Anlage
     * @throws NotFoundException wenn die Anlage nicht gefunden wurde
     */
    async findAttachmentById(id: string): Promise<EtbAttachment> {
        const attachment = await this.attachmentRepository.findOne({
            where: { id },
        });

        if (!attachment) {
            logger.error(`Anlage mit ID ${id} wurde nicht gefunden`);
            throw new NotFoundException(`Anlage mit ID ${id} wurde nicht gefunden`);
        }

        return attachment;
    }

    /**
     * Überschreibt einen ETB-Eintrag
     * 
     * @param id ID des zu überschreibenden ETB-Eintrags
     * @param ueberschreibeEtbDto Daten für den neuen überschreibenden Eintrag
     * @param userId ID des Benutzers, der den Eintrag überschreibt
     * @param userName Name des Benutzers, der den Eintrag überschreibt
     * @param userRole Rolle des Benutzers, der den Eintrag überschreibt
     * @returns Der neu erstellte überschreibende ETB-Eintrag
     */
    async ueberschreibeEintrag(
        id: string,
        ueberschreibeEtbDto: UeberschreibeEtbDto,
        userId: string,
        userName?: string,
        userRole?: string,
    ): Promise<EtbEntry> {
        // Finde den zu überschreibenden Eintrag
        const originalEntry = await this.findOne(id);

        // Markiere den ursprünglichen Eintrag als überschrieben
        originalEntry.status = EtbEntryStatus.UEBERSCHRIEBEN;
        originalEntry.timestampUeberschrieben = new Date();
        originalEntry.ueberschriebenVon = userId;

        // Speichere den aktualisierten ursprünglichen Eintrag
        await this.etbRepository.save(originalEntry);

        // Erstelle einen neuen Eintrag mit den aktualisierten Daten
        const neuerEintrag = this.etbRepository.create({
            // Übernehme die Daten des ursprünglichen Eintrags
            timestampErstellung: new Date(),
            timestampEreignis: ueberschreibeEtbDto.timestampEreignis ? new Date(ueberschreibeEtbDto.timestampEreignis) : originalEntry.timestampEreignis,
            kategorie: ueberschreibeEtbDto.kategorie || originalEntry.kategorie,
            titel: ueberschreibeEtbDto.titel !== undefined ? ueberschreibeEtbDto.titel : originalEntry.titel,
            beschreibung: ueberschreibeEtbDto.beschreibung || originalEntry.beschreibung,
            referenzEinsatzId: ueberschreibeEtbDto.referenzEinsatzId || originalEntry.referenzEinsatzId,
            referenzPatientId: ueberschreibeEtbDto.referenzPatientId || originalEntry.referenzPatientId,
            referenzEinsatzmittelId: ueberschreibeEtbDto.referenzEinsatzmittelId || originalEntry.referenzEinsatzmittelId,

            // Neue Metadaten
            autorId: userId,
            autorName: userName,
            autorRolle: userRole,
            version: 1,
            status: EtbEntryStatus.AKTIV,
            istAbgeschlossen: false,
            laufendeNummer: await this.getNextLaufendeNummer(),

            // Beziehung zum ursprünglichen Eintrag
            ueberschriebeneEintraege: [originalEntry]
        });

        logger.info(`ETB-Eintrag mit ID ${id} wird überschrieben von Benutzer ${userId}`);

        // Speichere den neuen Eintrag
        return this.etbRepository.save(neuerEintrag);
    }
} 