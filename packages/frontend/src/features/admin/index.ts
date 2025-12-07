/**
 * Admin Feature - Public API
 *
 * Zentrale Export-Datei für das gesamte Admin-Feature.
 * Definiert die öffentliche API und kapselt interne Implementierungen.
 */

// ============================================
// API Layer (Queries & Mutations)
// ============================================
export {
  // Query Keys
  ADMIN_QUERY_KEYS,
  // Hooks
  useAdminUserManagement,
} from './api';

// ============================================
// UI Layer (Components)
// ============================================
export * from './ui';
