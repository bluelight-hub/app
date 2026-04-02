import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '../common/einsatz-fahrzeug-error-codes';
import { EINSATZ_FAHRZEUG_VALIDATION, EINSATZ_FAHRZEUG_VALIDATION_ERRORS } from '../constants/einsatz-fahrzeug-validation.constants';
import { FahrzeugEinheitZugewiesenEvent } from '../events/fahrzeug-einheit-zugewiesen.event';
import { FahrzeugErfasstEvent } from '../events/fahrzeug-erfasst.event';
import { FmsStatusGeaendertEvent } from '../events/fms-status-geaendert.event';
import { EinsatzFahrzeugId } from '../value-objects/einsatz-fahrzeug-id';
import { GeoPosition } from '../value-objects/geo-position.vo';

/**
 * Props für EinsatzFahrzeug.createFromStammdaten() Factory Method.
 * Erstellt ein EinsatzFahrzeug als KOPIE eines StammFahrzeugs.
 */
export interface CreateEinsatzFahrzeugFromStammProps {
  /** Einsatz-ID (UUID) zu dem das Fahrzeug erfasst wird */
  einsatzId: string;
  /** Stamm-Fahrzeug-ID (CUID2) aus dem kopiert wird */
  stammId: string;
  /** Fahrzeugtyp-ID (CUID2) - KOPIERT vom StammFahrzeug */
  fahrzeugtypId: string;
  /** Funkrufname - KOPIERT vom StammFahrzeug (nicht referenziert!) */
  funkrufname: string;
  /** Kennzeichen - KOPIERT vom StammFahrzeug (optional) */
  kennzeichen?: string;
  /** User-ID der das Fahrzeug erfasst (Audit-Trail) */
  createdBy: string;
  /** Initiale Position (optional, z.B. GPS vom Fahrzeug) */
  position?: { lat: number; lng: number };
}

/**
 * Props für EinsatzFahrzeug.createTemporary() Factory Method.
 * Erstellt ein temporäres EinsatzFahrzeug OHNE Referenz zu Stammdaten.
 */
export interface CreateTemporaryEinsatzFahrzeugProps {
  /** Einsatz-ID (UUID) zu dem das Fahrzeug erfasst wird */
  einsatzId: string;
  /** Fahrzeugtyp-ID (CUID2) - bestimmt Icon und Kategorisierung */
  fahrzeugtypId: string;
  /** Funkrufname - DIREKT eingegeben (nicht aus Stammdaten) */
  funkrufname: string;
  /** Kennzeichen - DIREKT eingegeben (optional) */
  kennzeichen?: string;
  /** User-ID der das Fahrzeug erfasst (Audit-Trail) */
  createdBy: string;
  /** Initiale Position (optional, z.B. GPS vom Fahrzeug) */
  position?: { lat: number; lng: number };
}

/**
 * Props für EinsatzFahrzeug.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteEinsatzFahrzeugProps {
  id: string;
  einsatzId: string;
  stammId?: string;
  fahrzeugtypId: string;
  funkrufname: string;
  kennzeichen?: string;
  fmsStatus: number;
  position?: { lat: number; lng: number };
  einheitId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für EinsatzFahrzeug.updateFmsStatus() Method.
 */
export interface UpdateFmsStatusProps {
  fmsStatus: number;
  updatedBy: string;
  position?: { lat: number; lng: number };
}

/**
 * EinsatzFahrzeug Aggregate Root.
 *
 * Repräsentiert ein Fahrzeug das einem aktiven Einsatz zugewiesen ist.
 * Erstellt als KOPIE (Snapshot) eines StammFahrzeugs zum Zeitpunkt der Erfassung.
 *
 * **KRITISCHE DESIGN-ENTSCHEIDUNG: Kopier-Semantik (AC2)**
 * - `funkrufname` und `kennzeichen` werden KOPIERT, nicht referenziert
 * - WARUM? Änderungen am StammFahrzeug sollen laufende Einsätze NICHT beeinflussen
 * - Historische Korrektheit: Der Einsatzbericht zeigt den Namen zum Erfassungszeitpunkt
 * - `stammId` referenziert das Original für Tracking, aber Daten sind eigenständig
 *
 * **Lifecycle:**
 * - Erstellt via `createFromStammdaten()` wenn Fahrzeug zum Einsatz erfasst wird
 * - FMS-Status kann während Einsatz aktualisiert werden (0-9)
 * - Gelöscht wenn Einsatz gelöscht wird (CASCADE DELETE)
 *
 * **FMS-Status Codes:**
 * | Code | Label | Alarmierbar |
 * |------|-------|-------------|
 * | 0 | Nicht einsatzbereit | Nein |
 * | 1 | Auf Wache | Ja |
 * | 2 | Einsatzbereit (Initial) | Ja |
 * | 3-6 | Ausgerückt/Am EO/Sprechwunsch/Außer Dienst | Nein |
 * | 7-9 | Regional konfigurierbar | Konfigurierbar |
 *
 * **Invarianten:**
 * - einsatzId ist Pflichtfeld (FK zu Einsatz)
 * - fahrzeugtypId ist Pflichtfeld (FK zu Fahrzeugtyp)
 * - funkrufname ist Pflichtfeld und UNIQUE pro Einsatz (DB Constraint)
 * - fmsStatus muss zwischen 0 und 9 liegen
 * - createdBy ist Pflichtfeld für Audit-Trail
 */
