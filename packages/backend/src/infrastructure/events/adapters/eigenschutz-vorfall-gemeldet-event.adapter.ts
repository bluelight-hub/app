/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 5.1).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/vorfall-gemeldet.adapter.ts`.
 * Diese Datei existiert nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 (Slug-Derivat
 * `eigenschutz-vorfall-gemeldet`) findet.
 */
export { EigenschutzVorfallGemeldetEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/vorfall-gemeldet.adapter';
