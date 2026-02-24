/**
 * Aufbewahrungs Feature - Public API
 *
 * Zentrale Export-Datei fuer das DSGVO-Aufbewahrungs-Feature.
 */

// ============================================
// API Layer (Queries & Mutations)
// ============================================
export {
  AUFBEWAHRUNG_QUERY_KEYS,
  calculateRetryDelay,
  useAufbewahrungsKonfiguration,
  useAufbewahrungsVorschau,
  useComplianceReports,
  useUpdateAufbewahrungsKonfiguration,
} from './api';

// ============================================
// UI Components
// ============================================
export { AufbewahrungPage } from './ui';
