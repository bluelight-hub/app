import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { GEO_POSITION_VALIDATION } from '@domain/kraefte/value-objects/geo-position.vo';

/**
 * Command für das Registrieren einer Person zu einem aktiven Einsatz.
 *
 * **AC1 - Stammdaten-Person auswählen (optional):**
 * User wählt optional eine StammPerson aus der Liste. Die stammPersonId identifiziert
 * das ausgewählte Person. Falls stammPersonId gesetzt ist, werden Daten von der
 * StammPerson kopiert (Snapshot Pattern).
 *
 * **AC2 - Manuelle Erfassung:**
 * Falls keine StammPerson ausgewählt wurde (stammPersonId = undefined), werden
 * vorname, nachname, funktion direkt eingegeben. Der Handler erstellt dann eine
 * temporäre EinsatzPerson ohne Stammdaten-Referenz.
 *
 * **AC3 - Duplikat-Validierung:**
 * Handler prüft ob eine Person mit gleichem stammPersonId bereits im Einsatz
 * registriert ist (UNIQUE Constraint per Einsatz).
 */
export class RegistrierePersonCommand {
  private constructor(
    /** Einsatz-ID zu dem die Person registriert wird (UUID) */
    public readonly einsatzId: string,
    /** Stamm-Person-ID aus dem kopiert wird (CUID2, optional) */
    public readonly stammPersonId: string | undefined,
    /** Vorname - KOPIERT von StammPerson oder manuell eingegeben */
    public readonly vorname: string,
    /** Nachname - KOPIERT von StammPerson oder manuell eingegeben */
    public readonly nachname: string,
    /** Funktion im Einsatz (Helfer, Rettungshelfer, etc.) */
    public readonly funktion: string,
    /** Funkrufname (optional) */
    public readonly funkrufname: string | undefined,
    /** Qualifikation-IDs (optional) */
    public readonly qualifikationIds: string[],
    /** User-ID der die Person registriert (CUID2, Audit-Trail) */
    public readonly registriertVon: string,
    /** Optionale initiale GPS-Position */
    public readonly position?: { lat: number; lng: number },
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<RegistrierePersonCommand>
   */
  static create(props: {
    einsatzId: string;
    stammPersonId?: string;
    vorname: string;
    nachname: string;
    funktion: string;
    funkrufname?: string;
    qualifikationIds?: string[];
    registriertVon: string;
    position?: { lat: number; lng: number };
  }): Result<RegistrierePersonCommand> {
    // Validation: einsatzId (UUID Format, nicht leer)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: stammPersonId (CUID2 Format, optional)
    let trimmedStammPersonId: string | undefined = props.stammPersonId?.trim();
    if (trimmedStammPersonId !== undefined && trimmedStammPersonId.length > 0) {
      if (!isCuid(trimmedStammPersonId)) {
        return Result.fail('stammPersonId muss ein gültiger CUID2-Identifier sein');
      }
    } else {
      trimmedStammPersonId = undefined;
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

    // Validation: funktion (erforderlich)
    const trimmedFunktion = props.funktion?.trim() ?? '';
    if (trimmedFunktion.length === 0) {
      return Result.fail('Funktion ist erforderlich');
    }
    if (trimmedFunktion.length > 50) {
      return Result.fail('Funktion darf maximal 50 Zeichen lang sein');
    }

    // Validation: funkrufname (optional)
    let trimmedFunkrufname: string | undefined = props.funkrufname?.trim();
    if (trimmedFunkrufname && trimmedFunkrufname.length > 50) {
      return Result.fail('Funkrufname darf maximal 50 Zeichen lang sein');
    }
    if (trimmedFunkrufname !== undefined && trimmedFunkrufname.length === 0) {
      trimmedFunkrufname = undefined;
    }

    // Validation: registriertVon (CUID2 Format)
    const trimmedRegistriertVon = props.registriertVon?.trim() ?? '';
    if (trimmedRegistriertVon.length === 0) {
      return Result.fail('registriertVon ist erforderlich');
    }
    if (!isCuid(trimmedRegistriertVon)) {
      return Result.fail('registriertVon muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: qualifikationIds (optional, must be valid CUIDs)
    const validQualifikationIds: string[] = [];
    if (props.qualifikationIds) {
      for (const qId of props.qualifikationIds) {
        const trimmedQId = qId?.trim() ?? '';
        if (trimmedQId.length > 0) {
          if (!isCuid(trimmedQId)) {
            return Result.fail(`Qualifikation-ID "${trimmedQId}" ist ungültig`);
          }
          validQualifikationIds.push(trimmedQId);
        }
      }
    }

    // Validation: position (optional, WGS84 bounds)
    if (props.position) {
      const { lat, lng } = props.position;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return Result.fail('Position muss lat und lng als Zahlen enthalten');
      }
      if (lat < GEO_POSITION_VALIDATION.LAT_MIN || lat > GEO_POSITION_VALIDATION.LAT_MAX) {
        return Result.fail(`Breitengrad (lat) muss zwischen ${GEO_POSITION_VALIDATION.LAT_MIN} und ${GEO_POSITION_VALIDATION.LAT_MAX} liegen`);
      }
      if (lng < GEO_POSITION_VALIDATION.LNG_MIN || lng > GEO_POSITION_VALIDATION.LNG_MAX) {
        return Result.fail(`Längengrad (lng) muss zwischen ${GEO_POSITION_VALIDATION.LNG_MIN} und ${GEO_POSITION_VALIDATION.LNG_MAX} liegen`);
      }
    }

    return Result.ok(
      new RegistrierePersonCommand(
        trimmedEinsatzId,
        trimmedStammPersonId,
        trimmedVorname,
        trimmedNachname,
        trimmedFunktion,
        trimmedFunkrufname,
        validQualifikationIds,
        trimmedRegistriertVon,
        props.position,
      ),
    );
  }
}
