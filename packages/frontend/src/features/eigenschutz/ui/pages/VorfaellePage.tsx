import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { useListVorfaelle, type VorfallListBackendFilter } from '../../api/use-list-vorfaelle';
import { replaceFilterState, selectFilterIsActive, useVorfallFilterState, type VorfallFilterState } from '../../stores/vorfall-filter.store';
import { VorfallFilterBar } from '../organisms/VorfallFilterBar';
import { VorfallList } from '../organisms/VorfallList';
import { VorfallMeldenDrawer } from '../organisms/VorfallMeldenDrawer';
import { resolveAbschnittToEinheitIds } from '../../utils/resolve-abschnitt-einheiten';

export interface VorfaellePageProps {
  readonly einsatzId: string;
  readonly einheitId: string | null;
  // AC10 verlangt 2-State-UK-Filter; URL-Schema kennt nur `'1'` (oder
  // weglassen). Tri-State (`'0'`) ist defer (siehe Story-Q-Liste).
  readonly initialSearch?: { abschnittIds?: ReadonlyArray<string>; von?: string; bis?: string; uk?: '1' };
}

/**
 * Konvertiert `yyyy-mm-dd` (User-lokaler Tag) zu ISO-8601 mit Offset für den
 * Backend-Filter. **Halb-offenes Intervall:** `vorfallZeit >= von` UND
 * `vorfallZeit < nextDayOf(bis)`. Damit deckt der Filter genau den vom User
 * gewählten lokalen Tag ab — kein UTC-Drift, keine 23:59:59.999-Edge-Cases
 * (Code-Review Story 5.3 P0-Patch F1).
 */
