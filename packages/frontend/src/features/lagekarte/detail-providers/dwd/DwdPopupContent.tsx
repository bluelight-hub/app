/**
 * DwdPopupContent - Kompakte Popup-Ansicht für DWD-Wetterwarnungen
 *
 * Zeigt Warntyp, Warnstufe und Gültigkeitszeitraum in einem
 * kompakten Format direkt auf der Karte.
 */

import { cn } from '@/shared/ui/cn';
import { PiWarning } from 'react-icons/pi';
import { DEFAULT_BADGE_STYLE, SEVERITY_BADGE_STYLES, formatWarnungTime } from '../severity-styles';
import type { DwdWarnung } from './dwd-api';

interface DwdPopupContentProps {
  warnungen: DwdWarnung[];
}

/** DWD-spezifische Labels für Warnstufen */
const DWD_SEVERITY_LABELS: Record<string, string> = {
  Minor: 'Wetterwarnung',
  Moderate: 'Markante Warnung',
  Severe: 'Unwetterwarnung',
  Extreme: 'Extreme Unwetterwarnung',
};

export function DwdPopupContent({ warnungen }: DwdPopupContentProps) {
  if (warnungen.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnungen.map((warnung, idx) => {
        const style = SEVERITY_BADGE_STYLES[warnung.severity] ?? DEFAULT_BADGE_STYLE;

        return (
          <div key={idx}>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', style.bg, style.text)}>
              <PiWarning className="h-3 w-3" aria-hidden="true" />
              {DWD_SEVERITY_LABELS[warnung.severity] ?? 'Warnung'}
            </span>
            <p className="mt-1 text-sm font-medium text-text-primary">{warnung.event || warnung.headline}</p>
            <p className="text-xs text-text-muted">bis {formatWarnungTime(warnung.expires)}</p>
          </div>
        );
      })}

      {warnungen.length > 1 && <p className="text-xs font-medium text-text-muted">{warnungen.length} aktive Warnungen</p>}
    </div>
  );
}
