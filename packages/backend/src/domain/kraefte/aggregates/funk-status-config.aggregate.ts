import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import { FUNKSTATUS_VALIDATION, FUNKSTATUS_VALIDATION_ERRORS } from '../constants/funkstatus-validation.constants';
import { FUNKSTATUS_ERROR_CODES, FunkStatusError } from '../common/error-codes';
import { FunkStatusConfigUpdatedEvent } from '../events/funk-status-config-updated.event';
import { FunkStatusConfigId } from '../value-objects/funk-status-config-id';

/**
 * Props für FunkStatusConfig.reconstitute() (Hydration aus DB).
 *
 * **WICHTIG: Config-Only Pattern - KEIN CreateProps!**
 * Funkstatus werden via Seed/Migration erstellt, nicht via create() Factory.
 */
export interface ReconstituteFunkStatusConfigProps {
  id: string;
  code: number;
  standardLabel: string;
  customLabel?: string;
  farbe?: string;
  istAlarmierbar: boolean;
  beschreibung?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Props für FunkStatusConfig.update() Method.
 *
 * **Einschränkungen:**
 * - code ist NICHT änderbar (Immutable Business Key)
 * - standardLabel ist NICHT änderbar (System-Vorgabe)
 * - Nur customLabel, farbe, istAlarmierbar, beschreibung änderbar
 * - Update nur erlaubt für EDITABLE_CODES (7, 8, 9)
 */
export interface UpdateFunkStatusConfigProps {
  customLabel?: string;
  farbe?: string;
  istAlarmierbar?: boolean;
  beschreibung?: string;
  updatedBy: string;
}

/**
 * FunkStatusConfig Aggregate Root.
 *
 * Repräsentiert eine Funk-Status-Konfiguration (Status 0-9) im System.
 *
 * **Domain Rules:**
 * - Status 0-6 sind SYSTEM-DEFINIERT (Read-Only, nicht änderbar)
 * - Status 7-9 sind BENUTZER-DEFINIERT (Editierbar)
 * - Code ist IMMUTABLE Business Key (kann nicht geändert werden)
 * - customLabel überschreibt standardLabel in der Anzeige
 *
 * **Config-Only Pattern:**
 * - KEIN create() - Funkstatus werden via Seed/Migration erstellt
 * - NUR reconstitute() für DB-Hydration
 * - NUR update() für Änderungen (nur wenn code in EDITABLE_CODES)
 *
 * **Invarianten:**
 * - code ist Integer zwischen 0 und 9
 * - farbe ist Hex-Format (#RRGGBB) falls gesetzt
 * - createdBy ist Pflichtfeld für Audit-Trail
 * - Update nur erlaubt für editierbare Codes (7, 8, 9)
 *
 * **Business Rules:**
 * - Status 0-6 können NUR via Seed/Migration geändert werden (System-Änderungen)
 * - Status 7-9 können via Admin-UI geändert werden (Benutzer-Anpassungen)
 * - istAlarmierbar steuert, ob Fahrzeuge mit diesem Status alarmierbar sind
 */
export class FunkStatusConfig extends AggregateRoot<FunkStatusConfigId> {
  private _code: number;
  private _standardLabel: string;
  private _customLabel?: string;
  private _farbe?: string;
  private _istAlarmierbar: boolean;
  private _beschreibung?: string;
  private _createdBy: string;
  private _updatedBy?: string;

  private constructor(
    id: FunkStatusConfigId,
    code: number,
    standardLabel: string,
    istAlarmierbar: boolean,
    createdBy: string,
    customLabel?: string,
    farbe?: string,
    beschreibung?: string,
    createdAt?: Date,
    updatedAt?: Date,
    updatedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._code = code;
    this._standardLabel = standardLabel;
    this._customLabel = customLabel;
    this._farbe = farbe;
    this._istAlarmierbar = istAlarmierbar;
    this._beschreibung = beschreibung;
    this._createdBy = createdBy;
    this._updatedBy = updatedBy;
  }

  // ============ Getters ============

  /**
   * Gibt den Status-Code zurück (0-9).
   *
   * **WARUM Immutable (nur Getter, kein Setter)?**
   * - Code ist der Business Key (identifiziert den Status eindeutig)
   * - Änderung würde Semantik komplett verändern (Status 1 ≠ Status 2)
   * - FMS/Funk-Standard schreibt feste Code-Zuordnung vor
   */
  get code(): number {
    return this._code;
  }

