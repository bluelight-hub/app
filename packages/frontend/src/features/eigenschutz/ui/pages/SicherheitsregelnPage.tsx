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
import { buildEigenschutzBrowserUrl } from '@/features/eigenschutz/utils/build-eigenschutz-deep-link';
import { SicherheitsregelDrawer } from '@/features/eigenschutz/ui/organisms/SicherheitsregelDrawer';
import { SicherheitsregelEmpfangBanner } from '@/features/eigenschutz/ui/organisms/SicherheitsregelEmpfangBanner';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { CopyButton } from '@/shared/ui/molecules/copy-button.molecule';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiPlus, PiShieldCheck } from 'react-icons/pi';

export interface SicherheitsregelnPageProps {
  readonly einsatzId: string;
  readonly initialAction?: 'new-sicherheitsregel';
  readonly focusRegelId?: string;
  readonly onActionConsumed?: () => void;
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

const FORBIDDEN_ENTITY_MESSAGE = 'Diese Entität gehört zu einem anderen Einsatz oder ist für dich nicht freigegeben.';

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: number; response?: { status?: number }; cause?: { status?: number } };
  return candidate.status ?? candidate.response?.status ?? candidate.cause?.status ?? null;
}

export function SicherheitsregelnPage({ einsatzId, initialAction, focusRegelId, onActionConsumed }: SicherheitsregelnPageProps) {
  const [drawerOpen, setDrawerOpen] = useState(initialAction === 'new-sicherheitsregel');
  const [editRegel, setEditRegel] = useState<SicherheitsregelDto | undefined>(undefined);
  const [dismissedFocusRegelId, setDismissedFocusRegelId] = useState<string | undefined>(undefined);
  const aktiveEinheit = useAktiveEinsatzEinheit(einsatzId);
  const regelnQuery = useSicherheitsregeln(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const regeln = regelnQuery.data ?? [];

  useEffect(() => {
    if (initialAction === 'new-sicherheitsregel') {
      setEditRegel(undefined);
      setDrawerOpen(true);
    }
  }, [initialAction]);

  useEffect(() => {
    if (!focusRegelId || regelnQuery.isPending || regelnQuery.isError) return;
    if (dismissedFocusRegelId === focusRegelId) return;
    const match = regeln.find((regel) => regel.id === focusRegelId);
    if (!match) return;
    setEditRegel(match);
    setDrawerOpen(true);
  }, [dismissedFocusRegelId, focusRegelId, regeln, regelnQuery.isError, regelnQuery.isPending]);

  const einheitNameById = useMemo(() => {
    return new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit.name]));
  }, [einheitenQuery.data]);

  const handleOpenCreate = useCallback(() => {
    setEditRegel(undefined);
    setDrawerOpen(true);
  }, []);

  const clearActionParam = useCallback(() => {
    if (initialAction !== 'new-sicherheitsregel') return;
    onActionConsumed?.();
  }, [initialAction, onActionConsumed]);

  const handleOpenEdit = useCallback(
    (regel: SicherheitsregelDto) => {
      if (focusRegelId === regel.id) {
        setDismissedFocusRegelId(undefined);
      }
      setEditRegel(regel);
      setDrawerOpen(true);
    },
    [focusRegelId],
  );

  const handleClose = useCallback(() => {
    if (focusRegelId && editRegel?.id === focusRegelId) {
      setDismissedFocusRegelId(focusRegelId);
    }
    setDrawerOpen(false);
    setEditRegel(undefined);
    clearActionParam();
  }, [clearActionParam, editRegel?.id, focusRegelId]);

  const handleSaved = useCallback(
    (regelIds: string[]) => {
      logger.info('Sicherheitsregel(n) gespeichert', { einsatzId, regelIds });
      setDismissedFocusRegelId(focusRegelId);
      setDrawerOpen(false);
      setEditRegel(undefined);
      clearActionParam();
    },
    [clearActionParam, einsatzId, focusRegelId],
  );

  const showMissingFocusRegel = Boolean(focusRegelId) && !regelnQuery.isPending && !regelnQuery.isError && !regeln.some((regel) => regel.id === focusRegelId);
  const detailUrl = focusRegelId ? buildEigenschutzBrowserUrl({ type: 'sicherheitsregel', einsatzId, id: focusRegelId }) : undefined;
  const listErrorStatus = getHttpStatus((regelnQuery as { error?: unknown }).error);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sicherheitsregeln</h1>
          <p className="mt-1 text-sm text-text-muted">Spezifische Regeln für den gesamten Einsatz oder einzelne Einheiten dokumentieren und bekannt geben.</p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {detailUrl ? (
            <CopyButton text={detailUrl} idleLabel="Link kopieren" copiedLabel="Link kopiert" errorLabel="Link konnte nicht kopiert werden" size="sm" statusTestId="sicherheitsregel-copy-status" />
          ) : null}
          <Button intent="primary" onClick={handleOpenCreate} data-testid="sicherheitsregeln-neue-regel">
            <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Sicherheitsregel
          </Button>
        </div>
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
            <p className="font-medium">
              {listErrorStatus === 403 ? FORBIDDEN_ENTITY_MESSAGE : listErrorStatus === 404 ? 'Sicherheitsregeln nicht gefunden.' : 'Sicherheitsregeln konnten nicht geladen werden.'}
            </p>
            {listErrorStatus !== 403 && listErrorStatus !== 404 ? (
              <p className="mt-1 text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, ist der Bereich möglicherweise nicht freigegeben.</p>
            ) : null}
          </div>
          {listErrorStatus !== 403 && listErrorStatus !== 404 ? (
            <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void regelnQuery.refetch()} data-testid="sicherheitsregeln-list-retry">
              Erneut versuchen
            </Button>
          ) : null}
        </div>
      ) : null}

      {showMissingFocusRegel ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-panel border border-status-warning-border bg-status-warning-surface px-4 py-3 text-sm text-status-warning-text"
          data-testid="sicherheitsregel-missing-state"
        >
          <p className="font-medium">Sicherheitsregel nicht gefunden.</p>
          <a
            href={`/app/einsatz/${encodeURIComponent(einsatzId)}/sicherheit/eigenschutz/sicherheitsregeln`}
            className="mt-1 inline-flex font-medium text-action-primary underline-offset-2 hover:underline"
          >
            Zur Sicherheitsregeln-Liste
          </a>
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
