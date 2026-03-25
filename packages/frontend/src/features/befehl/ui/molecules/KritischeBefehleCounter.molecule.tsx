/**
 * KritischeBefehleCounter Molecule
 *
 * Zeigt die Anzahl kritischer Befehle (KRITISCH + WARNUNG) als Badge im Befehle-Header.
 * Pulsiert bei count > 0. Klick filtert auf kritische Befehle.
 */

import { useEffect, useMemo, useState } from 'react';
import { PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { getBefehlKritikalitaet } from '../../lib/befehl-priority';
import { AlarmDot } from '../atoms/AlarmDot.atom';

interface KritischeBefehleCounterProps {
  befehle: BefehlDto[];
  onClick?: () => void;
  className?: string;
}

/**
 * Badge das die Anzahl kritischer Befehle anzeigt.
 *
 * - Pulsiert bei count > 0 (respektiert prefers-reduced-motion)
 * - Klick loest Filter auf kritische Befehle aus
 * - Zeigt Icon + Text (WCAG: Farbe nie einziger Indikator)
 */
export function KritischeBefehleCounter({ befehle, onClick, className }: KritischeBefehleCounterProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const count = useMemo(() => {
    return befehle.filter((b) => {
      const k = getBefehlKritikalitaet(b, now);
      return k === 'KRITISCH' || k === 'WARNUNG';
    }).length;
  }, [befehle, now]);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        'bg-status-danger-surface text-status-danger-text hover:bg-status-danger-surface',
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
        className,
      )}
      aria-label={`${count} kritische${count !== 1 ? '' : 'r'} Befehl${count !== 1 ? 'e' : ''} anzeigen`}
    >
      <AlarmDot />
      <PiWarningCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {count} kritisch{count !== 1 ? 'e' : 'er'} Befehl{count !== 1 ? 'e' : ''}
      </span>
    </button>
  );
}
