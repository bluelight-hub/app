import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PiArrowSquareOut, PiClipboardText, PiWarningCircle, PiWarningOctagon } from 'react-icons/pi';
import type { EigenschutzVorfallListItemDto, EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useOffeneRueckmeldungen, type OffeneRueckmeldungEntry } from '../../api/queries';
import { useListVorfaelle } from '../../api/use-list-vorfaelle';

export interface EigenschutzOffenePunktePanelProps {
  readonly einsatzId: string;
  readonly mode?: 'inline' | 'compact';
  readonly className?: string;
}

export function EigenschutzOffenePunktePanel({ einsatzId, mode = 'inline', className }: EigenschutzOffenePunktePanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const vorfaelleQuery = useListVorfaelle(einsatzId, {});
  const rueckmeldungenQuery = useOffeneRueckmeldungen(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const einheitNameById = useMemo(() => new Map((einheitenQuery.data ?? []).map((einheit: EinsatzEinheitDto) => [einheit.id, einheit.name])), [einheitenQuery.data]);

  const vorfaelle = useMemo(() => sortVorfaelle(vorfaelleQuery.data ?? []), [vorfaelleQuery.data]);
  const rueckmeldungen = useMemo(() => sortRueckmeldungen(rueckmeldungenQuery.data ?? []), [rueckmeldungenQuery.data]);
  const totalCount = vorfaelle.length + rueckmeldungen.length;

  if (mode === 'compact') {
    return (
      <div className={cn('xl:hidden', className)}>
        <button
          type="button"
          data-testid="offene-punkte-compact-trigger"
          aria-label={`${totalCount} offene Punkte im Eigenschutz`}
          onClick={() => setDialogOpen(true)}
          className="focus:ring-focus flex w-full items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-panel px-3 py-2 text-left text-sm text-text-primary shadow-sm transition hover:border-border-strong focus:ring-2 focus:outline-none"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <PiWarningCircle className="h-4 w-4 shrink-0 text-status-warning-text" aria-hidden="true" />
            <span className="truncate font-medium">Offene Punkte</span>
          </span>
          <span className="rounded-pill bg-status-warning-surface px-2 py-0.5 text-xs font-semibold text-status-warning-text tabular-nums">{totalCount}</span>
        </button>
        <Dialog.SlideIn
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Offene Punkte"
          description="Vorfälle und Rückmeldungen im aktuellen Einsatz"
          size="md"
          className="max-w-[min(100vw,32rem)]"
        >
          <PanelContent
            einsatzId={einsatzId}
            vorfaelle={vorfaelle}
            rueckmeldungen={rueckmeldungen}
            einheitNameById={einheitNameById}
            vorfaelleLoading={vorfaelleQuery.isLoading}
            rueckmeldungenLoading={rueckmeldungenQuery.isLoading}
            vorfaelleError={vorfaelleQuery.isError}
            rueckmeldungenError={rueckmeldungenQuery.isError}
          />
        </Dialog.SlideIn>
      </div>
    );
  }

  return (
    <aside
      data-testid="eigenschutz-offene-punkte-panel"
      className={cn('min-w-0 rounded-panel border border-border-subtle bg-surface-panel p-3 shadow-sm', className)}
      aria-label="Offene Punkte im Eigenschutz"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Offene Punkte</h2>
        <span className="rounded-pill bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-muted tabular-nums">{totalCount}</span>
      </div>
      <PanelContent
        einsatzId={einsatzId}
        vorfaelle={vorfaelle}
        rueckmeldungen={rueckmeldungen}
        einheitNameById={einheitNameById}
        vorfaelleLoading={vorfaelleQuery.isLoading}
        rueckmeldungenLoading={rueckmeldungenQuery.isLoading}
        vorfaelleError={vorfaelleQuery.isError}
        rueckmeldungenError={rueckmeldungenQuery.isError}
      />
    </aside>
  );
}

interface PanelContentProps {
  readonly einsatzId: string;
  readonly vorfaelle: readonly EigenschutzVorfallListItemDto[];
  readonly rueckmeldungen: readonly OffeneRueckmeldungEntry[];
  readonly einheitNameById: ReadonlyMap<string, string>;
  readonly vorfaelleLoading: boolean;
  readonly rueckmeldungenLoading: boolean;
  readonly vorfaelleError: boolean;
  readonly rueckmeldungenError: boolean;
}

function PanelContent({ einsatzId, vorfaelle, rueckmeldungen, einheitNameById, vorfaelleLoading, rueckmeldungenLoading, vorfaelleError, rueckmeldungenError }: PanelContentProps) {
  return (
    <div className="space-y-4">
      <PanelSection id="offene-vorfaelle-title" title="Offene Vorfälle" count={vorfaelle.length}>
        {vorfaelleLoading ? <PanelHint>Lade Vorfälle…</PanelHint> : null}
        {vorfaelleError ? <PanelError>Offene Vorfälle konnten nicht geladen werden.</PanelError> : null}
        {!vorfaelleLoading && !vorfaelleError && vorfaelle.length === 0 ? <PanelHint>Keine offenen Vorfälle</PanelHint> : null}
        {!vorfaelleLoading && !vorfaelleError && vorfaelle.length > 0 ? (
          <ul className="space-y-2">
            {vorfaelle.map((vorfall) => (
              <OffenerVorfallPanelItem key={vorfall.id} einsatzId={einsatzId} vorfall={vorfall} einheitName={einheitNameById.get(vorfall.einheitId)} />
            ))}
          </ul>
        ) : null}
        {!vorfaelleLoading && !vorfaelleError && vorfaelle.length >= 200 ? <p className="text-xs text-text-muted">Liste begrenzt</p> : null}
      </PanelSection>

      <PanelSection id="ungeloeste-rueckmeldungen-title" title="Ungelöste Rückmeldungen" count={rueckmeldungen.length}>
        {rueckmeldungenLoading ? <PanelHint>Lade Rückmeldungen…</PanelHint> : null}
        {rueckmeldungenError ? <PanelError>Ungelöste Rückmeldungen konnten nicht geladen werden.</PanelError> : null}
        {!rueckmeldungenLoading && !rueckmeldungenError && rueckmeldungen.length === 0 ? <PanelHint>Keine ungelösten Rückmeldungen</PanelHint> : null}
        {!rueckmeldungenLoading && !rueckmeldungenError && rueckmeldungen.length > 0 ? (
          <ul className="space-y-2">
            {rueckmeldungen.map((rueckmeldung) => (
              <UngeloesteRueckmeldungPanelItem
                key={`${rueckmeldung.propagationGroupId}-${rueckmeldung.einheitId}`}
                einsatzId={einsatzId}
                rueckmeldung={rueckmeldung}
                einheitName={einheitNameById.get(rueckmeldung.einheitId)}
              />
            ))}
          </ul>
        ) : null}
        {!rueckmeldungenLoading && !rueckmeldungenError && rueckmeldungen.length >= 200 ? <p className="text-xs text-text-muted">Liste begrenzt</p> : null}
      </PanelSection>
    </div>
  );
}

function PanelSection({ id, title, count, children }: { readonly id: string; readonly title: string; readonly count: number; readonly children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id={id} className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          {title}
        </h3>
        <span className="text-xs font-semibold text-text-muted tabular-nums">{count}</span>
      </div>
      {children}
    </section>
  );
}

export function OffenerVorfallPanelItem({ einsatzId, vorfall, einheitName }: { readonly einsatzId: string; readonly vorfall: EigenschutzVorfallListItemDto; readonly einheitName?: string }) {
  return (
    <li data-testid={`offener-vorfall-${vorfall.id}`} className="bg-surface-base min-w-0 rounded-control border border-border-subtle p-2">
      <div className="flex min-w-0 items-start gap-2">
        <PiClipboardText className="mt-0.5 h-4 w-4 shrink-0 text-status-danger-text" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary" title={vorfall.was}>
            {vorfall.was}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted" title={`${formatDateTime(vorfall.vorfallZeit)} · ${einheitName ?? shortenId(vorfall.einheitId)}`}>
            {formatDateTime(vorfall.vorfallZeit)} · {einheitName ?? shortenId(vorfall.einheitId)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {vorfall.unfallkasseRelevant ? (
              <Badge variant="warning" size="sm">
                <span className="inline-flex items-center gap-1">
                  <PiWarningOctagon data-testid="uk-relevant-icon" className="h-3.5 w-3.5" aria-hidden="true" />
                  UK-relevant
                </span>
              </Badge>
            ) : null}
            <Link
              to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId"
              params={{ einsatzId, vorfallId: vorfall.id }}
              className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              Öffnen <PiArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export function UngeloesteRueckmeldungPanelItem({
  einsatzId,
  rueckmeldung,
  einheitName,
}: {
  readonly einsatzId: string;
  readonly rueckmeldung: OffeneRueckmeldungEntry;
  readonly einheitName?: string;
}) {
  const text = rueckmeldung.lueckeNotiz?.trim() || 'Rückmeldung ohne Text';
  return (
    <li data-testid={`offene-rueckmeldung-${rueckmeldung.propagationGroupId}-${rueckmeldung.einheitId}`} className="bg-surface-base min-w-0 rounded-control border border-border-subtle p-2">
      <div className="flex min-w-0 items-start gap-2">
        <PiWarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary" title={text}>
            {text}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted" title={`${formatDateTime(rueckmeldung.gemeldetAm)} · ${einheitName ?? shortenId(rueckmeldung.einheitId)}`}>
            {formatDateTime(rueckmeldung.gemeldetAm)} · {einheitName ?? shortenId(rueckmeldung.einheitId)}
          </p>
          {rueckmeldung.begruendungAnriss ? (
            <p className="mt-1 truncate text-xs text-text-muted" title={rueckmeldung.begruendungAnriss}>
              {rueckmeldung.begruendungAnriss}
            </p>
          ) : null}
          <Link
            to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile"
            params={{ einsatzId }}
            className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            Bearbeiten <PiArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function PanelHint({ children }: { readonly children: ReactNode }) {
  return <p className="bg-surface-base rounded-control border border-dashed border-border-subtle px-2 py-2 text-sm text-text-muted">{children}</p>;
}

function PanelError({ children }: { readonly children: ReactNode }) {
  return (
    <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-surface px-2 py-2 text-sm text-status-danger-text">
      {children}
    </p>
  );
}

function sortVorfaelle(rows: readonly EigenschutzVorfallListItemDto[]): EigenschutzVorfallListItemDto[] {
  return [...rows].sort((left, right) => {
    const timeDelta = right.vorfallZeit.localeCompare(left.vorfallZeit);
    if (timeDelta !== 0) return timeDelta;
    return right.id.localeCompare(left.id);
  });
}

function sortRueckmeldungen(rows: readonly OffeneRueckmeldungEntry[]): OffeneRueckmeldungEntry[] {
  return [...rows].sort((left, right) => {
    const timeDelta = right.gemeldetAm.localeCompare(left.gemeldetAm);
    if (timeDelta !== 0) return timeDelta;
    return `${left.propagationGroupId}:${left.einheitId}`.localeCompare(`${right.propagationGroupId}:${right.einheitId}`);
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function shortenId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
