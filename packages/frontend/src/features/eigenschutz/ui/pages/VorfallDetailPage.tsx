/**
 * VorfallDetailPage — Read-Only-Detailansicht eines Eigenschutz-Vorfalls
 * inkl. zeitpunkt-genauem Kontext-Snapshot (Story 5.2 AC12).
 *
 * Lädt den Vorfall via {@link useGetVorfall} und rendert je nach Query-State
 * Skeleton, Fehler-Banner, 404-Banner oder die Vorfall-Daten plus
 * `IncidentContextSnapshot`-Organism. Append-only — kein Edit-Pfad.
 *
 * **Zero-Toast:** Fehlerpfade rendern inline.
 */

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { EigenschutzVorfallDto, EigenschutzVorfallDtoBeteiligteInner, EigenschutzVorfallDtoWo } from '@bluelight-hub/shared/client';
import { buildEigenschutzBrowserUrl } from '@/features/eigenschutz/utils/build-eigenschutz-deep-link';
import { CopyButton } from '@/shared/ui/molecules/copy-button.molecule';
import { useExportVorfallAlsJson } from '../../api/use-export-vorfall-as-json';
import { useExportVorfallAlsPdf } from '../../api/use-export-vorfall-as-pdf';
import { useGetVorfall } from '../../api/use-get-vorfall';
import { useVorfallAuditTimeline, type VorfallAuditTimelineEntry } from '../../api/use-vorfall-audit-timeline';
import { IncidentContextSnapshot } from '../organisms/IncidentContextSnapshot';

export interface VorfallDetailPageProps {
  readonly einsatzId: string;
  readonly vorfallId: string;
}

function extractHttpStatus(error: unknown): number | null {
  // Code-Review-Patch (P11): openapi-fetch / fetch-Wrapper / TanStack-Query
  // wrappen den HTTP-Status je nach Generator-Version unterschiedlich. Robust
  // gegen alle bekannten Shapes: top-level `status`, `response.status`,
  // `cause.status`.
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: number; response?: { status?: number }; cause?: { status?: number } };
  return candidate.status ?? candidate.response?.status ?? candidate.cause?.status ?? null;
}

function is404(error: unknown): boolean {
  return extractHttpStatus(error) === 404;
}

function is403(error: unknown): boolean {
  return extractHttpStatus(error) === 403;
}

