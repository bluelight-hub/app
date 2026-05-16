/**
 * SicherungspostenDetailPage — Detail-Ansicht eines Sicherungspostens
 * (Story 4.4 Task 3, AC4).
 *
 * Lädt den Posten via {@link useGetSicherungsposten} und rendert
 * abhängig vom Query-State Skeleton, Fehler-Banner, 404-Banner oder die
 * Read-Only-Sektionen plus Footer-Aktions-Bar. Bearbeiten und Auflösen
 * delegieren an die bestehenden Organisms `SicherungspostenDrawer` und
 * `AufloeseSicherungspostenDialog` — keine zweite Editor-Implementierung.
 *
 * **Zero-Toast** (UX-DR21): alle Fehlerpfade rendern inline; kein Sonner.
 *
 * **Permission-Hinweis:** Der Eigenschutz-Feature-Slice verfügt aktuell
 * über keinen feingranularen Permission-Hook auf Action-Ebene. Die
 * existierende `SicherungspostenList` rendert „Bearbeiten"/„Auflösen"
 * unbedingt — die DetailPage folgt diesem Pattern und gated nur auf
 * `aufgeloestAm == null`.
 */

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { setPendingSicherungspostenPlacement } from '@/features/lagekarte/stores/draw.store';
import type { SicherungspostenDto, SicherungspostenDtoPersonalInner, SicherungspostenDtoStandort } from '@bluelight-hub/shared/client';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { CopyButton } from '@/shared/ui/molecules/copy-button.molecule';
import { buildEigenschutzBrowserUrl } from '@/features/eigenschutz/utils/build-eigenschutz-deep-link';
import { useGetSicherungsposten } from '../../api/use-sicherungsposten';
import { AufloeseSicherungspostenDialog } from '../organisms/AufloeseSicherungspostenDialog';
import { SicherungspostenDrawer } from '../organisms/SicherungspostenDrawer';

// consistency-allow: destructive-pattern - Auflösen-Button öffnet den Pattern-konformen AufloeseSicherungspostenDialog; Retry-Button ist nur Fehler-Recovery.
export interface SicherungspostenDetailPageProps {
  readonly einsatzId: string;
  readonly id: string;
}

/**
 * Skeleton für den Loading-State. Pattern-Anlehnung an
 * `GefaehrdungenDetailPage` — Header-Strip + drei Block-Skeletons für die
 * vier Read-Only-Sektionen.
 */
