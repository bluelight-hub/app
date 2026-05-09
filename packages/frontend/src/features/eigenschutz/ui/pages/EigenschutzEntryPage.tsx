import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { PiArrowsClockwise, PiClipboardText, PiMapPin, PiShield, PiShieldCheck, PiWarningOctagon } from 'react-icons/pi';
import { useSyncConflicts } from '@/features/eigenschutz/api/queries';
import { useEigenschutzShortcuts } from '../../hooks/useEigenschutzShortcuts';
import { EigenschutzShortcutHelpPopover } from '../molecules/EigenschutzShortcutHelpPopover';
import { AmpelDashboard } from '../organisms/AmpelDashboard';

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

export function EigenschutzEntryPage({ einsatzId }: EigenschutzEntryPageProps = {}) {
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  useEigenschutzShortcuts({
    context: 'dashboard',
    enabled: Boolean(einsatzId),
    isOverlayBlocking: shortcutHelpOpen,
    isHelpOpen: shortcutHelpOpen,
    onOpenHelp: () => setShortcutHelpOpen(true),
    onCloseHelp: () => setShortcutHelpOpen(false),
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Eigenschutz</h1>
          <p className="mt-1 text-sm text-text-muted">Arbeitsschutz und Sicherheitsmaßnahmen</p>
        </div>
        {einsatzId ? <EigenschutzShortcutHelpPopover context="dashboard" open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} /> : null}
      </header>
      {einsatzId ? (
        <>
          <AmpelDashboard einsatzId={einsatzId} />
          <EigenschutzNavLinks einsatzId={einsatzId} />
        </>
      ) : null}
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
    <nav aria-label="Eigenschutz-Bereiche" className="flex flex-wrap gap-2">
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
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten"
        params={{ einsatzId }}
        data-testid="eigenschutz-sicherungsposten-link"
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiMapPin aria-hidden="true" className="h-4 w-4" />
        <span>Sicherungsposten verwalten</span>
      </Link>
      <Link
        to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle"
        params={{ einsatzId }}
        data-testid="eigenschutz-vorfaelle-link"
        className="inline-flex items-start gap-2 rounded-control border border-border-subtle bg-action-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring"
      >
        <PiWarningOctagon aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span className="flex flex-col">
          <span>Vorfälle erfassen</span>
          <span data-testid="eigenschutz-vorfaelle-link-subtitle" className="text-xs font-normal text-text-muted">
            Vorfälle erfassen + nachbereiten
          </span>
        </span>
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
    </nav>
  );
}