function localDayStartIso(yyyymmdd: string | undefined): string | undefined {
  if (!yyyymmdd) return undefined;
  const [y, m, d] = yyyymmdd.split('-').map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return undefined;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function localNextDayStartIso(yyyymmdd: string | undefined): string | undefined {
  if (!yyyymmdd) return undefined;
  const [y, m, d] = yyyymmdd.split('-').map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return undefined;
  const next = new Date(y, m - 1, d, 0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next.toISOString();
}

const ROUTE_PATH = '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle' as const;

/**
 * Seite „Vorfälle" (Story 5.1 + 5.3).
 *
 * Story 5.3 ersetzt den 5.1-Stub durch Filter-Bar + Liste mit URL-Sync.
 * - Filter-Persistenz: nur via URL (Deep-Link-fähig, UX-Spec Z. 1037).
 * - `/`-Shortcut fokussiert das erste Filter-Control (UX-Spec Z. 319, 1062).
 * - Detail-Klick navigiert zur 5.2-Detail-Page.
 */
export function VorfaellePage({ einsatzId, einheitId, initialSearch }: VorfaellePageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const filterState = useVorfallFilterState();
  const filterBarRef = useRef<HTMLButtonElement>(null);
  // Letzter zwischen URL und Store synchronisierter Snapshot — verhindert
  // Loop-Oszillation, wenn URL→Store→URL feuert (Pattern analog
  // `use-split-view-url-sync` / Story 3.10 F8). Bei Browser-Back/Deep-Link-
  // Wechsel ändert sich `initialSearch`, der Snapshot triggert den Sync,
  // aber Store→URL-Effect erkennt „bereits synchron" und tut nichts.
  const lastSyncedKeyRef = useRef<string | null>(null);

  // URL → Store: bei jedem `initialSearch`-Wechsel (Initial-Mount UND
  // Browser-Back/Forward UND Deep-Link-Navigation) den Store auf den URL-
  // Stand bringen, sofern noch nicht synchronisiert (Code-Review F2).
  useEffect(() => {
    const nextState: VorfallFilterState = {
      abschnittIds: initialSearch?.abschnittIds ?? [],
      vorfallZeitVon: initialSearch?.von,
      vorfallZeitBis: initialSearch?.bis,
      unfallkasseRelevant: initialSearch?.uk === '1' ? true : undefined,
    };
    const nextKey = stateKey(nextState);
    if (lastSyncedKeyRef.current === nextKey) return;
    lastSyncedKeyRef.current = nextKey;
    replaceFilterState(nextState);
  }, [initialSearch]);

  // Store → URL: jeden Filter-Wechsel zurück in die URL schreiben (replace).
  // Skippt das Schreiben, wenn der Store gerade aus der URL gefüllt wurde —
  // dadurch entstehen keine redundanten History-Einträge / Loop-Reentries.
  useEffect(() => {
    const nextKey = stateKey(filterState);
    if (lastSyncedKeyRef.current === nextKey) return;
    lastSyncedKeyRef.current = nextKey;
    const search = serializeFilterToSearch(filterState);
    void (navigate as unknown as (opts: { to: string; params: { einsatzId: string }; search: VorfaelleSearchOutput; replace?: boolean }) => void)({
      to: ROUTE_PATH,
      params: { einsatzId },
      search,
      replace: true,
    });
  }, [filterState, einsatzId, navigate]);

  // `/`-Shortcut: fokussiert das erste Filter-Control. Nur außerhalb von
  // Eingabefeldern aktiv (sonst kann Sabine kein „/" tippen). Fallback bei
  // disabled Abschnitt-Dropdown auf das Von-Datum-Input (F15).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      const button = filterBarRef.current;
      if (button && !button.disabled) {
        button.focus();
        return;
      }
      const fallback = document.querySelector<HTMLInputElement>('[data-testid="vorfaelle-filter-von"]');
      fallback?.focus();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const { backendFilter, truncatedHint } = useMemo(() => {
    const resolved = resolveAbschnittToEinheitIds(filterState.abschnittIds, einheitenQuery.data ?? []);
    // Halb-offenes Intervall in lokaler Zeitzone (Code-Review F1):
    // `Von 07.05` → `>= 2026-05-07T00:00 lokal`; `Bis 07.05` → `< 2026-05-08T00:00 lokal`.
    const filter: VorfallListBackendFilter = {
      einheitIds: resolved.einheitIds.length > 0 ? resolved.einheitIds : undefined,
      vorfallZeitVon: localDayStartIso(filterState.vorfallZeitVon),
      vorfallZeitBis: localNextDayStartIso(filterState.vorfallZeitBis),
      unfallkasseRelevant: filterState.unfallkasseRelevant,
    };
    return {
      backendFilter: filter,
      truncatedHint: resolved.truncated ? { truncatedCount: resolved.droppedCount } : null,
    };
  }, [filterState, einheitenQuery.data]);

  const vorfaelleQuery = useListVorfaelle(einsatzId, backendFilter);

  return (
    <div data-testid="vorfaelle-page" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vorfälle</h1>
          <p className="mt-1 text-sm text-text-muted">Filter persistent über URL — als Deep-Link teilbar.</p>
        </div>
        <Button data-testid="vorfaelle-add-button" intent="primary" onClick={() => setDrawerOpen(true)}>
          + Vorfall melden
        </Button>
      </header>

      <VorfallFilterBar einsatzId={einsatzId} ref={filterBarRef} truncatedHint={truncatedHint} />

      <VorfallList
        einsatzId={einsatzId}
        rows={vorfaelleQuery.data}
        isLoading={vorfaelleQuery.isLoading}
        isError={vorfaelleQuery.isError}
        onRetry={() => void vorfaelleQuery.refetch()}
        onRowClick={(vorfallId) => {
          // TanStack-Router-Type-Inference erkennt die Detail-Route trotz
          // Eintrag in routeTree.gen.ts nicht — vermutlich Wechselwirkung mit
          // dem strict Zod-`validateSearch` der Eltern-Route. Cast als
          // pragmatischer Workaround; Route existiert real (Story 5.2).
          void (navigate as unknown as (opts: { to: string; params: { einsatzId: string; vorfallId: string } }) => void)({
            to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId',
            params: { einsatzId, vorfallId },
          });
        }}
      />

      <VorfallMeldenDrawer einsatzId={einsatzId} einheitId={einheitId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

interface VorfaelleSearchOutput {
  abschnittIds?: string;
  von?: string;
  bis?: string;
  // Nur `'1'` — AC10 schreibt 2-State-UK-Filter vor (kein Tri-State).
  uk?: '1';
}

function serializeFilterToSearch(state: VorfallFilterState): VorfaelleSearchOutput {
  if (!selectFilterIsActive(state)) return {};
  const out: VorfaelleSearchOutput = {};
  if (state.abschnittIds.length > 0) out.abschnittIds = state.abschnittIds.join(',');
  if (state.vorfallZeitVon !== undefined) out.von = state.vorfallZeitVon;
  if (state.vorfallZeitBis !== undefined) out.bis = state.vorfallZeitBis;
  if (state.unfallkasseRelevant === true) out.uk = '1';
  return out;
}

/**
 * Stabile String-Repräsentation des Filter-States für den Loop-Defense-
 * Vergleich URL↔Store (Code-Review F2). Reine Funktion ohne Seiteneffekte.
 */
function stateKey(state: VorfallFilterState): string {
  return JSON.stringify({
    abschnittIds: [...state.abschnittIds].sort(),
    von: state.vorfallZeitVon ?? null,
    bis: state.vorfallZeitBis ?? null,
    uk: state.unfallkasseRelevant === true ? '1' : null,
  });
}
