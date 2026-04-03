import type { EinsatzEinheit as PrismaEinsatzEinheit } from '@/generated/prisma/client';
import type { ReconstituteEinsatzEinheitProps } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import { nullToUndefined } from '@/shared/utils/type-utils';

/**
 * Prisma Entity mit _count Relation für istStaerke Berechnung.
 *
 * **Use Case:** Repository lädt EinsatzEinheit mit `include: { _count: { select: { personen: true } } }`
 * um die aktuelle Ist-Stärke (Anzahl zugewiesener Personen) zu ermitteln.
 *
 * **Performance:** Nutzt Prisma _count statt Array-Laden für optimale Performance.
 */
export type PrismaEinsatzEinheitWithCount = PrismaEinsatzEinheit & {
  _count?: {
    personen: number;
  };
};

/**
 * Mapper zwischen Prisma EinsatzEinheit Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **KRITISCH: NULL -> undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 *
 * **istStaerke Berechnung:**
 * - Wird aus `_count.personen` ermittelt (Anzahl zugewiesener EinsatzPersonEinheit Records)
 * - Falls _count nicht geladen: Default 0
 */
export class PrismaEinsatzEinheitMapper {
  /**
   * Mappt Prisma Entity zu Domain Aggregate Rekonstitutions-Props.
   *
   * **KRITISCH: NULL -> undefined Konvertierung für ALLE optionalen Felder!**
   * - parentId: string | null -> string | undefined
   * - funktion: string | null -> string | undefined
   * - einheitenfuehrerId: string | null -> string | undefined
   * - auftrag: string | null -> string | undefined
   * - einsatzort: string | null -> string | undefined
   * - updatedBy: string | null -> string | undefined
   *
   * **istStaerke:**
   * - Aus `_count.personen` ermittelt (Anzahl zugewiesener Personen)
   * - Falls _count nicht geladen: Default 0
   *
   * @param raw - Prisma EinsatzEinheit Entity mit optionalem _count
   * @returns ReconstituteEinsatzEinheitProps für Aggregate.reconstitute()
   */
  static toDomain(raw: PrismaEinsatzEinheitWithCount): ReconstituteEinsatzEinheitProps {
    return {
      id: raw.id,
      einsatzId: raw.einsatzId,
      parentId: nullToUndefined(raw.parentId),
      name: raw.name,
      typ: raw.typ,
      funktion: nullToUndefined(raw.funktion),
      status: raw.status,
      einheitenfuehrerId: nullToUndefined(raw.einheitenfuehrerId),
      sollStaerke: raw.sollStaerke,
      istStaerke: raw._count?.personen ?? 0,
      auftrag: nullToUndefined(raw.auftrag),
      einsatzort: nullToUndefined(raw.einsatzort),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      createdBy: raw.createdBy,
      updatedBy: nullToUndefined(raw.updatedBy),
    };
  }
}
