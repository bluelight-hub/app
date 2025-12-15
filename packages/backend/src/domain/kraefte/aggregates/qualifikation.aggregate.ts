import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { QualifikationCreatedEvent } from '../events/qualifikation-created.event';
import { QualifikationUpdatedEvent } from '../events/qualifikation-updated.event';
import { QualifikationId } from '../value-objects/qualifikation-id';
import { QualifikationKategorie } from '../value-objects/qualifikation-kategorie';
import {
  QUALIFIKATION_NAME_MIN_LENGTH,
  QUALIFIKATION_NAME_MAX_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MIN_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MAX_LENGTH,
  QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH,
  QUALIFIKATION_VALIDATION_ERRORS,
} from '../constants/qualifikation-validation.constants';
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '../common/error-codes';

/**
 * Re-export für Backwards Compatibility und convenience.
 * Ermöglicht Consumers weiterhin `import { QUALIFIKATION_KATEGORIEN } from '@domain/kraefte'`.
 */
export { QUALIFIKATION_KATEGORIEN, type QualifikationKategorieType } from '../value-objects/qualifikation-kategorie';

/**
 * Props für Qualifikation.create() Factory Method.
 */
export interface CreateQualifikationProps {
  name: string;
  abkuerzung: string;
  kategorie: string; // Wird intern zu QualifikationKategorie Value Object konvertiert
  beschreibung?: string;
  createdBy: string;
}

/**
 * Props für Qualifikation.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteQualifikationProps {
  id: string;
  name: string;
  abkuerzung: string;
  kategorie: string; // Wird intern zu QualifikationKategorie Value Object konvertiert
  beschreibung?: string;
  istAktiv: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für Qualifikation.update() Method.
 */
export interface UpdateQualifikationProps {
  name?: string;
  abkuerzung?: string;
  kategorie?: string; // Wird intern zu QualifikationKategorie Value Object konvertiert
  beschreibung?: string;
  istAktiv?: boolean;
  sortOrder?: number;
  updatedBy: string;
}

/**
 * Qualifikation Aggregate Root.
 *
 * Repräsentiert eine Qualifikations-Definition im Admin-Konfigurationsbereich.
 * Qualifikationen werden Rollen und Personen zugewiesen.
 *
 * **Invarianten:**
 * - Name ist Pflichtfeld (min. 3 Zeichen)
 * - Abkürzung ist Pflichtfeld (min. 2 Zeichen)
 * - Kategorie muss aus dem definierten ENUM stammen
 * - createdBy ist Pflichtfeld für Audit-Trail
 *
 * **Abkürzung Uniqueness:**
 * - Die Abkürzung MUSS unique sein (Datenbank-Constraint)
 * - WARUM wird Uniqueness NICHT im Aggregate enforced?
 *   1. **Aggregate Boundary:** Ein Aggregate kennt nur seinen eigenen State, nicht andere Aggregates
 *   2. **Performance:** Uniqueness-Check würde DB-Query in jedem create()/update() erfordern
 *   3. **Separation of Concerns:** Repository Layer ist verantwortlich für Persistence Constraints
 *   4. **Transaction Safety:** Uniqueness-Check + Insert MUSS atomar sein (Race Condition)
 * - LÖSUNG: Repository wirft bei Unique Constraint Violation einen Fehler
 * - Application Layer fängt diesen Fehler und returned Result.fail() mit User-Friendly Message
 *
 * **Business Rules:**
 * - Deaktivierte Qualifikationen sind nicht mehr in Dropdown-Selects verfügbar
 * - Bestehende Zuweisungen bleiben bei Deaktivierung erhalten
 */
