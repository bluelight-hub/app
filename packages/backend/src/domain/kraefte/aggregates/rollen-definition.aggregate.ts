import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { RollenDefinitionCreatedEvent } from '../events/rollen-definition-created.event';
import { RollenDefinitionUpdatedEvent } from '../events/rollen-definition-updated.event';
import { RolleId } from '../value-objects/rolle-id';
import { ROLLE_NAME_MIN_LENGTH, ROLLE_NAME_MAX_LENGTH, ROLLE_FUNKRUFNAME_MAX_LENGTH, ROLLE_BESCHREIBUNG_MAX_LENGTH, ROLLE_VALIDATION_ERRORS } from '../constants/rolle-validation.constants';

/**
 * Embedded Value für erforderliche Qualifikationen einer Rolle.
 * Speichert die M:N-Beziehung zwischen Rolle und Qualifikation.
 *
 * **WARUM Embedded Value und nicht separate Entity?**
 * - **Aggregate Boundary:** ErforderlicheQualifikation hat keine eigene Identität außerhalb der Rolle
 * - **Transactional Consistency:** Änderungen an Qualifikationen erfolgen atomar mit Rolle
 * - **Performance:** Keine zusätzliche DB-Join-Tabelle für Lesezugriffe nötig
 * - **Simplicity:** Embedded JSON-Array in Prisma ist einfacher als separate Relation-Tabelle
 *
 * **istPflicht Flag:**
 * - `true` = Diese Qualifikation ist zwingend erforderlich für die Rolle
 * - `false` = Diese Qualifikation ist optional/wünschenswert für die Rolle
 */
export interface ErforderlicheQualifikation {
  readonly qualifikationId: string;
  readonly istPflicht: boolean;
}

/**
 * Props für RollenDefinition.create() Factory Method.
 */
export interface CreateRollenDefinitionProps {
  name: string; // Wird auf normalisiert (trim)
  funkrufname?: string;
  beschreibung?: string;
  erforderlicheQualifikationen: ErforderlicheQualifikation[];
  createdBy: string; // CUID2 User ID für Audit-Trail
}

/**
 * Props für RollenDefinition.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteRollenDefinitionProps {
  id: string;
  name: string;
  funkrufname?: string;
  beschreibung?: string;
  istAktiv: boolean;
  sortOrder: number;
  erforderlicheQualifikationen: ErforderlicheQualifikation[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für RollenDefinition.update() Method.
 */
export interface UpdateRollenDefinitionProps {
  name?: string;
  funkrufname?: string;
  beschreibung?: string;
  istAktiv?: boolean;
  sortOrder?: number;
  erforderlicheQualifikationen?: ErforderlicheQualifikation[];
  updatedBy: string; // CUID2 User ID für Audit-Trail
}

/**
 * RollenDefinition Aggregate Root.
 *
 * Repräsentiert eine Rollendefinition im Admin-Konfigurationsbereich.
 * Rollen definieren welche Funktionen Personen in Einsätzen übernehmen können
 * und welche Qualifikationen dafür erforderlich sind.
 *
 * **Invarianten:**
 * - Name ist Pflichtfeld (min. 3 Zeichen)
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - sortOrder muss >= 0 sein (integer, finite)
 * - erforderlicheQualifikationen muss Array sein (kann leer sein)
 *
 * **Name Uniqueness:**
 * - Der Name SOLLTE unique sein (Business Requirement)
 * - WARUM wird Uniqueness NICHT im Aggregate enforced?
 *   1. **Aggregate Boundary:** Ein Aggregate kennt nur seinen eigenen State, nicht andere Aggregates
 *   2. **Performance:** Uniqueness-Check würde DB-Query in jedem create()/update() erfordern
 *   3. **Separation of Concerns:** Repository Layer ist verantwortlich für Persistence Constraints
 *   4. **Transaction Safety:** Uniqueness-Check + Insert MUSS atomar sein (Race Condition)
 * - LÖSUNG: Repository wirft bei Unique Constraint Violation einen Fehler
 * - Application Layer fängt diesen Fehler und returned Result.fail() mit User-Friendly Message
 *
 * **Name Normalisierung:**
 * - Name wird getrimmt (leading/trailing whitespace entfernt)
 * - WARUM? Verhindert versehentliche Duplikate durch Whitespace ("Fahrer " vs "Fahrer")
 * - Normalisierung erfolgt sowohl in create() als auch update()
 *
 * **Erforderliche Qualifikationen:**
 * - Embedded JSON-Array mit qualifikationId + istPflicht Flag
 * - Leer = "Keine Qualifikationen erforderlich" (z.B. "Helfer")
 * - istPflicht = true: Zwingend erforderlich (z.B. "Fahrer" benötigt "Führerschein C")
 * - istPflicht = false: Optional/wünschenswert (z.B. "Sanitäter" kann zusätzlich "Rettungssanitäter" haben)
 *
 * **Business Rules:**
 * - Deaktivierte Rollen sind nicht mehr in Dropdown-Selects verfügbar
 * - Bestehende Zuweisungen bleiben bei Deaktivierung erhalten
 * - Reaktivierung ist möglich (z.B. bei versehentlicher Deaktivierung)
 *
 * **Funkrufname:**
 * - Optional: Funkrufname für Kommunikation (z.B. "11-Kdt-1" für "Kommandant")
 * - Kann für Funkverkehr oder Statusmeldungen verwendet werden
 * - Nicht für alle Rollen erforderlich (z.B. "Helfer" hat keinen Funkrufnamen)
 */
