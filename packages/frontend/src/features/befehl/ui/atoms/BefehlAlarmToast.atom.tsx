/**
 * Befehl Alarm Toast
 *
 * Persistenter Toast fuer neue Befehl-Zuweisungen.
 * Erscheint app-weit via Sonner toast.custom().
 *
 * Features:
 * - Oranger Alarm-Style (unterscheidbar von roten Erinnerungs-Toasts)
 * - Live Elapsed-Time Anzeige
 * - "Zum Befehl" + "Zur Kenntnis" Actions
 * - Keyboard Support (Enter/Escape)
 */

import { cn } from '@/shared/ui/cn';
import { logger } from '@/shared/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import { PiArrowsClockwise, PiClock, PiMegaphoneFill, PiNavigationArrow, PiQuestion, PiWarningOctagon, PiX } from 'react-icons/pi';
import { toast } from 'sonner';

interface BefehlAlarmToastProps {
  toastId: string | number;
  befehlId: string;
  einsatzId: string;
  nummer: string;
  befehlsgeber: string;
  auftrag: string;
  erteiltAm: string;
}

function navigateToBefehl(einsatzId: string, befehlId: string) {
  void import('@/main')
    .then(({ router }) => {
      router.navigate({
        to: '/app/einsatz/$einsatzId/führung/befehle',
        params: { einsatzId },
        search: { befehlId },
      });
    })
    .catch((error) => {
      logger.warn('Befehl-Navigation über Router fehlgeschlagen, fallback auf URL', { error });
      if (typeof window !== 'undefined') {
        window.location.href = `/app/einsatz/${einsatzId}/führung/befehle?befehlId=${befehlId}`;
      }
    });
}

/** Formatiert die vergangene Zeit seit Erteilung */
function formatElapsedTime(erteiltAm: string): string {
  try {
    const date = new Date(erteiltAm);
    if (Number.isNaN(date.getTime())) {
      return 'gerade eben';
    }
    return formatDistanceToNow(date, { locale: de, addSuffix: false });
  } catch {
    return 'gerade eben';
  }
}

export function BefehlAlarmToast({ toastId, befehlId, einsatzId, nummer, befehlsgeber, auftrag, erteiltAm }: BefehlAlarmToastProps) {
  const [elapsedTime, setElapsedTime] = useState(() => formatElapsedTime(erteiltAm));

  // Live Update der Elapsed Time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(erteiltAm));
    }, 1000);
    return () => clearInterval(interval);
  }, [erteiltAm]);

  const handleNavigate = useCallback(() => {
    toast.dismiss(toastId);
    navigateToBefehl(einsatzId, befehlId);
  }, [toastId, befehlId, einsatzId]);

  const handleDismiss = useCallback(() => {
    toast.dismiss(toastId);
  }, [toastId]);

  // Keyboard Support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNavigate();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    },
    [handleNavigate, handleDismiss],
  );

  const truncatedInfo = `Von ${befehlsgeber}: ${auftrag}`;
  const displayInfo = truncatedInfo.length > 60 ? `${truncatedInfo.slice(0, 60)}...` : truncatedInfo;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      className={cn(
        'min-w-[300px] max-w-[420px] rounded-xl border-2 border-orange-400 p-4 shadow-2xl',
        'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
        'focus:outline-none focus:ring-4 focus:ring-orange-300',
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PiMegaphoneFill className="size-5 shrink-0 animate-bounce text-white" />
          <span className="font-semibold leading-tight">Neuer Befehl #{nummer}</span>
        </div>
      </div>

      {/* Info */}
      <p className="mb-3 text-orange-100 text-sm leading-snug">{displayInfo}</p>

      {/* Status */}
      <div className="mb-3 flex items-center gap-3 text-orange-100 text-sm">
        <div className="flex items-center gap-1">
          <PiClock className="size-4" />
          <span>seit {elapsedTime}</span>
        </div>
        <span className="rounded bg-orange-500/50 px-2 py-0.5 font-bold text-xs">BEFEHL</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNavigate}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white font-medium text-orange-700',
            'hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-white',
          )}
        >
          <PiNavigationArrow className="size-5" />
          Zum Befehl
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white/20 font-medium text-white',
            'hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50',
          )}
        >
          <PiX className="size-5" />
          Zur Kenntnis
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-center text-orange-200 text-xs">Enter: Zum Befehl | Esc: Zur Kenntnis</div>
    </div>
  );
}

