import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
import { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GetEtbEntriesByErinnerungQuery } from './get-etb-entries-by-erinnerung.query';
import type { ErinnerungEtbHistoryDto, EtbEntryPreviewDto, EtbHistoryUserDto } from '@application/erinnerung/dto/erinnerung-etb-history.dto';

/**
 * Handler für GetEtbEntriesByErinnerungQuery.
 *
 * Lädt alle ETB-Einträge, die zu einer bestimmten Erinnerung gehören,
 * basierend auf dem metadata.erinnerungId-Feld. Die Einträge werden
 * chronologisch sortiert (älteste zuerst) zurückgegeben.
 *
 * **Story 5.7: Bidirektionale Verknüpfung - Erinnerung zu ETB-Einträgen Query**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Ändert niemals Domain State
 * - Result<T>: Kein Exception-Throwing für vorhersagbare Fehler
 * - Prisma Direct: Optimierte Query ohne Domain-Aggregate (Performance)
 *
 * **Sicherheit:**
 * - Validiert, dass Erinnerung existiert
 * - Validiert, dass Erinnerung zum angegebenen Einsatz gehört
 * - Verhindert Cross-Einsatz-Datenzugriff
 *
 * **Fehlerbehandlung:**
 * - Erinnerung not found -> Result.fail('Erinnerung nicht gefunden')
 * - Erinnerung belongs to different Einsatz -> Result.fail('Erinnerung gehört nicht zu diesem Einsatz')
 * - Repository Error -> Result.fail('Fehler beim Laden der ETB-History')
 * - No entries found -> Result.ok({ entries: [], totalCount: 0 }) <- KEIN FEHLER
 *
 * @example
 * ```typescript
 * const query = new GetEtbEntriesByErinnerungQuery('cm3erinnerung123', 'cm3einsatz456');
 * const result = await handler.execute(query);
 * // result.value = {
 * //   entries: [...],
 * //   totalCount: 5
 * // }
 * ```
 */
@Injectable()
export class GetEtbEntriesByErinnerungHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und lädt die ETB-History einer Erinnerung.
   *
   * **Orchestration Flow:**
   * 1. Validiere Erinnerung existiert via Prisma-Query
   * 2. Validiere Erinnerung gehört zum angegebenen Einsatz (Sicherheit!)
   * 3. Lade ETB-ID für den Einsatz
   * 4. Query ETB-Einträge mit metadata->>'erinnerungId' Filter
   * 5. Include createdByUser für Namensauflösung
   * 6. Sort by createdAt ASC (chronologisch)
   * 7. Map zu DTOs -> return Result.ok(history)
   *
   * @param query - Die Query mit erinnerungId und einsatzId
   * @returns Result.ok(ErinnerungEtbHistoryDto) bei Erfolg, Result.fail() bei Fehler
   */
  async execute(query: GetEtbEntriesByErinnerungQuery): Promise<Result<ErinnerungEtbHistoryDto>> {
    try {
      this.logger.log(`Loading ETB history for erinnerungId=${query.erinnerungId}, einsatzId=${query.einsatzId}`, 'GetEtbEntriesByErinnerungHandler');

      // Step 1+2: Validate Erinnerung exists and belongs to Einsatz
      // Story 5.7: Auch etbEntryId laden für Original-Eintrag Verknüpfung
      const erinnerung = await this.prisma.erinnerung.findUnique({
        where: { id: query.erinnerungId },
        select: {
          id: true,
          einsatzId: true,
          etbEntryId: true,
        },
      });

      if (!erinnerung) {
        this.logger.warn(`Erinnerung not found: erinnerungId=${query.erinnerungId}`, 'GetEtbEntriesByErinnerungHandler');
        return Result.fail('Erinnerung nicht gefunden');
      }

      // Security check: Erinnerung must belong to the specified Einsatz
      if (erinnerung.einsatzId !== query.einsatzId) {
        this.logger.warn(`Security violation: Erinnerung ${query.erinnerungId} belongs to einsatzId=${erinnerung.einsatzId}, not ${query.einsatzId}`, 'GetEtbEntriesByErinnerungHandler');
        return Result.fail('Erinnerung gehört nicht zu diesem Einsatz');
      }

      // Step 3: Load ETB-ID for the Einsatz
      // WICHTIG: ETB hat eine eigene ID, die nicht gleich der EinsatzId ist!
      const etbRecord = await this.prisma.einsatztagebuch.findUnique({
        where: { einsatzId: query.einsatzId },
        select: { id: true },
      });

      if (!etbRecord) {
        this.logger.warn(`ETB not found for einsatzId=${query.einsatzId}`, 'GetEtbEntriesByErinnerungHandler');
        return Result.fail('ETB nicht gefunden');
      }

      const etbId = etbRecord.id;

      // Step 4+5+6: Query ETB entries
      // CRITICAL: Safety-Limit für Pagination (eine History hat selten mehr als 100 Events)
      // Story 5.7: Zwei Arten von Verknüpfungen finden:
      // 1. Einträge mit metadata.erinnerungId (automatisch erstellte wie "Erinnerung erstellt")
      // 2. Der Original-Eintrag (von dem aus die Erinnerung erstellt wurde, via etbEntryId)
      const orConditions = [
        {
          etbId: etbId,
          // JSON path filter for metadata.erinnerungId
          metadata: {
            path: ['erinnerungId'],
            equals: query.erinnerungId,
          },
        },
        // Wenn etbEntryId vorhanden, auch den Original-Eintrag finden
        ...(erinnerung.etbEntryId
          ? [
              {
                etbId: etbId,
                id: erinnerung.etbEntryId,
              },
            ]
          : []),
      ];

      const etbEntries = await this.prisma.etbEintrag.findMany({
        where: {
          OR: orConditions,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Chronological order (oldest first)
        },
        take: 100, // Safety-Limit: History hat normalerweise <100 Events
      });

      // Step 7: Map to DTOs
      const entries: EtbEntryPreviewDto[] = etbEntries.map((entry) => {
        const metadata = entry.metadata as Record<string, unknown> | null;
        // Story 5.7: EventType bestimmen
        // - Automatische Einträge haben metadata.eventType
        // - Original-Eintrag (etbEntryId) bekommt 'UrsprungsEintrag' als Marker
        let eventType: string;
        if (typeof metadata?.eventType === 'string') {
          eventType = metadata.eventType;
        } else if (entry.id === erinnerung.etbEntryId) {
          eventType = 'UrsprungsEintrag';
        } else {
          eventType = 'Unknown';
        }

        const createdBy: EtbHistoryUserDto = {
          id: entry.creator.id,
          username: entry.creator.username,
        };

        return {
          id: entry.id,
          sequenceNumber: entry.sequenceNumber,
          text: entry.text,
          eventType,
          timestamp: entry.createdAt,
          createdBy,
        };
      });

      const history: ErinnerungEtbHistoryDto = {
        entries,
        totalCount: entries.length,
      };

      this.logger.log(`ETB history loaded: erinnerungId=${query.erinnerungId}, entryCount=${entries.length}`, 'GetEtbEntriesByErinnerungHandler');

      return Result.ok(history);
    } catch (error) {
      // Unexpected error: Log with stack trace for monitoring/alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to load ETB history: erinnerungId=${query.erinnerungId}, error=${errorMessage}, stack=${stack}`, 'GetEtbEntriesByErinnerungHandler');
      return Result.fail('Fehler beim Laden der ETB-History');
    }
  }
}
