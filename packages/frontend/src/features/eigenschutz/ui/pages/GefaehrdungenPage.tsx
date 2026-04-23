/**
 * GefaehrdungenPage — Übersichts-Page für Gefährdungsbeurteilungen
 * (Story 2.1 Task 8, AC5).
 *
 * Rendert die Überschrift, einen Primary-Button für den Drawer sowie
 * einen Empty-State-Platzhalter für die eigentliche Listen-Darstellung
 * (kommt mit Story 2.4). Der Button wird bei fehlender
 * Permission (`eigenschutz:gefaehrdungsbeurteilung:write`) deaktiviert
 * inkl. `aria-disabled="true"` und Tooltip-Text, der die fehlende
 * Permission offenlegt (AC5).
 *
 * **Navigation nach Erstellung (AC3):** Nach erfolgreicher Erstellung
 * navigiert die Page in die Detail-Route
 * `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id`. Der
 * Ziel-Screen ist aktuell ein Stub (Story 2.2 ersetzt ihn durch die
 * Item-Erfassung mit 5x5-Risikomatrix); für Story 2.1 reicht die Navigation
 * als AC3-Erfüllung.
 */

import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PiClipboardText } from 'react-icons/pi';
import { useEigenschutzPermissions } from '../../hooks/useEigenschutzPermissions';
import { GefaehrdungseditorDrawer } from '../organisms/GefaehrdungseditorDrawer.organism';

export interface GefaehrdungenPageProps {
  readonly einsatzId: string;
}

export function GefaehrdungenPage({ einsatzId }: GefaehrdungenPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { canCreateGefaehrdungsbeurteilung, isLoading: isPermissionLoading, requiredPermission } = useEigenschutzPermissions();

  const isWriteDisabled = isPermissionLoading || !canCreateGefaehrdungsbeurteilung;
  const disabledTooltip = `Fehlende Berechtigung: ${requiredPermission}`;

  const handleOpen = useCallback(() => {
    if (isWriteDisabled) {
      return;
    }
    setDrawerOpen(true);
  }, [isWriteDisabled]);

  const handleCreated = useCallback(
    (beurteilungId: string) => {
      logger.info('Gefährdungsbeurteilung angelegt', { einsatzId, beurteilungId });
      setDrawerOpen(false);
      void navigate({
        to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
        params: { einsatzId, id: beurteilungId },
      });
    },
    [einsatzId, navigate],
  );

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gefährdungsbeurteilungen</h1>
          <p className="mt-1 text-sm text-text-muted">Pro Einheit eine Beurteilung anlegen, Gefährdungen erfassen und Schutzmaßnahmen dokumentieren.</p>
        </div>
        <Button
          intent="primary"
          onClick={handleOpen}
          disabled={isWriteDisabled}
          aria-disabled={isWriteDisabled || undefined}
          title={isWriteDisabled && !isPermissionLoading ? disabledTooltip : undefined}
          data-testid="gefaehrdungen-neue-beurteilung"
        >
          Neue Gefährdungsbeurteilung
        </Button>
      </header>

      <EmptyState icon={PiClipboardText} title="Noch keine Beurteilungen" description="Lege eine erste Gefährdungsbeurteilung an. Die Listen-Ansicht folgt mit Story 2.4." />

      {drawerOpen ? <GefaehrdungseditorDrawer einsatzId={einsatzId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={handleCreated} /> : null}
    </div>
  );
}
