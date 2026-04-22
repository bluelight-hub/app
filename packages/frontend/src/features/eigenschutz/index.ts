/**
 * Public API des Eigenschutz-Feature-Slice (Story 1.6).
 *
 * Re-exports sind bewusst schmal — Story 1.6 liefert nur den Smoke-Test-
 * Einsprungspunkt. Epic 2–5 ergänzt Hooks, Pages, Schemas etc. hier, sobald
 * fachliche Features ausgerollt werden.
 */
export { useEigenschutzHealth } from './api/queries';
export { EigenschutzEntryPage } from './ui/pages/EigenschutzEntryPage';
