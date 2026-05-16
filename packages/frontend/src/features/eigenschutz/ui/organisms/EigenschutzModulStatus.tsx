import { useMemo, type ComponentType } from 'react';
import { Link } from '@tanstack/react-router';
import { PiClipboardText, PiMapPin, PiShieldCheck, PiWarningOctagon } from 'react-icons/pi';
import type { AmpelProjectionDto, EigenschutzVorfallListItemDto, GefaehrdungsbeurteilungDto, SicherheitsregelDto, SicherungspostenDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';
import { useEigenschutzAmpelStatus } from '../../api/use-eigenschutz-ampel-status';
import { useGefaehrdungsbeurteilungen, useSicherheitsregeln } from '../../api/queries';
import { useListSicherungsposten } from '../../api/use-sicherungsposten';
import { useListVorfaelle } from '../../api/use-list-vorfaelle';

/**
 * Modul-Status-Sektion für die Eigenschutz-Übersicht.
 *
 * Zeigt vier kompakte Status-Tiles oberhalb der per-Einheit-AmpelCards an,
 * damit der Sicherheitsbeauftragte auf einen Blick sieht, was in den
 * Sub-Bereichen (Gefährdungen, Sicherheitsregeln, Sicherungsposten,
 * Vorfälle) los ist — ohne durch die Sub-Tabs klicken zu müssen.
 *
 * **Datenquellen** (alle bestehende Hooks; keine Backend-Änderungen):
 * - `useEigenschutzAmpelStatus` — liefert die `AmpelProjectionDto[]` für
 *   die Aggregat-Pills "X offene Hoch-Gefährdungen" (`offeneGefaehrdungenHoch`)
 *   und "X ausstehende Quittungen" (`ausstehendeRegelQuittungen`).
 *   TanStack-Query dedupliziert die Query mit dem Sibling-`AmpelDashboard`,
 *   sodass der Re-Mount keinen zusätzlichen Netzwerk-Roundtrip kostet.
 * - `useGefaehrdungsbeurteilungen` — Liste aller Beurteilungen für den Einsatz.
 * - `useSicherheitsregeln` — Liste aller aktiven Regeln für den Einsatz.
 * - `useListSicherungsposten(einsatzId, 'AKTIV')` — nur aktive Posten.
 * - `useListVorfaelle(einsatzId, {})` — alle Vorfälle des Einsatzes.
 *
 * **Vorfälle-Pill — Tech-Debt:** Solange kein Close-/Erledigt-Feature für
 * Vorfälle existiert (vgl. AmpelCard.tsx `offeneVorfaelle`-Pill), zeigt die
 * Pill den gleichen Wert wie der Total-Count. Sobald ein Status-Filter
 * verfügbar ist, sollte hier auf `useListVorfaelle(einsatzId, { status: 'OFFEN' })`
 * o.Ä. umgestellt werden.
 *
 * **Follow-up (Boyscout-Hinweis):** `QuittungsSummary` in `AmpelCard` addiert
 * PSA- und Regel-Quittungen zu einer Zahl pro Einheit — das kann verwirren,
 * wenn man die Aggregat-Pill hier nur über Regel-Quittungen rechnet. Nicht
 * im Scope dieser Story; als separate UX-Story aufnehmen.
 */
export interface EigenschutzModulStatusProps {
  readonly einsatzId: string;
  readonly className?: string;
}

const ROUTE = {
  gefaehrdungen: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen',
  sicherheitsregeln: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln',
  sicherungsposten: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten',
  vorfaelle: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle',
} as const;

export function EigenschutzModulStatus({ einsatzId, className }: EigenschutzModulStatusProps) {
  const ampelQuery = useEigenschutzAmpelStatus(einsatzId);
  const gefaehrdungenQuery = useGefaehrdungsbeurteilungen(einsatzId);
  const sicherheitsregelnQuery = useSicherheitsregeln(einsatzId);
  const sicherungspostenQuery = useListSicherungsposten(einsatzId, 'AKTIV');
  const vorfaelleQuery = useListVorfaelle(einsatzId, {});

  const ampelProjections = useMemo(() => (Array.isArray(ampelQuery.data) ? ampelQuery.data : []), [ampelQuery.data]);
  const gefaehrdungenTotal = (gefaehrdungenQuery.data ?? []).length;
  const sicherheitsregelnTotal = (sicherheitsregelnQuery.data ?? []).length;
  const sicherungspostenTotal = (sicherungspostenQuery.data ?? []).length;
  const vorfaelleTotal = (vorfaelleQuery.data ?? []).length;

  const offeneHochGefaehrdungen = useMemo(() => sumAmpelField(ampelProjections, 'offeneGefaehrdungenHoch'), [ampelProjections]);
  const ausstehendeRegelQuittungen = useMemo(() => sumAmpelField(ampelProjections, 'ausstehendeRegelQuittungen'), [ampelProjections]);

  return (
    <section data-testid="eigenschutz-modul-status" className={cn('space-y-2', className)} aria-label="Modul-Status">
      <h2 className="text-body-xs font-semibold tracking-[0.16em] text-text-muted uppercase">Modul-Status</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          <ModulStatusTile
            testId="modul-status-tile-gefaehrdungen"
            to={ROUTE.gefaehrdungen}
            einsatzId={einsatzId}
            Icon={PiClipboardText}
            label="Gefährdungen"
            total={gefaehrdungenTotal}
            totalUnit={gefaehrdungenTotal === 1 ? 'aktive Beurteilung' : 'aktive Beurteilungen'}
            isLoading={gefaehrdungenQuery.isLoading}
            isError={gefaehrdungenQuery.isError}
            pill={
              offeneHochGefaehrdungen > 0
                ? {
                    value: offeneHochGefaehrdungen,
                    label: offeneHochGefaehrdungen === 1 ? 'offene Hoch-Gefährdung' : 'offene Hoch-Gefährdungen',
                    tone: 'danger',
                  }
                : null
            }
          />
        </li>
        <li>
          <ModulStatusTile
            testId="modul-status-tile-sicherheitsregeln"
            to={ROUTE.sicherheitsregeln}
            einsatzId={einsatzId}
            Icon={PiShieldCheck}
            label="Sicherheitsregeln"
            total={sicherheitsregelnTotal}
            totalUnit={sicherheitsregelnTotal === 1 ? 'aktive Regel' : 'aktive Regeln'}
            isLoading={sicherheitsregelnQuery.isLoading}
            isError={sicherheitsregelnQuery.isError}
            pill={
              ausstehendeRegelQuittungen > 0
                ? {
                    value: ausstehendeRegelQuittungen,
                    label: ausstehendeRegelQuittungen === 1 ? 'ausstehende Quittung' : 'ausstehende Quittungen',
                    tone: 'warning',
                  }
                : null
            }
          />
        </li>
        <li>
          <ModulStatusTile
            testId="modul-status-tile-sicherungsposten"
            to={ROUTE.sicherungsposten}
            einsatzId={einsatzId}
            Icon={PiMapPin}
            label="Sicherungsposten"
            total={sicherungspostenTotal}
            totalUnit={sicherungspostenTotal === 1 ? 'aktiver Posten' : 'aktive Posten'}
            isLoading={sicherungspostenQuery.isLoading}
            isError={sicherungspostenQuery.isError}
            pill={null}
          />
        </li>
        <li>
          <ModulStatusTile
            testId="modul-status-tile-vorfaelle"
            to={ROUTE.vorfaelle}
            einsatzId={einsatzId}
            Icon={PiWarningOctagon}
            label="Vorfälle"
            total={vorfaelleTotal}
            totalUnit={vorfaelleTotal === 1 ? 'gemeldeter Vorfall' : 'gemeldete Vorfälle'}
            isLoading={vorfaelleQuery.isLoading}
            isError={vorfaelleQuery.isError}
            pill={
              vorfaelleTotal > 0
                ? {
                    value: vorfaelleTotal,
                    label: vorfaelleTotal === 1 ? 'offener Vorfall' : 'offene Vorfälle',
                    tone: 'danger',
                  }
                : null
            }
          />
        </li>
      </ul>
    </section>
  );
}

interface ModulStatusTileProps {
  readonly testId: string;
  readonly to: (typeof ROUTE)[keyof typeof ROUTE];
  readonly einsatzId: string;
  readonly Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  readonly label: string;
  readonly total: number;
  readonly totalUnit: string;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly pill: { readonly value: number; readonly label: string; readonly tone: 'danger' | 'warning' } | null;
}

function ModulStatusTile({ testId, to, einsatzId, Icon, label, total, totalUnit, isLoading, isError, pill }: ModulStatusTileProps) {
  return (
    <Link
      to={to}
      params={{ einsatzId }}
      data-testid={testId}
      aria-label={`${label}: ${total} ${totalUnit}${pill ? `, ${pill.value} ${pill.label}` : ''}`}
      className="flex h-full min-h-[6.5rem] flex-col gap-2 rounded-panel border border-border-subtle bg-surface-panel p-3 text-left shadow-sm transition-colors hover:border-border-strong focus-visible:shadow-focus-ring focus-visible:outline-none"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-text-muted" />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex flex-wrap items-baseline gap-1">
        {isLoading ? (
          <span className="text-sm text-text-muted">Lädt…</span>
        ) : isError ? (
          <span data-testid={`${testId}-error`} className="text-sm text-status-danger-text">
            Fehler beim Laden
          </span>
        ) : (
          <>
            <span data-testid={`${testId}-count`} className="text-2xl font-semibold text-text-primary tabular-nums">
              {total}
            </span>
            <span className="text-xs text-text-muted">{totalUnit}</span>
          </>
        )}
      </span>
      {pill ? (
        <span className="mt-auto">
          <MetricPill value={pill.value} label={pill.label} tone={pill.tone} testId={`${testId}-pill`} />
        </span>
      ) : null}
    </Link>
  );
}

function MetricPill({ value, label, tone, testId }: { readonly value: number; readonly label: string; readonly tone: 'danger' | 'warning'; readonly testId: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tone === 'danger' ? 'border-status-danger-border bg-status-danger-surface text-status-danger-text' : 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
      )}
    >
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function sumAmpelField(projections: readonly AmpelProjectionDto[], field: 'offeneGefaehrdungenHoch' | 'ausstehendeRegelQuittungen'): number {
  let sum = 0;
  for (const projection of projections) {
    const value = projection[field];
    if (Number.isFinite(value)) {
      sum += Math.max(0, Math.trunc(value));
    }
  }
  return sum;
}

// Type-only re-exports so consumers and tests share the same DTO references.
export type { AmpelProjectionDto, EigenschutzVorfallListItemDto, GefaehrdungsbeurteilungDto, SicherheitsregelDto, SicherungspostenDto };
