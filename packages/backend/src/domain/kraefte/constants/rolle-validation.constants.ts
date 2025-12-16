/**
 * Validierungskonstanten für RollenDefinition.
 *
 * Single Source of Truth für:
 * - Domain Aggregate Validierung
 * - Application Layer Command Validierung
 * - DTO @ApiProperty() decorators (OpenAPI)
 * - Frontend Form Validierung
 */

/** Minimale Länge für Rollennamen */
export const ROLLE_NAME_MIN_LENGTH = 3;

/** Maximale Länge für Rollennamen */
export const ROLLE_NAME_MAX_LENGTH = 100;

/** Maximale Länge für Funkrufname */
export const ROLLE_FUNKRUFNAME_MAX_LENGTH = 50;

/** Maximale Länge für Beschreibung */
export const ROLLE_BESCHREIBUNG_MAX_LENGTH = 500;

/**
 * Vordefinierte Validierungs-Fehlermeldungen.
 * Wiederverwendbar in DTOs und Commands.
 */
export const ROLLE_VALIDATION_ERRORS = {
  NAME_TOO_SHORT: `Name muss mindestens ${ROLLE_NAME_MIN_LENGTH} Zeichen haben`,
  NAME_TOO_LONG: `Name darf maximal ${ROLLE_NAME_MAX_LENGTH} Zeichen haben`,
  NAME_REQUIRED: 'Name ist erforderlich',
  FUNKRUFNAME_TOO_LONG: `Funkrufname darf maximal ${ROLLE_FUNKRUFNAME_MAX_LENGTH} Zeichen haben`,
  BESCHREIBUNG_TOO_LONG: `Beschreibung darf maximal ${ROLLE_BESCHREIBUNG_MAX_LENGTH} Zeichen haben`,
  SORT_ORDER_INVALID: 'sortOrder muss eine nicht-negative ganze Zahl sein',
  QUALIFIKATION_IDS_REQUIRED: 'qualifikationIds ist erforderlich (kann leer sein)',
} as const;
