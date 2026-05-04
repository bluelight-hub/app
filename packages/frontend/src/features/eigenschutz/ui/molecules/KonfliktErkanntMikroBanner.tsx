import { useEffect, useMemo } from 'react';
import { PiArrowsClockwise } from 'react-icons/pi';
import { useMyEinsatzRolle } from '@/features/befehl/api/use-my-einsatz-rolle';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { SeverityBanner } from '../organisms/SeverityBanner';
import type { KonfliktNotice } from '../../api/use-eigenschutz-konflikt-erkannt-live';

const AUTO_DISMISS_MS = 30_000;
const MAX_VISIBLE = 5;

export interface KonfliktErkanntMikroBannerProps {
  readonly einsatzId: string;
  readonly notices: readonly KonfliktNotice[];
  readonly onDismiss: (eventId: string) => void;
  /**
   * Story 3.10-Stub: Klick-Handler für „Konflikte ansehen". In Story 3.9
   * standardmäßig No-Op (Stub mit `data-testid="konflikt-banner-open"`).
   */
  readonly onOpenConflict?: (notice: KonfliktNotice) => void;
}

/**
 * `KonfliktErkanntMikroBanner` (Story 3.9 AC8).
 *
 * `warning`-Mikro-Banner-Stack für erkannte Sync-Konflikte — sichtbar nur für
 * `BEFEHLSGEBER` (Pattern Story 3.7), die eigenschutz-write-Rechte haben.
 * `polite` (UX-DR21 Zero-Toast): nicht-blockierend, Auto-Dismiss nach 30 s.
 *
 * **Architektur §I + Epic-AC**: explizit `variant="warning"`, NICHT
 * `assertive` — Konflikte sind aufmerksamkeitsrelevant, aber nicht
 * lebensbedrohlich.
 *
 * **Soft-Cap:** maximal 5 sichtbare Einträge; Overflow als Sammel-Banner.
 *
 * **Story 3.10-Vorbereitung:** der „Konflikte ansehen"-Button trägt
 * `data-testid="konflikt-banner-open"` und einen optionalen
 * `onOpenConflict`-Callback, den Story 3.10 mit Navigation zur
 * `SyncConflictsPage` verdrahtet. In 3.9 bleibt der Button klickbar, aber
 * ohne Navigation (kein Throw, kein Disable).
 */
export function KonfliktErkanntMikroBanner({ einsatzId, notices, onDismiss, onOpenConflict }: KonfliktErkanntMikroBannerProps) {
  const { data: rolle } = useMyEinsatzRolle(einsatzId);
  const { data: einheiten } = useEinsatzEinheiten(einsatzId);
  const einheitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of einheiten ?? []) map.set(e.id, e.name);
    return map;
  }, [einheiten]);

  const visible = useMemo(() => notices.slice(0, MAX_VISIBLE), [notices]);
  const overflow = Math.max(0, notices.length - MAX_VISIBLE);

  // Auto-Dismiss-Timer pro Notice. Aufräumen beim Unmount + bei Notice-Wechsel.
  // Code-Review P7: Iteriere ALLE notices (nicht nur visible), damit auch
  // Overflow-Notices (Index 5..49) den 30-s-Timer bekommen — sonst hängen
  // sie im Parent-State, bis sie durch FIFO-Cap verdrängt werden.
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const notice of notices) {
      const remaining = Math.max(0, AUTO_DISMISS_MS - (Date.now() - notice.receivedAt));
      const timer = setTimeout(() => onDismiss(notice.eventId), remaining);
      timers.push(timer);
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [notices, onDismiss]);

  if (rolle?.rolle !== 'BEFEHLSGEBER') return null;
  if (visible.length === 0) return null;

  return (
    <section role="region" aria-label="Erkannte Sync-Konflikte" data-testid="konflikt-erkannt-banner-stack" className="flex flex-col gap-2">
      {visible.map((notice) => {
        const einheitLabel = notice.einheitId ? formatEinheitLabel(notice.einheitId, einheitNameById.get(notice.einheitId)) : 'Einsatz';
        return (
          <SeverityBanner
            key={notice.eventId}
            variant="warning"
            tone="polite"
            headline={`Sync-Konflikt auf Abschnitt ${einheitLabel} – jetzt auflösen`}
            body={`Server-Version ${notice.serverVersion}, lokal erwartet ${notice.localExpectedVersion}.`}
            primaryActionLabel="Konflikte ansehen"
            onPrimary={() => onOpenConflict?.(notice)}
            primaryActionTestId="konflikt-banner-open"
            secondaryActionLabel="Schließen"
            onSecondary={() => onDismiss(notice.eventId)}
            footer={
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <PiArrowsClockwise aria-hidden className="size-4" />
                <span>Sync-Konflikt</span>
              </span>
            }
            data-testid="konflikt-erkannt-banner"
          />
        );
      })}
      {overflow > 0 ? (
        <SeverityBanner variant="warning" tone="polite" headline={`+ ${overflow} ${overflow === 1 ? 'weiterer Konflikt' : 'weitere Konflikte'}`} data-testid="konflikt-erkannt-overflow" />
      ) : null}
    </section>
  );
}

function formatEinheitLabel(einheitId: string, einheitName: string | undefined): string {
  if (einheitName && einheitName.trim().length > 0) {
    return einheitName;
  }
  return `${redactEinheitId(einheitId)}`;
}

function redactEinheitId(einheitId: string): string {
  if (einheitId.length <= 8) return einheitId;
  return `${einheitId.slice(0, 4)}…${einheitId.slice(-4)}`;
}
