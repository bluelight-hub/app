/**
 * HandlungsbedarfSection Organism
 *
 * Zone A der Befehle-Seite: Zeigt Befehle mit Handlungsbedarf in drei Sub-Sektionen
 * (kritisch, warnung, zuQuittieren). Collapsible mit Summary-Zeile.
 */

import { useState } from 'react';
import { PiCaretDown, PiCaretUp, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { type HandlungsbedarfResult, getRueckfrageInfo } from '../../hooks/use-handlungsbedarf';
import { BefehlAlertRow } from '../molecules/BefehlAlertRow.molecule';

interface HandlungsbedarfSectionProps {
  handlungsbedarf: HandlungsbedarfResult;
  onBefehlSelect: (befehlId: string) => void;
  onQuittieren: (befehlId: string) => void;
  className?: string;
}

export function HandlungsbedarfSection({ handlungsbedarf, onBefehlSelect, onQuittieren, className }: HandlungsbedarfSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { kritisch, warnung, zuQuittieren, hatHandlungsbedarf, gesamtCount } = handlungsbedarf;

  if (!hatHandlungsbedarf) return null;

  /** Summary-Text fuer den Collapsed-Zustand */
  const summaryParts: string[] = [];
  if (kritisch.length > 0) summaryParts.push(`${kritisch.length} kritisch`);
  if (warnung.length > 0) summaryParts.push(`${warnung.length} Rückfrage${warnung.length !== 1 ? 'n' : ''}`);
  if (zuQuittieren.length > 0) summaryParts.push(`${zuQuittieren.length} zu quittieren`);
  const summaryText = summaryParts.join(', ');

  return (
    <section className={cn('border-gray-200 border-b dark:border-gray-700', className)} aria-label="Handlungsbedarf">
      {/* Toggle-Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className={cn('flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-sm transition-colors', 'hover:bg-gray-50 dark:hover:bg-gray-800/50', 'text-gray-700 dark:text-gray-300')}
        aria-expanded={!isCollapsed}
        aria-controls="handlungsbedarf-content"
      >
        <PiWarningCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <span>
          Handlungsbedarf
          <span className="ml-1.5 font-normal text-gray-500 text-xs dark:text-gray-400">({gesamtCount})</span>
        </span>
        {isCollapsed && <span className="ml-2 font-normal text-gray-500 text-xs dark:text-gray-400">{summaryText}</span>}
        <span className="ml-auto">{isCollapsed ? <PiCaretDown className="h-4 w-4 text-gray-400" aria-hidden="true" /> : <PiCaretUp className="h-4 w-4 text-gray-400" aria-hidden="true" />}</span>
      </button>

      {/* Expandierter Content */}
      {!isCollapsed && (
        <div id="handlungsbedarf-content">
          {/* A1: Kritisch (roter Akzent) */}
          {kritisch.length > 0 && (
            <div className="border-red-500 border-l-4 bg-red-50/50 dark:bg-red-950/20">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                <span className="font-semibold text-red-700 text-xs dark:text-red-400">{kritisch.length} kritisch</span>
              </div>
              {kritisch.map((befehl) => (
                <BefehlAlertRow key={befehl.id} befehl={befehl} variant="kritisch" onClick={() => onBefehlSelect(befehl.id)} />
              ))}
            </div>
          )}

          {/* A2: Warnung (gelber Akzent) */}
          {warnung.length > 0 && (
            <div className={cn('border-yellow-400 border-l-4 bg-yellow-50/50 dark:bg-yellow-950/20', kritisch.length > 0 && 'border-t border-t-gray-200 dark:border-t-gray-700')}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden="true" />
                <span className="font-semibold text-xs text-yellow-700 dark:text-yellow-400">
                  {warnung.length} Rückfrage{warnung.length !== 1 ? 'n' : ''}
                </span>
              </div>
              {warnung.map((befehl) => (
                <BefehlAlertRow key={befehl.id} befehl={befehl} variant="warnung" beschreibung={getRueckfrageInfo(befehl)} onClick={() => onBefehlSelect(befehl.id)} />
              ))}
            </div>
          )}

          {/* A3: Zu quittieren (blauer Akzent, rollenbasiert) */}
          {zuQuittieren.length > 0 && (
            <div className={cn('border-blue-400 border-l-4 bg-blue-50/50 dark:bg-blue-950/20', (kritisch.length > 0 || warnung.length > 0) && 'border-t border-t-gray-200 dark:border-t-gray-700')}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />
                <span className="font-semibold text-blue-700 text-xs dark:text-blue-400">{zuQuittieren.length} zu quittieren</span>
              </div>
              {zuQuittieren.map((befehl) => (
                <BefehlAlertRow key={befehl.id} befehl={befehl} variant="zuQuittieren" onQuittieren={onQuittieren} onClick={() => onBefehlSelect(befehl.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
