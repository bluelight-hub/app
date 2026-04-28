/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 3.4).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/psa-quittung-abgegeben.adapter.ts`.
 * Diese Datei existiert hier nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 über das Slug-Derivat
 * `eigenschutz-quittung-abgegeben` findet.
 */
export { EigenschutzQuittungAbgegebenEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/psa-quittung-abgegeben.adapter';
