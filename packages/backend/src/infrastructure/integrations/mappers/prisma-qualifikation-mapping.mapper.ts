import type { QualifikationMapping as PrismaQualifikationMapping } from '@prisma/client';
import { QualifikationMapping, type IntegrationType } from '@domain/integrations';

/**
 * Mapper zwischen Prisma QualifikationMapping Entity und Domain Entity.
 *
 * **Hexagonal Architecture:** Uebersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Entity). Haelt die Domain Layer frei von Prisma-Typen.
 *
 * Story 7.2: HiOrg-Server Import - Qualifikations-Mapping
 *
 * @module infrastructure/integrations/mappers
 */
export class PrismaQualifikationMappingMapper {
  /**
   * Mappt Prisma Entity zu Domain Entity (Hydration).
   *
   * **Error Handling:** Wirft Error bei Rekonstitutionsfehlern, da ungueltige
   * Daten aus der DB ein Programming Error sind (Datenintegritaet wird
   * durch DB Constraints und Business Logic beim Speichern sichergestellt).
   *
   * @param record - Prisma QualifikationMapping Entity
   * @returns Domain QualifikationMapping Entity
   * @throws Error wenn Rekonstitution fehlschlaegt (Dateninkonsistenz)
   */
  static toDomain(record: PrismaQualifikationMapping): QualifikationMapping {
    const result = QualifikationMapping.reconstitute({
      id: record.id,
      externalName: record.externalName,
      externalSource: record.externalSource as IntegrationType,
      qualifikationId: record.qualifikationId,
      isAutoMatched: record.isAutoMatched,
      confidence: record.confidence,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    });

    // Reconstitute sollte nie fehlschlagen bei gueltigen DB-Daten
    if (result.isFailure) {
      throw new Error(`Failed to reconstitute QualifikationMapping: ${result.error}`);
    }

    return result.value!;
  }
}
