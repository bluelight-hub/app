import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { StammFahrzeugCreatedEvent } from '../events/stamm-fahrzeug-created.event';
import { StammFahrzeugUpdatedEvent } from '../events/stamm-fahrzeug-updated.event';
import { StammFahrzeugId } from '../value-objects/stamm-fahrzeug-id';
import {
  STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH,
  STAMM_FAHRZEUG_BAUJAHR_MIN,
  STAMM_FAHRZEUG_VALIDATION_ERRORS,
} from '../constants/stamm-fahrzeug-validation.constants';
import { STAMM_FAHRZEUG_ERROR_CODES, StammFahrzeugError } from '../common/stamm-fahrzeug-error-codes';

/**
 * Props für StammFahrzeug.create() Factory Method.
 */
export interface CreateStammFahrzeugProps {
  rufname: string;
  funkrufname: string;
  fahrzeugtypId: string; // CUID2 referenziert Fahrzeugtyp Aggregate (IMMUTABLE!)
  kennzeichen?: string;
  baujahr?: number;
  funkkenungBOS?: string;
  createdBy: string;
}

/**
 * Props für StammFahrzeug.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteStammFahrzeugProps {
  id: string;
  rufname: string;
  funkrufname: string;
  fahrzeugtypId: string; // IMMUTABLE
  kennzeichen?: string;
  baujahr?: number;
  funkkenungBOS?: string;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für StammFahrzeug.update() Method.
 */
export interface UpdateStammFahrzeugProps {
  rufname?: string;
  funkrufname?: string;
  // fahrzeugtypId ist NICHT enthalten - IMMUTABLE nach Erstellung!
  kennzeichen?: string;
  baujahr?: number;
  funkkenungBOS?: string;
  updatedBy: string;
}

/**
 * StammFahrzeug Aggregate Root.
 *
 * Repräsentiert ein konkretes Fahrzeug im Fuhrpark der Organisation.
 * Stamm-Fahrzeuge sind Instanzen von Fahrzeugtypen und werden in Einsätzen eingesetzt.
 *
 * **Invarianten:**
 * - Rufname ist Pflichtfeld (min. 2 Zeichen) - der Display-Name
 * - Funkrufname ist Pflichtfeld (min. 2 Zeichen) und muss UNIQUE sein (DB-Constraint)
 * - fahrzeugtypId ist Pflichtfeld und IMMUTABLE (kann nach Erstellung nicht geändert werden)
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - Baujahr muss >= 1900 sein (wenn gesetzt)
 *
 * **Fahrzeugtyp Immutability:**
 * - fahrzeugtypId kann NACH Erstellung NICHT mehr geändert werden
 * - WARUM? Ein RTW kann nicht nachträglich zu einem KTW werden (inhärent unterschiedlich)
 * - Business Rule: Bei Typwechsel muss neues StammFahrzeug erstellt werden
 * - update() Method MUSS Änderung von fahrzeugtypId ablehnen (Result.fail)
 *
 * **Funkrufname Uniqueness:**
 * - Der Funkrufname MUSS unique sein (Datenbank-Constraint)
 * - WARUM wird Uniqueness NICHT im Aggregate enforced?
 *   1. **Aggregate Boundary:** Ein Aggregate kennt nur seinen eigenen State, nicht andere Aggregates
 *   2. **Performance:** Uniqueness-Check würde DB-Query in jedem create()/update() erfordern
 *   3. **Separation of Concerns:** Repository Layer ist verantwortlich für Persistence Constraints
 *   4. **Transaction Safety:** Uniqueness-Check + Insert MUSS atomar sein (Race Condition)
 * - LÖSUNG: Repository wirft bei Unique Constraint Violation einen Fehler
 * - Application Layer fängt diesen Fehler und returned Result.fail() mit User-Friendly Message
 *
 * **Archive Pattern (Soft-Delete):**
 * - archivedAt/archivedBy statt isDeleted boolean
 * - WARUM? Timestamp + User-ID bieten mehr Kontext für Audit-Trail
 * - Archivierte Fahrzeuge sind nicht mehr in Dropdown-Selects verfügbar
 * - Bestehende Zuweisungen (Einsätze) bleiben bei Archivierung erhalten
 *
 * **Optional Fields:**
 * - kennzeichen, baujahr, funkkenungBOS sind optional
 * - undefined = "nicht gesetzt" (semantisch unterschiedlich zu empty string)
 * - Validierung erfolgt nur wenn Feld gesetzt ist
 *
 * **Business Rules:**
 * - Archivierte Fahrzeuge können reaktiviert werden (z.B. nach Reparatur)
 * - Fahrzeugtyp-Änderung ist NICHT erlaubt (neues Fahrzeug erstellen stattdessen)
 */
