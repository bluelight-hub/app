import { Result } from '@domain/common/result';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

/**
 * Query für das Laden aller aktiven RollenBesetzungen eines Einsatzes.
 *
 * **Story 5.2 - AC4:** Freigegebene Rollen (freigegebenAm != null)
 * werden NICHT in der Liste angezeigt.
 *
 * @see FindAllRollenBesetzungQueryHandler für Ausführung
 */
export class FindAllRollenBesetzungQuery {
  private constructor(
    /** Einsatz-ID für die Besetzungen geladen werden sollen */
    public readonly einsatzId: EinsatzId,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (CUID2)
   * @returns Result<FindAllRollenBesetzungQuery>
   */
  static create(einsatzId: string): Result<FindAllRollenBesetzungQuery> {
    const einsatzIdResult = EinsatzId.create(einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail(einsatzIdResult.error ?? 'Ungültige Einsatz-ID');
    }

    return Result.ok(new FindAllRollenBesetzungQuery(einsatzIdResult.value));
  }
}
