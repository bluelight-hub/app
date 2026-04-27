/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 2.7).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/sicherheitsregel-quittiert.adapter.ts`.
 * Diese Datei existiert hier nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 über das Slug-Derivat
 * `eigenschutz-sicherheitsregel-quittiert` findet.
 */
export { EigenschutzSicherheitsregelQuittiertEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/sicherheitsregel-quittiert.adapter';