export class StammFahrzeug extends AggregateRoot<StammFahrzeugId> {
  private _rufname: string;
  private _funkrufname: string;
  private readonly _fahrzeugtypId: string; // IMMUTABLE nach Erstellung
  private _kennzeichen?: string;
  private _baujahr?: number;
  private _funkkenungBOS?: string;
  private _archivedAt?: Date;
  private _archivedBy?: string;
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: StammFahrzeugId,
    rufname: string,
    funkrufname: string,
    fahrzeugtypId: string,
    createdBy: string,
    kennzeichen?: string,
    baujahr?: number,
    funkkenungBOS?: string,
    archivedAt?: Date,
    archivedBy?: string,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._rufname = rufname;
    this._funkrufname = funkrufname;
    this._fahrzeugtypId = fahrzeugtypId;
    this._kennzeichen = kennzeichen;
    this._baujahr = baujahr;
    this._funkkenungBOS = funkkenungBOS;
    this._archivedAt = archivedAt;
    this._archivedBy = archivedBy;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /**
   * Gibt den Rufname des Fahrzeugs zurück (z.B. "RTW 1", "KTW 2").
   *
   * **WARUM als public getter exponiert?**
   * - **Display Name:** Primärer Identifier in UI
   * - **Read-Only Access:** DTOs serialisieren Rufname für API-Responses
   * - **Encapsulation:** Direkter Zugriff auf `_rufname` würde Invarianten-Verletzung ermöglichen
   */
  get rufname(): string {
    return this._rufname;
  }

  /**
   * Gibt den Funkrufname des Fahrzeugs zurück (z.B. "Florian 1/46/1").
   *
   * **WARUM UNIQUE Constraint?**
   * - Funkrufname ist die eindeutige Kennung im Funkverkehr
   * - Duplikate würden zu Verwechslungen führen
   * - DB-Constraint enforced Uniqueness
   */
  get funkrufname(): string {
    return this._funkrufname;
  }

  /**
   * Gibt die Fahrzeugtyp-ID zurück (IMMUTABLE).
   *
   * **WARUM IMMUTABLE?**
   * - Ein RTW kann nicht nachträglich zu einem KTW werden
   * - Fahrzeugtyp ist eine fundamentale Eigenschaft (kein Update möglich)
   * - Bei Typwechsel muss neues StammFahrzeug erstellt werden
   */
  get fahrzeugtypId(): string {
    return this._fahrzeugtypId;
  }

  /**
   * Gibt das optionale Kfz-Kennzeichen zurück.
   */
  get kennzeichen(): string | undefined {
    return this._kennzeichen;
  }

  /**
   * Gibt das optionale Baujahr zurück.
   */
  get baujahr(): number | undefined {
    return this._baujahr;
  }

  /**
   * Gibt die optionale BOS-Funkkennung zurück.
   */
  get funkkenungBOS(): string | undefined {
    return this._funkkenungBOS;
  }

  /**
   * Gibt zurück, ob das Fahrzeug archiviert ist.
   *
   * **WARUM Soft-Delete statt Hard-Delete?**
   * - **Data Integrity:** Bestehende Zuweisungen (Einsätze) bleiben gültig
   * - **Audit-Trail:** Historische Daten referenzieren archivierte Fahrzeuge
   * - **Reversibility:** Reaktivierung ist möglich (z.B. nach Reparatur)
   * - **UI Filtering:** Frontend kann aktive/archivierte Fahrzeuge unterschiedlich darstellen
   */
  get isArchived(): boolean {
    return this._archivedAt !== undefined;
  }

