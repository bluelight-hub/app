/**
 * BefehlAlertRow Molecule
 *
 * Kompakte Alert-Zeile (~48px) fuer die Handlungsbedarf-Zone (Zone A).
 * Drei Varianten: kritisch (rot), warnung (gelb), zuQuittieren (blau).
 */

import { PiCaretRight } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { getQuittierungsfortschritt } from '../../lib/befehl-utils';
import { isBefehlUeberfaellig, parseZeitvorgabe } from '../../lib/befehl-priority';
import { AlarmDot } from '../atoms/AlarmDot.atom';

type AlertVariant = 'kritisch' | 'warnung' | 'zuQuittieren';

interface BefehlAlertRowProps {
  befehl: BefehlDto;
  variant: AlertVariant;
  /** Optionaler Beschreibungstext (z.B. "Rückfrage (Müller)") */
  beschreibung?: string;
  onClick?: () => void;
  /** Callback fuer direktes Quittieren (nur bei zuQuittieren-Variante) */
  onQuittieren?: (befehlId: string) => void;
  className?: string;
}

/** Berechnet die Ueberfaelligkeits-Dauer als lesbaren String */
function getUeberfaelligDauer(befehl: BefehlDto): string | null {
  const parsedMinutes = parseZeitvorgabe(befehl.zeitvorgabe);
  if (parsedMinutes == null) return null;

  const erteiltAm = befehl.erteiltAm instanceof Date ? befehl.erteiltAm : new Date(befehl.erteiltAm);
  const deadline = new Date(erteiltAm.getTime() + parsedMinutes * 60 * 1000);
  const diffMs = Date.now() - deadline.getTime();
  if (diffMs <= 0) return null;

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  const restMin = diffMin % 60;
  return restMin > 0 ? `${diffH}h ${restMin}min` : `${diffH}h`;
}

export function BefehlAlertRow({ befehl, variant, beschreibung, onClick, onQuittieren, className }: BefehlAlertRowProps) {
  const fortschritt = getQuittierungsfortschritt(befehl.empfaenger);
  const istUeberfaellig = isBefehlUeberfaellig(befehl);

  return (
    <button
      type="button"
      onClick={() => {
        if (variant === 'zuQuittieren' && onQuittieren) {
          onQuittieren(befehl.id);
        } else {
          onClick?.();
        }
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
        variant === 'kritisch' && 'hover:bg-status-danger-surface',
        variant === 'warnung' && 'hover:bg-status-warning-surface',
        variant === 'zuQuittieren' && 'hover:bg-status-info-surface',
        className,
      )}
      aria-label={`Befehl ${befehl.nummer}: ${befehl.auftrag}`}
    >
      {/* AlarmDot fuer kritische Befehle */}
      {variant === 'kritisch' && <AlarmDot className="flex-shrink-0" />}

      {/* Nummer */}
      <span className="flex-shrink-0 font-mono text-sm font-bold text-text-primary">{befehl.nummer}</span>

      {/* Grund-Badge / Beschreibung */}
      <span
        className={cn(
          'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          variant === 'kritisch' && 'bg-status-danger-surface text-status-danger-text',
          variant === 'warnung' && 'bg-status-warning-surface text-status-warning-text',
          variant === 'zuQuittieren' && 'bg-status-info-surface text-status-info-text',
        )}
      >
        {variant === 'kritisch' && (istUeberfaellig ? `Überfällig (${getUeberfaelligDauer(befehl) ?? '?'})` : 'Nicht verstanden')}
        {variant === 'warnung' && (beschreibung ?? 'Rückfrage')}
        {variant === 'zuQuittieren' && 'Quittieren'}
      </span>

      {/* Fortschritt (nicht bei zuQuittieren) */}
      {variant !== 'zuQuittieren' && (
        <span className="flex-shrink-0 text-xs text-text-muted">
          {fortschritt.quittiert}/{fortschritt.gesamt}
        </span>
      )}

      {/* Auftrag (truncated, flex-grow) */}
      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{befehl.auftrag}</span>

      {/* Chevron / Quittieren-Button */}
      {variant === 'zuQuittieren' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuittieren?.(befehl.id);
          }}
          className={cn('flex-shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors', 'bg-action-primary text-text-inverse hover:bg-action-primary-hover')}
        >
          Quittieren
        </button>
      ) : (
        <PiCaretRight className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
      )}
    </button>
  );
}
