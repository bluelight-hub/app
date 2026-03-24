/**
 * Erinnerung Alarm Toast
 *
 * Persistenter Toast fuer ausgeloeste Erinnerungen.
 * Erscheint app-weit via Sonner toast.custom().
 *
 * Features:
 * - Roter Alarm-Style (wie FloatingPill)
 * - Live Elapsed-Time Anzeige
 * - Bestätigen + Snooze Actions
 * - Keyboard Support (Enter/Escape)
 */

import { cn } from '@/shared/ui/cn';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import { PiBellRingingFill, PiCheck, PiClock, PiClockCountdown } from 'react-icons/pi';
import { toast } from 'sonner';
import { useAcknowledgeErinnerung, useSnoozeErinnerung } from '../../api';
import type { SnoozeMinutes } from '../../stores';

interface ErinnerungAlarmToastProps {
  toastId: string | number;
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  ausgeloestAm: string;
}

/** Formatiert die vergangene Zeit seit Ausloesen */
function formatElapsedTime(ausgeloestAm: string): string {
  try {
    const date = new Date(ausgeloestAm);
    if (Number.isNaN(date.getTime())) {
      return 'gerade eben';
    }
    return formatDistanceToNow(date, { locale: de, addSuffix: false });
  } catch {
    return 'gerade eben';
  }
}

export function ErinnerungAlarmToast({ toastId, erinnerungId, einsatzId, titel, ausgeloestAm }: ErinnerungAlarmToastProps) {
  const [elapsedTime, setElapsedTime] = useState(() => formatElapsedTime(ausgeloestAm));
  const [isProcessing, setIsProcessing] = useState(false);

  const acknowledgeErinnerung = useAcknowledgeErinnerung();
  const snoozeErinnerung = useSnoozeErinnerung();

  // Live Update der Elapsed Time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(ausgeloestAm));
    }, 1000);
    return () => clearInterval(interval);
  }, [ausgeloestAm]);

  const handleAcknowledge = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await acknowledgeErinnerung.mutateAsync({ einsatzId, erinnerungId });
      toast.dismiss(toastId);
    } catch {
      setIsProcessing(false);
    }
  }, [acknowledgeErinnerung, einsatzId, erinnerungId, toastId, isProcessing]);

  const handleSnooze = useCallback(
    async (minutes: SnoozeMinutes) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await snoozeErinnerung.mutateAsync({ einsatzId, erinnerungId, minutes });
        toast.dismiss(toastId);
      } catch {
        setIsProcessing(false);
      }
    },
    [snoozeErinnerung, einsatzId, erinnerungId, toastId, isProcessing],
  );

  // Keyboard Support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAcknowledge();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSnooze(5);
      }
    },
    [handleAcknowledge, handleSnooze],
  );

  const truncatedTitel = titel.length > 35 ? `${titel.slice(0, 35)}...` : titel;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      className={cn(
        'min-w-[300px] max-w-[420px] rounded-xl border-2 border-status-danger-border bg-status-danger-text p-4 text-text-inverse shadow-2xl',
        'focus:outline-none focus-visible:shadow-focus-ring',
        isProcessing && 'pointer-events-none opacity-70',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PiBellRingingFill className="size-5 shrink-0 animate-bounce text-white" />
          <span className="font-semibold leading-tight">{truncatedTitel}</span>
        </div>
      </div>

      {/* Status */}
      <div className="mb-3 flex items-center gap-3 text-text-inverse/85 text-sm">
        <div className="flex items-center gap-1">
          <PiClock className="size-4" />
          <span>seit {elapsedTime}</span>
        </div>
        <span className="rounded bg-surface-inverse/18 px-2 py-0.5 font-bold text-xs">ALARM</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Bestätigen */}
        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={isProcessing}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-surface-panel font-medium text-status-danger-text',
            'hover:bg-surface-raised focus:outline-none focus-visible:shadow-focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <PiCheck className="size-5" />
          Bestätigen
        </button>

        {/* Snooze Buttons */}
        <div className="flex gap-1 rounded-lg bg-surface-inverse/16 p-1">
          <PiClockCountdown className="my-auto ml-1 size-4 text-text-inverse/80" />
          {([1, 5, 10] as const).map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => handleSnooze(minutes)}
              disabled={isProcessing}
              className={cn(
                'cursor-pointer rounded px-2 py-1 font-medium text-sm text-text-inverse',
                'hover:bg-surface-inverse/20 focus:outline-none focus-visible:shadow-focus-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {minutes}m
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-center text-text-inverse/70 text-xs">Enter: Bestätigen | Esc: 5 Min Snooze</div>
    </div>
  );
}

/**
 * Zeigt den Alarm-Toast fuer eine Erinnerung an.
 * Nutzt toast.custom() mit persistenter Dauer.
 */
export function showErinnerungAlarmToast(erinnerungId: string, einsatzId: string, titel: string, ausgeloestAm: string) {
  // Prüfe ob Toast für diese Erinnerung bereits existiert
  const toastId = `erinnerung-alarm-${erinnerungId}`;

  toast.custom((id) => <ErinnerungAlarmToast toastId={id} erinnerungId={erinnerungId} einsatzId={einsatzId} titel={titel} ausgeloestAm={ausgeloestAm} />, {
    id: toastId,
    duration: Number.POSITIVE_INFINITY, // Persistent bis User interagiert
    position: 'top-right',
  });
}

/**
 * Versteckt den Alarm-Toast fuer eine Erinnerung.
 */
export function hideErinnerungAlarmToast(erinnerungId: string) {
  toast.dismiss(`erinnerung-alarm-${erinnerungId}`);
}
