import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { forwardRef, useMemo, type ReactNode } from 'react';
import { PiCaretUpDown, PiCheck, PiX } from 'react-icons/pi';
import type { EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { cn } from '@/shared/ui/cn';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { resetFilter, selectFilterIsActive, setAbschnittIds, setUnfallkasseRelevant, setZeitraum, useVorfallFilterState, type VorfallFilterState } from '../../stores/vorfall-filter.store';

export interface VorfallFilterBarProps {
  readonly einsatzId: string | undefined;
  /**
   * Wenn der Resolver mehr als `MAX_EINHEIT_IDS` Einheiten liefert, signalisiert
   * der Konsument hier, dass die Liste beim Backend-Aufruf gekürzt wurde.
   * Die Filter-Bar zeigt dann einen Inline-Hinweis-Chip.
   */
  readonly truncatedHint?: { readonly truncatedCount: number } | null;
}

/**
 * Filter-Bar für die Vorfall-Liste (Story 5.3, AC10).
 *
 * Vier Controls (Abschnitt-Multi-Select, Zeitraum von/bis, UK-Checkbox,
 * Reset) plus Active-Filter-Chips. Konsumiert den `vorfallFilterStore` als
 * Single-Source-of-Truth; URL-Sync läuft als separater Effect in der Page
 * (AC6/AC12).
 */
export const VorfallFilterBar = forwardRef<HTMLButtonElement, VorfallFilterBarProps>(({ einsatzId, truncatedHint }, ref) => {
  const state = useVorfallFilterState();
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const abschnitte = useMemo<EinsatzEinheitDto[]>(() => (einheitenQuery.data ?? []).filter((e) => e.typ === 'ABSCHNITT'), [einheitenQuery.data]);
  // Stable Reference für Listbox-`value` — verhindert unnötige Re-Renders
  // im Headless-UI-Listbox bei jedem Filter-Wechsel (Code-Review F9).
  const abschnittIdsValue = useMemo(() => [...state.abschnittIds], [state.abschnittIds]);

  const isActive = selectFilterIsActive(state);
  const isLoading = einheitenQuery.isLoading;
  const isError = einheitenQuery.isError;
  const hasNoAbschnitte = !isLoading && !isError && abschnitte.length === 0;
  const isAbschnittControlDisabled = isLoading || isError || hasNoAbschnitte;
  const abschnittPlaceholderTitle = isError ? 'Abschnitte konnten nicht geladen werden — Filter Zeitraum/UK-rel. weiter nutzbar' : hasNoAbschnitte ? 'Keine Abschnitte definiert' : undefined;

  // Date-Parse statt String-Vergleich — robust gegen Format-Drift in
  // ungewöhnlichen Eingaben (Code-Review F14). `<input type="date">` liefert
  // kanonisch `yyyy-mm-dd`, daher in der Praxis kein Bug, aber Defense-in-
  // Depth gegen programmatisch injizierten Müll.
  const rangeError = (() => {
    if (!state.vorfallZeitVon || !state.vorfallZeitBis) return null;
    const von = Date.parse(state.vorfallZeitVon);
    const bis = Date.parse(state.vorfallZeitBis);
    if (!Number.isFinite(von) || !Number.isFinite(bis)) return null;
    return von > bis ? 'Bis-Datum muss ≥ Von-Datum sein' : null;
  })();

  return (
    <section role="search" aria-label="Vorfälle filtern" data-testid="vorfaelle-filter-bar" className="rounded-lg border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-col gap-1">
          <label htmlFor="vorfaelle-filter-abschnitt" className="text-xs font-medium text-text-muted">
            Abschnitt
          </label>
          <Listbox as="div" multiple value={abschnittIdsValue} onChange={(ids: string[]) => setAbschnittIds(ids)} disabled={isAbschnittControlDisabled}>
            <ListboxButton
              ref={ref}
              id="vorfaelle-filter-abschnitt"
              data-testid="vorfaelle-filter-abschnitt-trigger"
              className={cn(
                'group flex w-full items-center gap-2 rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-left text-sm',
                'hover:bg-surface-panel-hover',
                'focus-visible:shadow-focus-ring focus-visible:outline-none',
                isAbschnittControlDisabled && 'cursor-not-allowed opacity-60',
              )}
              aria-label="Abschnitt-Multi-Select"
              title={abschnittPlaceholderTitle}
            >
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {state.abschnittIds.length > 0 ? `${state.abschnittIds.length} Abschnitt${state.abschnittIds.length === 1 ? '' : 'e'} ausgewählt` : 'Alle Abschnitte'}
              </span>
              <PiCaretUpDown className="h-4 w-4 flex-shrink-0 text-text-muted" />
            </ListboxButton>
            <ListboxOptions
              className={cn('absolute z-50 mt-1 max-h-60 min-w-[220px] overflow-auto rounded-lg border border-border-subtle bg-surface-panel shadow-panel', 'focus-visible:outline-none')}
              anchor="bottom start"
            >
              {abschnitte.map((abschnitt) => (
                <ListboxOption
                  key={abschnitt.id}
                  value={abschnitt.id}
                  className="data-[focus]:bg-surface-panel-hover flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-text-primary data-[selected]:font-medium"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {state.abschnittIds.includes(abschnitt.id) ? <PiCheck className="h-3.5 w-3.5 text-action-primary" /> : null}
                  </span>
                  <span className="truncate">{abschnitt.name}</span>
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="vorfaelle-filter-von" className="text-xs font-medium text-text-muted">
            Von
          </label>
          <input
            id="vorfaelle-filter-von"
            type="date"
            data-testid="vorfaelle-filter-von"
            value={state.vorfallZeitVon ?? ''}
            onChange={(e) => setZeitraum(e.target.value || undefined, state.vorfallZeitBis)}
            className="rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
            aria-label="Filter Zeitraum von"
            aria-invalid={rangeError ? 'true' : 'false'}
            aria-describedby={rangeError ? 'vorfaelle-filter-range-error' : undefined}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="vorfaelle-filter-bis" className="text-xs font-medium text-text-muted">
            Bis
          </label>
          <input
            id="vorfaelle-filter-bis"
            type="date"
            data-testid="vorfaelle-filter-bis"
            value={state.vorfallZeitBis ?? ''}
            onChange={(e) => setZeitraum(state.vorfallZeitVon, e.target.value || undefined)}
            className="rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
            aria-label="Filter Zeitraum bis"
            aria-invalid={rangeError ? 'true' : 'false'}
            aria-describedby={rangeError ? 'vorfaelle-filter-range-error' : undefined}
          />
        </div>

        <div className="flex items-center pb-1.5" data-testid="vorfaelle-filter-uk-wrapper">
          <Checkbox id="vorfaelle-filter-uk" checked={state.unfallkasseRelevant === true} onChange={(checked) => setUnfallkasseRelevant(checked ? true : undefined)} label="Nur Unfallkasse-relevant" />
        </div>

        {isActive ? (
          <Button data-testid="vorfaelle-filter-reset" intent="secondary" onClick={resetFilter}>
            Filter zurücksetzen
          </Button>
        ) : null}
      </div>

      {rangeError ? (
        <p id="vorfaelle-filter-range-error" className="mt-2 text-xs text-status-danger-text" role="alert">
          {rangeError}
        </p>
      ) : null}

      <ActiveFilterChips state={state} abschnitte={abschnitte} />

      {truncatedHint && truncatedHint.truncatedCount > 0 ? (
        <div
          data-testid="vorfaelle-filter-truncated-hint"
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-surface px-2 py-0.5 text-xs text-status-warning-text"
        >
          {truncatedHint.truncatedCount} weitere Einheit{truncatedHint.truncatedCount === 1 ? '' : 'en'} ignoriert (Backend-Cap 50)
        </div>
      ) : null}
    </section>
  );
});

VorfallFilterBar.displayName = 'VorfallFilterBar';

interface ActiveFilterChipsProps {
  readonly state: VorfallFilterState;
  readonly abschnitte: ReadonlyArray<EinsatzEinheitDto>;
}

function ActiveFilterChips({ state, abschnitte }: ActiveFilterChipsProps): ReactNode {
  const chips: ReactNode[] = [];

  if (state.abschnittIds.length > 0) {
    const namensliste = state.abschnittIds.map((id) => abschnitte.find((a) => a.id === id)?.name ?? id.slice(0, 8)).join(', ');
    chips.push(
      <Chip key="abschnitt" testId="vorfaelle-filter-chip-abschnitt" onRemove={() => setAbschnittIds([])}>
        Abschnitt: {namensliste}
      </Chip>,
    );
  }

  if (state.vorfallZeitVon !== undefined || state.vorfallZeitBis !== undefined) {
    const label = formatRangeLabel(state.vorfallZeitVon, state.vorfallZeitBis);
    chips.push(
      <Chip key="zeitraum" testId="vorfaelle-filter-chip-zeitraum" onRemove={() => setZeitraum(undefined, undefined)}>
        {label}
      </Chip>,
    );
  }

  if (state.unfallkasseRelevant !== undefined) {
    chips.push(
      <Chip key="uk" testId="vorfaelle-filter-chip-uk" onRemove={() => setUnfallkasseRelevant(undefined)}>
        UK-relevant
      </Chip>,
    );
  }

  if (chips.length === 0) return null;
  return <div className="mt-2 flex flex-wrap gap-2">{chips}</div>;
}

interface ChipProps {
  readonly children: ReactNode;
  readonly onRemove: () => void;
  readonly testId: string;
}

function Chip({ children, onRemove, testId }: ChipProps): ReactNode {
  return (
    <span data-testid={testId} className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-panel px-2 py-0.5 text-xs text-text-primary">
      {children}
      <button type="button" aria-label="Filter entfernen" onClick={onRemove} className="hover:bg-surface-panel-hover rounded-full p-0.5 focus-visible:shadow-focus-ring focus-visible:outline-none">
        <PiX className="h-3 w-3" />
      </button>
    </span>
  );
}

function formatRangeLabel(von: string | undefined, bis: string | undefined): string {
  const formatDe = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };
  if (von && bis) return `${formatDe(von)} – ${formatDe(bis)}`;
  if (von) return `Von ${formatDe(von)}`;
  if (bis) return `Bis ${formatDe(bis)}`;
  return 'Zeitraum';
}
