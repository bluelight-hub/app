import { PaginatedResponse } from '@/common/interfaces/paginated-response.interface';
import { PaginationService } from '@/common/services/pagination.service';
import { logger } from '@/logger/consola.logger';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import { EtbEntryStatus, EtbKategorie } from '../../../prisma/generated/prisma/enums';
import { CreateEtbDto } from './dto/create-etb.dto';
import { FilterEtbDto } from './dto/filter-etb.dto';
import { UeberschreibeEtbDto } from './dto/ueberschreibe-etb.dto';
import { UpdateEtbDto } from './dto/update-etb.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';

// Import der generierten Prisma-Typen für ETB-Einträge und Anlagen
import type { EtbAttachment, EtbEntry } from '../../../prisma/generated/prisma/client';

/**
 * Interface für Multer-Dateien.
 * Definiert die Struktur von hochgeladenen Dateien, die über Multer verarbeitet werden.
 * Wird verwendet, um Dateien als Anlagen zu ETB-Einträgen zu verarbeiten.
 */
interface MulterFile {
  /**
   * Name des Formularfelds, durch das die Datei hochgeladen wurde
   */
  fieldname: string;

  /**
   * Originaler Dateiname, wie er vom Client hochgeladen wurde
   */
  originalname: string;

  /**
   * Encoding-Typ der Datei
   */
  encoding: string;

  /**
   * MIME-Typ der Datei (z.B. 'image/jpeg', 'application/pdf')
   */
  mimetype: string;

  /**
   * Größe der Datei in Bytes
   */
  size: number;

  /**
   * Optionaler Pfad zum Verzeichnis, in dem die Datei gespeichert wurde
   */
  destination?: string;

  /**
   * Optionaler Name der Datei im Dateisystem nach der Speicherung
   */
  filename?: string;

  /**
   * Optionaler vollständiger Pfad zur gespeicherten Datei
   */
  path?: string;

  /**
   * Buffer mit dem Inhalt der Datei
   */
  buffer: Buffer;
}

/**
 * Service für die Verwaltung von Einsatztagebuch-Einträgen (ETB)
 *
 * Dieser Service implementiert die Geschäftslogik für das elektronische
 * Einsatztagebuch. Er verwaltet ETB-Einträge, deren Versionierung,
 * Überschreibungen und Anlagen. Der Service unterstützt sowohl
 * manuelle als auch automatisch generierte Einträge.
 *
 * Features:
 * - CRUD-Operationen für ETB-Einträge
 * - Fortlaufende Nummerierung von Einträgen
 * - Versionierung und Überschreibungsmechanismen
 * - Anlagenverwaltung mit sicherer Dateispeicherung
 * - Filterung und Paginierung von Einträgen
 * - Abschluss-Funktionalität für unveränderliche Einträge
 *
 * @class EtbService
 */
@Injectable()
export class EtbService {
  /**
   * Konstruktor für den EtbService
   *
   * @param paginationService Service für Paginierung
   * @param prisma PrismaService für Datenbankzugriffe mit Prisma
   */
  constructor(
    private paginationService: PaginationService,
    private prisma: PrismaService,
  ) {}

  // Die mapKategorieToPrisma-Methode wurde entfernt, da wir direkt Prisma-Enums verwenden

