/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 2.2).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter.ts`.
 * Diese Datei existiert hier nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * die Registrierung an Stelle 4 über das Slug-Derivat
 * `eigenschutz-gefaehrdungsbeurteilung-aktualisiert` findet.
 */
export { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter';
