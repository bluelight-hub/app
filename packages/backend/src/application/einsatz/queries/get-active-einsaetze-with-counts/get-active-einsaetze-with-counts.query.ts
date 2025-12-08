/**
 * Query fuer Einsaetze mit ETB-Eintraege und POI-Counts.
 *
 * Liefert Einsaetze mit vorberechneten Counts fuer optimale Performance.
 * Standardmaessig werden archivierte Einsaetze ausgeschlossen.
 *
 * **CQRS Read-Side Optimization:**
 * - Nutzt direkten PrismaService Zugriff (KEIN Repository Pattern)
 * - Prisma _count Aggregation fuer ETB-Eintraege und POIs
 * - Vermeidet N+1 Query Problem durch include mit _count
 * - Read-Optimierung: Keine Aggregate-Hydration notwendig
 *
 * **Unterschied zu GetActiveEinsaetzeQuery:**
 * - GetActiveEinsaetzeQuery: Repository Pattern, volle Domain Aggregates
 * - GetActiveEinsaetzeWithCountsQuery: Prisma direkt, DTO mit Counts
 * - GetActiveEinsaetzeQuery: Fuer Domain-Logik (Commands, Events)
 * - GetActiveEinsaetzeWithCountsQuery: Fuer UI-Listen (Dashboard, Uebersicht)
 *
 * @example
 * ```typescript
 * // Controller - nur aktive Einsaetze:
 * const query = new GetActiveEinsaetzeWithCountsQuery();
 * return this.queryBus.execute(query);
 *
 * // Controller - inklusive archivierter Einsaetze:
 * const query = new GetActiveEinsaetzeWithCountsQuery(true);
 * return this.queryBus.execute(query);
 * ```
 */
export class GetActiveEinsaetzeWithCountsQuery {
  /**
   * @param includeArchived - Archivierte Einsaetze einschliessen (Standard: false)
   */
  constructor(public readonly includeArchived: boolean = false) {}
}