export class RollenDefinition extends AggregateRoot<RolleId> {
  private _name: string;
  private _funkrufname?: string;
  private _beschreibung?: string;
  private _istAktiv: boolean;
  private _sortOrder: number;
  private _erforderlicheQualifikationen: ErforderlicheQualifikation[];
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: RolleId,
    name: string,
    createdBy: string,
    funkrufname?: string,
    beschreibung?: string,
    istAktiv = true,
    sortOrder = 0,
    erforderlicheQualifikationen: ErforderlicheQualifikation[] = [],
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._funkrufname = funkrufname;
    this._beschreibung = beschreibung;
    this._istAktiv = istAktiv;
    this._sortOrder = sortOrder;
    this._erforderlicheQualifikationen = [...erforderlicheQualifikationen]; // Defensive copy
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /**
   * Gibt den Namen der Rolle zurück.
   *
   * **WARUM als public getter exponiert?**
   * - **Business Key:** Name ist der primäre Display-Identifier in UI
   * - **Uniqueness Constraint:** Repository/Application Layer prüfen Duplikate vor save()
   * - **Read-Only Access:** DTOs serialisieren Name für API-Responses
   * - **Normalisierung:** Garantiert getrimmtes Format
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gibt den optionalen Funkrufnamen zurück.
   *
   * **WARUM optional (undefined statt empty string)?**
   * - **Semantic Clarity:** `undefined` = "nicht gesetzt", `""` = "gesetzt aber leer"
   * - **Database NULL:** DB-Modell nutzt NULL für nicht-gesetzte Felder
   * - **Optional Chaining:** Consumer können `funkrufname?.trim()` nutzen
   */
  get funkrufname(): string | undefined {
    return this._funkrufname;
  }

  /**
   * Gibt die optionale Beschreibung der Rolle zurück.
   *
   * **WARUM optional (undefined statt empty string)?**
   * - **Semantic Clarity:** `undefined` = "nicht gesetzt", `""` = "gesetzt aber leer"
   * - **Database NULL:** DB-Modell nutzt NULL für nicht-gesetzte Felder
   * - **Optional Chaining:** Consumer können `beschreibung?.trim()` nutzen
   */
  get beschreibung(): string | undefined {
    return this._beschreibung;
  }

  /**
   * Gibt zurück, ob die Rolle aktiv ist.
   *
   * **WARUM Soft-Delete statt Hard-Delete?**
   * - **Data Integrity:** Bestehende Zuweisungen (Person → Rolle) bleiben gültig
   * - **Audit-Trail:** Historische Daten referenzieren deaktivierte Rollen
   * - **Reversibility:** Reaktivierung ist möglich (z.B. bei versehentlicher Deaktivierung)
   * - **UI Filtering:** Frontend kann aktive/inaktive Rollen unterschiedlich darstellen
   *
   * Deaktivierte Rollen werden in Dropdown-Selects nicht mehr angezeigt.
   */
  get istAktiv(): boolean {
    return this._istAktiv;
  }

