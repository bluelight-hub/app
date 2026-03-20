import { cn } from '@/shared/ui/cn';
import { useEffect, useRef } from 'react';
import { PiNotePencil } from 'react-icons/pi';
import type { EtbDraftState } from '../../types/draft-state.types';

interface EtbDraftResumeBannerProps {
  /** Der geladene Draft */
  draft: EtbDraftState;
  /** Handler für "Fortsetzen" */
  onRestore: () => void;
  /** Handler für "Verwerfen" */
  onDiscard: () => void;
  /** Ob der Draft gerade wiederhergestellt wird */
  isRestoring?: boolean;
}

/** Formatiert das updatedAt-Datum als relative Zeitangabe */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'gerade eben';
  if (diffMinutes < 60) return `vor ${diffMinutes} Minute${diffMinutes === 1 ? '' : 'n'}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
  return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
}

/** Kürzt den Text auf maximal 80 Zeichen */
function truncateText(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Banner für ETB-Draft-Wiederaufnahme
 *
 * Zeigt eine Inline-Benachrichtigung wenn ein Draft vorhanden ist.
 * Bietet Fortsetzen/Verwerfen-Entscheidung an (UX-DR23/25: Inline statt Modal).
 */
export function EtbDraftResumeBanner({ draft, onRestore, onDiscard, isRestoring = false }: EtbDraftResumeBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Auto-Fokus bei Erscheinen
  useEffect(() => {
    bannerRef.current?.focus();
  }, []);

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-label="Ungespeicherter Entwurf"
      aria-live="polite"
      tabIndex={-1}
      className={cn('flex items-start gap-3 rounded-lg border border-status-info-border bg-status-info-surface px-4 py-3', 'focus:outline-none focus-visible:shadow-focus-ring')}
    >
      <PiNotePencil className="mt-0.5 h-5 w-5 shrink-0 text-status-info-text" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-status-info-text">Ungespeicherter Entwurf gefunden</p>
        <p className="mt-0.5 text-text-secondary text-xs">
          {formatRelativeTime(draft.updatedAt)} · {truncateText(draft.text)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={isRestoring}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus-visible:shadow-focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label="Entwurf verwerfen"
        >
          Verwerfen
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className={cn(
            'rounded-md bg-status-info-text px-3 py-1.5 text-xs font-medium text-white',
            'hover:opacity-90',
            'focus:outline-none focus-visible:shadow-focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label="Entwurf fortsetzen"
        >
          Fortsetzen
        </button>
      </div>
    </div>
  );
}
