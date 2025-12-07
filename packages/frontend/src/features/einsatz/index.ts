/**
 * Einsatz Feature - Public API
 *
 * Zentrale Export-Datei für das gesamte Einsatz-Feature.
 * Definiert die öffentliche API und kapselt interne Implementierungen.
 */

// ============================================
// API Layer (Queries & Mutations)
// ============================================
export {
  // Query Keys & Utilities
  EINSATZ_QUERY_KEYS,
  calculateRetryDelay,
  type EinsatzQueryFilters,
  // Query Hooks
  useEinsaetzeQuery,
  useEinsaetzeInfiniteQuery,
  useEinsatzDetail,
  useActiveEinsaetzeWithCounts,
  useEinsatzStatusCounts,
  // Mutation Hooks
  useCreateEinsatz,
  useUpdateEinsatz,
  useArchiveEinsatz,
} from './api';

// ============================================
// Store Layer (UI State Management)
// ============================================
export {
  // Store & Types
  einsatzUIStore,
  type EinsatzUIState,
  // Store Actions
  setSelectedEinsatzId,
  setStatusFilter,
  setSearchFilter,
  setPage,
  setLimit,
  setSorting,
  setViewMode,
  resetFilters,
  resetEinsatzUIStore,
  // Store Selectors
  getEinsatzQueryFilters,
} from './stores/einsatz-ui.store';

// ============================================
// Active Einsatz State Management
// ============================================
export {
  // Store & Types
  einsatzStore,
  useEinsatzStore,
  type Einsatz,
  // Selectors
  selectActiveEinsatz,
  selectIsLoadingActiveEinsatz,
  selectActiveEinsatzError,
  selectSelectedEinsatzId,
} from './stores/active-einsatz.store';

// ============================================
// Hooks
// ============================================
export {
  useActiveEinsatz,
  useEinsatzDetails,
  type UseEinsatzDetailsResult,
  useEinsatzModules,
  type Module,
} from './hooks';

// ============================================
// Schemas
// ============================================
export {
  updateEinsatzDtoSchema,
  updateEinsatzSchema,
  createEinsatzSchema,
  type UpdateEinsatzFormData,
} from './schemas/einsatz.schema';

// ============================================
// Components
// ============================================
// NOTE: Components bleiben in src/components/
// und werden NICHT hierher migriert.
// Import sie weiterhin von @/components/...
