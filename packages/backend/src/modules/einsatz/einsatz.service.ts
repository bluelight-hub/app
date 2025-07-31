import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEinsatzDto } from './dto/create-einsatz.dto';
import { Einsatz } from './entities/einsatz.entity';

/**
 * Service für die Verwaltung von Einsätzen
 *
 * Dieser Service implementiert die Geschäftslogik für Einsätze im
 * Bluelight Hub System. Er bietet grundlegende CRUD-Operationen
 * und dient als zentrale Schnittstelle für die Einsatzverwaltung.
 *
 * Features:
 * - Erstellung neuer Einsätze
 * - Abruf aller Einsätze
 * - Suche von Einsätzen nach ID
 *
 * @class EinsatzService
 */
@Injectable()
export class EinsatzService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Erstellt einen neuen Einsatz mit den angegebenen Daten.
   *
   * Diese Methode nimmt die Einsatzdaten entgegen und speichert sie
   * persistent in der Datenbank. Die Daten werden durch das DTO
   * validiert bevor sie gespeichert werden.
   *
   * @param createEinsatzDto Die Daten für den zu erstellenden Einsatz
   * @returns Der erstellte Einsatz mit generierter ID und Zeitstempeln
   * @throws {Error} Bei Datenbankfehlern während der Erstellung
   * @example
   * ```typescript
   * const neuerEinsatz = await einsatzService.create({
   *   name: 'Verkehrsunfall B5',
   *   beschreibung: 'Verkehrsunfall mit 2 PKW',
   *   ort: 'B5 Höhe Abfahrt Nord'
   * });
   * ```
   */
  async create(createEinsatzDto: CreateEinsatzDto): Promise<Einsatz> {
    return this.prisma.einsatz.create({
      data: createEinsatzDto,
    });
  }

  /**
   * Ruft alle Einsätze aus der Datenbank ab.
   *
   * Diese Methode liefert eine Liste aller gespeicherten Einsätze
   * ohne Filterung oder Paginierung. Für große Datenmengen sollte
   * eine paginierte Variante implementiert werden.
   *
   * @returns Array aller Einsätze aus der Datenbank
   * @throws {Error} Bei Datenbankfehlern während des Abrufs
   * @example
   * ```typescript
   * const alleEinsaetze = await einsatzService.findAll();
   * logger.info(`Anzahl Einsätze: ${alleEinsaetze.length}`);
   * ```
   */
  async findAll(): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany();
  }

  /**
   * Sucht einen spezifischen Einsatz anhand seiner ID.
   *
   * Diese Methode durchsucht die Datenbank nach einem Einsatz mit
   * der angegebenen ID. Wenn kein Einsatz gefunden wird, wird eine
   * NotFoundException geworfen.
   *
   * @param id Die eindeutige ID des gesuchten Einsatzes
   * @returns Der gefundene Einsatz
   * @throws {NotFoundException} Wenn kein Einsatz mit der angegebenen ID existiert
   * @throws {Error} Bei Datenbankfehlern während der Suche
   * @example
   * ```typescript
   * try {
   *   const einsatz = await einsatzService.findById('abc123');
   *   logger.info(`Einsatz gefunden: ${einsatz.name}`);
   * } catch (error) {
   *   if (error instanceof NotFoundException) {
   *     logger.error('Einsatz nicht gefunden');
   *   }
   * }
   * ```
   */
  async findById(id: string): Promise<Einsatz> {
    const einsatz = await this.prisma.einsatz.findUnique({ where: { id } });
    if (!einsatz) {
      throw new NotFoundException(`Einsatz ${id} not found`);
    }
    return einsatz;
  }
}
