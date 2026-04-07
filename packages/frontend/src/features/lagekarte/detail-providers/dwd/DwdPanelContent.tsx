/**
 * DwdPanelContent - Vollständige Detail-Ansicht für DWD-Wetterwarnungen
 *
 * Zeigt alle Informationen zu einer DWD-Warnung im Side-Panel:
 * Warntyp, Beschreibung, Gültigkeit, Gebiet, Handlungsempfehlung.
 */

import { cn } from '@/shared/ui/cn';
import { PiCalendar, PiInfo, PiMapPin, PiShieldWarning, PiWarning } from 'react-icons/pi';
import { DEFAULT_CARD_STYLE, SEVERITY_CARD_STYLES, formatWarnungDateTime } from '../severity-styles';
import type { DwdWarnung } from './dwd-api';

interface DwdPanelContentProps {
  warnungen: DwdWarnung[];
}

function WarnungSection({ warnung, index, total }: { warnung: DwdWarnung; index: number; total: number }) {
  const style = SEVERITY_CARD_STYLES[warnung.severity] ?? DEFAULT_CARD_STYLE;

  return (
    <div className={cn('rounded-lg border p-4', style.border, style.bg)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <PiWarning className={cn('mt-0.5 h-5 w-5 flex-shrink-0', style.text)} aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold tracking-wider uppercase', style.text)}>{style.label}</span>
            {total > 1 && (
              <span className="text-xs text-text-muted">
                ({index + 1}/{total})
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-base font-semibold text-text-primary">{warnung.event || warnung.headline}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {warnung.description && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiInfo className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.description}</p>
          </section>
        )}

        {(warnung.onset || warnung.expires) && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiCalendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
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
              <PiMapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Betroffenes Gebiet</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.areaDesc}</p>
          </section>
        )}

        {warnung.instruction && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiShieldWarning className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.instruction}</p>
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
    <div className="space-y-4">
      {warnungen.map((warnung, idx) => (
        <WarnungSection key={idx} warnung={warnung} index={idx} total={warnungen.length} />
      ))}
      <p className="text-xs text-text-muted">Quelle: Deutscher Wetterdienst (DWD)</p>
    </div>
  );
}