export class EinsatzFahrzeug extends AggregateRoot<EinsatzFahrzeugId> {
  private readonly _einsatzId: string; // IMMUTABLE: FK zu Einsatz
  private readonly _stammId?: string; // Optional: Referenz zum Original-StammFahrzeug
  private readonly _fahrzeugtypId: string; // IMMUTABLE: FK zu Fahrzeugtyp
  private _funkrufname: string; // KOPIE vom StammFahrzeug
  private _kennzeichen?: string; // KOPIE vom StammFahrzeug
  private _fmsStatus: number; // 0-9, initial 2 (Einsatzbereit)
  private _position?: GeoPosition; // Aktuelle GPS-Position
  private _einheitId?: string; // Optional: zugewiesene taktische Einheit
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: EinsatzFahrzeugId,
    einsatzId: string,
    fahrzeugtypId: string,
    funkrufname: string,
    fmsStatus: number,
    createdBy: string,
    stammId?: string,
    kennzeichen?: string,
    position?: GeoPosition,
    einheitId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._stammId = stammId;
    this._fahrzeugtypId = fahrzeugtypId;
    this._funkrufname = funkrufname;
    this._kennzeichen = kennzeichen;
    this._fmsStatus = fmsStatus;
    this._position = position;
    this._einheitId = einheitId;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /** Einsatz-ID (UUID) zu dem dieses Fahrzeug gehört */
  get einsatzId(): string {
    return this._einsatzId;
  }

  /** Stamm-Fahrzeug-ID (CUID2) falls aus Stammdaten erstellt */
  get stammId(): string | undefined {
    return this._stammId;
  }

  /** Fahrzeugtyp-ID (CUID2) - bestimmt Icon und Kategorisierung */
  get fahrzeugtypId(): string {
    return this._fahrzeugtypId;
  }

  /** Funkrufname (KOPIE zum Erfassungszeitpunkt) */
  get funkrufname(): string {
    return this._funkrufname;
  }

  /** Kennzeichen (KOPIE zum Erfassungszeitpunkt, optional) */
  get kennzeichen(): string | undefined {
    return this._kennzeichen;
  }

  /** Aktueller FMS-Status (0-9) */
  get fmsStatus(): number {
    return this._fmsStatus;
  }

  /** Aktuelle GPS-Position (optional) */
  get position(): GeoPosition | undefined {
    return this._position;
  }

  /** Zugewiesene Einheit-ID (CUID2, optional) */
  get einheitId(): string | undefined {
    return this._einheitId;
  }

  /** User-ID des Erstellers (Audit-Trail) */
  get createdBy(): string {
    return this._createdBy;
  }

  /** User-ID des letzten Bearbeiters (Audit-Trail) */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  // ============ Private Helper Methods ============

  /**
   * Validiert einen FMS-Status Wert.
   *
   * @param status - Der zu validierende FMS-Status (0-9)
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  private static validateFmsStatus(status: number): Result<void> {
    if (!Number.isFinite(status) || !Number.isInteger(status)) {
      return Result.fail<void>(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS, 'FMS-Status muss eine ganze Zahl sein'));
    }

    if (status < EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MIN || status > EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MAX) {
      return Result.fail<void>(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS, EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FMS_STATUS_OUT_OF_RANGE));
    }

    return Result.ok<void>(undefined);
  }

  // ============ Factory Methods ============

  /**
   * Factory Method: Erstellt EinsatzFahrzeug aus StammFahrzeug-Daten.
   *
   * **AC2 - Snapshot Pattern:**
   * - KOPIERT funkrufname und kennzeichen vom StammFahrzeug
   * - Setzt stammId als Referenz zum Original
   * - Initialer FMS-Status ist 2 (Einsatzbereit)
   * - Emittiert FahrzeugErfasstEvent für ETB-Eintrag
   *
   * @param props - CreateEinsatzFahrzeugFromStammProps mit StammFahrzeug-Daten
   * @returns Result<EinsatzFahrzeug> - Success oder Failure mit Fehlermeldung
   */
  static createFromStammdaten(props: CreateEinsatzFahrzeugFromStammProps): Result<EinsatzFahrzeug> {
    // Validation: einsatzId (UUID Format erwartet, aber nicht strikt validiert hier)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.EINSATZ_ID_REQUIRED);
    }