  /**
   * Gibt das Standard-Label zurück (system-definiert).
   *
   * **WARUM Read-Only?**
   * - Standard-Label sind vom FMS-Standard vorgegeben
   * - Nur via Seed/Migration änderbar (System-Änderungen)
   */
  get standardLabel(): string {
    return this._standardLabel;
  }

  /**
   * Gibt das benutzerdefinierte Label zurück (überschreibt standardLabel in UI).
   *
   * **WARUM optional?**
   * - Ermöglicht Organisations-spezifische Bezeichnungen
   * - Falls undefined, wird standardLabel in UI verwendet
   */
  get customLabel(): string | undefined {
    return this._customLabel;
  }

  /**
   * Gibt das anzuzeigende Label zurück (customLabel falls gesetzt, sonst standardLabel).
   *
   * **WARUM separater Getter?**
   * - Convenience für Consumer (keine Fallback-Logik nötig)
   * - Kapselt Business Rule "Custom überschreibt Standard"
   */
  get displayLabel(): string {
    return this._customLabel ?? this._standardLabel;
  }

  /**
   * Gibt die Farbe als Hex-String zurück (#RRGGBB).
   *
   * **WARUM optional?**
   * - Default-Farben können in Frontend definiert sein
   * - Ermöglicht farbliche Hervorhebung in UI
   */
  get farbe(): string | undefined {
    return this._farbe;
  }

  /**
   * Gibt zurück, ob Fahrzeuge mit diesem Status alarmierbar sind.
   *
   * **Business Logic:**
   * - Status 0 (Einsatzbereit) → istAlarmierbar = true
   * - Status 2 (Einsatz übernommen) → istAlarmierbar = false
   * - Steuert Alarmierungs-Filter im Disponenten-UI
   */
  get istAlarmierbar(): boolean {
    return this._istAlarmierbar;
  }

