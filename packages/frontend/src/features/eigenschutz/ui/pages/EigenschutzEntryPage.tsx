import { useState } from 'react';
import { useEigenschutzShortcuts } from '../../hooks/useEigenschutzShortcuts';
import { EigenschutzShortcutHelpPopover } from '../molecules/EigenschutzShortcutHelpPopover';
import { AmpelDashboard } from '../organisms/AmpelDashboard';

export interface EigenschutzEntryPageProps {
  /**
   * Aktuelle Einsatz-ID — wird für den `AmpelDashboard`-Mount benötigt.
   * Optional, damit bestehende Call-Sites ohne `einsatzId` weiterhin
   * kompilieren. Ohne `einsatzId` wird der Dashboard-Mount ausgeblendet.
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
      {einsatzId ? <AmpelDashboard einsatzId={einsatzId} /> : null}
    </div>
  );
}
