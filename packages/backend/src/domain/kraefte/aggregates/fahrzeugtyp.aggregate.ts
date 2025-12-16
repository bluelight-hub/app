import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { FahrzeugtypCreatedEvent } from '../events/fahrzeugtyp-created.event';
import { FahrzeugtypUpdatedEvent } from '../events/fahrzeugtyp-updated.event';
import { FahrzeugtypId } from '../value-objects/fahrzeugtyp-id';
import { FahrzeugtypKategorie } from '../value-objects/fahrzeugtyp-kategorie';
import {
  FAHRZEUGTYP_CODE_MIN_LENGTH,
  FAHRZEUGTYP_CODE_MAX_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH,
  FAHRZEUGTYP_VALIDATION_ERRORS,
} from '../constants/fahrzeugtyp-validation.constants';
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '../common/fahrzeugtyp-error-codes';

/**
 * Re-export für Backwards Compatibility und convenience.
 * Ermöglicht Consumers weiterhin `import { FAHRZEUGTYP_KATEGORIEN } from '@domain/kraefte'`.
 */
export { FAHRZEUGTYP_KATEGORIEN, type FahrzeugtypKategorieType } from '../value-objects/fahrzeugtyp-kategorie';
export type { SollbesatzungSchema } from '../types/sollbesatzung.types';

// Re-import for internal use
import type { SollbesatzungSchema } from '../types/sollbesatzung.types';

/**
 * Props für Fahrzeugtyp.create() Factory Method.
 */
export interface CreateFahrzeugtypProps {
  code: string; // Wird auf UPPERCASE normalisiert
  bezeichnung: string;
  kategorie: string; // Wird intern zu FahrzeugtypKategorie Value Object konvertiert
  beschreibung?: string;
  sollbesatzung?: SollbesatzungSchema;
  createdBy: string;
}

/**
 * Props für Fahrzeugtyp.reconstitute() (Hydration aus DB).
 */