  /**
   * Gibt die Sortierreihenfolge für UI-Anzeige zurück.
   *
   * **WARUM manueller sortOrder statt alphabetischer Sortierung?**
   * - **Business Requirements:** Fachbereich definiert Wichtigkeit/Priorität (z.B. "Kommandant" vor "Helfer")
   * - **Flexibility:** Alphabetische Sortierung würde sich bei Umbenennungen ändern
   * - **User Experience:** Häufig genutzte Rollen können oben stehen (Usability)
   * - **Domain-Driven:** Sortierung ist eine fachliche Regel, nicht technische Konvention
   */
  get sortOrder(): number {
    return this._sortOrder;
  }

  /**
   * Gibt die erforderlichen Qualifikationen als readonly Copy zurück.
   *
   * **WARUM readonly Copy und nicht direkte Referenz?**
   * - **Encapsulation:** Verhindert externe Mutation des internen Arrays
   * - **Immutability:** Änderungen nur über `update()` Method mit Validation und Event-Emission
   * - **Defensive Copy:** Consumer können Array manipulieren ohne Aggregate-State zu verletzen
   * - **Type Safety:** TypeScript readonly Array<T> verhindert versehentliche Mutationen
   */
  get erforderlicheQualifikationen(): readonly ErforderlicheQualifikation[] {
    return [...this._erforderlicheQualifikationen]; // Defensive copy
  }

  /**
   * Gibt die User-ID des Erstellers zurück (für Audit-Trail).
   *
   * **WARUM CUID2-Format erforderlich?**
   * - **Referential Integrity:** createdBy referenziert User.id (Foreign Key Semantik)
   * - **Validation:** isCuid() Check verhindert invalide User-IDs (Defense-in-Depth)
   * - **Auditability:** Wer hat diese Rolle erstellt? (Compliance-Anforderung)
   * - **Immutable:** Wird nur bei create() gesetzt, niemals geändert
   */
  get createdBy(): string {
    return this._createdBy;
  }

  /**
   * Gibt die User-ID des letzten Bearbeiters zurück (für Audit-Trail).
   *
   * **WARUM optional (undefined bei Erstellung)?**
   * - **Semantic Clarity:** undefined = "noch nie aktualisiert", CUID = "zuletzt aktualisiert von X"
   * - **Audit-Trail:** Unterscheidung zwischen Erstellung (createdBy) und Änderung (updatedBy)
   * - **Compliance:** Manche Audit-Standards erfordern "last modified by" Tracking
   * - **Mutable:** Wird bei jedem update() überschrieben
   */
  get updatedBy(): string | undefined {
    return this._updatedBy;
  }

  // ============ Private Helper Methods ============

  /**
   * Normalisiert Namen (trim).
   *
   * **WARUM Normalisierung?**
   * - Verhindert versehentliche Duplikate durch Whitespace ("Fahrer " vs "Fahrer")
   * - Konsistente Darstellung in UI
   * - Best Practice für User-Input Handling
   *
   * **HINWEIS:** Verwendet trim() ohne Whitespace-Collapse.
   * - "  Fahrer  " → "Fahrer" (leading/trailing entfernt)
   * - "Fahrer Maschinist" → "Fahrer Maschinist" (innere Leerzeichen bleiben)
   *
   * @param name - Der zu normalisierende Name
   * @returns Normalisierter Name (trimmed)
   */
  private static normalizeName(name: string): string {
    return name.trim();
  }

  // ============ Factory Methods ============

