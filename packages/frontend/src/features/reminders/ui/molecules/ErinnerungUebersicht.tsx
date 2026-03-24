/**
 * Erinnerung-Uebersicht Komponente
 *
 * Collapsible Panel mit Statistik-Karten fuer die Erinnerungs-Uebersicht.
 * Zeigt Gesamt, Acknowledged, Eskaliert, Erledigt und Aktuell aktiv.
 *
 * **Story 9.1 Task 7+8:**
 * - Clientseitige Statistik-Berechnung via useErinnerungUebersichtStatistik Hook
 * - Grid aus EinsatzStatsCard Karten
 * - Collapsible mit Toggle-Button (Pattern von KategorieDashboard)
 */

import { useState } from 'react';
import { PiCaretDown, PiCaretRight, PiChartBar, PiCheckCircle, PiWarningCircle, PiClock } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { ErinnerungResponseDto } from '@/shared';
import { EinsatzStatsCard } from '@/features/einsatz/ui/molecules/EinsatzStatsCard';
import { useErinnerungUebersichtStatistik } from '../../hooks/use-erinnerung-uebersicht-statistik';

interface ErinnerungUebersichtProps {
  erinnerungen: ErinnerungResponseDto[];
  className?: string;
}

export function ErinnerungUebersicht({ erinnerungen, className }: ErinnerungUebersichtProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const stats = useErinnerungUebersichtStatistik(erinnerungen);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 font-medium text-sm text-text-secondary" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        Erinnerungs-Übersicht
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <EinsatzStatsCard title="Gesamt erstellt" value={stats.total} icon={<PiChartBar className="h-5 w-5" />} variant="default" />
          <EinsatzStatsCard title="Acknowledged" value={stats.acknowledged} icon={<PiCheckCircle className="h-5 w-5" />} variant="success" />
          <EinsatzStatsCard title="Eskaliert" value={stats.eskaliert} icon={<PiWarningCircle className="h-5 w-5" />} variant="danger" />
          <EinsatzStatsCard title="Erledigt" value={stats.erledigt} icon={<PiCheckCircle className="h-5 w-5" />} variant="success" />
          <EinsatzStatsCard title="Aktuell aktiv" value={stats.active} icon={<PiClock className="h-5 w-5" />} variant={stats.active > 0 ? 'warning' : 'default'} />
        </div>
      )}
    </div>
  );
}
