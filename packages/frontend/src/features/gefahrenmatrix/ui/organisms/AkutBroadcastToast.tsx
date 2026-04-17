/**
 * AkutBroadcastToast (Issue #627, G4)
 *
 * Rendert die dreistufige AKUT-Eskalation aus `akutBroadcastStore`:
 * - Stage 1 (0–10s): Kurz-Toast (auto-dismiss nach 10s)
 * - Stage 2 (10–30s): Persistenter Toast (bleibt bis Interaktion)
 * - Stage 3 (>=30s): Header-Banner (oben über allem, nur manuelles Dismiss)
 *
 * Click auf Toast/Banner navigiert auf die Split-View mit Fokus auf die
 * betreffende Matrix-Zelle. `aria-live="assertive"` damit Screen-Reader
 * den Alarm ansagen. Animationen respektieren `prefers-reduced-motion`
 * via CSS (`@media`) — der Component selbst unterscheidet nicht.
 */

import { useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import { useNavigate } from '@tanstack/react-router';
import { PiSpeakerHigh, PiSpeakerSlash, PiWarningOctagon, PiX } from 'react-icons/pi';
import { akutBroadcastActions, akutBroadcastStore, type AkutAlert } from '../../stores/akut-broadcast.store';
import { GEFAHRENTYP_LABELS, SCHUTZOBJEKT_LABELS } from '../../schemas/gefahrenmatrix.schema';
import { cn } from '@/shared/ui/cn';

const STAGE_TO_PERSISTENT_MS = 10_000;
const STAGE_TO_BANNER_MS = 30_000;

export function AkutBroadcastToast() {
  const alerts = useStore(akutBroadcastStore, (s) => s.activeAlerts);
  const soundEnabled = useStore(akutBroadcastStore, (s) => s.soundEnabled);
  const navigate = useNavigate();

  useEffect(() => {
    if (alerts.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const alert of alerts) {
      const elapsed = Date.now() - alert.receivedAt;
      if (alert.stage === 'toast') {
        const remaining = STAGE_TO_PERSISTENT_MS - elapsed;
        timers.push(setTimeout(() => akutBroadcastActions.escalateAlert(alert.id), Math.max(0, remaining)));
      } else if (alert.stage === 'persistent') {
        const remaining = STAGE_TO_BANNER_MS - elapsed;
        timers.push(setTimeout(() => akutBroadcastActions.escalateAlert(alert.id), Math.max(0, remaining)));
      }
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [alerts]);

  if (alerts.length === 0) return null;

  const bannerAlerts = alerts.filter((a) => a.stage === 'banner');
  const toastAlerts = alerts.filter((a) => a.stage !== 'banner');

  const handleClick = (alert: AkutAlert) => {
    navigate({
      to: '/app/einsatz/$einsatzId/übersicht/karte',
      params: { einsatzId: alert.einsatzId },
      search: { mode: 'standard', split: true, focus: `cell:${alert.gefahrentyp}:${alert.schutzobjekt}` } as never,
    });
    akutBroadcastActions.dismissAlert(alert.id);
  };

  return (
    <>
      {bannerAlerts.length > 0 ? (
        <div
          role="alert"
          aria-live="assertive"
          className="akut-banner fixed inset-x-0 top-0 z-50 border-b-2 border-warnstufe-akut-stroke bg-warnstufe-akut-fill text-text-inverse shadow-lg"
          data-akut-stage="banner"
        >
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-2">
            <div className="flex items-center gap-2">
              <PiWarningOctagon className="size-5" aria-hidden />
              <span className="text-sm font-semibold">
                AKUT-Broadcast aktiv — {bannerAlerts.length} Meldung{bannerAlerts.length === 1 ? '' : 'en'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => akutBroadcastActions.toggleSound()}
                className="inline-flex size-7 items-center justify-center rounded-control hover:bg-white/10 focus:shadow-focus focus:outline-none"
                aria-label={soundEnabled ? 'AKUT-Sound ausschalten' : 'AKUT-Sound einschalten'}
                aria-pressed={soundEnabled}
              >
                {soundEnabled ? <PiSpeakerHigh className="size-4" aria-hidden /> : <PiSpeakerSlash className="size-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => handleClick(bannerAlerts[0])}
                className="rounded-control bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20 focus:shadow-focus focus:outline-none"
              >
                Zur Meldung
              </button>
              <button
                type="button"
                onClick={() => bannerAlerts.forEach((a) => akutBroadcastActions.dismissAlert(a.id))}
                className="inline-flex size-7 items-center justify-center rounded-control hover:bg-white/10 focus:shadow-focus focus:outline-none"
                aria-label="AKUT-Banner schließen"
              >
                <PiX className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastAlerts.length > 0 ? (
        <div role="alert" aria-live="assertive" className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2" data-akut-stage="toast-stack">
          {toastAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => handleClick(alert)}
              className={cn(
                'akut-toast pointer-events-auto flex w-[360px] items-start gap-3 rounded-panel border-l-4 border-warnstufe-akut-stroke bg-warnstufe-akut-fill p-3 text-left text-text-inverse shadow-panel focus:shadow-focus focus:outline-none',
                alert.stage === 'persistent' && 'ring-2 ring-warnstufe-akut-glow',
              )}
              data-akut-stage={alert.stage}
              data-akut-alert-id={alert.id}
            >
              <PiWarningOctagon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-semibold">AKUT: {GEFAHRENTYP_LABELS[alert.gefahrentyp]}</p>
                <p className="text-xs opacity-90">
                  {SCHUTZOBJEKT_LABELS[alert.schutzobjekt]} · gemeldet von {alert.aktualisiertVon}
                </p>
              </div>
              <span
                className="inline-flex size-6 items-center justify-center rounded-full bg-black/20 hover:bg-black/30"
                role="button"
                tabIndex={0}
                aria-label="AKUT-Toast schließen"
                onClick={(e) => {
                  e.stopPropagation();
                  akutBroadcastActions.dismissAlert(alert.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    akutBroadcastActions.dismissAlert(alert.id);
                  }
                }}
              >
                <PiX className="size-3.5" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
