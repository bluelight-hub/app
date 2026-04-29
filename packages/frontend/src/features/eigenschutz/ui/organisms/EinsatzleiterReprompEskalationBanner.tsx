import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PiClockCountdown } from 'react-icons/pi';
import { useMyEinsatzRolle } from '@/features/befehl/api/use-my-einsatz-rolle';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { SeverityBanner } from './SeverityBanner';
import type { QuittungUeberfaelligEventNotice } from '../../api/use-eigenschutz-quittung-ueberfaellig-live';

const MAX_VISIBLE = 5;

export interface EinsatzleiterReprompEskalationBannerProps {
  readonly einsatzId: string;
  readonly notices: readonly QuittungUeberfaelligEventNotice[];
  readonly onDismiss: (propagationGroupId: string, einheitId: string) => void;
}

/**
 * `EinsatzleiterReprompEskalationBanner` (Story 3.7 AC8).
 *
 * Polite-Mikro-Banner-Stack für überfällige PSA-Quittungen — sichtbar nur
 * für `BEFEHLSGEBER` (Einsatzleiter-Rolle, gegated über `useMyEinsatzRolle`).
 *
 * **A11y:** Section ist `role="region"` mit `aria-label` — die einzelnen
 * `SeverityBanner`-Atome tragen ihr eigenes `aria-live="polite"` + `role="status"`,
 * verschachtelte Live-Regions würden Doppel-Announcements erzeugen.
 *
 * **Soft-Cap:** maximal 5 sichtbare Einträge, Overflow als Sammel-Banner
 * („+ N weitere überfällige Quittungen").
 *
 * **Defense-in-Depth:** Das WS-Event geht an alle Room-Mitglieder; das
 * Rendering-Gating filtert auf BEFEHLSGEBER. Empfänger-Konsument ist
 * `PsaProfilEmpfangBanner` (AC7) — getrennter Pfad.
 */
export function EinsatzleiterReprompEskalationBanner({ einsatzId, notices, onDismiss }: EinsatzleiterReprompEskalationBannerProps) {
  const { data: rolle } = useMyEinsatzRolle(einsatzId);
  const navigate = useNavigate();
  // AC8 — Klartext-einheitName aus dem `useEinsatzEinheiten`-Cache lookuppen;
  // bei Cache-Miss fällt `formatEinheitLabel` auf einen redact-id-ähnlichen
  // Hash zurück.
  const { data: einheiten } = useEinsatzEinheiten(einsatzId);
  const einheitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of einheiten ?? []) map.set(e.id, e.name);
    return map;
  }, [einheiten]);

  const visible = useMemo(() => notices.slice(0, MAX_VISIBLE), [notices]);
  const overflow = Math.max(0, notices.length - MAX_VISIBLE);

  if (rolle?.rolle !== 'BEFEHLSGEBER') return null;
  if (visible.length === 0) return null;

  return (
    <section role="region" aria-label="Überfällige PSA-Quittungen" data-testid="einsatzleiter-reprompt-eskalation" className="flex flex-col gap-2">
      {visible.map((notice) => {
        const einheitLabel = formatEinheitLabel(notice.einheitId, einheitNameById.get(notice.einheitId));
        const occurredText = formatOccurred(notice.occurredAt);
        return (
          <SeverityBanner
            key={`${notice.propagationGroupId}:${notice.einheitId}`}
            variant="warning"
            tone="polite"
            headline={`Quittung für ${einheitLabel} überfällig`}
            body={`seit ${notice.ueberfaelligSeitMin} Minuten · Bekanntgabe vom ${occurredText}`}
            primaryActionLabel="Im Dashboard öffnen"
            onPrimary={() => {
              void navigate({
                to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile',
                params: { einsatzId },
                hash: `luecke-${notice.propagationGroupId}`,
              });
            }}
            secondaryActionLabel="Schließen"
            onSecondary={() => onDismiss(notice.propagationGroupId, notice.einheitId)}
            footer={
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <PiClockCountdown aria-hidden className="size-4" />
                <span>Re-Prompt</span>
              </span>
            }
            data-testid={`einsatzleiter-reprompt-eskalation-banner-${notice.propagationGroupId}`}
          />
        );
      })}
      {overflow > 0 ? (
        <SeverityBanner
          variant="warning"
          tone="polite"
          headline={`+ ${overflow} ${overflow === 1 ? 'weitere überfällige Quittung' : 'weitere überfällige Quittungen'}`}
          data-testid="einsatzleiter-reprompt-eskalation-overflow"
        />
      ) : null}
    </section>
  );
}

function formatEinheitLabel(einheitId: string, einheitName: string | undefined): string {
  // AC8 Anatomie: Klartext aus `useEinsatzEinheiten`-Cache, Fallback auf
  // einen redact-id-ähnlichen Hash. Frontend hat (Stand 04/2026) keinen
  // dezidierten `redactId`-Helper — die Truncation `prefix…suffix` produziert
  // eine kompakte, PII-sichere Darstellung; eine reine 6-Zeichen-Tail-
  // Heuristik weicht von der Spec ab und ist nicht eindeutig genug.
  if (einheitName && einheitName.trim().length > 0) {
    return einheitName;
  }
  return `Abschnitt ${redactEinheitId(einheitId)}`;
}

function redactEinheitId(einheitId: string): string {
  if (einheitId.length <= 8) return einheitId;
  return `${einheitId.slice(0, 4)}…${einheitId.slice(-4)}`;
}

function formatOccurred(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return iso;
  }
}