    // Validation: stammId (CUID2 Format)
    const trimmedStammId = props.stammId?.trim() ?? '';
    if (trimmedStammId.length === 0 || !isCuid(trimmedStammId)) {
      return Result.fail<EinsatzFahrzeug>('stammId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: fahrzeugtypId (CUID2 Format)
    const trimmedFahrzeugtypId = props.fahrzeugtypId?.trim() ?? '';
    if (trimmedFahrzeugtypId.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FAHRZEUGTYP_ID_REQUIRED);
    }
    if (!isCuid(trimmedFahrzeugtypId)) {
      return Result.fail<EinsatzFahrzeug>('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: funkrufname (Pflichtfeld)
    const trimmedFunkrufname = props.funkrufname?.trim() ?? '';
    if (trimmedFunkrufname.length < EINSATZ_FAHRZEUG_VALIDATION.FUNKRUFNAME_MIN_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_REQUIRED);
    }
    if (trimmedFunkrufname.length > EINSATZ_FAHRZEUG_VALIDATION.FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: kennzeichen (optional, max length)
    let trimmedKennzeichen: string | undefined = props.kennzeichen?.trim();
    if (trimmedKennzeichen && trimmedKennzeichen.length > EINSATZ_FAHRZEUG_VALIDATION.KENNZEICHEN_MAX_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
    }
    // Empty string → undefined
    if (trimmedKennzeichen !== undefined && trimmedKennzeichen.length === 0) {
      trimmedKennzeichen = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<EinsatzFahrzeug>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzFahrzeug>(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION, positionResult.error ?? 'Ungültige Position'));
      }
      geoPosition = positionResult.value;
    }

    // Create ID
    const idResult = EinsatzFahrzeugId.create();
    if (idResult.isFailure) {
      return Result.fail<EinsatzFahrzeug>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzFahrzeug>('Fehler bei ID-Generierung');
    }

    // Initial FMS-Status: 2 (Einsatzbereit)
    const initialFmsStatus = EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT;

    // Create Aggregate
    const einsatzFahrzeug = new EinsatzFahrzeug(
      id,
      trimmedEinsatzId,
      trimmedFahrzeugtypId,
      trimmedFunkrufname,
      initialFmsStatus,
      trimmedCreatedBy,
      trimmedStammId,
      trimmedKennzeichen,
      geoPosition,
      undefined,
    );

    // Emit Domain Event (AC2: FahrzeugErfasst für ETB-Eintrag)
    einsatzFahrzeug.addDomainEvent(new FahrzeugErfasstEvent(trimmedEinsatzId, id.value, trimmedFunkrufname, trimmedStammId, initialFmsStatus, trimmedCreatedBy));

    return Result.ok<EinsatzFahrzeug>(einsatzFahrzeug);
  }

  /**
   * Factory Method: Erstellt temporäres EinsatzFahrzeug OHNE Stammdaten-Referenz.
   *
   * **Use Case (Story 3-2):**
   * - Erfassung von externen Fahrzeugen (Rettungsdienst, Polizei, etc.)
   * - Schnelle Erfassung ohne vorherige Stammdaten-Anlage
   * - Kein stammId gesetzt (undefined)
   * - Funkrufname und Kennzeichen direkt eingegeben
   *
   * **Unterschied zu createFromStammdaten():**
   * - KEIN stammId Parameter (wird undefined gesetzt)
   * - Gleiche Validierung und Initialisierung wie StammFahrzeug-basiert
   * - Initialer FMS-Status ist 2 (Einsatzbereit)
   * - Emittiert FahrzeugErfasstEvent mit stammId: undefined
   *
   * @param props - CreateTemporaryEinsatzFahrzeugProps ohne StammFahrzeug-Daten
   * @returns Result<EinsatzFahrzeug> - Success oder Failure mit Fehlermeldung
   */
  static createTemporary(props: CreateTemporaryEinsatzFahrzeugProps): Result<EinsatzFahrzeug> {
    // Validation: einsatzId (UUID Format erwartet, aber nicht strikt validiert hier)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.EINSATZ_ID_REQUIRED);
    }