  /**
   * Gibt den Zeitpunkt der Archivierung zurück.
   */
  get archivedAt(): Date | undefined {
    return this._archivedAt;
  }

  /**
   * Gibt die User-ID des Archivierenden zurück.
   */
  get archivedBy(): string | undefined {
    return this._archivedBy;
  }

  /**
   * Gibt die User-ID des Erstellers zurück (für Audit-Trail).
   */
  get createdBy(): string {
    return this._createdBy;
  }

  /**
   * Gibt die User-ID des letzten Bearbeiters zurück (für Audit-Trail).
   */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  // ============ Private Helper Methods ============

  /**
   * Validiert ein Baujahr.
   *
   * **Validierungsregeln:**
   * - Muss eine ganze Zahl sein (keine Floats, NaN, Infinity)
   * - Muss >= 1900 sein (vor Erfindung des Automobils ist unrealistisch)
   *
   * @param baujahr - Das zu validierende Baujahr
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  private static validateBaujahr(baujahr: number): Result<void> {
    if (!Number.isFinite(baujahr) || !Number.isInteger(baujahr)) {
      return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.BAUJAHR_INVALID);
    }
    if (baujahr < STAMM_FAHRZEUG_BAUJAHR_MIN) {
      return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.BAUJAHR_TOO_LOW);
    }
    return Result.ok<void>(undefined);
  }

  // ============ Factory Methods ============

  /**
   * Factory Method für neues Stamm-Fahrzeug mit Validation.
   *
   * Emittiert StammFahrzeugCreatedEvent bei erfolgreicher Erstellung.
   *
   * @param props - CreateStammFahrzeugProps mit Pflichtfeldern
   * @returns Result<StammFahrzeug> - Success oder Failure mit Fehlermeldung
   */
  static create(props: CreateStammFahrzeugProps): Result<StammFahrzeug> {
    // Validation: Rufname
    const trimmedRufname = props.rufname?.trim() ?? '';
    if (trimmedRufname.length < STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT);
    }
    if (trimmedRufname.length > STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG);
    }

    // Validation: Funkrufname
    const trimmedFunkrufname = props.funkrufname?.trim() ?? '';
    if (trimmedFunkrufname.length < STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT);
    }
    if (trimmedFunkrufname.length > STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: fahrzeugtypId (CUID2 Format + Required)
    const trimmedFahrzeugtypId = props.fahrzeugtypId?.trim() ?? '';
    if (trimmedFahrzeugtypId.length === 0) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FAHRZEUGTYP_ID_REQUIRED);
    }
    if (!isCuid(trimmedFahrzeugtypId)) {
      return Result.fail<StammFahrzeug>('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: Kennzeichen (optional, aber wenn gesetzt dann max length)
    let trimmedKennzeichen: string | undefined = props.kennzeichen?.trim();
    if (trimmedKennzeichen && trimmedKennzeichen.length > STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
    }
    // Empty string nach trim() wird undefined
    if (trimmedKennzeichen && trimmedKennzeichen.length === 0) {
      trimmedKennzeichen = undefined;
    }

    // Validation: Baujahr (optional, aber wenn gesetzt dann validiert)
    if (props.baujahr !== undefined) {
      const baujahrValidation = StammFahrzeug.validateBaujahr(props.baujahr);
      if (baujahrValidation.isFailure) {
        return Result.fail<StammFahrzeug>(baujahrValidation.error ?? 'Ungültiges Baujahr');
      }
    }

    // Validation: FunkkenungBOS (optional, aber wenn gesetzt dann max length)
    let trimmedFunkkenungBOS: string | undefined = props.funkkenungBOS?.trim();
    if (trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH) {
      return Result.fail<StammFahrzeug>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKKENNUNG_TOO_LONG);
    }
    // Empty string nach trim() wird undefined
    if (trimmedFunkkenungBOS && trimmedFunkkenungBOS.length === 0) {
      trimmedFunkkenungBOS = undefined;
    }

    // Validation: createdBy (CUID2 Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<StammFahrzeug>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<StammFahrzeug>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Create ID
    const idResult = StammFahrzeugId.create();
    if (idResult.isFailure) {
      return Result.fail<StammFahrzeug>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<StammFahrzeug>('Fehler bei ID-Generierung');
    }

    // Create Aggregate
    const stammFahrzeug = new StammFahrzeug(id, trimmedRufname, trimmedFunkrufname, trimmedFahrzeugtypId, trimmedCreatedBy, trimmedKennzeichen, props.baujahr, trimmedFunkkenungBOS);

    // Emit Domain Event (mit primitiven Werten für Serialisierbarkeit)
    stammFahrzeug.addDomainEvent(new StammFahrzeugCreatedEvent(id.value, stammFahrzeug.rufname, stammFahrzeug.funkrufname, stammFahrzeug.fahrzeugtypId, stammFahrzeug.createdBy));

    return Result.ok<StammFahrzeug>(stammFahrzeug);
  }

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Verwendet wenn Aggregate aus Prisma geladen wird.
   *
   * **WARUM wird hier KEINE Validation durchgeführt?**
   * - **Trusted Source:** Daten kommen aus der Datenbank und wurden bereits bei create()/update() validiert
   * - **Performance:** Validation bei jedem DB-Read würde die Ladezeit signifikant erhöhen
   * - **Datenintegrität:** DB-Constraints (NOT NULL, CHECK, max length) garantieren Konsistenz
   * - **Historische Daten:** Alte Datensätze könnten neue Validationsregeln verletzen (Breaking Change)
   *
   * **Konsequenz:** Bei korrupten DB-Daten (manueller DB-Eingriff) kann Aggregate inkonsistent sein.
   * **Mitigation:** Repository Layer sollte bei kritischen Operationen Sanity-Checks durchführen.
   *
   * **WARUM wird hier trim() angewendet?**
   * - **Konsistenz:** create() trimmt Eingaben, reconstitute() sollte gleiches Verhalten haben
   * - **Defense in Depth:** Falls DB-Migration oder manueller Eingriff Whitespace einfügt
   * - **Minimal Overhead:** trim() auf Strings ist performant und verhindert Edge-Cases
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteStammFahrzeugProps mit allen DB-Feldern
   * @returns Result<StammFahrzeug>
   */
  static reconstitute(props: ReconstituteStammFahrzeugProps): Result<StammFahrzeug> {
    const idResult = StammFahrzeugId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail<StammFahrzeug>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<StammFahrzeug>('Ungültige ID');
    }

    // Minimal validation für DB-Daten (Defense in Depth)
    if (props.baujahr !== undefined) {
      const baujahrValidation = StammFahrzeug.validateBaujahr(props.baujahr);
      if (baujahrValidation.isFailure) {
        return Result.fail<StammFahrzeug>(`Korruptes Baujahr in DB-Daten: ${baujahrValidation.error}`);
      }
    }

    // Trim für Konsistenz mit create()
    const trimmedKennzeichen = props.kennzeichen?.trim();
    const kennzeichen = trimmedKennzeichen && trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined;

    const trimmedFunkkenungBOS = props.funkkenungBOS?.trim();
    const funkkenungBOS = trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;

    return Result.ok<StammFahrzeug>(
      new StammFahrzeug(
        id,
        props.rufname.trim(),
        props.funkrufname.trim(),
        props.fahrzeugtypId.trim(),
        props.createdBy.trim(),
        kennzeichen,
        props.baujahr,
        funkkenungBOS,
        props.archivedAt,
        props.archivedBy?.trim(),
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert das Stamm-Fahrzeug mit den angegebenen Feldern.
   *
   * **KRITISCH:** fahrzeugtypId kann NICHT geändert werden (IMMUTABLE).
   * Falls versucht, returned Result.fail() mit Error Code.
   *
   * Emittiert StammFahrzeugUpdatedEvent mit den geänderten Feldern.
   *
   * @param props - UpdateStammFahrzeugProps mit zu ändernden Feldern
   * @returns Result<void> - Success oder Failure
   */
  update(props: UpdateStammFahrzeugProps): Result<void> {
    const changes: Partial<Omit<UpdateStammFahrzeugProps, 'updatedBy'>> = {};

    // Validation und Update: Rufname
    if (props.rufname !== undefined) {
      const trimmedRufname = props.rufname.trim();
      if (trimmedRufname.length < STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT);
      }
      if (trimmedRufname.length > STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG);
      }
      this._rufname = trimmedRufname;
      changes.rufname = this._rufname;
    }

    // Validation und Update: Funkrufname
    if (props.funkrufname !== undefined) {
      const trimmedFunkrufname = props.funkrufname.trim();
      if (trimmedFunkrufname.length < STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT);
      }
      if (trimmedFunkrufname.length > STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
      }
      this._funkrufname = trimmedFunkrufname;
      changes.funkrufname = this._funkrufname;
    }

    // Validation und Update: Kennzeichen (optional)
    if (props.kennzeichen !== undefined) {
      const trimmedKennzeichen = props.kennzeichen.trim();
      if (trimmedKennzeichen.length > STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG);
      }
      this._kennzeichen = trimmedKennzeichen.length > 0 ? trimmedKennzeichen : undefined;
      changes.kennzeichen = this._kennzeichen;
    }

    // Validation und Update: Baujahr (optional)
    if (props.baujahr !== undefined) {
      const baujahrValidation = StammFahrzeug.validateBaujahr(props.baujahr);
      if (baujahrValidation.isFailure) {
        return Result.fail<void>(baujahrValidation.error ?? 'Ungültiges Baujahr');
      }
      this._baujahr = props.baujahr;
      changes.baujahr = this._baujahr;
    }

    // Validation und Update: FunkkenungBOS (optional)
    if (props.funkkenungBOS !== undefined) {
      const trimmedFunkkenungBOS = props.funkkenungBOS.trim();
      if (trimmedFunkkenungBOS.length > STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH) {
        return Result.fail<void>(STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKKENNUNG_TOO_LONG);
      }
      this._funkkenungBOS = trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;
      changes.funkkenungBOS = this._funkkenungBOS;
    }

    // Validation: updatedBy (Pflichtfeld, CUID2 Format)
    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<void>('updatedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(props.updatedBy)) {
      return Result.fail<void>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }
    this._updatedBy = props.updatedBy.trim();

    // Update Timestamp (nur wenn Änderungen)
    if (Object.keys(changes).length > 0) {
      this.updateTimestamp();
      this.addDomainEvent(new StammFahrzeugUpdatedEvent(this.id.value, changes, this._updatedBy));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Archiviert das Stamm-Fahrzeug (Soft-Delete Pattern).
   *
   * Archivierte Fahrzeuge sind nicht mehr in Dropdown-Selects verfügbar,
   * bestehende Zuweisungen (Einsätze) bleiben aber erhalten.
   *
   * @param archivedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  archive(archivedBy: string): Result<void> {
    if (this.isArchived) {
      return Result.fail<void>(StammFahrzeugError.format(STAMM_FAHRZEUG_ERROR_CODES.ALREADY_ARCHIVED, 'Fahrzeug ist bereits archiviert'));
    }

    // Validation: archivedBy (CUID2 Format)
    const trimmedArchivedBy = archivedBy?.trim() ?? '';
    if (trimmedArchivedBy.length === 0) {
      return Result.fail<void>('archivedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedArchivedBy)) {
      return Result.fail<void>('archivedBy muss ein gültiger CUID2-Identifier sein');
    }

    this._archivedAt = new Date();
    this._archivedBy = trimmedArchivedBy;
    this._updatedBy = trimmedArchivedBy;
    this.updateTimestamp();

    // Emit Domain Event (archivieren ist eine bedeutende State-Änderung)
    this.addDomainEvent(
      new StammFahrzeugUpdatedEvent(
        this.id.value,
        {
          // Keine Property-Änderungen, nur Archive-Status
        },
        trimmedArchivedBy,
      ),
    );

    return Result.ok<void>(undefined);
  }
}
