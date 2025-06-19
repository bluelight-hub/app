/**
 * Schema-Validierung für Seed-Daten JSON-Import.
 * Bietet robuste Validierung und aussagekräftige Fehlermeldungen.
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  CURRENT_SCHEMA_VERSION,
  ImportConfig,
  SEED_DATA_JSON_SCHEMA,
  SeedData,
  SIMPLE_SEED_DATA_JSON_SCHEMA,
  SimpleSeedData,
  SUPPORTED_SCHEMA_VERSIONS,
} from './schema';

/**
 * Validierungs-Ergebnis mit detaillierten Informationen.
 */
export interface ValidationResult {
  /** Ist die Validierung erfolgreich? */
  valid: boolean;
  /** Validierte und geparste Daten (nur bei Erfolg) */
  data?: SeedData | SimpleSeedData;
  /** Validierungsfehler */
  errors: ValidationError[];
  /** Warnungen (nicht-kritische Probleme) */
  warnings: ValidationWarning[];
  /** Erkanntes Schema-Format */
  detectedFormat: 'full' | 'simple' | 'unknown';
  /** Validierungs-Metadaten */
  metadata: {
    /** Schema-Version der Daten */
    schemaVersion?: string;
    /** Anzahl Einsätze */
    einsaetzeCount: number;
    /** Anzahl ETB-Einträge */
    etbEntriesCount: number;
    /** Geschätzte Speichergröße in Bytes */
    estimatedSizeBytes: number;
  };
}

/**
 * Validierungsfehler mit Kontext-Informationen.
 */
export interface ValidationError {
  /** Fehler-Code für programmatische Behandlung */
  code: string;
  /** Benutzerfreundliche Fehlermeldung */
  message: string;
  /** JSON-Pfad zum fehlerhaften Element */
  instancePath?: string;
  /** Schema-Pfad der verletzten Regel */
  schemaPath?: string;
  /** Zusätzliche Kontext-Daten */
  data?: any;
  /** Schweregrad des Fehlers */
  severity: 'error' | 'warning';
}

/**
 * Validierungswarnung für nicht-kritische Probleme.
 */
export interface ValidationWarning {
  /** Warnungs-Code */
  code: string;
  /** Warnungsmeldung */
  message: string;
  /** Empfohlene Aktion */
  recommendation?: string;
  /** Betroffener JSON-Pfad */
  path?: string;
}

/**
 * Schema-Validator Klasse.
 */
export class SchemaValidator {
  private ajv: Ajv;
  private fullValidator: ValidateFunction;
  private simpleValidator: ValidateFunction;

  constructor() {
    // AJV mit Formaten initialisieren
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv);

