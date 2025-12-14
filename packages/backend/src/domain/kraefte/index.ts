/**
 * Kräftemanagement Domain Layer Exports.
 *
 * Enthält alle Domain-Komponenten für die Kräfte-Verwaltung:
 * - Qualifikationen (Story 1-1)
 * - Fahrzeugtypen (Story 1-2, future)
 * - Rollen-Definitionen (Story 1-3, future)
 */

// Value Objects
export { QualifikationId } from './value-objects/qualifikation-id';

// Aggregates
export {
  Qualifikation,
  type CreateQualifikationProps,
  type ReconstituteQualifikationProps,
  type UpdateQualifikationProps,
  type QualifikationKategorie,
} from './aggregates/qualifikation.aggregate';

// Repository Interfaces (Ports)
export type { IQualifikationRepository, TransactionContext } from './repositories/i-qualifikation.repository';

// Domain Events
export { QualifikationCreatedEvent } from './events/qualifikation-created.event';
export { QualifikationUpdatedEvent } from './events/qualifikation-updated.event';
