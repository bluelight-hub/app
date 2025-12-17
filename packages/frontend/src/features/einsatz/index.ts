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
  // EinsatzFahrzeuge (Story 3-1 & 3-2)
  useEinsatzFahrzeuge,
  useErfasseFahrzeugAusStammdaten,
  useErfasseTemporalesFahrzeug,
  useStammFahrzeuge,
  STAMM_FAHRZEUGE_QUERY_KEYS,
  useFahrzeugtypen,
  FAHRZEUGTYP_QUERY_KEYS,
} from './api';

// ============================================
// Store Layer (UI State Management)
// ============================================
export * from './stores';

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
export * from './schemas';

// ============================================
// UI Components
// ============================================
export * from './ui';
