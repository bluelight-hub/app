import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: ILogger is needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: PrismaService is an Injectable class, not just a type - needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { GetErinnerungTimelineQuery } from './get-erinnerung-timeline.query';
import type { ErinnerungTimelineDto, ErinnerungTimelineEventDto, TimelineUserDto } from '@application/etb/dto/erinnerung-timeline.dto';

/**
 * Handler fuer GetErinnerungTimelineQuery.
 *
 * Laedt alle ETB-Eintraege, die zu einer bestimmten Erinnerung gehoeren,
 * basierend auf dem metadata.erinnerungId-Feld. Die Eintraege werden
 * chronologisch sortiert (aelteste zuerst) zurueckgegeben.
 *
 * **Story 5.5: ETB zeigt Erinnerungsverlauf (Timeline Widget)**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 * - Prisma Direct: Optimierte Query ohne Domain-Aggregate (Performance)
 *
 * **Sicherheit:**
 * - Validiert, dass Erinnerung existiert
 * - Validiert, dass Erinnerung zum angegebenen Einsatz gehoert
 * - Verhindert Cross-Einsatz-Datenzugriff
 *
 * **Fehlerbehandlung:**
 * - Erinnerung not found -> Result.fail('Erinnerung nicht gefunden')
 * - Erinnerung belongs to different Einsatz -> Result.fail('Erinnerung gehört nicht zu diesem Einsatz')
 * - Repository Error -> Result.fail('Fehler beim Laden der Erinnerungs-Timeline')
 * - No events found -> Result.ok({ events: [], totalCount: 0 }) <- KEIN FEHLER
 *
 * @example
 * ```typescript
 * const query = new GetErinnerungTimelineQuery('cm3erinnerung123', 'cm3einsatz456');
 * const result = await handler.execute(query);
 * // result.value = {
 * //   erinnerungId: 'cm3erinnerung123',
 * //   titel: 'Follow-up Leitstelle',
 * //   events: [...],
 * //   totalCount: 5
 * // }
 * ```
 */
@Injectable()
export class GetErinnerungTimelineQueryHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Fuehrt die Query aus und laedt die Erinnerungs-Timeline.
   *
   * **Orchestration Flow:**
   * 1. Validiere Erinnerung existiert via Prisma-Query
   * 2. Validiere Erinnerung gehoert zum angegebenen Einsatz (Sicherheit!)
   * 3. Query ETB-Eintraege mit kategorie='ERINNERUNG' und metadata->>'erinnerungId' Filter
   * 4. Include createdByUser fuer Namensaufloesung
   * 5. Sort by createdAt ASC (chronologisch)
   * 6. Map zu DTOs -> return Result.ok(timeline)
   *
   * @param query - Die Query mit erinnerungId und einsatzId
   * @returns Result.ok(ErinnerungTimelineDto) bei Erfolg, Result.fail() bei Fehler
   */
  async execute(query: GetErinnerungTimelineQuery): Promise<Result<ErinnerungTimelineDto>> {
    try {
      this.logger.log(`Loading timeline for erinnerungId=${query.erinnerungId}, einsatzId=${query.einsatzId}`, 'GetErinnerungTimelineQueryHandler');

      // Step 1+2: Validate Erinnerung exists and belongs to Einsatz
      const erinnerung = await this.prisma.erinnerung.findUnique({
        where: { id: query.erinnerungId },
        select: {
          id: true,
          titel: true,
          einsatzId: true,
        },
      });

      if (!erinnerung) {
        this.logger.warn(`Erinnerung not found: erinnerungId=${query.erinnerungId}`, 'GetErinnerungTimelineQueryHandler');
        return Result.fail('Erinnerung nicht gefunden');
      }

      // Security check: Erinnerung must belong to the specified Einsatz
      if (erinnerung.einsatzId !== query.einsatzId) {
        this.logger.warn(`Security violation: Erinnerung ${query.erinnerungId} belongs to einsatzId=${erinnerung.einsatzId}, not ${query.einsatzId}`, 'GetErinnerungTimelineQueryHandler');
        return Result.fail('Erinnerung gehört nicht zu diesem Einsatz');
      }

      // Step 3+4+5: Query ETB entries with metadata filter
      // ETB has same ID as Einsatz (1:1 relationship)
      const etbId = query.einsatzId;

      // CRITICAL 2: Safety-Limit für Pagination (eine Timeline hat selten mehr als 100 Events)
      const etbEntries = await this.prisma.etbEintrag.findMany({
        where: {
          etbId: etbId,
          kategorie: 'ERINNERUNG',
          // JSON path filter for metadata.erinnerungId
          metadata: {
            path: ['erinnerungId'],
            equals: query.erinnerungId,
          },
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
        take: 100, // Safety-Limit: Timeline hat normalerweise <100 Events
      });

      // Step 6: Map to DTOs
      const events: ErinnerungTimelineEventDto[] = etbEntries.map((entry) => {
        const metadata = entry.metadata as Record<string, unknown> | null;
        // MEDIUM 5: Sichere Runtime-Validierung statt unsafes Type Casting
        const eventType = typeof metadata?.eventType === 'string' ? metadata.eventType : 'Unknown';

        const createdBy: TimelineUserDto = {
          id: entry.creator.id,
          username: entry.creator.username,
          displayName: null, // User model does not have displayName
        };

        return {
          id: entry.id,
          eventType,
          timestamp: entry.createdAt,
          sequenceNumber: entry.sequenceNumber,
          createdBy,
          text: entry.text,
          metadata: metadata ?? undefined,
        };
      });

      const timeline: ErinnerungTimelineDto = {
        erinnerungId: erinnerung.id,
        titel: erinnerung.titel,
        events,
        totalCount: events.length,
      };

      this.logger.log(`Timeline loaded: erinnerungId=${query.erinnerungId}, eventCount=${events.length}`, 'GetErinnerungTimelineQueryHandler');

      return Result.ok(timeline);
    } catch (error) {
      // Unexpected error: Log with stack trace for monitoring/alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to load timeline: erinnerungId=${query.erinnerungId}, error=${errorMessage}, stack=${stack}`, 'GetErinnerungTimelineQueryHandler');
      return Result.fail('Fehler beim Laden der Erinnerungs-Timeline');
    }
  }
}