export class Qualifikation extends AggregateRoot<QualifikationId> {
  private _name: string;
  private _abkuerzung: string;
  private _kategorie: QualifikationKategorie;
  private _beschreibung?: string;
  private _istAktiv: boolean;
  private _sortOrder: number;
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: QualifikationId,
    name: string,
    abkuerzung: string,
    kategorie: QualifikationKategorie,
    createdBy: string,
    beschreibung?: string,
    istAktiv = true,
    sortOrder = 0,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._abkuerzung = abkuerzung;
    this._kategorie = kategorie;
    this._beschreibung = beschreibung;
    this._istAktiv = istAktiv;
    this._sortOrder = sortOrder;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /**
   * Gibt den vollständigen Namen der Qualifikation zurück.
   *
   * **WARUM als public getter exponiert?**
   * - **Read-Only Access:** Repository, DTOs, und Presentation Layer benötigen Lesezugriff
   * - **Encapsulation:** Direkter Zugriff auf `_name` würde Invarianten-Verletzung ermöglichen
   * - **Immutability:** Änderungen nur über `update()` Method mit Validation und Event-Emission
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gibt die eindeutige Abkürzung der Qualifikation zurück.
   *
   * **WARUM als public getter exponiert?**
   * - **Business Key:** Abkürzung ist der primäre Display-Identifier in UI (kompakter als Name)
   * - **Uniqueness Constraint:** Repository/Application Layer prüfen Duplikate vor save()
   * - **Read-Only Access:** DTOs serialisieren Abkürzung für API-Responses
   */
  get abkuerzung(): string {
    return this._abkuerzung;
  }

  /**
   * Gibt die Kategorie der Qualifikation als Value Object zurück.
   *
   * **WARUM als Value Object statt primitiver String?**
   * - **Type Safety:** ENUM-Validierung zur Compile-Time (kein ungültiger Wert möglich)
   * - **Domain Logic:** Value Object kapselt Kategorie-spezifische Business Rules
   * - **Self-Documenting:** Code-Completion zeigt erlaubte Werte (QUALIFIKATION_KATEGORIEN)
   */
  get kategorie(): QualifikationKategorie {
    return this._kategorie;
  }

  /**
   * Gibt die Kategorie als primitiven String zurück (z.B. für Serialisierung).
   *
   * **WARUM zusätzlich zu `kategorie` Getter?**
   * - **DTO Serialization:** Repository/DTOs benötigen primitiven String für DB/JSON
   * - **Convenience:** Vermeidet `.kategorie.value` Chaining in jedem Consumer
   * - **Performance:** Direkte String-Rückgabe ohne Value Object Overhead in Hot Paths
   */
  get kategorieValue(): string {
    return this._kategorie.value;
  }

  /**
   * Gibt die optionale Beschreibung der Qualifikation zurück.
   *
   * **WARUM optional (undefined statt empty string)?**
   * - **Semantic Clarity:** `undefined` = "nicht gesetzt", `""` = "gesetzt aber leer" (unterschiedliche Bedeutung)
   * - **Database NULL:** DB-Modell nutzt NULL für nicht-gesetzte Felder (konsistente Semantik)
   * - **Optional Chaining:** Consumer können `beschreibung?.trim()` nutzen statt `|| ''` Fallbacks
   */
  get beschreibung(): string | undefined {
    return this._beschreibung;
  }

  /**
   * Gibt zurück, ob die Qualifikation aktiv ist.
   *
   * **WARUM Soft-Delete statt Hard-Delete?**
   * - **Data Integrity:** Bestehende Zuweisungen (Rolle → Qualifikation) bleiben gültig
   * - **Audit-Trail:** Historische Daten referenzieren deaktivierte Qualifikationen
   * - **Reversibility:** Reaktivierung ist möglich (z.B. bei versehentlicher Deaktivierung)
   * - **UI Filtering:** Frontend kann aktive/inaktive Qualifikationen unterschiedlich darstellen
   *
   * Deaktivierte Qualifikationen werden in Dropdown-Selects nicht mehr angezeigt.
   */
  get istAktiv(): boolean {
    return this._istAktiv;
  }

