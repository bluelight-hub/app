import type { Gefaehrdungsbeurteilung as PrismaGefaehrdungsbeurteilung } from '@/generated/prisma/client';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungItem, type GefaehrdungItemProps } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';

/**
 * Mapper zwischen Prisma-Row (`gefaehrdungsbeurteilungen`) und Domain-Aggregat.
 *
 * Der Mapper kennt die strukturelle Form der JSONB-Items (via
 * `GefaehrdungItemProps`); fehlerhafte Items werden übersprungen und nicht
 * als Aggregate-Erzeugungsfehler an den Caller weitergereicht — der JSONB-
 * Content darf beim Read nicht fail-loudly sein (AC11-Coverage ist separat im
 * VO-Spec gesichert).
 */
export class PrismaGefaehrdungsbeurteilungMapper {
  static toDomain(row: PrismaGefaehrdungsbeurteilung): Gefaehrdungsbeurteilung {
    const items = Array.isArray(row.items) ? row.items : [];
    const domainItems: GefaehrdungItem[] = [];
    for (const raw of items) {
      if (typeof raw !== 'object' || raw === null) continue;
      const result = GefaehrdungItem.create(raw as unknown as GefaehrdungItemProps);
      if (result.isSuccess && result.value) {
        domainItems.push(result.value);
      }
    }

    // `reconstitute` statt `create`: übernimmt die tatsächliche DB-`version`
    // (sonst würde jedes geladene Aggregate auf Version 1 zurückfallen, was
    // die Optimistic-Concurrency-Prüfung ab dem zweiten Update kaputt macht).
    return Gefaehrdungsbeurteilung.reconstitute({
      id: row.id,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      createdBy: row.erstelltVonUserId,
      vorlageId: row.vorlageId,
      gefahrenzoneId: row.gefahrenzoneId,
      items: domainItems,
      version: row.version,
    });
  }

  static toPersistenceItems(items: readonly GefaehrdungItem[]): GefaehrdungItemProps[] {
    return items.map((item) => item.toJSON());
  }
}