  /**
   * Erstellt einen neuen ETB-Eintrag
   *
   * @param createEtbDto DTO mit den Daten für den neuen Eintrag
   * @param userId ID des Benutzers, der den Eintrag erstellt
   * @param _userName Name des Benutzers, der den Eintrag erstellt
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

    // Hole die nächste laufende Nummer
    const laufendeNummer = await this.getNextLaufendeNummer();

    // Wir verwenden direkt den EtbKategorie-Enum von Prisma
    const prismaKategorie = createEtbDto.kategorie;

    // Erstelle den Eintrag mit Prisma
    const prismaEintrag = await this.prisma.etbEntry.create({
      data: {
        ...createEtbDto,
        einsatz: { connect: { id: '' } },
        kategorie: prismaKategorie,
        timestampErstellung: new Date(),
        timestampEreignis: new Date(createEtbDto.timestampEreignis),
        autorId: userId,
        autorName: userName || userId,
        autorRolle: userRole,
        version: 1,
        istAbgeschlossen: false,
        laufendeNummer,
        status: EtbEntryStatus.AKTIV,
      } as any,
    } as any);

    return prismaEintrag;
  }

  /**
   * Erstellt einen automatischen ETB-Eintrag
   *
   * @param _data Daten für den automatischen Eintrag
   * @param _systemQuelle Quelle des automatischen Eintrags
   * @returns Der erstellte ETB-Eintrag
   */
  async createAutomaticEintrag(
    _data: {
      timestampEreignis: Date;
      kategorie: EtbKategorie;
      inhalt: string;
      referenzEinsatzId?: string;
      referenzPatientId?: string;
      referenzEinsatzmittelId?: string;
    },
    _systemQuelle: string,
  ): Promise<EtbEntry> {
    logger.info(`Automatischer ETB-Eintrag wird erstellt durch ${_systemQuelle}`);

    // Hole die nächste laufende Nummer
    const laufendeNummer = await this.getNextLaufendeNummer();

    // Wir verwenden direkt den EtbKategorie-Enum von Prisma
    const prismaKategorie = _data.kategorie;

    // Erstelle den Eintrag mit Prisma
    const { referenzEinsatzId: _unused, ...rest } = _data;
    const prismaEintrag = await this.prisma.etbEntry.create({
      data: {
        ...rest,
        einsatz: { connect: { id: '' } },
        kategorie: prismaKategorie,
        timestampErstellung: new Date(),
        autorId: 'system',
        autorName: 'System',
        autorRolle: 'Automatisierung',
        systemQuelle: _systemQuelle,
        version: 1,
        istAbgeschlossen: false,
        laufendeNummer,
        status: EtbEntryStatus.AKTIV,
      } as any,
    } as any);

    return prismaEintrag;
  }

