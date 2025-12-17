import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Erfassen eines temporären Fahrzeugs.
 *
 * **AC1 - Temporäres Fahrzeug anlegen:**
 * User gibt manuell funkrufname, fahrzeugtypId und optional kennzeichen ein.
 * Es wird KEIN StammFahrzeug referenziert (stammId ist undefined).
 *
 * **AC2 - Duplikat-Validierung:**
 * Handler prüft ob ein Fahrzeug mit gleichem Funkrufnamen bereits im
 * Einsatz existiert (UNIQUE Constraint per Einsatz).
 *
 * **AC3 - Fahrzeugtyp-Validierung:**
 * Handler prüft ob der Fahrzeugtyp existiert und aktiv ist.
 */
export class ErfasseTemporalesFahrzeugCommand {
  private constructor(
    /** Einsatz-ID zu dem das Fahrzeug erfasst wird (UUID) */
    public readonly einsatzId: string,
    /** Fahrzeugtyp-ID (CUID2) für Kategorisierung */
    public readonly fahrzeugtypId: string,
    /** Funkrufname des temporären Fahrzeugs (1-100 Zeichen) */
    public readonly funkrufname: string,
    /** User-ID des erfassenden Users (CUID2, Audit-Trail) */
    public readonly createdBy: string,
    /** Optionales Kennzeichen */
    public readonly kennzeichen?: string,
    /** Optionale initiale GPS-Position */
    public readonly position?: { lat: number; lng: number },
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<ErfasseTemporalesFahrzeugCommand>
   */
  static create(props: {
    einsatzId: string;
    fahrzeugtypId: string;
    funkrufname: string;
    createdBy: string;
    kennzeichen?: string;
    position?: { lat: number; lng: number };
  }): Result<ErfasseTemporalesFahrzeugCommand> {
    // Validation: einsatzId (UUID Format, nicht leer)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: fahrzeugtypId (CUID2 Format)
    const trimmedFahrzeugtypId = props.fahrzeugtypId?.trim() ?? '';
    if (trimmedFahrzeugtypId.length === 0) {
      return Result.fail('fahrzeugtypId ist erforderlich');
    }
    if (!isCuid(trimmedFahrzeugtypId)) {
      return Result.fail('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: funkrufname (1-100 Zeichen)
    const trimmedFunkrufname = props.funkrufname?.trim() ?? '';
    if (trimmedFunkrufname.length === 0) {
      return Result.fail('funkrufname ist erforderlich');
    }
    if (trimmedFunkrufname.length > 100) {
      return Result.fail('funkrufname darf maximal 100 Zeichen lang sein');
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail('createdBy ist erforderlich');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: kennzeichen (optional, max 20 Zeichen)
    const trimmedKennzeichen = props.kennzeichen?.trim();
    if (trimmedKennzeichen && trimmedKennzeichen.length > 20) {
      return Result.fail('kennzeichen darf maximal 20 Zeichen lang sein');
    }

    // Validation: position (optional, WGS84 bounds)
    if (props.position) {
      const { lat, lng } = props.position;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return Result.fail('Position muss lat und lng als Zahlen enthalten');
      }
      if (lat < -90 || lat > 90) {
        return Result.fail('Breitengrad (lat) muss zwischen -90 und 90 liegen');
      }
      if (lng < -180 || lng > 180) {
        return Result.fail('Längengrad (lng) muss zwischen -180 und 180 liegen');
      }
    }

    return Result.ok(
      new ErfasseTemporalesFahrzeugCommand(
        trimmedEinsatzId,
        trimmedFahrzeugtypId,
        trimmedFunkrufname,
        trimmedCreatedBy,
        trimmedKennzeichen && trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined,
        props.position,
      ),
    );
  }
}
