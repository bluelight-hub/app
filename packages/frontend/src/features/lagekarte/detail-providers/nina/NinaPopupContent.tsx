/**
 * NinaPopupContent - Kompakte Popup-Ansicht für NINA-Warnungen
 *
 * Zeigt Warntyp, Schweregrad und Herausgeber in einem
 * kompakten Format direkt auf der Karte.
 */

import { cn } from '@/shared/ui/cn';
import { format } from 'date-fns';
import { PiMegaphone } from 'react-icons/pi';
import type { NinaWarnung } from './nina-api';

interface NinaPopupContentProps {
  warnungen: NinaWarnung[];
}

/** Farben für Schweregrade */
const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  Minor: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  Moderate: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  Severe: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
  Extreme: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300' };

function formatTime(isoString: string | undefined): string {
  if (!isoString) return '–';
  try {
    return format(new Date(isoString), 'dd.MM. HH:mm') + ' Uhr';
  } catch {
    return isoString;
  }
}

export function NinaPopupContent({ warnungen }: NinaPopupContentProps) {
  if (warnungen.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnungen.map((warnung) => {
        const style = SEVERITY_STYLES[warnung.severity] ?? DEFAULT_STYLE;

        return (
          <div key={warnung.id}>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', style.bg, style.text)}>
              <PiMegaphone className="h-3 w-3" aria-hidden="true" />
              NINA
            </span>
            <p className="mt-1 text-sm font-medium text-text-primary">{warnung.headline || warnung.event}</p>
            {warnung.sender && <p className="text-xs text-text-muted">{warnung.sender}</p>}
            {warnung.expires && <p className="text-xs text-text-muted">bis {formatTime(warnung.expires)}</p>}
          </div>
        );
      })}

      {warnungen.length > 1 && <p className="text-xs font-medium text-text-muted">{warnungen.length} aktive Warnungen</p>}
    </div>
  );
}