function VorfallDetailSkeleton() {
  return (
    <div className="space-y-4" data-testid="vorfall-detail-loading">
      <div className="bg-surface-muted h-7 w-64 animate-pulse rounded-control" />
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
            <div className="bg-surface-muted h-4 w-40 animate-pulse rounded" />
            <div className="bg-surface-muted h-10 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
}

function formatBeteiligter(eintrag: EigenschutzVorfallDtoBeteiligteInner | unknown): string {
  if (!eintrag || typeof eintrag !== 'object') return '—';
  const kind = (eintrag as { kind?: string }).kind;
  if (kind === 'user') return `Nutzer: ${(eintrag as { userId?: string }).userId ?? '—'}`;
  if (kind === 'freitext') {
    const name = (eintrag as { name?: string }).name ?? '—';
    const rolle = (eintrag as { rolle?: string }).rolle;
    return rolle ? `${name} (${rolle})` : name;
  }
  return '—';
}

function formatWo(wo: EigenschutzVorfallDtoWo | null | undefined): string {
  if (!wo || typeof wo !== 'object') return '—';
  const kind = (wo as { kind?: string }).kind;
  if (kind === 'coordinate') {
    const lon = (wo as { longitude?: number }).longitude;
    const lat = (wo as { latitude?: number }).latitude;
    if (typeof lon === 'number' && typeof lat === 'number') {
      const hint = (wo as { addressHint?: string }).addressHint;
      const coords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      return hint ? `${coords} · ${hint}` : coords;
    }
  }
  if (kind === 'freitext') {
    return (wo as { text?: string }).text ?? '—';
  }
  return '—';
}

function formatExportFormat(exportFormat: string | null | undefined): string {
  if (!exportFormat) return 'Export';
  return exportFormat.toUpperCase();
}

function formatAuditActor(entry: VorfallAuditTimelineEntry): string {
  if (entry.userName) return `Nutzer: ${entry.userName}`;
  return entry.userId ? `Nutzer-ID: ${entry.userId.slice(0, 8)}` : 'Nutzer unbekannt';
}

function ExportHistorySection({ entries, isLoading, isError }: { readonly entries: readonly VorfallAuditTimelineEntry[] | undefined; readonly isLoading: boolean; readonly isError: boolean }) {
  return (
    <section data-testid="vorfall-export-history-section" className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
      <h2 className="text-sm font-semibold text-text-primary">Export-Historie</h2>
      {isLoading ? (
        <p data-testid="vorfall-export-history-loading" className="text-sm text-text-muted">
          Export-Historie wird geladen…
        </p>
      ) : null}
      {!isLoading && isError ? (
        <p data-testid="vorfall-export-history-error" role="status" aria-live="polite" className="text-sm text-status-warning-text">
          Export-Historie konnte nicht geladen werden.
        </p>
      ) : null}
      {!isLoading && !isError && (entries?.length ?? 0) === 0 ? (
        <p data-testid="vorfall-export-history-empty" className="text-sm text-text-muted">
          Noch keine Exporte protokolliert.
        </p>
      ) : null}
      {!isLoading && !isError && entries && entries.length > 0 ? (
        <ul className="divide-y divide-border-subtle text-sm">
          {entries.map((entry) => (
            <li key={entry.id} data-testid={`vorfall-export-history-entry-${entry.id}`} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text-primary">
                  {formatExportFormat(entry.format)} exportiert · {formatDateTime(entry.occurredAt)}
                </p>
                <p className="text-xs text-text-muted">{formatAuditActor(entry)}</p>
              </div>
              <p className="text-xs text-text-muted">{entry.label}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface ExportErrorBannerProps {
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly testId?: string;
  readonly retryTestId?: string;
  readonly genericMessage?: string;
}

/**
 * Inline-Error-Banner für den Export (PDF / JSON).
 *
 * Code-Review-Patches (P9, P11):
 * - `role="status"` + `aria-live="polite"` für Screenreader-Ankündigung
 *   (Spec AC9 wollte `SeverityBanner tone="polite"`).
 * - 403/404 vs. generischer Fehler: bei Permission-Denied / Vorfall-weg ist
 *   ein Retry sinnlos; wir zeigen einen passenden Text und blenden den
 *   Retry-Button aus, damit User nicht endlos wiederholen.
 */
function ExportErrorBanner({
  error,
  onRetry,
  testId = 'vorfall-export-error-banner',
  retryTestId = 'vorfall-export-retry-button',
  genericMessage = 'Export fehlgeschlagen — bitte erneut versuchen.',
}: ExportErrorBannerProps) {
  const status = extractHttpStatus(error);
  let message = genericMessage;
  let allowRetry = true;
  if (status === 403) {
    message = 'Keine Berechtigung zum Export. Bitte die Eigenschutz-Permission prüfen.';
    allowRetry = false;
  } else if (status === 404) {
    message = 'Vorfall nicht mehr verfügbar — möglicherweise wurde er entfernt.';
    allowRetry = false;
  }
  return (
    <div data-testid={testId} role="status" aria-live="polite" className="rounded-panel border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
      <p className="font-medium">{message}</p>
      {allowRetry ? (
        <button type="button" data-testid={retryTestId} className="mt-1 text-xs underline" onClick={onRetry}>
          Erneut versuchen
        </button>
      ) : null}
    </div>
  );
}

export function VorfallDetailPage({ einsatzId, vorfallId }: VorfallDetailPageProps) {
  const query = useGetVorfall(einsatzId, vorfallId);
  const auditTimeline = useVorfallAuditTimeline(einsatzId, vorfallId);
  const exportPdf = useExportVorfallAlsPdf();
  const exportJson = useExportVorfallAlsJson();

  if (query.isLoading) return <VorfallDetailSkeleton />;

  if (query.isError) {
    if (is403(query.error)) {
      return (
        <div data-testid="vorfall-detail-forbidden" className="rounded-panel border border-status-warning-border bg-status-warning-surface p-4">
          <h2 className="text-base font-semibold text-status-warning-text">Vorfall nicht freigegeben</h2>
          <p className="mt-1 text-sm text-text-muted">Diese Entität gehört zu einem anderen Einsatz oder ist für dich nicht freigegeben.</p>
        </div>
      );
    }
    if (is404(query.error)) {
      return (
        <div data-testid="vorfall-detail-not-found" className="rounded-panel border border-status-warning-border bg-status-warning-surface p-4">
          <h2 className="text-base font-semibold text-status-warning-text">Vorfall nicht gefunden</h2>
          <p className="mt-1 text-sm text-text-muted">Der angefragte Vorfall existiert nicht oder gehört zu einem anderen Einsatz.</p>
        </div>
      );
    }
    return (
      <div data-testid="vorfall-detail-error" className="border-status-error-border bg-status-error-surface rounded-panel border p-4">
        <h2 className="text-status-error-text text-base font-semibold">Vorfall konnte nicht geladen werden</h2>
        <p className="mt-1 text-sm text-text-muted">Bitte später erneut versuchen.</p>
      </div>
    );
  }

  const vorfall = query.data as EigenschutzVorfallDto | undefined;
  if (!vorfall) return <VorfallDetailSkeleton />;
  const detailUrl = buildEigenschutzBrowserUrl({ type: 'vorfall', einsatzId, vorfallId });

  return (
    <div className="space-y-4" data-testid="vorfall-detail-page">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Vorfall vom {formatDateTime(vorfall.vorfallZeit)}</h1>
          {vorfall.unfallkasseRelevant ? <p className="mt-1 text-sm font-medium text-status-warning-text">Unfallkassen-relevant</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CopyButton text={detailUrl} idleLabel="Link kopieren" copiedLabel="Link kopiert" errorLabel="Link konnte nicht kopiert werden" size="sm" statusTestId="vorfall-detail-copy-status" />
            <button
              type="button"
              className="text-action-primary-foreground rounded-control bg-action-primary px-3 py-1.5 text-sm font-medium hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="vorfall-export-pdf-button"
              disabled={exportPdf.isPending}
              aria-busy={exportPdf.isPending}
              onClick={() => exportPdf.mutate({ einsatzId, vorfallId })}
            >
              {exportPdf.isPending ? 'PDF wird erzeugt…' : 'Als PDF exportieren'}
            </button>
            <button
              type="button"
              className="hover:bg-surface-muted rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="vorfall-export-json-button"
              disabled={exportJson.isPending}
              aria-busy={exportJson.isPending}
              onClick={() => exportJson.mutate({ einsatzId, vorfallId })}
            >
              {exportJson.isPending ? 'JSON wird erzeugt…' : 'Als JSON exportieren'}
            </button>
          </div>
          {exportPdf.isError ? (
            <ExportErrorBanner
              error={exportPdf.error}
              onRetry={() => {
                exportPdf.reset();
                exportPdf.mutate({ einsatzId, vorfallId });
              }}
            />
          ) : null}
          {exportJson.isError ? (
            <ExportErrorBanner
              error={exportJson.error}
              testId="vorfall-export-json-error-banner"
              retryTestId="vorfall-export-json-retry-button"
              genericMessage="JSON-Export fehlgeschlagen — bitte erneut versuchen."
              onRetry={() => {
                exportJson.reset();
                exportJson.mutate({ einsatzId, vorfallId });
              }}
            />
          ) : null}
        </div>
      </header>

      <section data-testid="vorfall-detail-section-fakten" className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
        <h2 className="text-sm font-semibold text-text-primary">Was, Wann, Wo</h2>
        <dl className="space-y-1 text-sm text-text-primary">
          <div className="flex gap-2">
            <dt className="w-24 text-text-muted">Was:</dt>
            <dd>{vorfall.was}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-text-muted">Wann:</dt>
            <dd>{formatDateTime(vorfall.wann)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-text-muted">Wo:</dt>
            <dd>{formatWo(vorfall.wo as EigenschutzVorfallDtoWo | null | undefined)}</dd>
          </div>
        </dl>
      </section>

      <section data-testid="vorfall-detail-section-beteiligte" className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
        <h2 className="text-sm font-semibold text-text-primary">Beteiligte</h2>
        {vorfall.beteiligte.length === 0 ? (
          <p className="text-sm text-text-muted">Keine Beteiligten erfasst.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-primary">
            {vorfall.beteiligte.map((eintrag, idx) => (
              <li key={idx}>{formatBeteiligter(eintrag)}</li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="vorfall-detail-section-massnahmen" className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
        <h2 className="text-sm font-semibold text-text-primary">Maßnahmen</h2>
        {vorfall.massnahmen.length === 0 ? <p className="text-sm text-text-muted">Keine Maßnahmen erfasst.</p> : <p className="text-sm whitespace-pre-line text-text-primary">{vorfall.massnahmen}</p>}
      </section>

      <IncidentContextSnapshot einsatzId={einsatzId} rawSnapshot={vorfall.kontextSnapshot} />

      <ExportHistorySection entries={auditTimeline.data} isLoading={auditTimeline.isLoading} isError={auditTimeline.isError} />
    </div>
  );
}
