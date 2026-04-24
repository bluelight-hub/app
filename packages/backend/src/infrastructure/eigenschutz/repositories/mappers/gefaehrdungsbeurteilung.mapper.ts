import type { Gefaehrdungsbeurteilung as PrismaGefaehrdungsbeurteilung, GefaehrdungsbeurteilungVersion as PrismaGefaehrdungsbeurteilungVersion } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import type { GefaehrdungsbeurteilungVersionRow } from '@domain/eigenschutz/repositories';
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
  static toDomain(row: PrismaGefaehrdungsbeurteilung): Result<Gefaehrdungsbeurteilung> {
    const domainItems = PrismaGefaehrdungsbeurteilungMapper.rehydrateItems(row.items);

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

  /**
   * Mapped eine rohe Prisma-Row der Versions-Tabelle
   * (`gefaehrdungsbeurteilung_versionen`) auf den Read-Model-Row-Typ
   * {@link GefaehrdungsbeurteilungVersionRow} (Story 2.4).
   *
   * Die Items werden defensiv aus dem JSONB rehydriert — identisch zu
   * `toDomain`: fehlerhafte Einträge werden still übersprungen (das Timeline-
   * Read-Model darf auf Legacy- oder Migrations-Artefakten nicht fail-loudly
   * sein).
   *
   * `changedFields` wird als `Record<string, unknown>` getippt (Story 2.3
   * persistiert z. B. `{ added, removed, updated, unchanged }`; Story 2.1
   * `{ created: true }`).
   */
  static toVersionRow(row: PrismaGefaehrdungsbeurteilungVersion): GefaehrdungsbeurteilungVersionRow {
    return {
      version: row.version,
      items: PrismaGefaehrdungsbeurteilungMapper.rehydrateItems(row.items),
      // `changedFields` ist in Prisma als `Json`-Feld typisiert; die tatsächliche
      // Form ist je nach Write-Pfad unterschiedlich (siehe JSDoc). Wir geben
      // sie 1:1 weiter und überlassen dem Frontend-Formatter die Interpretation.
      changedFields: (row.changedFields ?? {}) as Record<string, unknown>,
      gueltigVon: row.gueltigVon,
      gueltigBis: row.gueltigBis,
      changedByUserId: row.changedByUserId,
      eventId: row.eventId,
    };
  }

  /**
   * Defensiver JSONB → GefaehrdungItem[]-Rehydrator. Fehlerhafte Einträge
   * werden übersprungen (siehe Klassenkopf-Kommentar).
   */
  private static rehydrateItems(raw: unknown): GefaehrdungItem[] {
    const items = Array.isArray(raw) ? raw : [];
    const domainItems: GefaehrdungItem[] = [];
    for (const entry of items) {
      if (typeof entry !== 'object' || entry === null) continue;
      const result = GefaehrdungItem.create(entry as unknown as GefaehrdungItemProps);
      if (result.isSuccess && result.value) {
        domainItems.push(result.value);
      }
    }
    return domainItems;
  }
}