/**
 * Zeigt den Alarm-Toast fuer einen neuen Befehl an.
 * Nutzt toast.custom() mit persistenter Dauer.
 */
export function showBefehlAlarmToast(befehlId: string, einsatzId: string, nummer: string, befehlsgeber: string, auftrag: string, erteiltAm: string) {
  const toastId = `befehl-alarm-${befehlId}`;

  toast.custom((id) => <BefehlAlarmToast toastId={id} befehlId={befehlId} einsatzId={einsatzId} nummer={nummer} befehlsgeber={befehlsgeber} auftrag={auftrag} erteiltAm={erteiltAm} />, {
    id: toastId,
    duration: Number.POSITIVE_INFINITY,
    position: 'top-right',
  });
}

/**
 * Versteckt den Alarm-Toast fuer einen Befehl.
 */
export function hideBefehlAlarmToast(befehlId: string) {
  toast.dismiss(`befehl-alarm-${befehlId}`);
}

// ===== Quittierungs-Alarm (RUECKFRAGE / NICHT_VERSTANDEN) =====

interface QuittierungAlarmToastProps {
  toastId: string | number;
  befehlId: string;
  einsatzId: string;
  nummer: string;
  quittierungArt: 'RUECKFRAGE' | 'NICHT_VERSTANDEN';
  quittiertAm: string;
}

/** Style-Config je QuittierungArt */
const QUITTIERUNG_STYLES = {
  RUECKFRAGE: {
    border: 'border-amber-400',
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    ring: 'focus:ring-amber-300',
    badge: 'bg-amber-500/50',
    badgeText: 'RÜCKFRAGE',
    title: (nr: string) => `Rückfrage zu Befehl #${nr}`,
    description: 'Ein Empfänger hat eine Rückfrage zu Ihrem Befehl',
    icon: PiQuestion,
    actionBg: 'text-amber-700',
    actionHover: 'hover:bg-amber-50',
  },
  NICHT_VERSTANDEN: {
    border: 'border-red-400',
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    ring: 'focus:ring-red-300',
    badge: 'bg-red-500/50',
    badgeText: 'NICHT VERSTANDEN',
    title: (nr: string) => `Befehl #${nr} nicht verstanden`,
    description: 'Ein Empfänger hat Ihren Befehl als "Nicht verstanden" quittiert',
    icon: PiWarningOctagon,
    actionBg: 'text-red-700',
    actionHover: 'hover:bg-red-50',
  },
} as const;

export function QuittierungAlarmToast({ toastId, befehlId, einsatzId, nummer, quittierungArt, quittiertAm }: QuittierungAlarmToastProps) {
  const [elapsedTime, setElapsedTime] = useState(() => formatElapsedTime(quittiertAm));
  const style = QUITTIERUNG_STYLES[quittierungArt];
  const Icon = style.icon;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(quittiertAm));
    }, 1000);
    return () => clearInterval(interval);
  }, [quittiertAm]);

  const handleNavigate = useCallback(() => {
    toast.dismiss(toastId);
    navigateToBefehl(einsatzId, befehlId);
  }, [toastId, befehlId, einsatzId]);

  const handleDismiss = useCallback(() => {
    toast.dismiss(toastId);
  }, [toastId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNavigate();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    },
    [handleNavigate, handleDismiss],
  );

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      className={cn('min-w-[300px] max-w-[420px] rounded-xl border-2 p-4 shadow-2xl', style.border, style.bg, 'text-white', style.ring)}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-5 shrink-0 animate-bounce text-white" />
          <span className="font-semibold leading-tight">{style.title(nummer)}</span>
        </div>
      </div>

      {/* Info */}
      <p className="mb-3 text-sm leading-snug opacity-90">{style.description}</p>

      {/* Status */}
      <div className="mb-3 flex items-center gap-3 text-sm opacity-90">
        <div className="flex items-center gap-1">
          <PiClock className="size-4" />
          <span>vor {elapsedTime}</span>
        </div>
        <span className={cn('rounded px-2 py-0.5 font-bold text-xs', style.badge)}>{style.badgeText}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNavigate}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white font-medium',
            style.actionBg,
            style.actionHover,
            'focus:outline-none focus:ring-2 focus:ring-white',
          )}
        >
          <PiNavigationArrow className="size-5" />
          Zum Befehl
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white/20 font-medium text-white',
            'hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50',
          )}
        >
          <PiX className="size-5" />
          OK
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-center text-xs opacity-70">Enter: Zum Befehl | Esc: Schließen</div>
    </div>
  );
}

