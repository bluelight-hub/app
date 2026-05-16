import { useMemo } from 'react';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import type { SyncConflictsFilter } from '../../api/queries';
import { ConflictResolutionList } from './ConflictResolutionList';

export interface SyncConflictsDrawerProps {
  readonly einsatzId: string;
  /** `true` öffnet den Drawer; `false` hält ihn geschlossen. */
  readonly isOpen: boolean;
  /** Callback bei Close-Action (Backdrop, X-Button, ESC). */
  readonly onClose: () => void;
  /**
   * Vorbelegung des Filters (z. B. aus Mikro-Banner-Deeplink oder
   * Search-Param-Redirect der alten `/sync-konflikte`-URL).
   */
  readonly initialFilter?: SyncConflictsFilter;
}

/**
 * `SyncConflictsDrawer` — Slide-in-Drawer für die Auflösung offener
 * Sync-Konflikte.
 *
 * **Warum Drawer statt eigene Seite?** Konflikt-Auflösung wird **kontextual**
 * zur Eigenschutz-Übersicht aufgerufen (Popover, Mikro-Banner, Summary-
 * Banner, Command-Palette). Eine eigene Sub-Tab-Route lenkt den Fokus vom
 * Einsatz-Workspace ab — der Drawer hält den Kontext (Karte, Banner,
 * Sub-Nav) sichtbar im Hintergrund und schließt nach der Auflösung zum
 * vorherigen Zustand zurück.
 *
 * **Pattern:** `Dialog.SlideIn` (rechts, `lg`) — gleicher Stil wie
 * `PsaProfilDetailDrawer` (Story 3.5), damit Operatoren das visuelle
 * Vokabular wiedererkennen.
 */
export function SyncConflictsDrawer({ einsatzId, isOpen, onClose, initialFilter }: SyncConflictsDrawerProps) {
  // Stabile `initialFilter`-Referenz analog zur ehemaligen Page-Komponente —
  // verhindert Re-Render-Schleifen im `useEffect` der `ConflictResolutionList`.
  const stableInitialFilter = useMemo(() => ({ entityType: initialFilter?.entityType, einheitId: initialFilter?.einheitId }), [initialFilter?.entityType, initialFilter?.einheitId]);

  return (
    <Dialog.SlideIn isOpen={isOpen} onClose={onClose} title="Sync-Konflikte" description="Multi-Device-Konflikte (FR50) — auf jeder Zeile entscheiden, welche Version gilt." size="xl" position="right">
      <div className="flex flex-col gap-4" data-testid="sync-conflicts-drawer">
        <ConflictResolutionList einsatzId={einsatzId} initialFilter={stableInitialFilter} />
      </div>
    </Dialog.SlideIn>
  );
}
