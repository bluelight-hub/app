import type { GefaehrdungsbeurteilungVorlage as PrismaGefaehrdungsbeurteilungVorlage } from '@/generated/prisma/client';
import type { GefaehrdungsbeurteilungVorlageReadModel } from '@domain/eigenschutz/repositories';
import { GefaehrdungItem, type GefaehrdungItemProps } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';

/**
 * Mapper zwischen Prisma-Row (`gefaehrdungsbeurteilung_vorlagen`) und dem
 * Vorlagen-Read-Model. Items werden durch den VO-Constructor geschickt, damit
 * Risiko-Enum-Werte und Titel-Length validiert werden.
 */
export class PrismaGefaehrdungsbeurteilungVorlageMapper {
  static toReadModel(row: PrismaGefaehrdungsbeurteilungVorlage): GefaehrdungsbeurteilungVorlageReadModel {
    const items: GefaehrdungItem[] = [];
    const rawItems = Array.isArray(row.items) ? row.items : [];
    for (const raw of rawItems) {
      if (typeof raw !== 'object' || raw === null) continue;
      const result = GefaehrdungItem.create(raw as unknown as GefaehrdungItemProps);
      if (result.isSuccess && result.value) {
        items.push(result.value);
      }
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      szenario: row.szenario,
      items,
      version: row.version,
      aktiv: row.aktiv,
      erstelltAm: row.erstelltAm,
    };
  }
}