/**
 * Zeigt den persistenten Alarm-Toast fuer RUECKFRAGE/NICHT_VERSTANDEN an.
 */
export function showQuittierungAlarmToast(befehlId: string, einsatzId: string, nummer: string, quittierungArt: 'RUECKFRAGE' | 'NICHT_VERSTANDEN', quittiertAm: string) {
  const toastId = `quittierung-alarm-${befehlId}-${quittiertAm}`;

  toast.custom((id) => <QuittierungAlarmToast toastId={id} befehlId={befehlId} einsatzId={einsatzId} nummer={nummer} quittierungArt={quittierungArt} quittiertAm={quittiertAm} />, {
    id: toastId,
    duration: Number.POSITIVE_INFINITY,
    position: 'top-right',
  });
}

// ===== Korrektur-Alarm (Befehl wurde korrigiert) =====

interface KorrekturAlarmToastProps {
  toastId: string | number;
  befehlId: string;
  einsatzId: string;
  nummer: string;
  timestamp: string;
}

export function KorrekturAlarmToast({ toastId, befehlId, einsatzId, nummer, timestamp }: KorrekturAlarmToastProps) {
  const [elapsedTime, setElapsedTime] = useState(() => formatElapsedTime(timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(timestamp));
    }, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  const handleNavigate = useCallback(() => {
    toast.dismiss(toastId);
    navigateToBefehl(einsatzId, befehlId);
  }, [toastId, befehlId, einsatzId]);

  const handleDismiss = useCallback(() => {
    toast.dismiss(toastId);
  }, [toastId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNavigate();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    },
    [handleNavigate, handleDismiss],
  );

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleKeyDown}
      className={cn(
        'min-w-[300px] max-w-[420px] rounded-xl border-2 border-violet-400 p-4 shadow-2xl',
        'bg-gradient-to-br from-blue-600 to-violet-600 text-white',
        'focus:outline-none focus:ring-4 focus:ring-violet-300',
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PiArrowsClockwise className="size-5 shrink-0 animate-spin text-white" />
          <span className="font-semibold leading-tight">Befehl #{nummer} korrigiert</span>
        </div>
      </div>

      {/* Info */}
      <p className="mb-3 text-sm text-violet-100 leading-snug">Dieser Befehl wurde durch eine Korrektur ersetzt</p>

      {/* Status */}
      <div className="mb-3 flex items-center gap-3 text-sm text-violet-100">
        <div className="flex items-center gap-1">
          <PiClock className="size-4" />
          <span>vor {elapsedTime}</span>
        </div>
        <span className="rounded bg-violet-500/50 px-2 py-0.5 font-bold text-xs">KORRIGIERT</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNavigate}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white font-medium text-violet-700',
            'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white',
          )}
        >
          <PiNavigationArrow className="size-5" />
          Zum Befehl
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-4 py-2',
            'cursor-pointer bg-white/20 font-medium text-white',
            'hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50',
          )}
        >
          <PiX className="size-5" />
          OK
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-center text-violet-200 text-xs">Enter: Zum Befehl | Esc: Schließen</div>
    </div>
  );
}

/**
 * Zeigt den persistenten Alarm-Toast fuer einen korrigierten Befehl an.
 */
export function showKorrekturAlarmToast(befehlId: string, einsatzId: string, nummer: string, timestamp: string) {
  const toastId = `korrektur-alarm-${befehlId}`;

  toast.custom((id) => <KorrekturAlarmToast toastId={id} befehlId={befehlId} einsatzId={einsatzId} nummer={nummer} timestamp={timestamp} />, {
    id: toastId,
    duration: Number.POSITIVE_INFINITY,
    position: 'top-right',
  });
}
