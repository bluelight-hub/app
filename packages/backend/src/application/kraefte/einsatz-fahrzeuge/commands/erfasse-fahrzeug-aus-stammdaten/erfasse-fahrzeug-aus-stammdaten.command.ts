import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Erfassen eines Fahrzeugs aus Stammdaten.
 *
 * **AC1 - Stammdaten-Fahrzeug auswählen:**
 * User wählt ein StammFahrzeug aus der Liste. Die stammId identifiziert
 * das ausgewählte Fahrzeug.
 *
 * **AC2 - Snapshot Pattern:**
 * Der Handler lädt das StammFahrzeug und KOPIERT die relevanten Daten
 * (funkrufname, kennzeichen, fahrzeugtypId) in das neue EinsatzFahrzeug.
 *
 * **AC4 - Duplikat-Validierung:**
 * Handler prüft ob ein Fahrzeug mit gleichem Funkrufnamen bereits im
 * Einsatz existiert (UNIQUE Constraint per Einsatz).
 */
export class ErfasseFahrzeugAusStammdatenCommand {
  private constructor(
    /** Einsatz-ID zu dem das Fahrzeug erfasst wird (UUID) */
    public readonly einsatzId: string,
    /** Stamm-Fahrzeug-ID aus dem kopiert wird (CUID2) */
    public readonly stammId: string,
    /** User-ID des erfassenden Users (CUID2, Audit-Trail) */
    public readonly createdBy: string,
    /** Optionale initiale GPS-Position */
    public readonly position?: { lat: number; lng: number },
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<ErfasseFahrzeugAusStammdatenCommand>
   */
  static create(props: { einsatzId: string; stammId: string; createdBy: string; position?: { lat: number; lng: number } }): Result<ErfasseFahrzeugAusStammdatenCommand> {
    // Validation: einsatzId (UUID Format, nicht leer)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: stammId (CUID2 Format)
    const trimmedStammId = props.stammId?.trim() ?? '';
    if (trimmedStammId.length === 0) {
      return Result.fail('stammId ist erforderlich');
    }
    if (!isCuid(trimmedStammId)) {
      return Result.fail('stammId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail('createdBy ist erforderlich');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail('createdBy muss ein gültiger CUID2-Identifier sein');
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

    return Result.ok(new ErfasseFahrzeugAusStammdatenCommand(trimmedEinsatzId, trimmedStammId, trimmedCreatedBy, props.position));
  }
}
