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
import { useEigenschutzShortcuts } from '@/features/eigenschutz/hooks/useEigenschutzShortcuts';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { useWorkspaceBlockingOverlay } from '@/features/workspace/hooks/use-workspace-blocking-overlay';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiClipboardText, PiPlus } from 'react-icons/pi';
import { GefaehrdungsbeurteilungListItem } from '../molecules/GefaehrdungsbeurteilungListItem';
import { EigenschutzPageHeader } from '../molecules/EigenschutzPageHeader';
import { GefaehrdungseditorDrawer } from '../organisms/GefaehrdungseditorDrawer.organism';

// consistency-allow: destructive-pattern - Retry-Button bei Ladefehler, keine destruktive Mutation.
export interface GefaehrdungenPageProps {
  readonly einsatzId: string;
  readonly initialAction?: 'new-gefaehrdung';
}

const ROUTE_PATH = '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/' as const;

function withoutActionParam(prev: Record<string, unknown>): Record<string, unknown> {
  const next = { ...prev };
  delete next.action;
  return next;
}

export function GefaehrdungenPage({ einsatzId, initialAction }: GefaehrdungenPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isBlocking: workspaceIsBlocking } = useWorkspaceBlockingOverlay();
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

  const clearActionParam = useCallback(() => {
    if (initialAction !== 'new-gefaehrdung') return;
    void (navigate as unknown as (opts: { to: typeof ROUTE_PATH; params: { einsatzId: string }; search: (prev: Record<string, unknown>) => Record<string, unknown>; replace: boolean }) => void)({
      to: ROUTE_PATH,
      params: { einsatzId },
      search: withoutActionParam,
      replace: true,
    });
  }, [einsatzId, initialAction, navigate]);

  useEffect(() => {
    if (initialAction === 'new-gefaehrdung') {
      setDrawerOpen(true);
    }
  }, [initialAction]);

  useEigenschutzShortcuts({
    context: 'gefaehrdungen',
    enabled: true,
    isOverlayBlocking: workspaceIsBlocking || drawerOpen,
    onOpenGefaehrdungCreate: handleOpen,
  });

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
      <EigenschutzPageHeader
        title="Gefährdungsbeurteilungen"
        description="Pro Einheit eine Beurteilung anlegen, Gefährdungen erfassen und Schutzmaßnahmen dokumentieren."
        actions={
          <Button intent="primary" onClick={handleOpen} data-testid="gefaehrdungen-neue-beurteilung" kbd="n">
            <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Neue Gefährdungsbeurteilung
          </Button>
        }
      />

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

      {drawerOpen ? (
        <GefaehrdungseditorDrawer
          einsatzId={einsatzId}
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            clearActionParam();
          }}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}
