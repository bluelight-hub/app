import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '../common/einsatz-person-error-codes';
import { EINSATZ_PERSON_VALIDATION, EINSATZ_PERSON_VALIDATION_ERRORS } from '../constants/einsatz-person-validation.constants';
import { EinsatzPersonHinzugefuegtEvent } from '../events/einsatz-person-hinzugefuegt.event';
import { PersonZuFahrzeugZugewiesenEvent } from '../events/person-zu-fahrzeug-zugewiesen.event';
import { PersonVonFahrzeugEntferntEvent } from '../events/person-von-fahrzeug-entfernt.event';
import { EinsatzPersonId } from '../value-objects/einsatz-person-id';
import { GeoPosition } from '../value-objects/geo-position.vo';

/**
 * Props für EinsatzPerson.createFromStammPerson() Factory Method.
 * Erstellt eine EinsatzPerson als KOPIE einer StammPerson.
 */
export interface CreateEinsatzPersonFromStammProps {
  /** Einsatz-ID (UUID) zu dem die Person registriert wird */
  einsatzId: string;
  /** Stamm-Person-ID (CUID2) aus dem kopiert wird */
  stammId: string;
  /** Vorname - KOPIERT von StammPerson */
  vorname: string;
  /** Nachname - KOPIERT von StammPerson */
  nachname: string;
  /** Funktion im Einsatz (Helfer, Rettungshelfer, etc.) */
  funktion: string;
  /** Funkrufname - KOPIERT von StammPerson (optional) */
  funkrufname?: string;
  /** Qualifikation-IDs - KOPIERT (Snapshot) */
  qualifikationIds?: string[];
  /** User-ID der die Person registriert (Audit-Trail) */
  createdBy: string;
  /** Initiale Position (optional, z.B. GPS) */
  position?: { lat: number; lng: number };
}

/**
 * Props für EinsatzPerson.createTemporary() Factory Method.
 * Erstellt eine temporäre EinsatzPerson OHNE Referenz zu Stammdaten.
 */
export interface CreateTemporaryEinsatzPersonProps {
  /** Einsatz-ID (UUID) zu dem die Person registriert wird */
  einsatzId: string;
  /** Vorname - DIREKT eingegeben (nicht aus Stammdaten) */
  vorname: string;
  /** Nachname - DIREKT eingegeben (nicht aus Stammdaten) */
  nachname: string;
  /** Funktion im Einsatz (Helfer, Rettungshelfer, etc.) */
  funktion: string;
  /** Funkrufname - DIREKT eingegeben (optional) */
  funkrufname?: string;
  /** Qualifikation-IDs (optional) */
  qualifikationIds?: string[];
  /** User-ID der die Person registriert (Audit-Trail) */
  createdBy: string;
  /** Initiale Position (optional, z.B. GPS) */
  position?: { lat: number; lng: number };
}

/**
 * Props für EinsatzPerson.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteEinsatzPersonProps {
  id: string;
  einsatzId: string;
  stammId?: string;
  vorname: string;
  nachname: string;
  funktion: string;
  funkrufname?: string;
  qualifikationIds: string[];
  position?: { lat: number; lng: number };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  fahrzeugId?: string;
}

/**
 * EinsatzPerson Aggregate Root.
 *
 * Repräsentiert eine Person die einem aktiven Einsatz zugewiesen ist.
 * Erstellt als KOPIE (Snapshot) einer StammPerson zum Zeitpunkt der Erfassung.
 *
 * **KRITISCHE DESIGN-ENTSCHEIDUNG: Kopier-Semantik (Snapshot Pattern)**
 * - `vorname`, `nachname`, `funkrufname` werden KOPIERT, nicht referenziert
 * - WARUM? Änderungen an StammPerson sollen laufende Einsätze NICHT beeinflussen
 * - Historische Korrektheit: Der Einsatzbericht zeigt den Namen zum Erfassungszeitpunkt
 * - `stammId` referenziert das Original für Tracking, aber Daten sind eigenständig
 *
 * **Two Factories Pattern:**
 * - `createFromStammPerson()` - Erstellt aus Stammdaten (KOPIERT Daten!)
 * - `createTemporary()` - Manuell erfasste Person (stammId = undefined)
 *
 * **Lifecycle:**
 * - Erstellt via Factory wenn Person zum Einsatz registriert wird
 * - Qualifikationen werden als Snapshot gespeichert (M:N Relation)
 * - Gelöscht wenn Einsatz gelöscht wird (CASCADE DELETE)
 *
 * **Invarianten:**
 * - einsatzId ist Pflichtfeld (FK zu Einsatz)
 * - vorname ist Pflichtfeld
 * - nachname ist Pflichtfeld
 * - funktion ist Pflichtfeld (Epic 4 AC1)
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - stammId + einsatzId ist UNIQUE (keine doppelte Registrierung)
 */