  /**
   * Findet alle ETB-Einträge mit optionaler Filterung und Paginierung
   *
   * @param filterDto DTO mit Filterkriterien und Paginierungsparametern
   * @returns Eine paginierte Liste von ETB-Einträgen
   */
  async findAll(filterDto: FilterEtbDto): Promise<PaginatedResponse<EtbEntry>> {
    logger.debug('Suche ETB-Einträge mit Filtern');
    const {
      page = 1,
      limit = 10,
      kategorie,
      autorId,
      vonZeitstempel,
      bisZeitstempel,
      search,
      referenzEinsatzId,
      includeUeberschrieben = false,
    } = filterDto;

    // Baue Where-Bedingung basierend auf den Filtern
    const where: any = {};

    // Status-Filter (standardmäßig nur aktive Einträge)
    if (!includeUeberschrieben) {
      where.status = EtbEntryStatus.AKTIV;
    }

    // Kategorie-Filter
    if (kategorie) {
      where.kategorie = kategorie;
    }

    // Autor-Filter
    if (autorId) {
      where.autorId = autorId;
    }

    // Zeitstempel-Filter (von - bis)
    if (vonZeitstempel || bisZeitstempel) {
      where.timestampEreignis = {};

      if (vonZeitstempel) {
        where.timestampEreignis.gte = new Date(vonZeitstempel);
      }

      if (bisZeitstempel) {
        where.timestampEreignis.lte = new Date(bisZeitstempel);
      }
    }

    // ReferenzEinsatzId-Filter
    if (referenzEinsatzId) {
      where.referenzEinsatzId = referenzEinsatzId;
    }

    // Textsuche im Inhalt
    if (search) {
      where.OR = [
        { inhalt: { contains: search, mode: 'insensitive' } },
        { autorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Erstelle paginierte Abfrage
    const paginatedEntries = await this.paginationService.paginate<EtbEntry>(
      'etbEntry',
      {
        where,
        orderBy: { laufendeNummer: 'desc' },
        include: { anlagen: true },
      },
      page,
      limit,
    );

    // Konvertiere Prisma-Objekte in Entities (falls Entity-Klasse verwendet wird)
    // const mappedEntries = {
    //     ...paginatedEntries,
    //     items: paginatedEntries.items.map(item => EtbEntryEntity.fromPrisma(item))
    // };

    // Einfach die Prisma-Objekte zurückgeben, da wir mit dem Prisma-Typ arbeiten
    return paginatedEntries;
  }

  /**
   * Findet einen ETB-Eintrag anhand seiner ID
   *
   * @param id ID des zu findenden ETB-Eintrags
   * @returns Der gefundene ETB-Eintrag
   * @throws NotFoundException wenn der Eintrag nicht gefunden wurde
   */
  async findOne(id: string): Promise<EtbEntry> {
    const etbEntry = await this.prisma.etbEntry.findUnique({
      where: { id },
      include: { anlagen: true },
    });

    if (!etbEntry) {
      logger.error(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`);
      throw new NotFoundException(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`);
    }

    return etbEntry;
  }

  /**
   * Aktualisiert einen bestehenden ETB-Eintrag
   *
   * @param id ID des zu aktualisierenden ETB-Eintrags
   * @param updateEtbDto DTO mit den zu aktualisierenden Daten
   * @returns Der aktualisierte ETB-Eintrag
   * @throws NotFoundException Wenn der Eintrag nicht gefunden wurde
   * @throws BadRequestException Wenn der Eintrag bereits abgeschlossen ist
   */
  async updateEintrag(id: string, updateEtbDto: UpdateEtbDto): Promise<EtbEntry> {
    // Prüfe, ob der Eintrag existiert und nicht abgeschlossen ist
    const existingEntry = await this.findOne(id);

    if (existingEntry.istAbgeschlossen) {
      logger.error(
        `ETB-Eintrag mit ID ${id} ist bereits abgeschlossen und kann nicht aktualisiert werden`,
      );
      throw new BadRequestException('Abgeschlossene ETB-Einträge können nicht aktualisiert werden');
    }

    logger.info(`ETB-Eintrag mit ID ${id} wird aktualisiert`);

    // Update des Eintrags mit Prisma
    const updatedPrismaEntry = await this.prisma.etbEntry.update({
      where: { id },
      data: {
        ...updateEtbDto,
        // Wenn ein neuer Zeitstempel angegeben ist, konvertiere ihn zu Date
        timestampEreignis: updateEtbDto.timestampEreignis
          ? new Date(updateEtbDto.timestampEreignis)
          : undefined,
        // Setze die Version direkt (Inkrement um 1)
        version: { increment: 1 },
      },
      include: { anlagen: true },
    });

    return updatedPrismaEntry;
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

    logger.info(`ETB-Eintrag mit ID ${id} wird abgeschlossen von Benutzer ${userId}`);

    const updatedPrismaEntry = await this.prisma.etbEntry.update({
      where: { id },
      data: {
        istAbgeschlossen: true,
        timestampAbschluss: new Date(),
        abgeschlossenVon: userId,
      },
      include: { anlagen: true },
    });

    return updatedPrismaEntry;
  }

  /**
   * Fügt eine Dateianlage zu einem ETB-Eintrag hinzu
   *
   * @param id ID des ETB-Eintrags
   * @param file Die hochgeladene Datei
   * @param addAttachmentDto DTO mit der optionalen Beschreibung der Anlage
   * @returns Die erstellte ETB-Anlage
   * @throws NotFoundException Wenn der ETB-Eintrag nicht gefunden wurde
   * @throws BadRequestException Wenn der ETB-Eintrag bereits abgeschlossen ist oder andere Validierungsfehler auftreten
   */
  async addAttachment(
    id: string,
    file: MulterFile,
    addAttachmentDto: AddAttachmentDto,
  ): Promise<EtbAttachment> {
    // Prüfen, ob der Eintrag existiert
    const etbEntry = await this.findOne(id);

    // Prüfen, ob der Eintrag abgeschlossen ist
    if (etbEntry.istAbgeschlossen) {
      logger.error(
        `Anlage kann nicht zu ETB-Eintrag ${id} hinzugefügt werden, da er abgeschlossen ist`,
      );
      throw new BadRequestException(
        'Anlagen können nicht zu abgeschlossenen ETB-Einträgen hinzugefügt werden',
      );
    }

    try {
      // Sicherer Dateiname durch Sanitization
      const safeFileName = sanitize(file.originalname);

      // Generiere einen eindeutigen Dateinamen, um Überschreibungen zu vermeiden
      const uniqueFileName = `${Date.now()}-${safeFileName}`;

      // Pfad zum Uploads-Verzeichnis
      const uploadDir = path.join(process.cwd(), 'uploads');

      // Erstelle das Verzeichnis, falls es nicht existiert
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Vollständiger Pfad zur Datei
      const filePath = path.join(uploadDir, uniqueFileName);

      // Schreibe die Datei
      fs.writeFileSync(filePath, file.buffer);

      logger.info(`Datei ${uniqueFileName} wurde gespeichert unter ${filePath}`);

      // Erstelle den Datenbankeintrag für die Anlage
      const attachment = await this.prisma.etbAttachment.create({
        data: {
          etbEntryId: id,
          dateiname: safeFileName, // Verwende die Feldnamen gemäß Prisma-Schema
          dateityp: file.mimetype,
          speicherOrt: filePath,
          beschreibung: addAttachmentDto?.beschreibung || null,
        },
      });

      logger.info(`Anlage wurde erfolgreich zum ETB-Eintrag ${id} hinzugefügt`);

      return attachment;
    } catch (error: any) {
      logger.error(`Fehler beim Hinzufügen einer Anlage zum ETB-Eintrag ${id}:`, error);
      throw new BadRequestException(`Fehler beim Hinzufügen der Anlage: ${error.message}`);
    }
  }

  /**
   * Findet alle Anlagen zu einem ETB-Eintrag
   *
   * @param etbEntryId ID des ETB-Eintrags
   * @returns Eine Liste von ETB-Anlagen
   */
  async findAttachmentsByEtbEntryId(etbEntryId: string): Promise<EtbAttachment[]> {
    const attachments = await this.prisma.etbAttachment.findMany({
      where: { etbEntryId },
    });

    return attachments;
  }

  /**
   * Findet eine ETB-Anlage anhand ihrer ID
   *
   * @param id ID der zu findenden ETB-Anlage
   * @returns Die gefundene ETB-Anlage
   * @throws NotFoundException Wenn die Anlage nicht gefunden wurde
   */
  async findAttachmentById(id: string): Promise<EtbAttachment> {
    const attachment = await this.prisma.etbAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      logger.error(`ETB-Anlage mit ID ${id} wurde nicht gefunden`);
      throw new NotFoundException(`ETB-Anlage mit ID ${id} wurde nicht gefunden`);
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
    const now = new Date();

    // Führe die Überschreibung in einer Transaktion durch, um die Konsistenz zu gewährleisten
    return this.prisma.$transaction(async (tx) => {
      // Markiere den ursprünglichen Eintrag als überschrieben
      await tx.etbEntry.update({
        where: { id },
        data: {
          status: EtbEntryStatus.UEBERSCHRIEBEN,
          timestampUeberschrieben: now,
          ueberschriebenVon: userId,
        },
      });

      // Hole die nächste laufende Nummer
      const laufendeNummer = await this.getNextLaufendeNummer();

      // Erstelle den neuen Eintrag
      const neuerEintrag = await tx.etbEntry.create({
        data: {
          timestampErstellung: now,
          timestampEreignis: ueberschreibeEtbDto.timestampEreignis
            ? new Date(ueberschreibeEtbDto.timestampEreignis)
            : originalEntry.timestampEreignis,
          kategorie: ueberschreibeEtbDto.kategorie || originalEntry.kategorie,
          inhalt: ueberschreibeEtbDto.inhalt || originalEntry.inhalt,
          einsatz: { connect: { id: '' } },
          referenzPatientId:
            ueberschreibeEtbDto.referenzPatientId || originalEntry.referenzPatientId,
          referenzEinsatzmittelId:
            ueberschreibeEtbDto.referenzEinsatzmittelId || originalEntry.referenzEinsatzmittelId,
          autorId: userId,
          autorName: userName,
          autorRolle: userRole,
          version: 1,
          status: EtbEntryStatus.AKTIV,
          istAbgeschlossen: false,
          laufendeNummer,
          ueberschriebeneEintraege: {
            connect: { id },
          },
        } as any,
        include: {
          anlagen: true,
          ueberschriebeneEintraege: true,
        },
      });

      logger.info(`ETB-Eintrag mit ID ${id} wird überschrieben von Benutzer ${userId}`);

      return neuerEintrag;
    });
  }

  /**
   * Generiert die nächste verfügbare laufende Nummer für ETB-Einträge
   *
   * @returns Die nächste verfügbare laufende Nummer
   */
  private async getNextLaufendeNummer(): Promise<number> {
    const result = await this.prisma.etbEntry.aggregate({
      _max: {
        laufendeNummer: true,
      },
    });
    return (result._max.laufendeNummer || 0) + 1;
  }
}