export interface ReconstituteFahrzeugtypProps {
  id: string;
  code: string; // Bereits UPPERCASE aus DB
  bezeichnung: string;
  kategorie: string; // Wird intern zu FahrzeugtypKategorie Value Object konvertiert
  beschreibung?: string;
  sollbesatzung?: SollbesatzungSchema;
  istAktiv: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für Fahrzeugtyp.update() Method.
 */
export interface UpdateFahrzeugtypProps {
  code?: string; // Wird auf UPPERCASE normalisiert
  bezeichnung?: string;
  kategorie?: string; // Wird intern zu FahrzeugtypKategorie Value Object konvertiert
  beschreibung?: string;
  sollbesatzung?: SollbesatzungSchema;
  istAktiv?: boolean;
  sortOrder?: number;
  updatedBy: string;
}

/**
 * Fahrzeugtyp Aggregate Root.
 *
 * Repräsentiert eine Fahrzeugtyp-Definition im Admin-Konfigurationsbereich.
 * Fahrzeugtypen definieren welche Art von Fahrzeugen im System erfasst werden können
 * und welche Sollbesatzung sie haben.
 *
 * **Invarianten:**
 * - Code ist Pflichtfeld (min. 2 Zeichen) und wird auf UPPERCASE normalisiert
 * - Bezeichnung ist Pflichtfeld (min. 3 Zeichen)
 * - Kategorie muss aus dem definierten ENUM stammen
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - sortOrder muss >= 0 sein (integer, finite)
 *
 * **Code Uniqueness:**
 * - Der Code MUSS unique sein (Datenbank-Constraint)
 * - WARUM wird Uniqueness NICHT im Aggregate enforced?
 *   1. **Aggregate Boundary:** Ein Aggregate kennt nur seinen eigenen State, nicht andere Aggregates
 *   2. **Performance:** Uniqueness-Check würde DB-Query in jedem create()/update() erfordern
 *   3. **Separation of Concerns:** Repository Layer ist verantwortlich für Persistence Constraints
 *   4. **Transaction Safety:** Uniqueness-Check + Insert MUSS atomar sein (Race Condition)
 * - LÖSUNG: Repository wirft bei Unique Constraint Violation einen Fehler
 * - Application Layer fängt diesen Fehler und returned Result.fail() mit User-Friendly Message
 *
 * **Code Normalisierung:**
 * - Code wird IMMER auf UPPERCASE normalisiert (z.B. "hlf" → "HLF")
 * - WARUM? Konsistente Darstellung in UI und einfacher Abgleich
 * - Normalisierung erfolgt sowohl in create() als auch update()
 *
 * **Sollbesatzung Schema:**
 * - JSON-Feld mit flexibler Struktur (fahrer, sanitaeter, notarzt, funktrupp, helfer)
 * - Optional: Manche Fahrzeugtypen haben keine definierte Sollbesatzung
 * - Validierung: Nur positive Zahlen erlaubt (>= 0)
 *
 * **Business Rules:**
 * - Deaktivierte Fahrzeugtypen sind nicht mehr in Dropdown-Selects verfügbar
 * - Bestehende Zuweisungen bleiben bei Deaktivierung erhalten
 */
export class Fahrzeugtyp extends AggregateRoot<FahrzeugtypId> {
  private _code: string; // UPPERCASE
  private _bezeichnung: string;
  private _kategorie: FahrzeugtypKategorie;
  private _beschreibung?: string;
  private _sollbesatzung?: SollbesatzungSchema;
  private _istAktiv: boolean;
  private _sortOrder: number;
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: FahrzeugtypId,
    code: string, // Erwartet bereits UPPERCASE-normalized
    bezeichnung: string,
    kategorie: FahrzeugtypKategorie,
    createdBy: string,
    beschreibung?: string,
    sollbesatzung?: SollbesatzungSchema,
    istAktiv = true,
    sortOrder = 0,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._code = code;
    this._bezeichnung = bezeichnung;
    this._kategorie = kategorie;
    this._beschreibung = beschreibung;
    this._sollbesatzung = sollbesatzung;
    this._istAktiv = istAktiv;
    this._sortOrder = sortOrder;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /**
   * Gibt den eindeutigen Code des Fahrzeugtyps zurück (UPPERCASE).
   *
   * **WARUM als public getter exponiert?**
   * - **Business Key:** Code ist der primäre Display-Identifier in UI
   * - **Uniqueness Constraint:** Repository/Application Layer prüfen Duplikate vor save()
   * - **Read-Only Access:** DTOs serialisieren Code für API-Responses
   * - **UPPERCASE Normalisierung:** Garantiert konsistentes Format
   */
  get code(): string {
    return this._code;
  }

  /**
   * Gibt die vollständige Bezeichnung des Fahrzeugtyps zurück.
   *
   * **WARUM als public getter exponiert?**
   * - **Read-Only Access:** Repository, DTOs, und Presentation Layer benötigen Lesezugriff
   * - **Encapsulation:** Direkter Zugriff auf `_bezeichnung` würde Invarianten-Verletzung ermöglichen
   * - **Immutability:** Änderungen nur über `update()` Method mit Validation und Event-Emission
   */
  get bezeichnung(): string {
    return this._bezeichnung;
  }

