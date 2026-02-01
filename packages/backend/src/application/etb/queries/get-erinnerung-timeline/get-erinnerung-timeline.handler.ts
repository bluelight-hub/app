import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
import { ILogger } from '@domain/ports/i-logger.port';
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
      // Story 5.7: Auch etbEntryId laden für Original-Eintrag Verknüpfung
      const erinnerung = await this.prisma.erinnerung.findUnique({
        where: { id: query.erinnerungId },
        select: {
          id: true,
          titel: true,
          einsatzId: true,
          etbEntryId: true,
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
      // WICHTIG: ETB hat eine eigene ID, die nicht gleich der EinsatzId ist!
      // Wir muessen das ETB per EinsatzId laden, um dessen echte ID zu bekommen.
      const etbRecord = await this.prisma.einsatztagebuch.findUnique({
        where: { einsatzId: query.einsatzId },
        select: { id: true },
      });

      if (!etbRecord) {
        this.logger.warn(`ETB not found for einsatzId=${query.einsatzId}`, 'GetErinnerungTimelineQueryHandler');
        return Result.fail('ETB nicht gefunden');
      }

      const etbId = etbRecord.id;

      // CRITICAL 2: Safety-Limit für Pagination (eine Timeline hat selten mehr als 100 Events)
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
        take: 100, // Safety-Limit: Timeline hat normalerweise <100 Events
      });

      // Step 6: Map to DTOs
      const events: ErinnerungTimelineEventDto[] = etbEntries.map((entry) => {
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
