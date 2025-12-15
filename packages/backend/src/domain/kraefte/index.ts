/**
 * Kräftemanagement Domain Layer Exports.
 *
 * Enthält alle Domain-Komponenten für die Kräfte-Verwaltung:
 * - Qualifikationen (Story 1-1)
 * - Fahrzeugtypen (Story 1-2, future)
 * - Rollen-Definitionen (Story 1-3, future)
 */

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