  /**
   * Gibt die Kategorie des Fahrzeugtyps als Value Object zurück.
   *
   * **WARUM als Value Object statt primitiver String?**
   * - **Type Safety:** ENUM-Validierung zur Compile-Time (kein ungültiger Wert möglich)
   * - **Domain Logic:** Value Object kapselt Kategorie-spezifische Business Rules
   * - **Self-Documenting:** Code-Completion zeigt erlaubte Werte (FAHRZEUGTYP_KATEGORIEN)
   */
  get kategorie(): FahrzeugtypKategorie {
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
   * Gibt die optionale Beschreibung des Fahrzeugtyps zurück.
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
   * Gibt das optionale Sollbesatzung-Schema zurück.
   *
   * **WARUM optional?**
   * - Nicht alle Fahrzeugtypen haben eine definierte Sollbesatzung
   * - undefined = "keine Sollbesatzung definiert"
   */
  get sollbesatzung(): SollbesatzungSchema | undefined {
    return this._sollbesatzung;
  }

  /**
   * Gibt zurück, ob der Fahrzeugtyp aktiv ist.
   *
   * **WARUM Soft-Delete statt Hard-Delete?**
   * - **Data Integrity:** Bestehende Zuweisungen (Fahrzeug → Fahrzeugtyp) bleiben gültig
   * - **Audit-Trail:** Historische Daten referenzieren deaktivierte Fahrzeugtypen
   * - **Reversibility:** Reaktivierung ist möglich (z.B. bei versehentlicher Deaktivierung)
   * - **UI Filtering:** Frontend kann aktive/inaktive Fahrzeugtypen unterschiedlich darstellen
   *
   * Deaktivierte Fahrzeugtypen werden in Dropdown-Selects nicht mehr angezeigt.
   */
  get istAktiv(): boolean {
    return this._istAktiv;
  }

  /**
   * Gibt die Sortierreihenfolge für UI-Anzeige zurück.
   *
   * **WARUM manueller sortOrder statt alphabetischer Sortierung?**
   * - **Business Requirements:** Fachbereich definiert Wichtigkeit/Priorität (z.B. "HLF" vor "MTW")
   * - **Flexibility:** Alphabetische Sortierung würde sich bei Umbenennungen ändern
   * - **User Experience:** Häufig genutzte Fahrzeugtypen können oben stehen (Usability)
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
   * - **Auditability:** Wer hat diesen Fahrzeugtyp erstellt? (Compliance-Anforderung)
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
   * Normalisiert Code auf UPPERCASE.
   *
   * **WARUM Normalisierung?**
   * - Konsistente Darstellung in UI (immer UPPERCASE)
   * - Einfacher Vergleich (keine Case-Sensitivity-Probleme)
   * - Best Practice für technische Codes/Kennungen
   *
   * **HINWEIS:** Verwendet trim() ohne Whitespace-Collapse.
   * - "  ABC  " → "ABC" (leading/trailing entfernt)
   * - "A B C" → "A B C" (innere Leerzeichen bleiben erhalten)
   * - Falls Whitespace-Collapse benötigt: `code.replace(/\s+/g, ' ')` verwenden
   *
   * @param code - Der zu normalisierende Code
   * @returns Normalisierter Code (trimmed + UPPERCASE, ohne Whitespace-Collapse)
   */
  private static normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Validiert das Sollbesatzung-Schema.
   *
   * **Validierungsregeln:**
   * - Alle Werte müssen >= 0 sein (keine negativen Besatzungszahlen)
   * - Alle Werte müssen ganze Zahlen sein (keine Floats, NaN, Infinity)
   *
   * **HINWEIS:** 0 ist erlaubt!
   * - 0 = "Diese Rolle ist nicht vorgesehen" (z.B. { fahrer: 1, notarzt: 0 })
   * - undefined = "Keine Angabe zu dieser Rolle" (Property nicht gesetzt)
   * - Leeres Objekt {} ist valide (Fahrzeugtyp ohne Sollbesatzung-Definition)
   *
   * @param sollbesatzung - Das zu validierende Schema
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  private static validateSollbesatzung(sollbesatzung: SollbesatzungSchema): Result<void> {
    const entries = Object.entries(sollbesatzung);

    for (const [key, value] of entries) {
      if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
        return Result.fail<void>(`Sollbesatzung.${key} muss eine ganze Zahl sein`);
      }
      if (value < 0) {
        return Result.fail<void>(`Sollbesatzung.${key} muss >= 0 sein`);
      }
    }

    return Result.ok<void>(undefined);
  }

  // ============ Factory Methods ============

  /**
   * Factory Method für neuen Fahrzeugtyp mit Validation.
   *
   * Emittiert FahrzeugtypCreatedEvent bei erfolgreicher Erstellung.
   *
   * @param props - CreateFahrzeugtypProps mit Pflichtfeldern
   * @returns Result<Fahrzeugtyp> - Success oder Failure mit Fehlermeldung
   */
  static create(props: CreateFahrzeugtypProps): Result<Fahrzeugtyp> {
    // Code normalisieren (trim + UPPERCASE)
    const normalizedCode = Fahrzeugtyp.normalizeCode(props.code);

    // Validation: Code (nutzt Domain-Konstanten für Single Source of Truth)
    if (normalizedCode.length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
      return Result.fail<Fahrzeugtyp>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT);
    }
    if (normalizedCode.length > FAHRZEUGTYP_CODE_MAX_LENGTH) {
      return Result.fail<Fahrzeugtyp>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG);
    }

