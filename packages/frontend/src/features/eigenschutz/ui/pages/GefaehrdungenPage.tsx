/**
 * GefaehrdungenPage — Übersichts-Page für Gefährdungsbeurteilungen
 * (Story 2.1 Task 8, AC5).
 *
 * Rendert die Überschrift, einen Primary-Button für den Drawer sowie
 * den Empty-State für die direkte Anlege-Ansicht ohne Listen-Datenquelle.
 *
 * **Navigation nach Erstellung (AC3):** Nach erfolgreicher Erstellung
 * navigiert die Page in die Detail-Route
 * `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id`. Der
 * Ziel-Screen ist die Detail-Erfassung mit 5x5-Risikomatrix.
 */

import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PiClipboardText } from 'react-icons/pi';
import { GefaehrdungseditorDrawer } from '../organisms/GefaehrdungseditorDrawer.organism';

export interface GefaehrdungenPageProps {
  readonly einsatzId: string;
}

export function GefaehrdungenPage({ einsatzId }: GefaehrdungenPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpen = useCallback(() => {
    setDrawerOpen(true);
  }, []);

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
        <Button intent="primary" onClick={handleOpen} data-testid="gefaehrdungen-neue-beurteilung">
          Neue Gefährdungsbeurteilung
        </Button>
      </header>

      <EmptyState
        icon={PiClipboardText}
        title="Beurteilung anlegen"
        description="Vorhandene Beurteilungen werden in dieser Ansicht nicht aufgeführt. Beim Anlegen prüft das System, ob die gewählte Einheit bereits eine Beurteilung hat."
      />

      {drawerOpen ? <GefaehrdungseditorDrawer einsatzId={einsatzId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={handleCreated} /> : null}
    </div>
  );
}
