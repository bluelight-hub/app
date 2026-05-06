/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 4.1).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/sicherungsposten-eingerichtet.adapter.ts`.
 * Diese Datei existiert nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 (Slug-Derivat
 * `eigenschutz-sicherungsposten-eingerichtet`) findet.
 */
export { EigenschutzSicherungspostenEingerichtetEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/sicherungsposten-eingerichtet.adapter';