export class EinsatzPerson extends AggregateRoot<EinsatzPersonId> {
  private readonly _einsatzId: string; // IMMUTABLE: FK zu Einsatz
  private readonly _stammId?: string; // Optional: Referenz zur Original-StammPerson
  private _vorname: string; // KOPIE von StammPerson
  private _nachname: string; // KOPIE von StammPerson
  private _funktion: string; // Funktion im Einsatz
  private _funkrufname?: string; // KOPIE von StammPerson (optional)
  private _qualifikationIds: string[]; // KOPIE zum Erfassungszeitpunkt
  private _position?: GeoPosition; // Aktuelle GPS-Position
  private _createdBy: string;
  private _updatedBy?: string;
  private _fahrzeugId?: string; // NEU: Nullable Fahrzeug-Referenz

  private constructor(
    id: EinsatzPersonId,
    einsatzId: string,
    vorname: string,
    nachname: string,
    funktion: string,
    createdBy: string,
    stammId?: string,
    funkrufname?: string,
    qualifikationIds?: string[],
    position?: GeoPosition,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
    fahrzeugId?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._stammId = stammId;
    this._vorname = vorname;
    this._nachname = nachname;
    this._funktion = funktion;
    this._funkrufname = funkrufname;
    this._qualifikationIds = [...(qualifikationIds ?? [])];
    this._position = position;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
    this._fahrzeugId = fahrzeugId;
  }

  // ============ Getters ============

  /** Einsatz-ID (UUID) zu dem diese Person gehört */
  get einsatzId(): string {
    return this._einsatzId;
  }

  /** Stamm-Person-ID (CUID2) falls aus Stammdaten erstellt */
  get stammId(): string | undefined {
    return this._stammId;
  }

  /** Vorname (KOPIE zum Erfassungszeitpunkt) */
  get vorname(): string {
    return this._vorname;
  }

  /** Nachname (KOPIE zum Erfassungszeitpunkt) */
  get nachname(): string {
    return this._nachname;
  }

  /** Funktion im Einsatz (Helfer, Rettungshelfer, etc.) */
  get funktion(): string {
    return this._funktion;
  }

  /** Funkrufname (KOPIE zum Erfassungszeitpunkt, optional) */
  get funkrufname(): string | undefined {
    return this._funkrufname;
  }

  /** Qualifikation-IDs (KOPIE zum Erfassungszeitpunkt) */
  get qualifikationIds(): string[] {
    return [...this._qualifikationIds]; // Shallow copy (mutation-safe)
  }

  /** Aktuelle GPS-Position (optional) */
  get position(): GeoPosition | undefined {
    return this._position;
  }

  /** User-ID des Erstellers (Audit-Trail) */
  get createdBy(): string {
    return this._createdBy;
  }

  /** User-ID des letzten Bearbeiters (Audit-Trail) */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  /** ID des zugewiesenen Fahrzeugs (nullable) */
  get fahrzeugId(): string | undefined {
    return this._fahrzeugId;
  }

  // ============ Factory Methods ============

