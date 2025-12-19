import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command zur Registrierung einer Person via QR-Code (DRK-App Format).
 *
 * Der QR-Code enthält die Personalnummer (mnr), Vorname (vn), Nachname (nn)
 * und optional die Funkkennung (fk). Die Personalnummer wird für den
 * Stammdaten-Lookup verwendet (falls vorhanden).
 *
 * @see Story 4.2 - Person via QR-Code registrieren
 */
export class RegistrierePersonViaQrCodeCommand {
  private constructor(
    /** Einsatz-ID zu dem die Person registriert wird (UUID) */
    public readonly einsatzId: string,
    /** Personalnummer aus QR-Code (DRK: "mnr" Parameter) */
    public readonly personalnummer: string,
    /** Vorname aus QR-Code (DRK: "vn" Parameter) */
    public readonly vorname: string,
    /** Nachname aus QR-Code (DRK: "nn" Parameter) */
    public readonly nachname: string,
    /** BOS-Funkkennung aus QR-Code (DRK: "fk" Parameter, optional) */
    public readonly funkkennung: string | undefined,
    /** User-ID der die Person registriert (CUID2, Audit-Trail) */
    public readonly registriertVon: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * Validiert QR-Daten und erstellt Command.
   * Personalnummer wird später für StammPerson-Lookup verwendet.
   *
   * @param props - Command Properties aus QR-Code
   * @returns Result<RegistrierePersonViaQrCodeCommand>
   */
  static create(props: { einsatzId: string; personalnummer: string; vorname: string; nachname: string; funkkennung?: string; registriertVon: string }): Result<RegistrierePersonViaQrCodeCommand> {
    // Validation: einsatzId (erforderlich)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: personalnummer (erforderlich, aus QR "mnr")
    const trimmedPersonalnummer = props.personalnummer?.trim() ?? '';
    if (trimmedPersonalnummer.length === 0) {
      return Result.fail('Personalnummer ist erforderlich');
    }
    if (trimmedPersonalnummer.length > 50) {
      return Result.fail('Personalnummer darf maximal 50 Zeichen lang sein');
    }

    // Validation: vorname (erforderlich)
    const trimmedVorname = props.vorname?.trim() ?? '';
    if (trimmedVorname.length === 0) {
      return Result.fail('Vorname ist erforderlich');
    }
    if (trimmedVorname.length > 100) {
      return Result.fail('Vorname darf maximal 100 Zeichen lang sein');
    }

    // Validation: nachname (erforderlich)
    const trimmedNachname = props.nachname?.trim() ?? '';
    if (trimmedNachname.length === 0) {
      return Result.fail('Nachname ist erforderlich');
    }
    if (trimmedNachname.length > 100) {
      return Result.fail('Nachname darf maximal 100 Zeichen lang sein');
    }

    // Validation: funkkennung (optional)
    let trimmedFunkkennung: string | undefined = props.funkkennung?.trim();
    if (trimmedFunkkennung && trimmedFunkkennung.length > 50) {
      return Result.fail('Funkkennung darf maximal 50 Zeichen lang sein');
    }
    if (trimmedFunkkennung !== undefined && trimmedFunkkennung.length === 0) {
      trimmedFunkkennung = undefined;
    }

    // Validation: registriertVon (CUID2 Format)
    const trimmedRegistriertVon = props.registriertVon?.trim() ?? '';
    if (trimmedRegistriertVon.length === 0) {
      return Result.fail('registriertVon ist erforderlich');
    }
    if (!isCuid(trimmedRegistriertVon)) {
      return Result.fail('registriertVon muss ein gueltiger CUID2-Identifier sein');
    }

    return Result.ok(new RegistrierePersonViaQrCodeCommand(trimmedEinsatzId, trimmedPersonalnummer, trimmedVorname, trimmedNachname, trimmedFunkkennung, trimmedRegistriertVon));
  }
}
