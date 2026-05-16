/**
 * Slug-Proxy für den Feature-Slice-Adapter (Issue #415).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/vorfall-geschlossen.adapter.ts`.
 * Diese Datei existiert nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 (Slug-Derivat
 * `eigenschutz-vorfall-geschlossen`) findet.
 */
export { EigenschutzVorfallGeschlossenEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/vorfall-geschlossen.adapter';
