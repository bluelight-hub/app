/**
 * Validierungs-Konstanten für EinsatzFahrzeug Aggregate.
 *
 * Zentrale Definition aller Validierungsgrenzen zur Vermeidung von Magic Numbers.
 * Diese Konstanten werden in Aggregate, Commands und DTOs verwendet.
 *
 * **FMS-Status Codes (0-9):**
 * | Code | Bedeutung | Alarmierbar |
 * |------|-----------|-------------|
 * | 0 | Nicht einsatzbereit | Nein |
 * | 1 | Auf Wache | Ja |
 * | 2 | Einsatzbereit (Standard bei Erfassung) | Ja |
 * | 3 | Ausgerückt zum Einsatz | Nein |
 * | 4 | Am Einsatzort | Nein |
 * | 5 | Sprechwunsch | Nein |
 * | 6 | Außer Dienst | Nein |
 * | 7-9 | Regional konfigurierbar | Konfigurierbar |
 */
export const EINSATZ_FAHRZEUG_VALIDATION = {
  /** FMS-Status Minimum: 0 (Nicht einsatzbereit) */
  FMS_STATUS_MIN: 0,
  /** FMS-Status Maximum: 9 (Regional konfigurierbar) */
  FMS_STATUS_MAX: 9,
  /** FMS-Status Default bei Erfassung: 2 (Einsatzbereit) */
  FMS_STATUS_DEFAULT: 2,

  /** Funkrufname minimale Länge */
  FUNKRUFNAME_MIN_LENGTH: 1,
  /** Funkrufname maximale Länge (DB constraint: VARCHAR(100)) */
  FUNKRUFNAME_MAX_LENGTH: 100,

  /** Kennzeichen minimale Länge (wenn gesetzt) */
  KENNZEICHEN_MIN_LENGTH: 1,
  /** Kennzeichen maximale Länge (DB constraint: VARCHAR(20)) */
  KENNZEICHEN_MAX_LENGTH: 20,
} as const;

/**
 * Validierungs-Fehlermeldungen für EinsatzFahrzeug.
 * Deutsche Fehlermeldungen für konsistente UX.
 */
export const EINSATZ_FAHRZEUG_VALIDATION_ERRORS = {
  FMS_STATUS_OUT_OF_RANGE: `FMS-Status muss zwischen ${EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MIN} und ${EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_MAX} liegen`,
  FUNKRUFNAME_REQUIRED: 'Funkrufname ist erforderlich',
  FUNKRUFNAME_TOO_LONG: `Funkrufname darf maximal ${EINSATZ_FAHRZEUG_VALIDATION.FUNKRUFNAME_MAX_LENGTH} Zeichen haben`,
  KENNZEICHEN_TOO_LONG: `Kennzeichen darf maximal ${EINSATZ_FAHRZEUG_VALIDATION.KENNZEICHEN_MAX_LENGTH} Zeichen haben`,
  EINSATZ_ID_REQUIRED: 'EinsatzId ist erforderlich',
  FAHRZEUGTYP_ID_REQUIRED: 'FahrzeugtypId ist erforderlich',
  CREATED_BY_REQUIRED: 'CreatedBy ist erforderlich',
} as const;

/**
 * FMS-Status Labels für UI Darstellung.
 * Mapping von FMS-Code zu deutschem Label.
 */
export const FMS_STATUS_LABELS = {
  0: 'Nicht einsatzbereit',
  1: 'Auf Wache',
  2: 'Einsatzbereit',
  3: 'Ausgerückt zum Einsatz',
  4: 'Am Einsatzort',
  5: 'Sprechwunsch',
  6: 'Außer Dienst',
  7: 'Regional 7',
  8: 'Regional 8',
  9: 'Regional 9',
} as const;