    // Validation: Bezeichnung (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.bezeichnung || props.bezeichnung.trim().length < FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH) {
      return Result.fail<Fahrzeugtyp>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT);
    }
    if (props.bezeichnung.length > FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH) {
      return Result.fail<Fahrzeugtyp>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG);
    }

    // Validation: Kategorie (delegiert an Value Object)
    const kategorieResult = FahrzeugtypKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<Fahrzeugtyp>(kategorieResult.error ?? 'Ungültige Kategorie');
    }
    const kategorie = kategorieResult.value;
    if (!kategorie) {
      return Result.fail<Fahrzeugtyp>('Ungültige Kategorie');
    }

    // Validation: Beschreibung (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.beschreibung && props.beschreibung.length > FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH) {
      return Result.fail<Fahrzeugtyp>(FAHRZEUGTYP_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
    }

    // Validation: Sollbesatzung (optional, aber wenn gesetzt dann validiert)
    if (props.sollbesatzung) {
      const sollbesatzungValidation = Fahrzeugtyp.validateSollbesatzung(props.sollbesatzung);
      if (sollbesatzungValidation.isFailure) {
        return Result.fail<Fahrzeugtyp>(sollbesatzungValidation.error ?? 'Ungültige Sollbesatzung');
      }
    }

    // Validation: createdBy (CUID2 Format)
    // Trim BEFORE validation to allow whitespace-wrapped CUIDs
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<Fahrzeugtyp>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<Fahrzeugtyp>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Create ID
    const idResult = FahrzeugtypId.create();
    if (idResult.isFailure) {
      return Result.fail<Fahrzeugtyp>(idResult.error ?? 'Fehler bei ID-Generierung');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<Fahrzeugtyp>('Fehler bei ID-Generierung');
    }

    // Trim und handle empty string for beschreibung
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    // Create Aggregate
    const fahrzeugtyp = new Fahrzeugtyp(
      id,
      normalizedCode, // UPPERCASE
      props.bezeichnung.trim(),
      kategorie,
      trimmedCreatedBy,
      beschreibung,
      props.sollbesatzung,
    );

    // Emit Domain Event (mit primitiven Werten für Serialisierbarkeit)
    fahrzeugtyp.addDomainEvent(new FahrzeugtypCreatedEvent(id.value, fahrzeugtyp.code, fahrzeugtyp.bezeichnung, fahrzeugtyp.kategorieValue, fahrzeugtyp.createdBy));

    return Result.ok<Fahrzeugtyp>(fahrzeugtyp);
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
   * @param props - ReconstituteFahrzeugtypProps mit allen DB-Feldern
   * @returns Result<Fahrzeugtyp>
   */
  static reconstitute(props: ReconstituteFahrzeugtypProps): Result<Fahrzeugtyp> {
    const idResult = FahrzeugtypId.create(props.id);
    if (idResult.isFailure) {
      // Override English error message from EntityId with German message
      return Result.fail<Fahrzeugtyp>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<Fahrzeugtyp>('Ungültige ID');
    }

    // Kategorie Value Object erstellen (minimal validation für DB-Daten)
    const kategorieResult = FahrzeugtypKategorie.create(props.kategorie);
    if (kategorieResult.isFailure) {
      return Result.fail<Fahrzeugtyp>('Ungültige Kategorie in DB-Daten');
    }
    const kategorie = kategorieResult.value;
    if (!kategorie) {
      return Result.fail<Fahrzeugtyp>('Ungültige Kategorie in DB-Daten');
    }

    // Trim für Konsistenz mit create() (Defense in Depth gegen DB-Korruption)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    // Validation: sortOrder (Defense in Depth gegen korrupte DB-Daten)
    if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
      return Result.fail<Fahrzeugtyp>(`Ungültiger sortOrder in DB-Daten: ${props.sortOrder}`);
    }
    if (props.sortOrder < 0) {
      return Result.fail<Fahrzeugtyp>(`sortOrder muss >= 0 sein (ist: ${props.sortOrder})`);
    }

    // Validation: Sollbesatzung (Defense in Depth gegen korrupte DB-Daten)
    if (props.sollbesatzung) {
      const sollbesatzungValidation = Fahrzeugtyp.validateSollbesatzung(props.sollbesatzung);
      if (sollbesatzungValidation.isFailure) {
        return Result.fail<Fahrzeugtyp>(`Korrupte Sollbesatzung in DB-Daten: ${sollbesatzungValidation.error}`);
      }
    }

    return Result.ok<Fahrzeugtyp>(
      new Fahrzeugtyp(
        id,
        props.code
          .trim()
          .toUpperCase(), // UPPERCASE Normalisierung
        props.bezeichnung.trim(),
        kategorie,
        props.createdBy.trim(),
        beschreibung,
        props.sollbesatzung,
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
   * Aktualisiert den Fahrzeugtyp mit den angegebenen Feldern.
   *
   * Emittiert FahrzeugtypUpdatedEvent mit den geänderten Feldern.
   *
   * @param props - UpdateFahrzeugtypProps mit zu ändernden Feldern
   * @returns Result<void> - Success oder Failure
   */
  update(props: UpdateFahrzeugtypProps): Result<void> {
    const changes: Partial<Omit<UpdateFahrzeugtypProps, 'updatedBy'>> = {};

    // Validation und Update: Code (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.code !== undefined) {
      const normalizedCode = Fahrzeugtyp.normalizeCode(props.code);
      if (normalizedCode.length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
        return Result.fail<void>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT);
      }
      if (normalizedCode.length > FAHRZEUGTYP_CODE_MAX_LENGTH) {
        return Result.fail<void>(FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG);
      }
      this._code = normalizedCode;
      changes.code = this._code;
    }

    // Validation und Update: Bezeichnung (nutzt Domain-Konstanten für Single Source of Truth)
    if (props.bezeichnung !== undefined) {
      if (props.bezeichnung.trim().length < FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH) {
        return Result.fail<void>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT);
      }
      if (props.bezeichnung.length > FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH) {
        return Result.fail<void>(FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG);
      }
      this._bezeichnung = props.bezeichnung.trim();
      changes.bezeichnung = this._bezeichnung;
    }

    // Validation und Update: Kategorie (delegiert an Value Object)
    if (props.kategorie !== undefined) {
      const kategorieResult = FahrzeugtypKategorie.create(props.kategorie);
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
      if (props.beschreibung.length > FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH) {
        return Result.fail<void>(FAHRZEUGTYP_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
      }
      // Konsistentes Handling: leerer String nach trim() wird undefined
      const trimmedBeschreibung = props.beschreibung.trim();
      this._beschreibung = trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
      changes.beschreibung = this._beschreibung;
    }

    // Validation und Update: Sollbesatzung
    if (props.sollbesatzung !== undefined) {
      const sollbesatzungValidation = Fahrzeugtyp.validateSollbesatzung(props.sollbesatzung);
      if (sollbesatzungValidation.isFailure) {
        return Result.fail<void>(sollbesatzungValidation.error ?? 'Ungültige Sollbesatzung');
      }
      this._sollbesatzung = props.sollbesatzung;
      changes.sollbesatzung = this._sollbesatzung;
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
      this.addDomainEvent(new FahrzeugtypUpdatedEvent(this.id.value, changes, this._updatedBy));
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Deaktiviert den Fahrzeugtyp (Soft-Delete Pattern).
   *
   * Deaktivierte Fahrzeugtypen sind nicht mehr in Dropdown-Selects verfügbar,
   * bestehende Zuweisungen bleiben aber erhalten.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  deactivate(updatedBy: string): Result<void> {
    if (!this._istAktiv) {
      return Result.fail<void>(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.ALREADY_DEACTIVATED, 'Fahrzeugtyp ist bereits deaktiviert'));
    }

    return this.update({ istAktiv: false, updatedBy });
  }

  /**
   * Reaktiviert einen deaktivierten Fahrzeugtyp.
   *
   * @param updatedBy - User ID für Audit-Trail
   * @returns Result<void>
   */
  reactivate(updatedBy: string): Result<void> {
    if (this._istAktiv) {
      return Result.fail<void>('Fahrzeugtyp ist bereits aktiv');
    }

    return this.update({ istAktiv: true, updatedBy });
  }
}
