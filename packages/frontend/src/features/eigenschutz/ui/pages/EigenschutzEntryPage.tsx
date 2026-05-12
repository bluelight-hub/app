import { useState } from 'react';
import { useEigenschutzShortcuts } from '../../hooks/useEigenschutzShortcuts';
import { EigenschutzPageHeader } from '../molecules/EigenschutzPageHeader';
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
      <EigenschutzPageHeader
        title="Eigenschutz"
        description="Arbeitsschutz und Sicherheitsmaßnahmen"
        actions={einsatzId ? <EigenschutzShortcutHelpPopover context="dashboard" open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} /> : null}
      />
      {einsatzId ? <AmpelDashboard einsatzId={einsatzId} /> : null}
    </div>
  );
}