function SicherungspostenDetailSkeleton() {
  return (
    <div className="space-y-4" data-testid="sicherungsposten-detail-loading">
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

/**
 * Erkennt 404 anhand des Web-Response-Status, den `ResponseError` aus dem
 * generierten Client trägt (`error.response.status`).
 */
function is404(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

function is403(error: unknown): boolean {
  const candidate = error as { status?: number; response?: { status?: number }; cause?: { status?: number } } | null;
  return (candidate?.status ?? candidate?.response?.status ?? candidate?.cause?.status) === 403;
}

function formatStandort(standort: SicherungspostenDtoStandort | undefined | null): { label: string; coordinates?: string } {
  if (!standort || typeof standort !== 'object') return { label: '—' };
  const kind = (standort as { kind?: unknown }).kind;
  if (kind === 'coordinate') {
    const lon = (standort as { longitude?: number }).longitude;
    const lat = (standort as { latitude?: number }).latitude;
    if (typeof lon === 'number' && typeof lat === 'number') {
      const hint = (standort as { addressHint?: unknown }).addressHint;
      return {
        label: 'Koordinaten (WGS84)',
        coordinates: `${lat.toFixed(5)}, ${lon.toFixed(5)}${typeof hint === 'string' && hint.length > 0 ? ` — ${hint}` : ''}`,
      };
    }
  }
  if (kind === 'address') {
    const text = (standort as { text?: string }).text;
    return { label: 'Adresse / Beschreibung', coordinates: typeof text === 'string' && text.length > 0 ? text : '—' };
  }
  return { label: '—' };
}

/**
 * Stabiler 6-stelliger Hex-Hash der UserId für die Mikro-Footer-Anzeige.
 * FNV-1a 32-bit ist nicht-kryptographisch, aber für Anzeige-Zwecke
 * ausreichend: deterministisch (gleicher User → gleiche 6 Zeichen),
 * gleichmäßig verteilt (~16M Buckets), und vermeidet das Leaken der
 * Klar-CUID-Anfangs-Zeichen, die für eine ganze Generation identisch sind.
 */
function hashUserIdShort(userId: string | null | undefined): string {
  if (!userId) return '——';
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function describePersonal(entry: SicherungspostenDtoPersonalInner): string {
  if (!entry || typeof entry !== 'object') return '—';
  const kind = (entry as { kind?: unknown }).kind;
  if (kind === 'user') {
    const userId = (entry as { userId?: string }).userId;
    return typeof userId === 'string' && userId.length > 0 ? `User: ${userId}` : 'User: —';
  }
  if (kind === 'freitext') {
    const name = (entry as { name?: string }).name ?? '';
    const rolle = (entry as { rolle?: string }).rolle;
    return typeof rolle === 'string' && rolle.length > 0 ? `${name} (${rolle})` : name || '—';
  }
  return '—';
}

export function SicherungspostenDetailPage({ einsatzId, id }: SicherungspostenDetailPageProps) {
  const query = useGetSicherungsposten(einsatzId, id);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aufloesenOpen, setAufloesenOpen] = useState(false);

  if (query.isPending) {
    return <SicherungspostenDetailSkeleton />;
  }

  if (query.isError && is404(query.error)) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-panel border border-status-warning-border bg-status-warning-surface px-4 py-3 text-sm text-status-warning-text"
        data-testid="sicherungsposten-detail-not-found"
      >
        <p className="font-medium">Sicherungsposten existiert nicht oder gehört zu einem anderen Einsatz.</p>
        <Link
          to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten"
          params={{ einsatzId }}
          className="text-sm font-medium text-action-primary underline-offset-2 hover:underline"
          data-testid="sicherungsposten-detail-not-found-back"
        >
          Zur Sicherungsposten-Liste
        </Link>
      </div>
    );
  }

  if (query.isError && is403(query.error)) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-panel border border-status-warning-border bg-status-warning-surface px-4 py-3 text-sm text-status-warning-text"
        data-testid="sicherungsposten-detail-forbidden"
      >
        <p className="font-medium">Diese Entität gehört zu einem anderen Einsatz oder ist für dich nicht freigegeben.</p>
        <Link
          to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten"
          params={{ einsatzId }}
          className="text-sm font-medium text-action-primary underline-offset-2 hover:underline"
          data-testid="sicherungsposten-detail-forbidden-back"
        >
          Zur Sicherungsposten-Liste
        </Link>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-panel border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"
        data-testid="sicherungsposten-detail-error"
      >
        <p className="font-medium">Sicherungsposten konnte nicht geladen werden.</p>
        <p className="text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, ist der Bereich möglicherweise nicht freigegeben.</p>
        <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void query.refetch()} data-testid="sicherungsposten-detail-retry">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const posten = query.data;
  const istAufgeloest = posten.aufgeloestAm != null;
  const standort = formatStandort(posten.standort);
  const detailUrl = buildEigenschutzBrowserUrl({ type: 'sicherungsposten', einsatzId, id: posten.id });
  const isCoordinate = (posten.standort as { kind?: unknown } | null | undefined)?.kind === 'coordinate';
  const personal = Array.isArray(posten.personal) ? posten.personal : [];
  const zustaendigkeitsbereich = (posten.zustaendigkeitsbereich as string | null | undefined) ?? null;
  const abloesezeiten = (posten.abloesezeiten as string | null | undefined) ?? null;

  const aktualisiertAmFormatted = (() => {
    try {
      return format(new Date(posten.aktualisiertAm), 'HH:mm dd.MM.yyyy', { locale: de });
    } catch {
      return posten.aktualisiertAm;
    }
  })();
  const aktualisiertVonShort = hashUserIdShort(posten.aktualisiertVonUserId);

  const handleShowOnMap = () => {
    if (!isCoordinate) return;
    void navigate({
      to: '/app/einsatz/$einsatzId/übersicht/karte',
      params: { einsatzId },
      search: (prev: Record<string, unknown>) => ({ ...prev, focus: `sicherungsposten:${posten.id}` }),
    });
  };

  const handlePlatzieren = () => {
    setPendingSicherungspostenPlacement(posten.id, posten.version, posten.bezeichnung);
    void navigate({
      to: '/app/einsatz/$einsatzId/übersicht/karte',
      params: { einsatzId },
    });
  };

  return (
    <div className="space-y-4 md:space-y-6" data-testid="sicherungsposten-detail-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Heading as="h1" size="2xl">
              {posten.bezeichnung}
            </Heading>
            <span
              className="inline-flex items-center rounded-control bg-action-secondary px-2 py-1 text-xs font-medium text-text-secondary"
              title="Optimistic-Concurrency-Token — wird beim Speichern mitgeschickt."
              data-testid="sicherungsposten-detail-version-badge"
            >
              v{posten.version}
            </span>
            {istAufgeloest ? (
              <span
                className="inline-flex items-center rounded-control border border-status-warning-border bg-status-warning-surface px-2 py-1 text-xs font-medium text-status-warning-text"
                data-testid="sicherungsposten-detail-aufgeloest-badge"
              >
                Aufgelöst
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-text-muted" data-testid="sicherungsposten-detail-meta">
            Zuletzt aktualisiert: {aktualisiertAmFormatted} (von {aktualisiertVonShort})
          </p>
        </div>
        <CopyButton text={detailUrl} idleLabel="Link kopieren" copiedLabel="Link kopiert" errorLabel="Link konnte nicht kopiert werden" size="sm" statusTestId="sicherungsposten-detail-copy-status" />
      </header>

      <section
        aria-labelledby="sicherungsposten-detail-standort-heading"
        className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4"
        data-testid="sicherungsposten-detail-section-standort"
      >
        <Heading as="h2" size="sm" id="sicherungsposten-detail-standort-heading">
          Standort
        </Heading>
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Typ:</span> {standort.label}
        </p>
        {standort.coordinates ? <p className="text-sm text-text-secondary">{standort.coordinates}</p> : null}
      </section>

      <section
        aria-labelledby="sicherungsposten-detail-personal-heading"
        className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4"
        data-testid="sicherungsposten-detail-section-personal"
      >
        <Heading as="h2" size="sm" id="sicherungsposten-detail-personal-heading">
          Personal
        </Heading>
        {personal.length === 0 ? (
          <p className="text-sm text-text-muted">Kein Personal hinterlegt.</p>
        ) : (
          <ul className="space-y-1 text-sm text-text-secondary">
            {personal.map((entry, idx) => (
              <li key={`personal-${idx}`} data-testid={`sicherungsposten-detail-personal-${idx}`}>
                {describePersonal(entry)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="sicherungsposten-detail-zustaendigkeit-heading"
        className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4"
        data-testid="sicherungsposten-detail-section-zustaendigkeit"
      >
        <Heading as="h2" size="sm" id="sicherungsposten-detail-zustaendigkeit-heading">
          Zuständigkeitsbereich
        </Heading>
        {zustaendigkeitsbereich && zustaendigkeitsbereich.length > 0 ? (
          <p className="text-sm whitespace-pre-wrap text-text-secondary">{zustaendigkeitsbereich}</p>
        ) : (
          <p className="text-sm text-text-muted">Kein Zuständigkeitsbereich hinterlegt.</p>
        )}
      </section>

      <section
        aria-labelledby="sicherungsposten-detail-abloesezeiten-heading"
        className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4"
        data-testid="sicherungsposten-detail-section-abloesezeiten"
      >
        <Heading as="h2" size="sm" id="sicherungsposten-detail-abloesezeiten-heading">
          Ablösezeiten
        </Heading>
        {abloesezeiten && abloesezeiten.length > 0 ? (
          <p className="text-sm whitespace-pre-wrap text-text-secondary">{abloesezeiten}</p>
        ) : (
          <p className="text-sm text-text-muted">Keine Ablösezeiten hinterlegt.</p>
        )}
      </section>

      <footer className="flex flex-wrap items-center gap-2" data-testid="sicherungsposten-detail-actions">
        {!istAufgeloest ? (
          <>
            <Button intent="primary" type="button" onClick={() => setDrawerOpen(true)} data-testid="sicherungsposten-detail-edit">
              Bearbeiten
            </Button>
            <Button intent="danger" appearance="outline" type="button" onClick={() => setAufloesenOpen(true)} data-testid="sicherungsposten-detail-aufloesen">
              Auflösen
            </Button>
            {isCoordinate ? (
              <Button intent="secondary" appearance="ghost" type="button" title="Auf Karte zeigen" onClick={handleShowOnMap} data-testid="sicherungsposten-detail-show-on-map">
                Auf Karte zeigen
              </Button>
            ) : (
              <Button
                intent="secondary"
                appearance="ghost"
                type="button"
                title="Auf Karte platzieren — anschließend per Klick auf die Karte die Position setzen"
                onClick={handlePlatzieren}
                data-testid="sicherungsposten-detail-place-on-map"
              >
                Auf Karte platzieren
              </Button>
            )}
          </>
        ) : null}
      </footer>

      <SicherungspostenDrawer einsatzId={einsatzId} mode="edit" open={drawerOpen} onClose={() => setDrawerOpen(false)} posten={posten} />

      <AufloeseSicherungspostenDialog einsatzId={einsatzId} posten={aufloesenOpen ? posten : null} onClose={() => setAufloesenOpen(false)} />
    </div>
  );
}
