import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { QualifikationCreatedEvent } from '../events/qualifikation-created.event';
import { QualifikationUpdatedEvent } from '../events/qualifikation-updated.event';
import { QualifikationId } from '../value-objects/qualifikation-id';

/**
 * Erlaubte Qualifikation-Kategorien (konsistent mit Prisma ENUM).
 */
export type QualifikationKategorie = 'FUEHRUNG' | 'SANITAET' | 'BETREUUNG' | 'TECHNIK' | 'SONSTIGES';

/**
 * Props für Qualifikation.create() Factory Method.
 */
export interface CreateQualifikationProps {
  name: string;
  abkuerzung: string;
  kategorie: QualifikationKategorie;
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
  kategorie: QualifikationKategorie;
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
  kategorie?: QualifikationKategorie;
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
  private static readonly VALID_KATEGORIEN: QualifikationKategorie[] = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'];

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
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gibt die eindeutige Abkürzung der Qualifikation zurück.
   */
  get abkuerzung(): string {
    return this._abkuerzung;
  }

  /**
   * Gibt die Kategorie der Qualifikation zurück.
   */
  get kategorie(): QualifikationKategorie {
    return this._kategorie;
  }

  /**
   * Gibt die optionale Beschreibung der Qualifikation zurück.
   */
  get beschreibung(): string | undefined {
    return this._beschreibung;
  }

  /**
   * Gibt zurück, ob die Qualifikation aktiv ist.
   *
   * Deaktivierte Qualifikationen werden in Dropdown-Selects nicht mehr angezeigt.
   */
  get istAktiv(): boolean {
    return this._istAktiv;
  }

  /**
   * Gibt die Sortierreihenfolge für UI-Anzeige zurück.
   */
  get sortOrder(): number {
    return this._sortOrder;
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
    // Validation: Name
    if (!props.name || props.name.trim().length < 3) {
      return Result.fail<Qualifikation>('Name muss mindestens 3 Zeichen haben');
    }
    if (props.name.length > 100) {
      return Result.fail<Qualifikation>('Name darf maximal 100 Zeichen lang sein');
    }

    // Validation: Abkuerzung
    if (!props.abkuerzung || props.abkuerzung.trim().length < 2) {
      return Result.fail<Qualifikation>('Abkürzung muss mindestens 2 Zeichen haben');
    }
    if (props.abkuerzung.length > 20) {
      return Result.fail<Qualifikation>('Abkürzung darf maximal 20 Zeichen lang sein');
    }

    // Validation: Kategorie
    if (!Qualifikation.VALID_KATEGORIEN.includes(props.kategorie)) {
      return Result.fail<Qualifikation>(`Ungültige Kategorie: ${props.kategorie}. Erlaubt: ${Qualifikation.VALID_KATEGORIEN.join(', ')}`);
    }

    // Validation: Beschreibung
    if (props.beschreibung && props.beschreibung.length > 1000) {
      return Result.fail<Qualifikation>('Beschreibung darf maximal 1000 Zeichen lang sein');
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
    const qualifikation = new Qualifikation(id, props.name.trim(), props.abkuerzung.trim(), props.kategorie, trimmedCreatedBy, beschreibung);

    // Emit Domain Event (mit primitiver String-ID für Serialisierbarkeit)
    qualifikation.addDomainEvent(new QualifikationCreatedEvent(id.value, qualifikation.name, qualifikation.abkuerzung, qualifikation.kategorie, qualifikation.createdBy));

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

    // Trim für Konsistenz mit create() (Defense in Depth gegen DB-Korruption)
    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<Qualifikation>(
      new Qualifikation(
        id,
        props.name.trim(),
        props.abkuerzung.trim(),
        props.kategorie,
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

    // Validation und Update: Name
    if (props.name !== undefined) {
      if (props.name.trim().length < 3) {
        return Result.fail<void>('Name muss mindestens 3 Zeichen haben');
      }
      if (props.name.length > 100) {
        return Result.fail<void>('Name darf maximal 100 Zeichen lang sein');
      }
      this._name = props.name.trim();
      changes.name = this._name;
    }

    // Validation und Update: Abkuerzung
    if (props.abkuerzung !== undefined) {
      if (props.abkuerzung.trim().length < 2) {
        return Result.fail<void>('Abkürzung muss mindestens 2 Zeichen haben');
      }
      if (props.abkuerzung.length > 20) {
        return Result.fail<void>('Abkürzung darf maximal 20 Zeichen lang sein');
      }
      this._abkuerzung = props.abkuerzung.trim();
      changes.abkuerzung = this._abkuerzung;
    }

    // Validation und Update: Kategorie
    if (props.kategorie !== undefined) {
      if (!Qualifikation.VALID_KATEGORIEN.includes(props.kategorie)) {
        return Result.fail<void>(`Ungültige Kategorie: ${props.kategorie}. Erlaubt: ${Qualifikation.VALID_KATEGORIEN.join(', ')}`);
      }
      this._kategorie = props.kategorie;
      changes.kategorie = this._kategorie;
    }

    // Validation und Update: Beschreibung
    if (props.beschreibung !== undefined) {
      if (props.beschreibung.length > 1000) {
        return Result.fail<void>('Beschreibung darf maximal 1000 Zeichen lang sein');
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
      return Result.fail<void>('Qualifikation ist bereits deaktiviert');
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
