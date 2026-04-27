/**
 * SicherheitsregelnPage — Übersichts-Page für Sicherheitsregeln
 * (Story 2.6, Task 9 / AC1 + AC6 + AC11).
 *
 * - Header mit Primary-Button „+ Sicherheitsregel" → öffnet den
 *   `SicherheitsregelDrawer` im Create-Modus.
 * - Listen-Darstellung aller aktiven Regeln (zuletzt aktualisierte zuerst),
 *   ein Klick auf eine Zeile öffnet den Drawer im Edit-Modus (`regel`-Prop
 *   vorbelegt).
 * - Empty-/Loading-/Error-States folgen dem Muster aus `GefaehrdungenPage`.
 * - Zero-Toast-Policy (UX-DR21): keine Erfolgs-Toasts; Fehler inline.
 */

import { useSicherheitsregeln } from '@/features/eigenschutz/api/queries';
import { useAktiveEinsatzEinheit } from '@/features/eigenschutz/hooks/use-aktive-einsatz-einheit';
import type { SicherheitsregelDto } from '@/features/eigenschutz/schemas/sicherheitsregel.schema';
import { SicherheitsregelDrawer } from '@/features/eigenschutz/ui/organisms/SicherheitsregelDrawer';
import { SicherheitsregelEmpfangBanner } from '@/features/eigenschutz/ui/organisms/SicherheitsregelEmpfangBanner';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useCallback, useMemo, useState } from 'react';
import { PiPlus, PiShieldCheck } from 'react-icons/pi';

export interface SicherheitsregelnPageProps {
  readonly einsatzId: string;
}

/**
 * Übersetzt ISO-Strings in kurze deutschsprachige Datumsangaben. Lokal
 * gehalten, damit die Page keine zusätzliche Util-Abhängigkeit aufnimmt
 * (analog zu `GefaehrdungsbeurteilungListItem`).
 */
function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function truncate(value: string, max = 120): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function SicherheitsregelnPage({ einsatzId }: SicherheitsregelnPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRegel, setEditRegel] = useState<SicherheitsregelDto | undefined>(undefined);
  const aktiveEinheit = useAktiveEinsatzEinheit(einsatzId);
  const regelnQuery = useSicherheitsregeln(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const regeln = regelnQuery.data ?? [];

  const einheitNameById = useMemo(() => {
    return new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit.name]));
  }, [einheitenQuery.data]);

  const handleOpenCreate = useCallback(() => {
    setEditRegel(undefined);
    setDrawerOpen(true);
  }, []);

  const handleOpenEdit = useCallback((regel: SicherheitsregelDto) => {
    setEditRegel(regel);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditRegel(undefined);
  }, []);

  const handleSaved = useCallback(
    (regelIds: string[]) => {
      logger.info('Sicherheitsregel(n) gespeichert', { einsatzId, regelIds });
      setDrawerOpen(false);
      setEditRegel(undefined);
    },
    [einsatzId],
  );

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sicherheitsregeln</h1>
          <p className="mt-1 text-sm text-text-muted">Spezifische Regeln für den gesamten Einsatz oder einzelne Einheiten dokumentieren und bekannt geben.</p>
        </div>
        <Button intent="primary" onClick={handleOpenCreate} data-testid="sicherheitsregeln-neue-regel">
          <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Sicherheitsregel
        </Button>
      </header>

      {/* Story 2.7: Empfangs-Bereich für die aktuell aktive Einheit. Rendert
          nur, wenn der User eine Einheit ausgewählt hat — die Auswahl-UI
          rendert ein eigener Selector im EigenschutzEntryPage-Layout
          (Story-Folge-Ticket: explizite Einheit-Auswahl-Komponente). */}
      {aktiveEinheit.einheitId !== null && (
        <section data-testid="sicherheitsregeln-empfang" aria-label="Live-Bekanntgaben für deine Einheit">
          <SicherheitsregelEmpfangBanner einsatzId={einsatzId} />
        </section>
      )}

      {regelnQuery.isPending ? (
        <div className="rounded-panel border border-border-subtle bg-surface-panel p-4 text-sm text-text-muted" data-testid="sicherheitsregeln-list-loading">
          Lade Sicherheitsregeln…
        </div>
      ) : null}

      {regelnQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-panel border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"
          data-testid="sicherheitsregeln-list-error"
        >
          <div>
            <p className="font-medium">Sicherheitsregeln konnten nicht geladen werden.</p>
            <p className="mt-1 text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, ist der Bereich möglicherweise nicht freigegeben.</p>
          </div>
          <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void regelnQuery.refetch()} data-testid="sicherheitsregeln-list-retry">
            Erneut versuchen
          </Button>
        </div>
      ) : null}

      {!regelnQuery.isPending && !regelnQuery.isError && regeln.length === 0 ? (
        <EmptyState
          icon={PiShieldCheck}
          title="Noch keine Sicherheitsregeln"
          description="Lege die erste Regel für den Einsatz oder einzelne Einheiten an. Danach erscheint sie hier in der Übersicht."
          action={{ label: 'Erste Regel anlegen', onClick: handleOpenCreate }}
        />
      ) : null}

      {!regelnQuery.isPending && !regelnQuery.isError && regeln.length > 0 ? (
        <ul className="space-y-2" data-testid="sicherheitsregeln-list">
          {regeln.map((regel) => {
            const einheitLabel = regel.einheitId === null || regel.einheitId === undefined ? 'Gesamter Einsatz' : `Einheit: ${einheitNameById.get(regel.einheitId) ?? regel.einheitId}`;
            return (
              <li key={regel.id}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(regel)}
                  className="block w-full rounded-panel border border-border-subtle bg-surface-panel p-4 text-left transition-colors hover:border-border-strong focus:outline-none focus-visible:shadow-focus-ring"
                  data-testid={`sicherheitsregel-zeile-${regel.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">{regel.titel}</h2>
                      <p className="mt-1 text-sm text-text-muted">{truncate(regel.inhalt, 140)}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-text-muted">
                      <div>Version {regel.version}</div>
                      <div>{formatDate(regel.aktualisiertAm)}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-medium text-text-primary">{einheitLabel}</div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {drawerOpen ? <SicherheitsregelDrawer einsatzId={einsatzId} open={drawerOpen} onClose={handleClose} onSaved={handleSaved} regel={editRegel} /> : null}
    </div>
  );
}