  /**
   * Factory Method: Erstellt EinsatzPerson aus StammPerson-Daten.
   *
   * **Snapshot Pattern:**
   * - KOPIERT vorname, nachname, funkrufname von StammPerson
   * - Setzt stammId als Referenz zum Original
   * - Emittiert EinsatzPersonHinzugefuegtEvent für ETB-Eintrag
   *
   * @param props - CreateEinsatzPersonFromStammProps mit StammPerson-Daten
   * @returns Result<EinsatzPerson> - Success oder Failure mit Fehlermeldung
   */
  static createFromStammPerson(props: CreateEinsatzPersonFromStammProps): Result<EinsatzPerson> {
    // Validation: einsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.EINSATZ_ID_REQUIRED);
    }

    // Validation: stammId (CUID2 Format)
    const trimmedStammId = props.stammId?.trim() ?? '';
    if (trimmedStammId.length === 0 || !isCuid(trimmedStammId)) {
      return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND, 'stammId muss ein gültiger CUID2-Identifier sein'));
    }

    // Validation: vorname
    const trimmedVorname = props.vorname?.trim() ?? '';
    if (trimmedVorname.length < EINSATZ_PERSON_VALIDATION.VORNAME_MIN_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_REQUIRED);
    }
    if (trimmedVorname.length > EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG);
    }

    // Validation: nachname
    const trimmedNachname = props.nachname?.trim() ?? '';
    if (trimmedNachname.length < EINSATZ_PERSON_VALIDATION.NACHNAME_MIN_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.NACHNAME_REQUIRED);
    }
    if (trimmedNachname.length > EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG);
    }

    // Validation: funktion
    const trimmedFunktion = props.funktion?.trim() ?? '';
    if (trimmedFunktion.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.FUNKTION_REQUIRED);
    }
    if (trimmedFunktion.length > EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.FUNKTION_TOO_LONG);
    }

    // Validation: funkrufname (optional)
    let trimmedFunkrufname: string | undefined = props.funkrufname?.trim();
    if (trimmedFunkrufname && trimmedFunkrufname.length > EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'Funkrufname darf maximal 50 Zeichen lang sein'));
    }
    if (trimmedFunkrufname !== undefined && trimmedFunkrufname.length === 0) {
      trimmedFunkrufname = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<EinsatzPerson>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, positionResult.error ?? 'Ungültige Position'));
      }
      geoPosition = positionResult.value;
    }

    // Validation: qualifikationIds (optional, must be valid CUIDs)
    const validQualifikationIds: string[] = [];
    if (props.qualifikationIds) {
      for (const qId of props.qualifikationIds) {
        const trimmedQId = qId?.trim() ?? '';
        if (trimmedQId.length > 0) {
          if (!isCuid(trimmedQId)) {
            return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.INVALID_QUALIFIKATION, `Qualifikation-ID "${trimmedQId}" ist ungültig`));
          }
          validQualifikationIds.push(trimmedQId);
        }
      }
    }

    // Create ID
    const idResult = EinsatzPersonId.create();
    if (idResult.isFailure) {
      return Result.fail<EinsatzPerson>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzPerson>('Fehler bei ID-Generierung');
    }

    // Create Aggregate
    const einsatzPerson = new EinsatzPerson(
      id,
      trimmedEinsatzId,
      trimmedVorname,
      trimmedNachname,
      trimmedFunktion,
      trimmedCreatedBy,
      trimmedStammId,
      trimmedFunkrufname,
      validQualifikationIds,
      geoPosition,
    );

    // Emit Domain Event (für ETB-Eintrag)
    einsatzPerson.addDomainEvent(new EinsatzPersonHinzugefuegtEvent(trimmedEinsatzId, id.value, trimmedStammId, trimmedVorname, trimmedNachname, trimmedFunktion, trimmedCreatedBy));

    return Result.ok<EinsatzPerson>(einsatzPerson);
  }

  /**
   * Factory Method: Erstellt temporäre EinsatzPerson OHNE Stammdaten-Referenz.
   *
   * **Use Case (Story 4-1 AC2):**
   * - Manuell erfasste Person ohne Autocomplete-Auswahl
   * - Schnelle Erfassung ohne vorherige Stammdaten-Anlage
   * - Kein stammId gesetzt (undefined)
   * - Vorname, Nachname, Funktion direkt eingegeben
   *
   * @param props - CreateTemporaryEinsatzPersonProps ohne StammPerson-Daten
   * @returns Result<EinsatzPerson> - Success oder Failure mit Fehlermeldung
   */
  static createTemporary(props: CreateTemporaryEinsatzPersonProps): Result<EinsatzPerson> {
    // Validation: einsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.EINSATZ_ID_REQUIRED);
    }

    // Validation: vorname
    const trimmedVorname = props.vorname?.trim() ?? '';
    if (trimmedVorname.length < EINSATZ_PERSON_VALIDATION.VORNAME_MIN_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_REQUIRED);
    }
    if (trimmedVorname.length > EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG);
    }

    // Validation: nachname
    const trimmedNachname = props.nachname?.trim() ?? '';
    if (trimmedNachname.length < EINSATZ_PERSON_VALIDATION.NACHNAME_MIN_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.NACHNAME_REQUIRED);
    }
    if (trimmedNachname.length > EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG);
    }

    // Validation: funktion
    const trimmedFunktion = props.funktion?.trim() ?? '';
    if (trimmedFunktion.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.FUNKTION_REQUIRED);
    }
    if (trimmedFunktion.length > EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.FUNKTION_TOO_LONG);
    }

    // Validation: funkrufname (optional)
    let trimmedFunkrufname: string | undefined = props.funkrufname?.trim();
    if (trimmedFunkrufname && trimmedFunkrufname.length > EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'Funkrufname darf maximal 50 Zeichen lang sein'));
    }
    if (trimmedFunkrufname !== undefined && trimmedFunkrufname.length === 0) {
      trimmedFunkrufname = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<EinsatzPerson>(EINSATZ_PERSON_VALIDATION_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<EinsatzPerson>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, positionResult.error ?? 'Ungültige Position'));
      }
      geoPosition = positionResult.value;
    }

    // Validation: qualifikationIds (optional, must be valid CUIDs)
    const validQualifikationIds: string[] = [];
    if (props.qualifikationIds) {
      for (const qId of props.qualifikationIds) {
        const trimmedQId = qId?.trim() ?? '';
        if (trimmedQId.length > 0) {
          if (!isCuid(trimmedQId)) {
            return Result.fail<EinsatzPerson>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.INVALID_QUALIFIKATION, `Qualifikation-ID "${trimmedQId}" ist ungültig`));
          }
          validQualifikationIds.push(trimmedQId);
        }
      }
    }

    // Create ID
    const idResult = EinsatzPersonId.create();
    if (idResult.isFailure) {
      return Result.fail<EinsatzPerson>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzPerson>('Fehler bei ID-Generierung');
    }

    // Create Aggregate (stammId = undefined für temporäre Personen)
    const einsatzPerson = new EinsatzPerson(
      id,
      trimmedEinsatzId,
      trimmedVorname,
      trimmedNachname,
      trimmedFunktion,
      trimmedCreatedBy,
      undefined, // stammId: undefined (temporäre Person)
      trimmedFunkrufname,
      validQualifikationIds,
      geoPosition,
    );

    // Emit Domain Event (stammId: undefined für temporäre Personen)
    einsatzPerson.addDomainEvent(
      new EinsatzPersonHinzugefuegtEvent(
        trimmedEinsatzId,
        id.value,
        undefined, // stammId: undefined
        trimmedVorname,
        trimmedNachname,
        trimmedFunktion,
        trimmedCreatedBy,
      ),
    );

    return Result.ok<EinsatzPerson>(einsatzPerson);
  }

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteEinsatzPersonProps mit allen DB-Feldern
   * @returns Result<EinsatzPerson>
   */
  static reconstitute(props: ReconstituteEinsatzPersonProps): Result<EinsatzPerson> {
    const idResult = EinsatzPersonId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail<EinsatzPerson>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzPerson>('Ungültige ID');
    }

    // Position rekonstruieren (falls vorhanden)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzPerson>(`Korrupte Position in DB-Daten: ${positionResult.error}`);
      }
      geoPosition = positionResult.value;
    }

    // Trim für Konsistenz
    const trimmedFunkrufname = props.funkrufname?.trim();
    const funkrufname = trimmedFunkrufname && trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;

    return Result.ok<EinsatzPerson>(
      new EinsatzPerson(
        id,
        props.einsatzId.trim(),
        props.vorname.trim(),
        props.nachname.trim(),
        props.funktion.trim(),
        props.createdBy.trim(),
        props.stammId?.trim(),
        funkrufname,
        props.qualifikationIds,
        geoPosition,
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
        props.fahrzeugId,
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Weist die Person einem Fahrzeug zu.
   *
   * Emittiert PersonZuFahrzeugZugewiesenEvent für ETB-Eintrag.
   * Idempotent: Zuweisung zum gleichen Fahrzeug erzeugt kein Event.
   *
   * @param fahrzeugId - EinsatzFahrzeug-ID (CUID2)
   * @param fahrzeugFunkrufname - Für Event/ETB (denormalisiert)
   * @param updatedBy - User-ID für Audit
   * @returns Result<void>
   */
  assignToFahrzeug(fahrzeugId: string, fahrzeugFunkrufname: string, updatedBy: string): Result<void> {
    // Validation: fahrzeugId
    if (!fahrzeugId?.trim() || !isCuid(fahrzeugId.trim())) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'fahrzeugId muss ein gültiger CUID2-Identifier sein'));
    }
    // Validation: fahrzeugFunkrufname (BLOCKER Fix)
    if (!fahrzeugFunkrufname?.trim()) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'fahrzeugFunkrufname ist erforderlich'));
    }
    // Validation: updatedBy
    if (!updatedBy?.trim() || !isCuid(updatedBy.trim())) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    const trimmedFahrzeugId = fahrzeugId.trim();
    const trimmedFunkrufname = fahrzeugFunkrufname.trim();
    const trimmedUpdatedBy = updatedBy.trim();

    // Idempotenz: Bereits zugewiesen → kein Event
    if (this._fahrzeugId === trimmedFahrzeugId) {
      return Result.ok<void>(undefined);
    }

    // State Update
    this._fahrzeugId = trimmedFahrzeugId;
    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    // Domain Event
    this.addDomainEvent(new PersonZuFahrzeugZugewiesenEvent(this._einsatzId, this._id.value, trimmedFahrzeugId, this._vorname, this._nachname, trimmedFunkrufname, trimmedUpdatedBy));

    return Result.ok<void>(undefined);
  }

  /**
   * Entfernt die Fahrzeug-Zuweisung.
   *
   * Emittiert PersonVonFahrzeugEntferntEvent für ETB-Eintrag.
   * Idempotent: Entfernen ohne Zuweisung erzeugt kein Event.
   *
   * @param fahrzeugFunkrufname - Für Event/ETB (denormalisiert)
   * @param updatedBy - User-ID für Audit
   * @returns Result<void>
   */
  removeFromFahrzeug(fahrzeugFunkrufname: string, updatedBy: string): Result<void> {
    // Validation: fahrzeugFunkrufname (für ETB-Eintrag)
    if (!fahrzeugFunkrufname?.trim()) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'fahrzeugFunkrufname ist erforderlich'));
    }

    // Validation: updatedBy
    if (!updatedBy?.trim() || !isCuid(updatedBy.trim())) {
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR, 'updatedBy muss ein gültiger CUID2-Identifier sein'));
    }

    // Idempotenz: Nicht zugewiesen → Success (kein Event)
    if (!this._fahrzeugId) {
      return Result.ok<void>(undefined);
    }

    const previousFahrzeugId = this._fahrzeugId;
    const trimmedFunkrufname = fahrzeugFunkrufname.trim();
    const trimmedUpdatedBy = updatedBy.trim();

    // State Update
    this._fahrzeugId = undefined;
    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    // Domain Event
    this.addDomainEvent(new PersonVonFahrzeugEntferntEvent(this._einsatzId, this._id.value, previousFahrzeugId, this._vorname, this._nachname, trimmedFunkrufname, trimmedUpdatedBy));

    return Result.ok<void>(undefined);
  }
}
