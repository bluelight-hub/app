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
