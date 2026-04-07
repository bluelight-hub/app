/**
 * DwdPanelContent - Vollständige Detail-Ansicht für DWD-Wetterwarnungen
 *
 * Zeigt alle Informationen zu einer DWD-Warnung im Side-Panel:
 * Warntyp, Beschreibung, Gültigkeit, Gebiet, Handlungsempfehlung.
 * Design: Badge-Pill + flaches Layout mit Sektions-Trennlinien.
 */

import { cn } from '@/shared/ui/cn';
import { PiCalendar, PiInfo, PiMapPin, PiShieldWarning, PiWarning } from 'react-icons/pi';
import { DEFAULT_BADGE_STYLE, SEVERITY_BADGE_STYLES, formatWarnungDateTime } from '../severity-styles';
import type { DwdWarnung } from './dwd-api';

interface DwdPanelContentProps {
  warnungen: DwdWarnung[];
}

/** DWD-spezifische Labels für Warnstufen */
const DWD_SEVERITY_LABELS: Record<string, string> = {
  Minor: 'Wetterwarnung',
  Moderate: 'Markante Warnung',
  Severe: 'Unwetterwarnung',
  Extreme: 'Extreme Unwetterwarnung',
};

function WarnungSection({ warnung, index, total }: { warnung: DwdWarnung; index: number; total: number }) {
  const style = SEVERITY_BADGE_STYLES[warnung.severity] ?? DEFAULT_BADGE_STYLE;
  const label = DWD_SEVERITY_LABELS[warnung.severity] ?? 'Warnung';

  return (
    <div>
      {/* Badge + Titel */}
      <div className="mb-4">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase', style.bg, style.text)}>
          <PiWarning className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        {total > 1 && (
          <span className="ml-2 text-xs text-text-muted">
            ({index + 1}/{total})
          </span>
        )}
        <h3 className="mt-1.5 text-base leading-snug font-semibold text-text-primary">{warnung.event || warnung.headline}</h3>
        <p className="mt-0.5 text-xs text-text-muted">DWD · Deutscher Wetterdienst</p>
      </div>

      {/* Detail-Sektionen */}
      <div className="space-y-3.5 border-t border-border-subtle pt-3">
        {warnung.description && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiInfo className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.description}</p>
          </section>
        )}

        {warnung.instruction && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiShieldWarning className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.instruction}</p>
          </section>
        )}

        {(warnung.onset || warnung.expires) && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiCalendar className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
              <div>
                <span className="text-xs text-text-muted">Von: </span>
                {formatWarnungDateTime(warnung.onset)}
              </div>
              <div>
                <span className="text-xs text-text-muted">Bis: </span>
                {formatWarnungDateTime(warnung.expires)}
              </div>
            </div>
          </section>
        )}

        {warnung.areaDesc && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <h4 className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">Betroffenes Gebiet</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.areaDesc}</p>
          </section>
        )}
      </div>
    </div>
  );
}

export function DwdPanelContent({ warnungen }: DwdPanelContentProps) {
  if (warnungen.length === 0) {
    return <p className="py-4 text-center text-sm text-text-muted">Keine aktiven Warnungen an dieser Stelle.</p>;
  }

  return (
    <div className="space-y-6">
      {warnungen.map((warnung, idx) => (
        <WarnungSection key={idx} warnung={warnung} index={idx} total={warnungen.length} />
      ))}
      <p className="text-xs text-text-muted">Quelle: Deutscher Wetterdienst (DWD)</p>
    </div>
  );
}
