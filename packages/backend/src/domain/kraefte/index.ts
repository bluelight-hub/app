/**
 * Kräftemanagement Domain Layer Exports.
 *
 * Enthält alle Domain-Komponenten für die Kräfte-Verwaltung:
 * - Qualifikationen (Story 1-1)
 * - Fahrzeugtypen (Story 1-2)
 * - Rollen-Definitionen (Story 1-3, future)
 */

// ============================================================================
// QUALIFIKATION (Story 1-1)
// ============================================================================

// Constants (Validation Rules - Single Source of Truth)
export {
  QUALIFIKATION_NAME_MIN_LENGTH,
  QUALIFIKATION_NAME_MAX_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MIN_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MAX_LENGTH,
  QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH,
  QUALIFIKATION_VALIDATION_ERRORS,
} from './constants/qualifikation-validation.constants';

// Value Objects
export { QualifikationId } from './value-objects/qualifikation-id';
export { QualifikationKategorie, QUALIFIKATION_KATEGORIEN, type QualifikationKategorieType } from './value-objects/qualifikation-kategorie';

// Aggregates
export { Qualifikation, type CreateQualifikationProps, type ReconstituteQualifikationProps, type UpdateQualifikationProps } from './aggregates/qualifikation.aggregate';

// Repository Interfaces (Ports)
export type { IQualifikationRepository, TransactionContext } from './repositories/i-qualifikation.repository';

// Domain Events
export { QualifikationCreatedEvent } from './events/qualifikation-created.event';
export { QualifikationUpdatedEvent } from './events/qualifikation-updated.event';

// ============================================================================
// FAHRZEUGTYP (Story 1-2)
// ============================================================================

// Constants (Validation Rules - Single Source of Truth)
export {
  FAHRZEUGTYP_CODE_MIN_LENGTH,
  FAHRZEUGTYP_CODE_MAX_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH,
  FAHRZEUGTYP_VALIDATION_ERRORS,
} from './constants/fahrzeugtyp-validation.constants';

// Value Objects
export { FahrzeugtypId } from './value-objects/fahrzeugtyp-id';
export { FahrzeugtypKategorie, FAHRZEUGTYP_KATEGORIEN, type FahrzeugtypKategorieType } from './value-objects/fahrzeugtyp-kategorie';

// Aggregates
export {
  Fahrzeugtyp,
  type SollbesatzungSchema,
  type CreateFahrzeugtypProps,
  type ReconstituteFahrzeugtypProps,
  type UpdateFahrzeugtypProps,
} from './aggregates/fahrzeugtyp.aggregate';

// Repository Interfaces (Ports)
export type { IFahrzeugtypRepository } from './repositories/i-fahrzeugtyp.repository';

// Domain Events
export { FahrzeugtypCreatedEvent } from './events/fahrzeugtyp-created.event';
export { FahrzeugtypUpdatedEvent } from './events/fahrzeugtyp-updated.event';

// Error Codes
export { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError, type FahrzeugtypErrorCode } from './common/fahrzeugtyp-error-codes';

// ============================================================================
// FUNKSTATUS CONFIG (Story 1-4)
// ============================================================================

// Constants (Validation Rules - Single Source of Truth)
export { FUNKSTATUS_VALIDATION, FUNKSTATUS_VALIDATION_ERRORS } from './constants/funkstatus-validation.constants';

// Value Objects
export { FunkStatusConfigId } from './value-objects/funk-status-config-id';

// Aggregates
export { FunkStatusConfig, type ReconstituteFunkStatusConfigProps, type UpdateFunkStatusConfigProps } from './aggregates/funk-status-config.aggregate';

// Repository Interfaces (Ports)
export type { IFunkStatusConfigRepository } from './repositories/i-funk-status-config.repository';

// Domain Events
export { FunkStatusConfigUpdatedEvent } from './events/funk-status-config-updated.event';

// Error Codes
export { FUNKSTATUS_ERROR_CODES, FunkStatusError, type FunkStatusErrorCode } from './common/error-codes';

// ============================================================================
// STAMM-FAHRZEUG (Story 2-1)
// ============================================================================

// Constants (Validation Rules - Single Source of Truth)
export {
  STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH,
  STAMM_FAHRZEUG_BAUJAHR_MIN,
  STAMM_FAHRZEUG_VALIDATION_ERRORS,
} from './constants/stamm-fahrzeug-validation.constants';

// Value Objects
export { StammFahrzeugId } from './value-objects/stamm-fahrzeug-id';

// Aggregates
export { StammFahrzeug, type CreateStammFahrzeugProps, type ReconstituteStammFahrzeugProps, type UpdateStammFahrzeugProps } from './aggregates/stamm-fahrzeug.aggregate';

// Repository Interfaces (Ports)
export type { IStammFahrzeugRepository } from './repositories/i-stamm-fahrzeug.repository';

// Domain Events
export { StammFahrzeugCreatedEvent } from './events/stamm-fahrzeug-created.event';
export { StammFahrzeugUpdatedEvent } from './events/stamm-fahrzeug-updated.event';

// Error Codes
export { STAMM_FAHRZEUG_ERROR_CODES, StammFahrzeugError, type StammFahrzeugErrorCode } from './common/stamm-fahrzeug-error-codes';

// ============================================================================
// STAMM-PERSON (Story 2-2)
// ============================================================================

// Constants (Validation Rules - Single Source of Truth)
export {
  STAMM_PERSON_VORNAME_MIN_LENGTH,
  STAMM_PERSON_VORNAME_MAX_LENGTH,
  STAMM_PERSON_NACHNAME_MIN_LENGTH,
  STAMM_PERSON_NACHNAME_MAX_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH,
  STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  STAMM_PERSON_VALIDATION_ERRORS,
} from './constants/stamm-person-validation.constants';

// Value Objects
export { StammPersonId } from './value-objects/stamm-person-id';

// Aggregates
export { StammPerson, type CreateStammPersonProps, type ReconstituteStammPersonProps, type UpdateStammPersonProps } from './aggregates/stamm-person.aggregate';

// Repository Interfaces (Ports)
export type { IStammPersonRepository } from './repositories/i-stamm-person.repository';

// Domain Events
export { StammPersonCreatedEvent } from './events/stamm-person-created.event';
export { StammPersonUpdatedEvent } from './events/stamm-person-updated.event';

// Error Codes
export { STAMM_PERSON_ERROR_CODES, StammPersonError, type StammPersonErrorCode } from './common/stamm-person-error-codes';

// ============================================================================
// EINSATZ-PERSON (Story 4-1)
// ============================================================================

// Value Objects
export { EinsatzPersonId } from './value-objects/einsatz-person-id';

// Aggregates
export {
  EinsatzPerson,
  type CreateEinsatzPersonFromStammProps,
  type CreateTemporaryEinsatzPersonProps,
  type ReconstituteEinsatzPersonProps,
} from './aggregates/einsatz-person.aggregate';

// Repository Interfaces (Ports)
export type { IEinsatzPersonRepository } from './repositories/i-einsatz-person.repository';

// Domain Events
export { EinsatzPersonHinzugefuegtEvent } from './events/einsatz-person-hinzugefuegt.event';
export { PersonZuFahrzeugZugewiesenEvent } from './events/person-zu-fahrzeug-zugewiesen.event';
export { PersonVonFahrzeugEntferntEvent } from './events/person-von-fahrzeug-entfernt.event';

// Error Codes
export { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError, type EinsatzPersonErrorCode } from './common/einsatz-person-error-codes';
