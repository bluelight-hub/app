import type { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';

/**
 * Mapper zwischen Prisma EinsatzRollenbesetzung und Domain RollenBesetzung Aggregate.
 *
 * **Snapshot-Pattern:**
 * Die Felder rollenName, personVorname, personNachname werden bei Erstellung
 * KOPIERT und bleiben historisch korrekt auch wenn sich die Quelldaten ändern.
 *
 * **Audit Trail Mapping:**
 * - createdAt: DateTime → Date (automatisch durch Prisma)
 * - createdBy: String → string
 * - updatedAt: DateTime → Date (automatisch durch Prisma)
 */
export class PrismaRollenBesetzungMapper {
  /**
   * Konvertiert Prisma Entity zu Domain Aggregate.
   *
   * **Value Object Validation:**
   * - Alle IDs werden als Value Objects validiert (CUID2 Format)
   * - Bei Validierungsfehler: Result.fail mit spezifischer Fehlermeldung
   *
   * @param entity - Prisma EinsatzRollenbesetzung Entity
   * @returns Result<RollenBesetzung> Domain Aggregate oder Fehler
   */
  static toDomain(entity: Prisma.EinsatzRollenbesetzungGetPayload<object>): Result<RollenBesetzung> {
    // Value Object Instantiation mit Fail-Fast Pattern
    const idResult = RollenBesetzungId.create(entity.id);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail(`id: ${idResult.error}`);
    }

    const einsatzIdResult = EinsatzId.create(entity.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail(`einsatzId: ${einsatzIdResult.error}`);
    }

    const personIdResult = EinsatzPersonId.create(entity.personId);
    if (personIdResult.isFailure || !personIdResult.value) {
      return Result.fail(`personId: ${personIdResult.error}`);
    }

    const rolleIdResult = RolleId.create(entity.rollenDefinitionId);
    if (rolleIdResult.isFailure || !rolleIdResult.value) {
      return Result.fail(`rolleId: ${rolleIdResult.error}`);
    }

    // Domain Aggregate via reconstitute() erstellen
    return RollenBesetzung.reconstitute({
      id: idResult.value,
      einsatzId: einsatzIdResult.value,
      einsatzPersonId: personIdResult.value,
      rolleId: rolleIdResult.value,
      rollenName: entity.rollenName,
      personVorname: entity.personVorname,
      personNachname: entity.personNachname,
      createdAt: entity.createdAt,
      createdBy: entity.createdBy,
      updatedAt: entity.updatedAt,
      updatedBy: entity.updatedBy ?? undefined,
      freigegebenAm: entity.freigegebenAm ?? undefined,
      freigegebenVon: entity.freigegebenVon ?? undefined,
    });
  }

  /**
   * Konvertiert Domain Aggregate zu Prisma Create Input.
   *
   * **Required Fields:**
   * - id, einsatzId, rollenDefinitionId, personId: CUID2 String IDs
   * - rollenName, personVorname, personNachname: Snapshot-Felder
   * - creator: User Relation (basierend auf createdBy Scalar Field)
   *
   * **Auto-Generated Fields (Prisma):**
   * - createdAt: DateTime @default(now())
   * - updatedAt: DateTime @updatedAt
   * - createdBy: String @map("created_by") - Auto-set durch creator Relation
   *
   * @param aggregate - Domain RollenBesetzung Aggregate
   * @returns Prisma EinsatzRollenbesetzungCreateInput
   */
  static toPersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungCreateInput {
    return {
      id: aggregate.id.value,
      einsatz: { connect: { id: aggregate.einsatzId.value } },
      rollenDefinition: { connect: { id: aggregate.rolleId.value } },
      person: { connect: { id: aggregate.einsatzPersonId.value } },
      rollenName: aggregate.rollenName,
      personVorname: aggregate.personVorname,
      personNachname: aggregate.personNachname,
      creator: { connect: { id: aggregate.createdBy } },
    };
  }

  /**
   * Konvertiert Domain Aggregate zu Prisma Update Input für Freigabe.
   *
   * **Soft-Delete Pattern (Story 5.2):**
   * - freigegebenAm wird gesetzt bei Freigabe (vorher null)
   * - freigegebenVon speichert User-ID für Audit Trail
   * - updatedBy wird für Audit Trail gesetzt (wer hat die Änderung durchgeführt)
   *
   * **Note:** updatedAt wird automatisch durch Prisma @updatedAt gesetzt.
   *
   * @param aggregate - Domain RollenBesetzung Aggregate mit Freigabe-Daten
   * @returns Prisma EinsatzRollenbesetzungUpdateInput
   */
  static toUpdatePersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungUpdateInput {
    return {
      freigegebenAm: aggregate.freigegebenAm ?? null,
      freigegebenVon: aggregate.freigegebenVon ?? null,
      // Audit Trail: updater Relation für updatedBy Feld
      ...(aggregate.updatedBy && { updater: { connect: { id: aggregate.updatedBy } } }),
    };
  }
}
