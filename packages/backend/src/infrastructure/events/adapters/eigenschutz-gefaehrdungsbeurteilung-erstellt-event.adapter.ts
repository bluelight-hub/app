/**
 * Slug-Proxy für den Feature-Slice-Adapter (Story 2.1).
 *
 * Die eigentliche Implementierung liegt in
 * `infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-erstellt.adapter.ts`.
 * Diese Datei existiert hier nur, damit die Konsistenz-Spec
 * `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
 * (Story 1.7 AC4) die Registrierung an Stelle 4 über das Slug-Derivat
 * `eigenschutz-gefaehrdungsbeurteilung-erstellt` findet.
 */
export { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from '@/infrastructure/eigenschutz/event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';