    // Validator-Funktionen kompilieren
    this.fullValidator = this.ajv.compile(SEED_DATA_JSON_SCHEMA);
    this.simpleValidator = this.ajv.compile(SIMPLE_SEED_DATA_JSON_SCHEMA);
  }

  /**
   * Validiert JSON-Daten und erkennt automatisch das Format.
   */
  validate(jsonData: any, config: ImportConfig = {}): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
      detectedFormat: 'unknown',
      metadata: {
        einsaetzeCount: 0,
        etbEntriesCount: 0,
        estimatedSizeBytes: 0,
      },
    };

    try {
      // Format-Erkennung
      const format = this.detectFormat(jsonData);
      result.detectedFormat = format;

      if (format === 'unknown') {
        result.errors.push({
          code: 'UNKNOWN_FORMAT',
          message:
            'Unbekanntes JSON-Format. Muss entweder vollständiges oder vereinfachtes Seed-Format sein.',
          severity: 'error',
        });
        return result;
      }

      // Schema-Validierung
      const isValid =
        format === 'full' ? this.fullValidator(jsonData) : this.simpleValidator(jsonData);

      if (!isValid) {
        // AJV-Fehler zu strukturierten Fehlern konvertieren
        const validator = format === 'full' ? this.fullValidator : this.simpleValidator;
        result.errors.push(...this.convertAjvErrors(validator.errors || []));
        return result;
      }

      // Zusätzliche semantische Validierung
      const semanticValidation = this.validateSemantics(jsonData, format, config);
      result.errors.push(...semanticValidation.errors);
      result.warnings.push(...semanticValidation.warnings);

      if (result.errors.length === 0) {
        result.valid = true;
        result.data = jsonData;
        result.metadata = this.generateMetadata(jsonData, format);
      }
    } catch (error) {
      result.errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validierung fehlgeschlagen: ${error.message}`,
        severity: 'error',
      });
    }

    return result;
  }

  /**
   * Erkennt das Format der JSON-Daten.
   */
  private detectFormat(data: any): 'full' | 'simple' | 'unknown' {
    if (!data || typeof data !== 'object') {
      return 'unknown';
    }

    // Vollständiges Format hat version, metadata und einsaetze
    if (data.version && data.metadata && data.einsaetze) {
      return 'full';
    }

    // Vereinfachtes Format hat nur einsatz
    if (data.einsatz && typeof data.einsatz === 'object') {
      return 'simple';
    }

    return 'unknown';
  }

  /**
   * Konvertiert AJV-Fehler zu strukturierten Fehlern.
   */
  private convertAjvErrors(ajvErrors: any[]): ValidationError[] {
    return ajvErrors.map((error) => ({
      code: `SCHEMA_${error.keyword?.toUpperCase() || 'ERROR'}`,
      message: this.humanizeAjvError(error),
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      data: error.data,
      severity: 'error' as const,
    }));
  }

  /**
   * Macht AJV-Fehlermeldungen benutzerfreundlicher.
   */
  private humanizeAjvError(error: any): string {
    const path = error.instancePath || 'Root';

    switch (error.keyword) {
      case 'required':
        return `Pflichtfeld fehlt in ${path}: ${error.params.missingProperty}`;
      case 'type':
        return `Falscher Datentyp in ${path}: Erwartet ${error.params.type}, gefunden ${typeof error.data}`;
      case 'minLength':
        return `Wert in ${path} ist zu kurz: Mindestens ${error.params.limit} Zeichen erforderlich`;
      case 'maxLength':
        return `Wert in ${path} ist zu lang: Maximal ${error.params.limit} Zeichen erlaubt`;
      case 'enum':
        return `Ungültiger Wert in ${path}: Muss einer der folgenden Werte sein: ${error.params.allowedValues.join(', ')}`;
      case 'format':
        return `Ungültiges Format in ${path}: ${error.params.format} erwartet`;
      case 'minimum':
        return `Wert in ${path} ist zu klein: Mindestens ${error.params.limit} erforderlich`;
      default:
        return `Validierungsfehler in ${path}: ${error.message}`;
    }
  }

  /**
   * Führt zusätzliche semantische Validierung durch.
   */
  private validateSemantics(
    data: any,
    format: 'full' | 'simple',
    config: ImportConfig,
  ): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (format === 'full') {
      // Schema-Version prüfen
      if (!SUPPORTED_SCHEMA_VERSIONS.includes(data.version)) {
        if (config.validationLevel === 'strict') {
          errors.push({
            code: 'UNSUPPORTED_SCHEMA_VERSION',
            message: `Nicht unterstützte Schema-Version: ${data.version}. Unterstützt: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}`,
            severity: 'error',
          });
        } else {
          warnings.push({
            code: 'SCHEMA_VERSION_WARNING',
            message: `Schema-Version ${data.version} ist nicht offiziell unterstützt`,
            recommendation: `Verwende Version ${CURRENT_SCHEMA_VERSION}`,
          });
        }
      }

      // Einsätze-Namen Eindeutigkeit prüfen
      const einsatzNames = data.einsaetze.map((e: any) => e.name);
      const duplicateNames = einsatzNames.filter(
        (name: string, index: number) => einsatzNames.indexOf(name) !== index,
      );

      if (duplicateNames.length > 0) {
        errors.push({
          code: 'DUPLICATE_EINSATZ_NAMES',
          message: `Doppelte Einsatz-Namen gefunden: ${duplicateNames.join(', ')}`,
          severity: 'error',
        });
      }

      // ETB-Einträge Validierung
      data.einsaetze.forEach((einsatz: any, einsatzIndex: number) => {
        if (einsatz.etbEntries && einsatz.etbEntries.length > 0) {
          this.validateEtbEntries(
            einsatz.etbEntries,
            `einsaetze[${einsatzIndex}]`,
            errors,
            warnings,
          );
        }
      });
    }

    // Allgemeine Validierung für beide Formate
    this.validateCommonSemantics(data, format, errors, warnings, config);

    return { errors, warnings };
  }

  /**
   * Validiert ETB-Einträge auf Konsistenz.
   */
  private validateEtbEntries(
    etbEntries: any[],
    basePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Laufende Nummern prüfen
    const laufendeNummern = etbEntries
      .filter((entry) => entry.laufendeNummer)
      .map((entry) => entry.laufendeNummer)
      .sort((a, b) => a - b);

    // Duplikate prüfen
    const duplicates = laufendeNummern.filter(
      (num, index) => laufendeNummern.indexOf(num) !== index,
    );

    if (duplicates.length > 0) {
      errors.push({
        code: 'DUPLICATE_LAUFENDE_NUMMER',
        message: `Doppelte laufende Nummern in ${basePath}: ${duplicates.join(', ')}`,
        severity: 'error',
      });
    }

    // Zeitstempel-Chronologie prüfen
    let lastTimestamp: Date | null = null;
    etbEntries.forEach((entry, index) => {
      if (entry.timestampEreignis) {
        const timestamp = new Date(entry.timestampEreignis);
        if (lastTimestamp && timestamp < lastTimestamp) {
          warnings.push({
            code: 'TIMESTAMP_ORDER',
            message: `Zeitstempel in ${basePath}.etbEntries[${index}] ist nicht chronologisch`,
            recommendation: 'Überprüfe die Zeitstempel-Reihenfolge',
            path: `${basePath}.etbEntries[${index}].timestampEreignis`,
          });
        }
        lastTimestamp = timestamp;
      }
    });
  }

  /**
   * Allgemeine semantische Validierung für beide Formate.
   */
  private validateCommonSemantics(
    data: any,
    format: 'full' | 'simple',
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _config: ImportConfig,
  ): void {
    // Einsatz-Namen Längen-Validierung
    const einsaetze = format === 'full' ? data.einsaetze : [data.einsatz];

    einsaetze.forEach((einsatz: any, index: number) => {
      if (einsatz.name && einsatz.name.length > 255) {
        errors.push({
          code: 'EINSATZ_NAME_TOO_LONG',
          message: `Einsatz-Name zu lang (${einsatz.name.length} Zeichen, max. 255)`,
          severity: 'error',
          instancePath: format === 'full' ? `einsaetze[${index}].name` : 'einsatz.name',
        });
      }
    });

    // Performance-Warnungen
    if (format === 'full') {
      const totalEtbEntries = data.einsaetze.reduce(
        (sum: number, einsatz: any) => sum + (einsatz.etbEntries?.length || 0),
        0,
      );

      if (totalEtbEntries > 1000) {
        warnings.push({
          code: 'LARGE_DATASET',
          message: `Großer Datensatz mit ${totalEtbEntries} ETB-Einträgen`,
          recommendation: 'Import könnte länger dauern. Erwäge --dry-run Option.',
        });
      }
    }
  }

  /**
   * Generiert Metadaten für validierte Daten.
   */
  private generateMetadata(data: any, format: 'full' | 'simple'): ValidationResult['metadata'] {
    const metadata: ValidationResult['metadata'] = {
      einsaetzeCount: 0,
      etbEntriesCount: 0,
      estimatedSizeBytes: 0,
    };

    if (format === 'full') {
      metadata.schemaVersion = data.version;
      metadata.einsaetzeCount = data.einsaetze.length;
      metadata.etbEntriesCount = data.einsaetze.reduce(
        (sum: number, einsatz: any) => sum + (einsatz.etbEntries?.length || 0),
        0,
      );
    } else {
      metadata.einsaetzeCount = 1;
      metadata.etbEntriesCount = data.initialEtbEntries?.length || 0;
    }

    // Grobe Schätzung der Speichergröße
    metadata.estimatedSizeBytes = JSON.stringify(data).length;

    return metadata;
  }
}

/**
 * Convenience-Funktion für schnelle Validierung.
 */
export function validateSeedData(jsonData: any, config: ImportConfig = {}): ValidationResult {
  const validator = new SchemaValidator();
  return validator.validate(jsonData, config);
}

/**
 * Validiert eine JSON-String.
 */
export function validateSeedDataString(
  jsonString: string,
  config: ImportConfig = {},
): ValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return validateSeedData(data, config);
  } catch (parseError) {
    return {
      valid: false,
      errors: [
        {
          code: 'JSON_PARSE_ERROR',
          message: `JSON Parse-Fehler: ${parseError.message}`,
          severity: 'error',
        },
      ],
      warnings: [],
      detectedFormat: 'unknown',
      metadata: {
        einsaetzeCount: 0,
        etbEntriesCount: 0,
        estimatedSizeBytes: 0,
      },
    };
  }
}
