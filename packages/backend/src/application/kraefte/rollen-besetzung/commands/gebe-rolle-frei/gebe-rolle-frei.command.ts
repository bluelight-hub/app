import { Result } from '@domain/common/result';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Command zur Freigabe einer besetzten Führungsrolle.
 *
 * **Story 5.2:** Implementiert das Soft-Delete Pattern für Rollenbesetzungen.
 * Nach Freigabe ist die Person wieder als reguläre Einsatzkraft verfügbar.
 *
 * **Business Rules:**
 * - AC1: Freigabe setzt `freigegebenAm` und emittiert RolleFreigegeben Event
 * - AC3: Idempotenz - Doppelte Freigabe wird abgewiesen (BEREITS_FREIGEGEBEN)
 *
 * **Error Codes:**
 * - `Invalid rollenBesetzungId`: CUID2 Format-Fehler
 * - `Invalid freigegebenVon format`: CUID Format-Fehler (User ID)
 * - `freigegebenVon is required`: Pflichtfeld fehlt
 */
export class GebeRolleFreiCommand {
  private constructor(
    public readonly rollenBesetzungId: RollenBesetzungId,
    public readonly freigegebenVon: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * Validiert alle Eingaben und gibt Result<Command> zurück.
   * Beide IDs werden als CUID validiert (RollenBesetzungId: CUID2, UserId: CUID).
   *
   * @param props - Command Properties
   * @returns Result<GebeRolleFreiCommand> - Success oder Failure mit Error
   */
  static create(props: { rollenBesetzungId: string; freigegebenVon: string }): Result<GebeRolleFreiCommand> {
    // Validiere rollenBesetzungId (CUID2 Format)
    const idResult = RollenBesetzungId.create(props.rollenBesetzungId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail(idResult.error ?? 'Invalid rollenBesetzungId');
    }

    // Validiere freigegebenVon (Pflichtfeld + CUID Format)
    if (!props.freigegebenVon || props.freigegebenVon.trim() === '') {
      return Result.fail('freigegebenVon is required');
    }

    // Validiere freigegebenVon als UserId (CUID Format)
    const userIdResult = UserId.create(props.freigegebenVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail('Invalid freigegebenVon format - must be valid CUID');
    }

    return Result.ok(new GebeRolleFreiCommand(idResult.value, userIdResult.value.value));
  }
}
