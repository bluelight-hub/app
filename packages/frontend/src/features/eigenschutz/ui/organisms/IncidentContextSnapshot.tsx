/**
 * IncidentContextSnapshot — Read-Only-Anzeige des zeitpunkt-genauen
 * Kontext-Snapshots eines Eigenschutz-Vorfalls (Story 5.2 AC12).
 *
 * Drei Kontextblöcke (Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln)
 * mit klar abgegrenzter `surface-raised`-Optik und Mikro-Footer
 * „historischer Stand, nicht aktuell". Sprache im **Präteritum** signalisiert
 * juristisch belastbar den historischen Kontext.
 *
 * **Defensive:** Bei Zod-`safeParse`-Failure ODER `{}`-5.1-Bestand rendert die
 * Komponente einen EmptyState mit `data-testid="incident-snapshot-unavailable"`,
 * damit fehlerhafte/legacy Snapshots die Detail-Page nicht crashen.
 *
 * **Klickpfad „Im Kontext zeigen"** (Epic-AC4): nur Gefährdungsbeurteilung
 * verlinkt aktuell auf die Versions-Historie (Story 2.4). PSA und
 * Sicherheitsregeln sind Phase-2 (siehe Story 5.2 Q-Liste #5).
 */

import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { EigenschutzKontextSnapshotV1, type EigenschutzKontextSnapshotV1Type } from '@bluelight-hub/shared';

export interface IncidentContextSnapshotProps {
  readonly einsatzId: string;
  readonly rawSnapshot: unknown;
}

function formatHeader(snapshotAt: string): string {
  const date = new Date(snapshotAt);
  if (Number.isNaN(date.getTime())) return snapshotAt;
  // AC12-Format: „HH:MM DD.MM.YYYY" (Spec-Literal, ohne „Uhr,").
  return format(date, 'HH:mm dd.MM.yyyy', { locale: de });
}

function isLegacyEmptySnapshot(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && Object.keys(raw as Record<string, unknown>).length === 0;
}

function UnavailableState({ variant }: { variant: 'legacy' | 'corrupt' }) {
  // Code-Review-Patch (P7): Differenzierung zwischen Legacy `{}` (5.1-Bestand,
  // erwartet) und korruptem Snapshot (Datenfehler, unerwartet). Beide nutzen
  // dasselbe `data-testid`, der UI-Text macht den Unterschied transparent.
  const message =
    variant === 'legacy' ? 'Kontext-Snapshot vor Story 5.2 erfasst — nicht verfügbar.' : 'Kontext-Snapshot konnte nicht gelesen werden — Datenfehler. Bitte an die Sicherheitsbeauftragten melden.';
  return (
    <section
      data-testid="incident-snapshot-unavailable"
      data-variant={variant}
      className="rounded-panel border border-border-subtle bg-surface-panel p-4"
      aria-label="Kontext-Snapshot nicht verfügbar"
    >
      <h2 className="text-sm font-semibold text-text-primary">Kontext-Snapshot</h2>
      <p className="mt-1 text-sm text-text-muted">{message}</p>
    </section>
  );
}

export function IncidentContextSnapshot({ einsatzId, rawSnapshot }: IncidentContextSnapshotProps) {
  const parsed = EigenschutzKontextSnapshotV1.safeParse(rawSnapshot);
  if (!parsed.success) {
    return <UnavailableState variant={isLegacyEmptySnapshot(rawSnapshot) ? 'legacy' : 'corrupt'} />;
  }
  return <RenderedSnapshot einsatzId={einsatzId} snapshot={parsed.data} />;
}

function RenderedSnapshot({ einsatzId, snapshot }: { einsatzId: string; snapshot: EigenschutzKontextSnapshotV1Type }) {
  const headerLabel = formatHeader(snapshot.snapshotAt);
  return (
    <section
      data-testid="incident-context-snapshot"
      aria-readonly="true"
      aria-label={`Kontext-Snapshot zum Vorfall-Zeitpunkt ${headerLabel}`}
      className="space-y-3 rounded-panel border border-border-strong bg-surface-raised p-4"
    >
      <header>
        <h2 data-testid="incident-snapshot-header" className="text-sm font-semibold text-text-primary">
          Stand zum Vorfall-Zeitpunkt: {headerLabel}
        </h2>
      </header>

      <GefaehrdungsbeurteilungBlock snapshot={snapshot} einsatzId={einsatzId} />
      <PsaBlock snapshot={snapshot} />
      <SicherheitsregelnBlock snapshot={snapshot} />

      <footer className="pt-1">
        <p className="text-xs text-text-muted italic">historischer Stand, nicht aktuell</p>
      </footer>
    </section>
  );
}

function GefaehrdungsbeurteilungBlock({ snapshot, einsatzId }: { snapshot: EigenschutzKontextSnapshotV1Type; einsatzId: string }) {
  const gb = snapshot.gefaehrdungsbeurteilung;
  return (
    <article data-testid="incident-snapshot-gefaehrdungsbeurteilung" className="rounded-control border border-border-subtle bg-surface-panel p-3">
      <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Gefährdungsbeurteilung galt</h3>
      {gb ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-text-primary">
            Version {gb.version} · gültig ab {format(new Date(gb.gueltigVon), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-primary">
            {gb.items.map((item, idx) => (
              <li key={item.id ?? `item-${idx}`}>
                {item.title}
                {item.risikoklasse ? <span className="ml-2 text-xs tracking-wider text-text-muted uppercase">{item.risikoklasse}</span> : null}
              </li>
            ))}
          </ul>
          <Link
            to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen"
            params={{ einsatzId }}
            data-testid="incident-snapshot-gefaehrdungsbeurteilung-link"
            className="inline-flex items-center gap-1 text-xs font-medium text-action-primary underline"
          >
            Im Kontext zeigen
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Keine Gefährdungsbeurteilung galt zum Vorfall-Zeitpunkt.</p>
      )}
    </article>
  );
}

function PsaBlock({ snapshot }: { snapshot: EigenschutzKontextSnapshotV1Type }) {
  return (
    <article data-testid="incident-snapshot-psa-profile" className="rounded-control border border-border-subtle bg-surface-panel p-3">
      <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">PSA-Profile waren aktiv</h3>
      {snapshot.aktivePsaProfile.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Keine PSA-Profile galten zum Zeitpunkt.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-text-primary">
          {snapshot.aktivePsaProfile.map((profil) => (
            <li key={profil.id}>
              <span className="font-medium">PSA war: {profil.profil}</span>
              <span className="text-text-muted"> · seit {format(new Date(profil.gueltigVon), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SicherheitsregelnBlock({ snapshot }: { snapshot: EigenschutzKontextSnapshotV1Type }) {
  return (
    <article data-testid="incident-snapshot-sicherheitsregeln" className="rounded-control border border-border-subtle bg-surface-panel p-3">
      <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Sicherheitsregeln galten</h3>
      {snapshot.sicherheitsregeln.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Keine Sicherheitsregeln galten zum Zeitpunkt.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-text-primary">
          {snapshot.sicherheitsregeln.map((regel) => (
            <li key={`${regel.regelId}::${regel.versionId}`}>
              <p className="font-medium">Sicherheitsregel galt: {regel.titel}</p>
              <p className="text-xs text-text-muted">
                Version {regel.version} · {regel.einsatzweit ? 'einsatzweit' : 'einheitsspezifisch'}
              </p>
              <p className="mt-1 whitespace-pre-line text-text-primary">{regel.inhalt}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
