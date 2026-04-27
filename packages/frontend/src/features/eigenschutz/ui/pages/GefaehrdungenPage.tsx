/**
 * GefaehrdungenPage — Übersichts-Page für Gefährdungsbeurteilungen
 * (Story 2.1 Task 8, AC5).
 *
 * Rendert die Überschrift, einen Primary-Button für den Drawer sowie die
 * echte Listen-Ansicht aller Gefährdungsbeurteilungen des Einsatzes.
 *
 * **Navigation nach Erstellung (AC3):** Nach erfolgreicher Erstellung
 * navigiert die Page in die Detail-Route
 * `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id`. Der
 * Ziel-Screen ist die Detail-Erfassung mit 5x5-Risikomatrix.
 */

import { useGefaehrdungsbeurteilungen } from '@/features/eigenschutz/api/queries';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { PiClipboardText, PiPlus } from 'react-icons/pi';
import { GefaehrdungsbeurteilungListItem } from '../molecules/GefaehrdungsbeurteilungListItem';
import { GefaehrdungseditorDrawer } from '../organisms/GefaehrdungseditorDrawer.organism';

export interface GefaehrdungenPageProps {
  readonly einsatzId: string;
}

export function GefaehrdungenPage({ einsatzId }: GefaehrdungenPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const beurteilungenQuery = useGefaehrdungsbeurteilungen(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const beurteilungen = beurteilungenQuery.data ?? [];

  const einheitenById = useMemo(() => {
    return new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit.name]));
  }, [einheitenQuery.data]);

  const handleOpen = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleSelect = useCallback(
    (beurteilungId: string) => {
      void navigate({
        to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id',
        params: { einsatzId, id: beurteilungId },
      });
    },
    [einsatzId, navigate],
  );

  const handleCreated = useCallback(
    (beurteilungId: string) => {
      logger.info('Gefährdungsbeurteilung angelegt', { einsatzId, beurteilungId });
      setDrawerOpen(false);
      handleSelect(beurteilungId);
    },
    [einsatzId, handleSelect],
  );

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gefährdungsbeurteilungen</h1>
          <p className="mt-1 text-sm text-text-muted">Pro Einheit eine Beurteilung anlegen, Gefährdungen erfassen und Schutzmaßnahmen dokumentieren.</p>
        </div>
        <Button intent="primary" onClick={handleOpen} data-testid="gefaehrdungen-neue-beurteilung">
          <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Neue Gefährdungsbeurteilung
        </Button>
      </header>

      {beurteilungenQuery.isPending ? (
        <div className="rounded-panel border border-border-subtle bg-surface-panel p-4 text-sm text-text-muted" data-testid="gefaehrdungen-list-loading">
          Lade Gefährdungsbeurteilungen…
        </div>
      ) : null}

      {beurteilungenQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-panel border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"
          data-testid="gefaehrdungen-list-error"
        >
          <div>
            <p className="font-medium">Gefährdungsbeurteilungen konnten nicht geladen werden.</p>
            <p className="mt-1 text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, ist der Bereich möglicherweise nicht freigegeben.</p>
          </div>
          <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void beurteilungenQuery.refetch()} data-testid="gefaehrdungen-list-retry">
            Erneut versuchen
          </Button>
        </div>
      ) : null}

      {!beurteilungenQuery.isPending && !beurteilungenQuery.isError && beurteilungen.length === 0 ? (
        <EmptyState
          icon={PiClipboardText}
          title="Noch keine Gefährdungsbeurteilungen"
          description="Lege die erste Beurteilung für eine Einheit an. Danach erscheint sie hier in der Übersicht."
          action={{ label: 'Erste Beurteilung anlegen', onClick: handleOpen }}
        />
      ) : null}

      {!beurteilungenQuery.isPending && !beurteilungenQuery.isError && beurteilungen.length > 0 ? (
        <ul className="space-y-2" data-testid="gefaehrdungen-list">
          {beurteilungen.map((beurteilung) => (
            <li key={beurteilung.id}>
              <GefaehrdungsbeurteilungListItem beurteilung={beurteilung} einheitName={einheitenById.get(beurteilung.einheitId) ?? beurteilung.einheitId} onClick={() => handleSelect(beurteilung.id)} />
            </li>
          ))}
        </ul>
      ) : null}

      {drawerOpen ? <GefaehrdungseditorDrawer einsatzId={einsatzId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={handleCreated} /> : null}
    </div>
  );
}
