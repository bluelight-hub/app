import { Link } from '@tanstack/react-router';
import { PiArrowsClockwise, PiClipboardText, PiShield, PiShieldCheck } from 'react-icons/pi';
import { useSyncConflicts } from '@/features/eigenschutz/api/queries';

export interface EigenschutzEntryPageProps {
  /**
   * Aktuelle Einsatz-ID — wird für Deep-Links in Subbereiche (z. B.
   * Gefährdungsbeurteilungen, Story 2.1) benötigt.
   *
   * Optional, damit bestehende Call-Sites ohne `einsatzId` weiterhin
   * kompilieren. Ohne `einsatzId` wird der CTA-Link ausgeblendet.
   */
  readonly einsatzId?: string;
}

/**
 * Eigenschutz-Entry-Page (Story 1.6 + 2.1 Task 8).
 *
 * Die Seite ist bewusst leer-aber-lauffähig: sie signalisiert dem Nutzer,
 * dass das Modul für den aktuellen Einsatz verdrahtet ist. Epic 2–5
 * ersetzt den Empty-State schrittweise durch AmpelDashboard, GefährdungenPage,
 * PSA-Profile, Sicherungsposten und Vorfallmeldung.
 *
 * **Story 2.1:** Ein Call-to-Action verlinkt auf die neue
 * Gefährdungsbeurteilungs-Route, sobald eine `einsatzId` bekannt ist.
 */
export function EigenschutzEntryPage({ einsatzId }: EigenschutzEntryPageProps = {}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Eigenschutz</h1>
        <p className="mt-1 text-sm text-text-muted">Arbeitsschutz und Sicherheitsmaßnahmen</p>
      </header>
      <div className="space-y-3 rounded-lg bg-surface-panel p-4 shadow">
        <p className="text-text-muted">Hier entstehen Gefährdungsbeurteilung, PSA-Verwaltung, Sicherheitsregeln, Sicherungsposten und Vorfallmeldung.</p>
        {einsatzId ? <EigenschutzNavLinks einsatzId={einsatzId} /> : null}
      </div>
    </div>
  );
}

/**
 * Navigations-Bereich (Story 3.10 AC9): Sub-Routen-Links inkl. neuem
 * „Konflikte"-Eintrag mit Count-Badge. Eigene Komponente, damit der
 * `useSyncConflicts`-Hook nur dann ausgeführt wird, wenn auch eine
 * `einsatzId` vorliegt — sonst wäre der Hook-Aufruf zwar harmlos
 * (`enabled: false`), aber konzeptionell unsauber (Hook ohne Kontext).
 */
function EigenschutzNavLinks({ einsatzId }: { einsatzId: string }) {
  const conflictsQuery = useSyncConflicts(einsatzId);
  const conflictCount = conflictsQuery.data?.length ?? 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen"
        params={{ einsatzId }}
        data-testid="eigenschutz-gefaehrdungen-link"
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiClipboardText aria-hidden="true" className="h-4 w-4" />
        <span>Gefährdungsbeurteilungen verwalten</span>
      </Link>
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln"
        params={{ einsatzId }}
        data-testid="eigenschutz-sicherheitsregeln-link"
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiShieldCheck aria-hidden="true" className="h-4 w-4" />
        <span>Sicherheitsregeln verwalten</span>
      </Link>
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile"
        params={{ einsatzId }}
        data-testid="eigenschutz-psa-profile-link"
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiShield aria-hidden="true" className="h-4 w-4" />
        <span>PSA-Profile verwalten</span>
      </Link>
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/sync-konflikte"
        params={{ einsatzId }}
        data-testid="eigenschutz-sync-konflikte-link"
        activeProps={{ 'aria-current': 'page' }}
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiArrowsClockwise aria-hidden="true" className="h-4 w-4" />
        <span>Konflikte</span>
        {conflictCount > 0 ? (
          <span
            data-testid="eigenschutz-sync-konflikte-badge"
            aria-label={`${conflictCount} offene Konflikte`}
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full border border-status-warning-border bg-status-warning-surface px-1.5 py-0.5 text-xs font-semibold text-status-warning-text"
          >
            {conflictCount}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