  /**
   * Gibt die Sortierreihenfolge für UI-Anzeige zurück.
   *
   * **WARUM manueller sortOrder statt alphabetischer Sortierung?**
   * - **Business Requirements:** Fachbereich definiert Wichtigkeit/Priorität (z.B. "Gruppenführer" vor "Atemschutz")
   * - **Flexibility:** Alphabetische Sortierung würde sich bei Umbenennungen ändern
   * - **User Experience:** Häufig genutzte Qualifikationen können oben stehen (Usability)
   * - **Domain-Driven:** Sortierung ist eine fachliche Regel, nicht technische Konvention
   */
  get sortOrder(): number {
    return this._sortOrder;
  }

  /**
   * Gibt die User-ID des Erstellers zurück (für Audit-Trail).
   *
   * **WARUM CUID2-Format erforderlich?**
   * - **Referential Integrity:** createdBy referenziert User.id (Foreign Key Semantik)
   * - **Validation:** isCuid() Check verhindert invalide User-IDs (Defense-in-Depth)
   * - **Auditability:** Wer hat diese Qualifikation erstellt? (Compliance-Anforderung)
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

  // ============ Factory Methods ============

  /**
   * Factory Method für neue Qualifikation mit Validation.
   *
   * Emittiert QualifikationCreatedEvent bei erfolgreicher Erstellung.
   *
   * @param props - CreateQualifikationProps mit Pflichtfeldern
   * @returns Result<Qualifikation> - Success oder Failure mit Fehlermeldung
   */
  static create(props: CreateQualifikationProps): Result<Qualifikation> {
    // Validation: Name (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.name || props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
      return Result.fail<Qualifikation>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_SHORT);
    }
    if (props.name.length > QUALIFIKATION_NAME_MAX_LENGTH) {
      return Result.fail<Qualifikation>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_LONG);
    }

    // Validation: Abkuerzung (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.abkuerzung || props.abkuerzung.trim().length < QUALIFIKATION_ABKUERZUNG_MIN_LENGTH) {
      return Result.fail<Qualifikation>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_SHORT);
    }
    if (props.abkuerzung.length > QUALIFIKATION_ABKUERZUNG_MAX_LENGTH) {
      return Result.fail<Qualifikation>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_LONG);
    }

    // Validation: Kategorie (delegiert an Value Object)
    const kategorieResult = QualifikationKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<Qualifikation>(kategorieResult.error ?? 'Ungültige Kategorie');
    }
    const kategorie = kategorieResult.value;
    if (!kategorie) {
      return Result.fail<Qualifikation>('Ungültige Kategorie');
    }

    // Validation: Beschreibung (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.beschreibung && props.beschreibung.length > QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<Qualifikation>(QUALIFIKATION_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: createdBy (CUID2 Format)
    // Trim BEFORE validation to allow whitespace-wrapped CUIDs
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<Qualifikation>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<Qualifikation>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Create ID
    const idResult = QualifikationId.create();
    if (idResult.isFailure) {
      return Result.fail<Qualifikation>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<Qualifikation>('Fehler bei ID-Generierung');
    }

    // Trim und handle empty string for beschreibung
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    // Create Aggregate
    const qualifikation = new Qualifikation(id, props.name.trim(), props.abkuerzung.trim(), kategorie, trimmedCreatedBy, beschreibung);

    // Emit Domain Event (mit primitiven Werten für Serialisierbarkeit)
    qualifikation.addDomainEvent(new QualifikationCreatedEvent(id.value, qualifikation.name, qualifikation.abkuerzung, qualifikation.kategorieValue, qualifikation.createdBy));

    return Result.ok<Qualifikation>(qualifikation);
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
   * @param props - ReconstituteQualifikationProps mit allen DB-Feldern
   * @returns Result<Qualifikation>
   */
  static reconstitute(props: ReconstituteQualifikationProps): Result<Qualifikation> {
    const idResult = QualifikationId.create(props.id);
    if (idResult.isFailure) {
      // Override English error message from EntityId with German message
      return Result.fail<Qualifikation>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<Qualifikation>('Ungültige ID');
    }

    // Kategorie Value Object erstellen (minimal validation für DB-Daten)
    const kategorieResult = QualifikationKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<Qualifikation>('Ungültige Kategorie in DB-Daten');
    }
    const kategorie = kategorieResult.value;
    if (!kategorie) {
      return Result.fail<Qualifikation>('Ungültige Kategorie in DB-Daten');
    }

    // Trim für Konsistenz mit create() (Defense in Depth gegen DB-Korruption)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    // Validation: sortOrder (Defense in Depth gegen korrupte DB-Daten)
    // CR-1 Fix: Negative Werte, NaN, Infinity werden abgelehnt
    if (props.sortOrder < 0 || !Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
      return Result.fail<Qualifikation>(`Ungültiger sortOrder in DB-Daten: ${props.sortOrder}`);
    }

    return Result.ok<Qualifikation>(
      new Qualifikation(
        id,
        props.name.trim(),
        props.abkuerzung.trim(),
        kategorie,
        props.createdBy.trim(),
        beschreibung,
        props.istAktiv,
        props.sortOrder,
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert die Qualifikation mit den angegebenen Feldern.
   *
   * Emittiert QualifikationUpdatedEvent mit den geänderten Feldern.
   *
   * @param props - UpdateQualifikationProps mit zu ändernden Feldern
   * @returns Result<void> - Success oder Failure
   */
  update(props: UpdateQualifikationProps): Result<void> {
    const changes: Partial<Omit<UpdateQualifikationProps, 'updatedBy'>> = {};

    // Validation und Update: Name (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.name !== undefined) {
      if (props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
        return Result.fail<void>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_SHORT);
      }
      if (props.name.length > QUALIFIKATION_NAME_MAX_LENGTH) {
        return Result.fail<void>(QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_LONG);
      }
      this._name = props.name.trim();
      changes.name = this._name;
    }

    // Validation und Update: Abkuerzung (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.abkuerzung !== undefined) {
      if (props.abkuerzung.trim().length < QUALIFIKATION_ABKUERZUNG_MIN_LENGTH) {
        return Result.fail<void>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_SHORT);
      }
      if (props.abkuerzung.length > QUALIFIKATION_ABKUERZUNG_MAX_LENGTH) {
        return Result.fail<void>(QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_LONG);
      }
      this._abkuerzung = props.abkuerzung.trim();
      changes.abkuerzung = this._abkuerzung;
    }

    // Validation und Update: Kategorie (delegiert an Value Object)
    if (props.kategorie !== undefined) {
      const kategorieResult = QualifikationKategorie.create(props.kategorie);
      if (kategorieResult.isFailure) {
        return Result.fail<void>(kategorieResult.error ?? 'Ungültige Kategorie');
      }
      const kategorie = kategorieResult.value;
      if (!kategorie) {
        return Result.fail<void>('Ungültige Kategorie');
      }
      this._kategorie = kategorie;
      changes.kategorie = this._kategorie.value;
    }

    // Validation und Update: Beschreibung (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.beschreibung !== undefined) {
      if (props.beschreibung.length > QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH) {
        return Result.fail<void>(QUALIFIKATION_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
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
      this.addDomainEvent(new QualifikationUpdatedEvent(this.id.value, changes, this._updatedBy));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Deaktiviert die Qualifikation (Soft-Delete Pattern).
   *
   * Deaktivierte Qualifikationen sind nicht mehr in Dropdown-Selects verfügbar,
   * bestehende Zuweisungen bleiben aber erhalten.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  deactivate(updatedBy: string): Result<void> {
    if (!this._istAktiv) {
      return Result.fail<void>(QualifikationError.format(QUALIFIKATION_ERROR_CODES.ALREADY_DEACTIVATED, 'Qualifikation ist bereits deaktiviert'));
    }

    return this.update({ istAktiv: false, updatedBy });
  }

  /**
   * Reaktiviert eine deaktivierte Qualifikation.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  reactivate(updatedBy: string): Result<void> {
    if (this._istAktiv) {
      return Result.fail<void>('Qualifikation ist bereits aktiv');
    }

    return this.update({ istAktiv: true, updatedBy });
  }
}
