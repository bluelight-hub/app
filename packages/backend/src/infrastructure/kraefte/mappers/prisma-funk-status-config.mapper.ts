import type { FunkStatusConfig as PrismaFunkStatusConfig } from '@/generated/prisma/client';
import { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import { Result } from '@domain/common/result';

/**
 * Mapper zwischen Prisma FunkStatusConfig Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **Config-Only Pattern:**
 * - KEIN toPersistenceCreate - FunkStatusConfig wird via Seed/Migration erstellt
 * - NUR toPersistenceUpdate - Nur editierbare Felder aktualisieren
 * - code und standardLabel werden NICHT in Update gemappt (Immutable)
 */
export class PrismaFunkStatusConfigMapper {
  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<FunkStatusConfig> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **Erwartete Fehlerszenarien:**
   * - Ungültiger Code (nicht 0-9)
   * - Ungültiges Farbformat (nicht #RRGGBB)
   * - Fehlende Pflichtfelder (sollte durch DB Constraints verhindert werden)
   * - Dateninkonsistenz (z.B. createdBy ist kein CUID2)
   *
   * @param entity - Prisma FunkStatusConfig Entity
   * @returns Result<FunkStatusConfig> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaFunkStatusConfig): Result<FunkStatusConfig> {
    const result = FunkStatusConfig.reconstitute({
      id: entity.id,
      code: entity.code,
      standardLabel: entity.standardLabel,
      customLabel: entity.customLabel ?? undefined, // NULL → undefined
      farbe: entity.farbe ?? undefined, // NULL → undefined
      istAlarmierbar: entity.istAlarmierbar,
      beschreibung: entity.beschreibung ?? undefined, // NULL → undefined
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy ?? undefined, // NULL → undefined
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<FunkStatusConfig>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<FunkStatusConfig>(result.value);
  }

  /**
   * Mappt Domain Aggregate zu Prisma Update Data.
   *
   * **Config-Only Pattern: NUR Update, KEIN Create!**
   * FunkStatusConfig wird via Seed/Migration erstellt, nicht via Application Layer.
   *
   * **WICHTIG: Welche Felder werden NICHT gemappt?**
   * - code: Immutable Business Key (identifiziert Status)
   * - standardLabel: System-definiert, nur via Seed/Migration änderbar
   * - id: Immutable (Primary Key)
   * - createdAt: Immutable (Timestamp)
   * - createdBy: Immutable (Audit-Trail)
   *
   * **WICHTIG: Farbe Normalisierung!**
   * - Farbe wird zu UpperCase konvertiert (#ff0000 → #FF0000)
   * - Garantiert einheitliche Darstellung in UI
   * - Verhindert Case-Sensitivity-Probleme bei Vergleichen
   *
   * **WICHTIG: updatedAt wird NICHT gemappt!**
   * Prisma @updatedAt Decorator aktualisiert das Feld automatisch.
   *
   * @param aggregate - Das FunkStatusConfig Domain Aggregate
   * @returns Prisma-kompatibles Update-Datenobjekt
   */
  static toPersistenceUpdate(aggregate: FunkStatusConfig): Omit<PrismaFunkStatusConfig, 'id' | 'code' | 'standardLabel' | 'createdAt' | 'updatedAt' | 'createdBy'> {
    return {
      customLabel: aggregate.customLabel ?? null, // undefined → NULL (DB nullable)
      farbe: aggregate.farbe ? aggregate.farbe.toUpperCase() : null, // Normalisierung!
      istAlarmierbar: aggregate.istAlarmierbar,
      beschreibung: aggregate.beschreibung ?? null, // undefined → NULL (DB nullable)
      updatedBy: aggregate.updatedBy ?? null, // Pflichtfeld für Audit-Trail
      // code, standardLabel, id, createdAt, createdBy sind NICHT änderbar
      // updatedAt wird von Prisma @updatedAt automatisch gesetzt
    };
  }
}
