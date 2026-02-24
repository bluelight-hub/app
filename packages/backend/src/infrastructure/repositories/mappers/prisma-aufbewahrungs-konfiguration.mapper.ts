import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import type { AufbewahrungsKonfiguration as PrismaAufbewahrungsKonfiguration } from '@/generated/prisma/client';

/**
 * Bidirektionaler Mapper: AufbewahrungsKonfiguration Value Object ↔ Prisma Model.
 *
 * @remarks Story 5.5
 */
export class PrismaAufbewahrungsKonfigurationMapper {
  /**
   * Konvertiert Prisma Record zu Domain Value Object.
   * Wirft Error bei ungültigen Werten (sollte nie passieren, da save() validiert).
   */
  static toDomain(prisma: PrismaAufbewahrungsKonfiguration): AufbewahrungsKonfiguration {
    const result = AufbewahrungsKonfiguration.create(prisma.aufbewahrungsfristJahre, prisma.freigabeperiodeTage, prisma.automatischLoeschenAktiv);
    if (result.isFailure) {
      throw new Error(`Ungültige AufbewahrungsKonfiguration in DB: ${result.error}`);
    }
    return result.value!;
  }

  /**
   * Konvertiert Domain Value Object zu Prisma-kompatiblen Daten.
   */
  static toPersistence(config: AufbewahrungsKonfiguration, updatedBy: string) {
    return {
      aufbewahrungsfristJahre: config.aufbewahrungsfristJahre,
      freigabeperiodeTage: config.freigabeperiodeTage,
      automatischLoeschenAktiv: config.automatischLoeschenAktiv,
      updatedBy,
    };
  }
}
