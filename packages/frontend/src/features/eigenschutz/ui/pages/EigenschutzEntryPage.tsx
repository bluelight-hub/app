/**
 * Eigenschutz-Entry-Page (Story 1.6).
 *
 * Die Seite ist bewusst leer-aber-lauffähig: sie signalisiert dem Nutzer,
 * dass das Modul für den aktuellen Einsatz verdrahtet ist. Epic 2–5
 * ersetzt den Empty-State durch AmpelDashboard, GefährdungenPage, PSA-
 * Profile, Sicherungsposten und Vorfallmeldung.
 */
export function EigenschutzEntryPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Eigenschutz</h1>
        <p className="mt-1 text-sm text-text-muted">Arbeitsschutz und Sicherheitsmaßnahmen</p>
      </header>
      <div className="rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Hier entstehen Gefährdungsbeurteilung, PSA-Verwaltung, Sicherheitsregeln, Sicherungsposten und Vorfallmeldung.</p>
      </div>
    </div>
  );
}