  /**
   * Gibt die optionale Beschreibung zurück.
   *
   * **WARUM optional?**
   * - Zusätzliche Erklärung für Administratoren
   * - Nicht in Dropdown-UI, nur in Konfigurations-UI
   */
  get beschreibung(): string | undefined {
    return this._beschreibung;
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

  /**
   * Prüft ob dieser Status editierbar ist (nur 7, 8, 9).
   *
   * **Business Rule:**
   * - Status 0-6: System-definiert, nur via Seed/Migration änderbar
   * - Status 7-9: Benutzer-definiert, via Admin-UI änderbar
   */
  get isEditable(): boolean {
    return (FUNKSTATUS_VALIDATION.EDITABLE_CODES as readonly number[]).includes(this._code);
  }

  // ============ Factory Methods ============

  /**
   * Reconstitute Method für Hydration aus Datenbank.
   *
   * Verwendet wenn Aggregate aus Prisma geladen wird.
   *
   * **WARUM wird hier KEINE vollständige Validation durchgeführt?**
   * - **Trusted Source:** Daten kommen aus der Datenbank und wurden bereits bei Seed/Migration validiert
   * - **Performance:** Validation bei jedem DB-Read würde die Ladezeit erhöhen
   * - **Datenintegrität:** DB-Constraints (NOT NULL, CHECK, max length) garantieren Konsistenz
   *
   * **Defense in Depth Validation:**
   * - code: Integer 0-9 Check
   * - farbe: Hex-Format Check falls gesetzt
   * - createdBy: CUID2-Format Check
   *
   * Keine Domain Events (historische Daten, nicht neu erstellt).
   *
   * @param props - ReconstituteFunkStatusConfigProps mit allen DB-Feldern
   * @returns Result<FunkStatusConfig>
   */
  static reconstitute(props: ReconstituteFunkStatusConfigProps): Result<FunkStatusConfig> {
    const idResult = FunkStatusConfigId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail<FunkStatusConfig>('Ungültige ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail<FunkStatusConfig>('Ungültige ID');
    }

    // Defense in Depth: Code Validation
    if (!Number.isInteger(props.code)) {
      return Result.fail<FunkStatusConfig>('Code muss eine ganze Zahl sein');
    }
    if (props.code < FUNKSTATUS_VALIDATION.CODE_MIN || props.code > FUNKSTATUS_VALIDATION.CODE_MAX) {
      return Result.fail<FunkStatusConfig>(FunkStatusError.format(FUNKSTATUS_ERROR_CODES.CODE_OUT_OF_RANGE, `Code ${props.code} ist außerhalb des Bereichs 0-9`));
    }

    // Defense in Depth: Farbe Validation (falls gesetzt)
    const trimmedFarbe = props.farbe?.trim();
    if (trimmedFarbe && trimmedFarbe.length > 0) {
      if (!FUNKSTATUS_VALIDATION.COLOR_HEX_PATTERN.test(trimmedFarbe)) {
        return Result.fail<FunkStatusConfig>(FunkStatusError.format(FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT, FUNKSTATUS_VALIDATION_ERRORS.INVALID_COLOR_FORMAT));
      }
    }

    // Defense in Depth: createdBy CUID2 Validation
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<FunkStatusConfig>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<FunkStatusConfig>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Trim und handle empty strings
    const trimmedCustomLabel = props.customLabel?.trim();
    const customLabel = trimmedCustomLabel && trimmedCustomLabel.length > 0 ? trimmedCustomLabel : undefined;

    const trimmedBeschreibung = props.beschreibung?.trim();
    const beschreibung = trimmedBeschreibung && trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;

    return Result.ok<FunkStatusConfig>(
      new FunkStatusConfig(
        id,
        props.code,
        props.standardLabel.trim(),
        props.istAlarmierbar,
        trimmedCreatedBy,
        customLabel,
        trimmedFarbe && trimmedFarbe.length > 0 ? trimmedFarbe : undefined,
        beschreibung,
        props.createdAt,
        props.updatedAt,
        props.updatedBy?.trim(),
      ),
    );
  }

  // ============ Business Methods ============

  /**
   * Aktualisiert die FunkStatusConfig mit den angegebenen Feldern.
   *
   * **Einschränkungen:**
   * - Nur editierbare Codes (7, 8, 9) können aktualisiert werden
   * - code und standardLabel sind NICHT änderbar (Immutable)
   *
   * Emittiert FunkStatusConfigUpdatedEvent mit den geänderten Feldern.
   *
   * @param props - UpdateFunkStatusConfigProps mit zu ändernden Feldern
   * @returns Result<void> - Success oder Failure
   */
  update(props: UpdateFunkStatusConfigProps): Result<void> {
    // Business Rule: Nur editierbare Codes (7, 8, 9) ändern erlaubt
    if (!this.isEditable) {
      return Result.fail<void>(FunkStatusError.format(FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY, FUNKSTATUS_VALIDATION_ERRORS.CODE_READ_ONLY));
    }

    const changes: Partial<Omit<UpdateFunkStatusConfigProps, 'updatedBy'>> = {};

    // Validation und Update: customLabel
    if (props.customLabel !== undefined) {
      const trimmedCustomLabel = props.customLabel.trim();
      if (trimmedCustomLabel.length > FUNKSTATUS_VALIDATION.LABEL_MAX_LENGTH) {
        return Result.fail<void>(FUNKSTATUS_VALIDATION_ERRORS.LABEL_TOO_LONG);
      }
      // Leerer String nach trim() wird undefined (Fallback zu standardLabel)
      this._customLabel = trimmedCustomLabel.length > 0 ? trimmedCustomLabel : undefined;
      changes.customLabel = this._customLabel;
    }

    // Validation und Update: farbe
    if (props.farbe !== undefined) {
      const trimmedFarbe = props.farbe.trim();
      if (trimmedFarbe.length > 0) {
        if (!FUNKSTATUS_VALIDATION.COLOR_HEX_PATTERN.test(trimmedFarbe)) {
          return Result.fail<void>(FunkStatusError.format(FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT, FUNKSTATUS_VALIDATION_ERRORS.INVALID_COLOR_FORMAT));
        }
        this._farbe = trimmedFarbe;
      } else {
        this._farbe = undefined;
      }
      changes.farbe = this._farbe;
    }

    // Update: istAlarmierbar
    if (props.istAlarmierbar !== undefined) {
      this._istAlarmierbar = props.istAlarmierbar;
      changes.istAlarmierbar = this._istAlarmierbar;
    }

    // Validation und Update: beschreibung
    if (props.beschreibung !== undefined) {
      if (props.beschreibung.length > FUNKSTATUS_VALIDATION.BESCHREIBUNG_MAX_LENGTH) {
        return Result.fail<void>(FUNKSTATUS_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG);
      }
      const trimmedBeschreibung = props.beschreibung.trim();
      this._beschreibung = trimmedBeschreibung.length > 0 ? trimmedBeschreibung : undefined;
      changes.beschreibung = this._beschreibung;
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
      this.addDomainEvent(new FunkStatusConfigUpdatedEvent(this.id.value, this._code, changes, this._updatedBy));
    }

    return Result.ok<void>(undefined);
  }
}
