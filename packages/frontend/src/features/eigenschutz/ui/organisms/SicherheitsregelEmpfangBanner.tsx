import { useCallback, useMemo, useState } from 'react';
import { useAckSicherheitsregel } from '../../api/queries';
import { useSicherheitsregelLiveBanner } from '../../api/use-sicherheitsregel-live-banner';
import { useAktiveEinsatzEinheit } from '../../hooks/use-aktive-einsatz-einheit';
import { SeverityBanner } from './SeverityBanner';

const MAX_VISIBLE = 3;

export interface SicherheitsregelEmpfangBannerProps {
  einsatzId: string;
  /**
   * Wird beim Klick auf „Details ansehen" gerufen — die Page-Komponente
   * scrollt z. B. zu der Regel-Zeile in der Liste.
   */
  onShowDetails?: (regelId: string) => void;
}

/**
 * Empfangs-Banner-Stack für Sicherheitsregeln (Story 2.7 AC1/AC11/AC12/AC13/AC14).
 *
 * **Verhalten:**
 * - Hört auf Live-Events via `useSicherheitsregelLiveBanner`.
 * - Filtert auf die aktuelle Einheit (oder einsatzweit).
 * - Rendert maximal 3 Banner gleichzeitig; ab 4+ kommt ein „N weitere
 *   Sicherheitsregeln warten"-Sammel-Banner (UX-DR22 Alarm-Budget).
 * - Quittierung via `useAckSicherheitsregel` — optimistisches Verschwinden,
 *   Inline-Error bei Mutation-Fehler (Zero-Toast, UX-DR21).
 *
 * **Voraussetzung:** Die aktive Einheit muss gesetzt sein (über
 * `useAktiveEinsatzEinheit`). Ohne aktive Einheit rendert die Komponente
 * `null` — die Page-UI prompt-et dann zur Auswahl.
 *
 * **Per-Regel-Mutation-Tracking** (Story 2.7 Code-Review-Patch): Da
 * `useAckSicherheitsregel` ein einziger TanStack-Mutation-Hook ist und
 * gleichzeitige Aufrufe coalesced, halten wir den Pending-Status pro `regelId`
 * in lokalem State. So überleben `onError`-Branches gleichzeitiger Quittungen
 * auf zwei verschiedenen Bannern (Doppel-Tap-Schutz).
 */
export function SicherheitsregelEmpfangBanner({ einsatzId, onShowDetails }: SicherheitsregelEmpfangBannerProps) {
  const { einheitId } = useAktiveEinsatzEinheit(einsatzId);
  const { banner, dismiss } = useSicherheitsregelLiveBanner({ einsatzId, einheitId, enabled: einheitId !== null });
  const ackMutation = useAckSicherheitsregel(einsatzId);
  const [errorByRegelId, setErrorByRegelId] = useState<Record<string, string | undefined>>({});
  const [pendingRegelIds, setPendingRegelIds] = useState<Set<string>>(() => new Set());

  const visible = useMemo(() => banner.slice(0, MAX_VISIBLE), [banner]);
  const overflowCount = banner.length - visible.length;
  const newestRegelId = visible.length > 0 ? visible[visible.length - 1].regelId : null;

  const handleQuittieren = useCallback(
    (regelId: string) => {
      if (einheitId === null) return;
      // Doppel-Tap-Schutz: bereits laufende Mutation für diese Regel
      // ignorieren — sonst feuern wir die Mutation mehrfach und der
      // letzte `onError`/`onSuccess`-Callback überschreibt die früheren.
      if (pendingRegelIds.has(regelId)) return;
      setErrorByRegelId((prev) => ({ ...prev, [regelId]: undefined }));
      setPendingRegelIds((prev) => {
        const next = new Set(prev);
        next.add(regelId);
        return next;
      });
      ackMutation.mutate(
        { id: regelId, einheitId },
        {
          onSuccess: () => {
            setPendingRegelIds((prev) => {
              const next = new Set(prev);
              next.delete(regelId);
              return next;
            });
            dismiss(regelId);
          },
          onError: () => {
            setPendingRegelIds((prev) => {
              const next = new Set(prev);
              next.delete(regelId);
              return next;
            });
            setErrorByRegelId((prev) => ({ ...prev, [regelId]: 'Quittung fehlgeschlagen — erneut versuchen' }));
          },
        },
      );
    },
    [ackMutation, dismiss, einheitId, pendingRegelIds],
  );

  if (einheitId === null) return null;
  if (banner.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" data-testid="sicherheitsregel-empfang-stack">
      {visible.map((entry) => {
        const headline = entry.variant === 'info' ? `Neue Sicherheitsregel: ${entry.titel}` : `Geänderte Sicherheitsregel: ${entry.titel}`;
        // Story 2.7 AC12 — neueste Regel sticht durch dünne Akzent-Border hervor.
        const isNewest = entry.regelId === newestRegelId && visible.length > 1;
        return (
          <div key={entry.regelId} data-newest={isNewest ? 'true' : undefined} className={isNewest ? 'rounded-lg ring-1 ring-blue-500/60 dark:ring-blue-400/60' : undefined}>
            <SeverityBanner
              data-testid={`sicherheitsregel-banner-${entry.regelId}`}
              variant={entry.variant}
              tone="polite"
              headline={headline}
              body={entry.inhaltAnriss}
              footer={`${new Date(entry.occurredAt).toLocaleString('de-DE')} · ${entry.einsatzweit ? 'Einsatzweit' : 'Eigene Einheit'}`}
              primaryActionLabel="Quittieren"
              onPrimary={() => handleQuittieren(entry.regelId)}
              secondaryActionLabel="Details ansehen"
              onSecondary={onShowDetails === undefined ? undefined : () => onShowDetails(entry.regelId)}
              inlineError={errorByRegelId[entry.regelId]}
              onRetry={() => handleQuittieren(entry.regelId)}
              pending={pendingRegelIds.has(entry.regelId)}
            />
          </div>
        );
      })}
      {overflowCount > 0 && (
        <div role="status" aria-live="polite" data-testid="sicherheitsregel-overflow-banner" className="border-foreground/20 bg-muted/40 text-foreground/80 rounded-md border px-4 py-3 text-sm">
          {overflowCount === 1 ? `${overflowCount} weitere Sicherheitsregel wartet auf Quittierung.` : `${overflowCount} weitere Sicherheitsregeln warten auf Quittierung.`}
        </div>
      )}
    </div>
  );
}