  /**
   * Factory Method für neue RollenDefinition mit Validation.
   *
   * Emittiert RollenDefinitionCreatedEvent bei erfolgreicher Erstellung.
   *
   * @param props - CreateRollenDefinitionProps mit Pflichtfeldern
   * @returns Result<RollenDefinition> - Success oder Failure mit Fehlermeldung
   */
  static create(props: CreateRollenDefinitionProps): Result<RollenDefinition> {
    // Name normalisieren (trim)
    const normalizedName = RollenDefinition.normalizeName(props.name);

    // Validation: Name (nutzt Domain-Konstanten für Single Source of Truth)
    if (normalizedName.length === 0) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.NAME_REQUIRED);
    }
    if (normalizedName.length < ROLLE_NAME_MIN_LENGTH) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.NAME_TOO_SHORT);
    }
    if (normalizedName.length > ROLLE_NAME_MAX_LENGTH) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.NAME_TOO_LONG);
    }

    // Validation: Funkrufname (optional, nutzt Domain-Konstanten)
    if (props.funkrufname && props.funkrufname.length > ROLLE_FUNKRUFNAME_MAX_LENGTH) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
    }

    // Validation: Beschreibung (optional, nutzt Domain-Konstanten)
    if (props.beschreibung && props.beschreibung.length > ROLLE_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: createdBy (CUID2 Format)
    // Trim BEFORE validation to allow whitespace-wrapped CUIDs
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<RollenDefinition>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<RollenDefinition>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: erforderlicheQualifikationen (muss Array sein)
    if (!Array.isArray(props.erforderlicheQualifikationen)) {
      return Result.fail<RollenDefinition>(ROLLE_VALIDATION_ERRORS.QUALIFIKATION_IDS_REQUIRED);
    }

    // Create ID
    const idResult = RolleId.create();
    if (idResult.isFailure) {
      return Result.fail<RollenDefinition>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<RollenDefinition>('Fehler bei ID-Generierung');
    }

    // Trim und handle empty string for optional fields
    const trimmedFunkrufname = props.funkrufname?.trim();
    const funkrufname = trimmedFunkrufname && trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;

    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    // Create Aggregate
    const rollenDefinition = new RollenDefinition(
      id,
      normalizedName,
      trimmedCreatedBy,
      funkrufname,
      beschreibung,
      true, // istAktiv default
      0, // sortOrder default
      props.erforderlicheQualifikationen,
    );

    // Emit Domain Event (mit primitiven Werten für Serialisierbarkeit)
    rollenDefinition.addDomainEvent(
      new RollenDefinitionCreatedEvent(id.value, rollenDefinition.name, rollenDefinition.funkrufname, rollenDefinition.erforderlicheQualifikationen, rollenDefinition.createdBy),
    );

    return Result.ok<RollenDefinition>(rollenDefinition);
  }

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Verwendet wenn Aggregate aus Prisma geladen wird.
   *
   * **WARUM wird hier KEINE vollständige Validation durchgeführt?**
   * - **Trusted Source:** Daten kommen aus der Datenbank und wurden bereits bei create()/update() validiert
   * - **Performance:** Validation bei jedem DB-Read würde die Ladezeit signifikant erhöhen
   * - **Datenintegrität:** DB-Constraints (NOT NULL, CHECK, max length) garantieren Konsistenz
   * - **Historische Daten:** Alte Datensätze könnten neue Validationsregeln verletzen (Breaking Change)
   *
   * **Defense-in-Depth für kritische Invarianten:**
   * - sortOrder wird validiert (finite, integer, >= 0) gegen DB-Korruption
   * - erforderlicheQualifikationen muss Array sein
   *
   * **WARUM wird hier trim() angewendet?**
   * - **Konsistenz:** create() trimmt Eingaben, reconstitute() sollte gleiches Verhalten haben
   * - **Defense in Depth:** Falls DB-Migration oder manueller Eingriff Whitespace einfügt
   * - **Minimal Overhead:** trim() auf Strings ist performant und verhindert Edge-Cases
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteRollenDefinitionProps mit allen DB-Feldern
   * @returns Result<RollenDefinition>
   */
  static reconstitute(props: ReconstituteRollenDefinitionProps): Result<RollenDefinition> {
    const idResult = RolleId.create(props.id);
    if (idResult.isFailure) {
      // Override English error message from EntityId with German message
      return Result.fail<RollenDefinition>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<RollenDefinition>('Ungültige ID');
    }

    // Validation: sortOrder (Defense in Depth gegen korrupte DB-Daten)
    if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
      return Result.fail<RollenDefinition>(`Ungültiger sortOrder in DB-Daten: ${props.sortOrder}`);
    }
    if (props.sortOrder < 0) {
      return Result.fail<RollenDefinition>(`sortOrder muss >= 0 sein (ist: ${props.sortOrder})`);
    }

    // Validation: erforderlicheQualifikationen muss Array sein
    if (!Array.isArray(props.erforderlicheQualifikationen)) {
      return Result.fail<RollenDefinition>('erforderlicheQualifikationen muss ein Array sein (DB-Daten korrupt)');
    }

    // Trim für Konsistenz mit create() (Defense in Depth gegen DB-Korruption)
    const trimmedFunkrufname = props.funkrufname?.trim();
    const funkrufname = trimmedFunkrufname && trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;

    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<RollenDefinition>(
      new RollenDefinition(
        id,
        props.name.trim(),
        props.createdBy.trim(),
        funkrufname,
        beschreibung,
        props.istAktiv,
        props.sortOrder,
        props.erforderlicheQualifikationen,
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert die RollenDefinition mit den angegebenen Feldern.
   *
   * Emittiert RollenDefinitionUpdatedEvent mit den geänderten Feldern.
   *
   * @param props - UpdateRollenDefinitionProps mit zu ändernden Feldern
   * @returns Result<void> - Success oder Failure
   */
  update(props: UpdateRollenDefinitionProps): Result<void> {
    const changes: Partial<Omit<UpdateRollenDefinitionProps, 'updatedBy'>> = {};

    // Validation und Update: Name (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.name !== undefined) {
      const normalizedName = RollenDefinition.normalizeName(props.name);
      if (normalizedName.length === 0) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.NAME_REQUIRED);
      }
      if (normalizedName.length < ROLLE_NAME_MIN_LENGTH) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.NAME_TOO_SHORT);
      }
      if (normalizedName.length > ROLLE_NAME_MAX_LENGTH) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.NAME_TOO_LONG);
      }
      this._name = normalizedName;
      changes.name = this._name;
    }

    // Validation und Update: Funkrufname (nutzt Domain-Konstanten)
    if (props.funkrufname !== undefined) {
      if (props.funkrufname.length > ROLLE_FUNKRUFNAME_MAX_LENGTH) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG);
      }
      // Konsistentes Handling: leerer String nach trim() wird undefined
      const trimmedFunkrufname = props.funkrufname.trim();
      this._funkrufname = trimmedFunkrufname.length > 0 ? trimmedFunkrufname : undefined;
      changes.funkrufname = this._funkrufname;
    }

    // Validation und Update: Beschreibung (nutzt Domain-Konstanten)
    if (props.beschreibung !== undefined) {
      if (props.beschreibung.length > ROLLE_BESCHREIBUNG_MAX_LENGTH) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
      }
      // Konsistentes Handling: leerer String nach trim() wird undefined
      const trimmedBeschreibung = props.beschreibung.trim();
      this._beschreibung = trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
      changes.beschreibung = this._beschreibung;
    }

    // Update: istAktiv
    if (props.istAktiv !== undefined) {
      this._istAktiv = props.istAktiv;
      changes.istAktiv = this._istAktiv;
    }

    // Validation und Update: sortOrder
    if (props.sortOrder !== undefined) {
      if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
        return Result.fail<void>('sortOrder muss eine ganze Zahl sein (keine NaN oder Infinity)');
      }
      if (props.sortOrder < 0) {
        return Result.fail<void>('sortOrder muss größer oder gleich 0 sein');
      }
      this._sortOrder = props.sortOrder;
      changes.sortOrder = this._sortOrder;
    }

    // Update: erforderlicheQualifikationen (mit Validation)
    if (props.erforderlicheQualifikationen !== undefined) {
      if (!Array.isArray(props.erforderlicheQualifikationen)) {
        return Result.fail<void>(ROLLE_VALIDATION_ERRORS.QUALIFIKATION_IDS_REQUIRED);
      }
      this._erforderlicheQualifikationen = [...props.erforderlicheQualifikationen]; // Defensive copy
      changes.erforderlicheQualifikationen = this._erforderlicheQualifikationen;
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
      this.addDomainEvent(new RollenDefinitionUpdatedEvent(this.id.value, changes, this._updatedBy));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Deaktiviert die RollenDefinition (Soft-Delete Pattern).
   *
   * Deaktivierte Rollen sind nicht mehr in Dropdown-Selects verfügbar,
   * bestehende Zuweisungen bleiben aber erhalten.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  deactivate(updatedBy: string): Result<void> {
    if (!this._istAktiv) {
      return Result.fail<void>('Rolle ist bereits deaktiviert');
    }

    return this.update({ istAktiv: false, updatedBy });
  }

  /**
   * Reaktiviert eine deaktivierte RollenDefinition.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  reactivate(updatedBy: string): Result<void> {
    if (this._istAktiv) {
      return Result.fail<void>('Rolle ist bereits aktiv');
    }

    return this.update({ istAktiv: true, updatedBy });
  }
}