    // Validation: fahrzeugtypId (CUID2 Format)
    const trimmedFahrzeugtypId = props.fahrzeugtypId?.trim() ?? '';
    if (trimmedFahrzeugtypId.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FAHRZEUGTYP_ID_REQUIRED);
    }
    if (!isCuid(trimmedFahrzeugtypId)) {
      return Result.fail<EinsatzFahrzeug>('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: funkrufname (Pflichtfeld)
    const trimmedFunkrufname = props.funkrufname?.trim() ?? '';
    if (trimmedFunkrufname.length < EINSATZ_FAHRZEUG_VALIDATION.FUNKRUFNAME_MIN_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_REQUIRED);
    }
    if (trimmedFunkrufname.length > EINSATZ_FAHRZEUG_VALIDATION.FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: kennzeichen (optional, max length)
    let trimmedKennzeichen: string | undefined = props.kennzeichen?.trim();
    if (trimmedKennzeichen && trimmedKennzeichen.length > EINSATZ_FAHRZEUG_VALIDATION.KENNZEICHEN_MAX_LENGTH) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
    }
    // Empty string → undefined
    if (trimmedKennzeichen !== undefined && trimmedKennzeichen.length === 0) {
      trimmedKennzeichen = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<EinsatzFahrzeug>(EINSATZ_FAHRZEUG_VALIDATION_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<EinsatzFahrzeug>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzFahrzeug>(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION, positionResult.error ?? 'Ungültige Position'));
      }
      geoPosition = positionResult.value;
    }

    // Create ID
    const idResult = EinsatzFahrzeugId.create();
    if (idResult.isFailure) {
      return Result.fail<EinsatzFahrzeug>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzFahrzeug>('Fehler bei ID-Generierung');
    }

    // Initial FMS-Status: 2 (Einsatzbereit)
    const initialFmsStatus = EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT;

    // Create Aggregate (stammId = undefined für temporäre Fahrzeuge)
    const einsatzFahrzeug = new EinsatzFahrzeug(
      id,
      trimmedEinsatzId,
      trimmedFahrzeugtypId,
      trimmedFunkrufname,
      initialFmsStatus,
      trimmedCreatedBy,
      undefined, // stammId: undefined (temporäres Fahrzeug)
      trimmedKennzeichen,
      geoPosition,
      undefined, // einheitId: undefined bei Erstellung
    );

    // Emit Domain Event (stammId: undefined für temporäre Fahrzeuge)
    einsatzFahrzeug.addDomainEvent(
      new FahrzeugErfasstEvent(
        trimmedEinsatzId,
        id.value,
        trimmedFunkrufname,
        undefined, // stammId: undefined (temporäres Fahrzeug)
        initialFmsStatus,
        trimmedCreatedBy,
      ),
    );

    return Result.ok<EinsatzFahrzeug>(einsatzFahrzeug);
  }

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteEinsatzFahrzeugProps mit allen DB-Feldern
   * @returns Result<EinsatzFahrzeug>
   */
  static reconstitute(props: ReconstituteEinsatzFahrzeugProps): Result<EinsatzFahrzeug> {
    const idResult = EinsatzFahrzeugId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail<EinsatzFahrzeug>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<EinsatzFahrzeug>('Ungültige ID');
    }

    // Defense-in-Depth: FMS-Status Validierung
    const fmsValidation = EinsatzFahrzeug.validateFmsStatus(props.fmsStatus);
    if (fmsValidation.isFailure) {
      return Result.fail<EinsatzFahrzeug>(`Korrupter FMS-Status in DB-Daten: ${fmsValidation.error}`);
    }

    // Position rekonstruieren (falls vorhanden)
    let geoPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<EinsatzFahrzeug>(`Korrupte Position in DB-Daten: ${positionResult.error}`);
      }
      geoPosition = positionResult.value;
    }

    // Trim für Konsistenz
    const trimmedKennzeichen = props.kennzeichen?.trim();
    const kennzeichen = trimmedKennzeichen && trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined;

    return Result.ok<EinsatzFahrzeug>(
      new EinsatzFahrzeug(
        id,
        props.einsatzId.trim(),
        props.fahrzeugtypId.trim(),
        props.funkrufname.trim(),
        props.fmsStatus,
        props.createdBy.trim(),
        props.stammId?.trim(),
        kennzeichen,
        geoPosition,
        props.einheitId?.trim(),
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert den FMS-Status des Fahrzeugs.
   *
   * Kann optional auch die Position aktualisieren (z.B. GPS-Update).
   *
   * @param props - UpdateFmsStatusProps mit neuem Status
   * @returns Result<void> - Success oder Failure
   */
  updateFmsStatus(props: UpdateFmsStatusProps): Result<void> {
    // Validation: fmsStatus
    const fmsValidation = EinsatzFahrzeug.validateFmsStatus(props.fmsStatus);
    if (fmsValidation.isFailure) {
      return fmsValidation;
    }

    // Validation: updatedBy (Pflichtfeld, CUID2 Format)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail<void>('updatedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail<void>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: position (optional) - Fail-Fast VOR Mutation
    let validatedPosition: GeoPosition | undefined;
    if (props.position) {
      const positionResult = GeoPosition.create(props.position.lat, props.position.lng);
      if (positionResult.isFailure) {
        return Result.fail<void>(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION, positionResult.error ?? 'Ungültige Position'));
      }
      validatedPosition = positionResult.value;
    }

    // Speichere alten Status VOR Mutation für Event (AC2)
    const previousStatus = this._fmsStatus;

    // Idempotenz: Prüfe ob Status sich wirklich ändert
    const statusChanged = previousStatus !== props.fmsStatus;

    // Emit FMS-Status Changed Event NUR wenn Status sich geändert hat (AC2: für ETB Auto-Eintrag)
    // Idempotenz: Keine State-Mutation und Event-Emission bei unverändertem Status → verhindert ETB-Spam
    if (statusChanged) {
      // Update State (NUR bei Änderung)
      this._fmsStatus = props.fmsStatus;
      this.updateTimestamp(); // NUR bei echter Änderung Timestamp updaten (Idempotenz)
      this.addDomainEvent(new FmsStatusGeaendertEvent(this._id.value, this._einsatzId, this._funkrufname, previousStatus, props.fmsStatus, trimmedUpdatedBy));
    }

    // updatedBy und position können auch bei gleichem Status aktualisiert werden (Metadata-Update)
    this._updatedBy = trimmedUpdatedBy;
    if (validatedPosition !== undefined) {
      this._position = validatedPosition;
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Weist das Fahrzeug einer taktischen Einheit zu oder entfernt die Zuweisung.
   *
   * **Validierung:**
   * - updatedBy muss ein gültiger CUID2-Identifier sein
   * - einheitId muss CUID2 sein wenn nicht null
   * - Idempotenz: Keine Mutation/Event wenn einheitId unverändert
   *
   * @param einheitId - Einheit-ID (CUID2) oder null zum Entfernen
   * @param einheitName - Name der Einheit (denormalisiert für ETB) oder null
   * @param updatedBy - User-ID des Bearbeiters (CUID2, Audit-Trail)
   * @returns Result<void> - Success oder Failure
   */
  assignToEinheit(einheitId: string | null, einheitName: string | null, updatedBy: string): Result<void> {
    // Validation: updatedBy (Pflichtfeld, CUID2 Format)
    const trimmedUpdatedBy = updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail<void>('updatedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail<void>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: einheitId (CUID2 wenn nicht null)
    let trimmedEinheitId: string | null = null;
    if (einheitId !== null) {
      trimmedEinheitId = einheitId.trim();
      if (trimmedEinheitId.length === 0 || !isCuid(trimmedEinheitId)) {
        return Result.fail<void>('einheitId muss ein gültiger CUID2-Identifier sein');
      }
    }

    // Idempotenz: Prüfe ob Einheit sich wirklich ändert
    const currentEinheitId = this._einheitId ?? null;
    if (currentEinheitId === trimmedEinheitId) {
      return Result.ok<void>(undefined);
    }

    // Vorherige Einheit-ID merken für Event
    const previousEinheitId = currentEinheitId;

    // State-Mutation
    this._einheitId = trimmedEinheitId ?? undefined;
    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    // Domain Event emittieren
    this.addDomainEvent(new FahrzeugEinheitZugewiesenEvent(this._einsatzId, this._id.value, this._funkrufname, trimmedEinheitId, einheitName, previousEinheitId, trimmedUpdatedBy));

    return Result.ok<void>(undefined);
  }
}
