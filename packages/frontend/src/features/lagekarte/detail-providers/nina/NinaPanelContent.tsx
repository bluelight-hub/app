/**
 * NinaPanelContent - Vollständige Detail-Ansicht für NINA-Warnungen
 *
 * Zeigt alle Informationen zu NINA-Warnungen im Side-Panel:
 * Warntyp, Beschreibung, Gültigkeit, Gebiet, Handlungsempfehlung, Herausgeber.
 */

import { cn } from '@/shared/ui/cn';
import { format } from 'date-fns';
import { PiCalendar, PiInfo, PiMapPin, PiMegaphone, PiShieldWarning, PiUser } from 'react-icons/pi';
import type { NinaWarnung } from './nina-api';

interface NinaPanelContentProps {
  warnungen: NinaWarnung[];
}

/** Farben für Schweregrade */
const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  Minor: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-300', label: 'Geringfügig' },
  Moderate: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', label: 'Mäßig' },
  Severe: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', label: 'Schwer' },
  Extreme: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-800 dark:text-purple-300', label: 'Extrem' },
};

const DEFAULT_STYLE = {
  bg: 'bg-gray-50 dark:bg-gray-800/50',
  border: 'border-gray-200 dark:border-gray-700',
  text: 'text-gray-800 dark:text-gray-300',
  label: 'Warnung',
};

function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return '–';
  try {
    return format(new Date(isoString), 'dd.MM.yyyy, HH:mm') + ' Uhr';
  } catch {
    return isoString;
  }
}

function WarnungSection({ warnung, index, total }: { warnung: NinaWarnung; index: number; total: number }) {
  const style = SEVERITY_STYLES[warnung.severity] ?? DEFAULT_STYLE;

  return (
    <div className={cn('rounded-lg border p-4', style.border, style.bg)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <PiMegaphone className={cn('mt-0.5 h-5 w-5 flex-shrink-0', style.text)} aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold tracking-wider uppercase', style.text)}>{style.label}</span>
            {total > 1 && (
              <span className="text-xs text-text-muted">
                ({index + 1}/{total})
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-base font-semibold text-text-primary">{warnung.headline || warnung.event}</h3>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Beschreibung */}
        {warnung.description && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiInfo className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Beschreibung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.description}</p>
          </section>
        )}

        {/* Gültigkeitszeitraum */}
        {(warnung.onset || warnung.expires) && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiCalendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Gültigkeit</h4>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-text-primary">
              <div>
                <span className="text-xs text-text-muted">Von: </span>
                {formatDateTime(warnung.onset)}
              </div>
              <div>
                <span className="text-xs text-text-muted">Bis: </span>
                {formatDateTime(warnung.expires)}
              </div>
            </div>
          </section>
        )}

        {/* Betroffenes Gebiet */}
        {warnung.areaDesc && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiMapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Betroffenes Gebiet</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.areaDesc}</p>
          </section>
        )}

        {/* Handlungsempfehlung */}
        {warnung.instruction && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiShieldWarning className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Handlungsempfehlung</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{warnung.instruction}</p>
          </section>
        )}

        {/* Herausgeber */}
        {warnung.sender && (
          <section>
            <div className="flex items-center gap-1.5">
              <PiUser className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <h4 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Herausgeber</h4>
            </div>
            <p className="mt-1 text-sm text-text-primary">{warnung.sender}</p>
          </section>
        )}
      </div>
    </div>
  );
}

export function NinaPanelContent({ warnungen }: NinaPanelContentProps) {
  if (warnungen.length === 0) {
    return <p className="py-4 text-center text-sm text-text-muted">Keine aktiven NINA-Warnungen an dieser Stelle.</p>;
  }

  return (
    <div className="space-y-4">
      {warnungen.map((warnung, idx) => (
        <WarnungSection key={warnung.id} warnung={warnung} index={idx} total={warnungen.length} />
      ))}

      {/* Quellenangabe */}
      <p className="text-xs text-text-muted">Quelle: Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK) — NINA Warn-App</p>
    </div>
  );
}
