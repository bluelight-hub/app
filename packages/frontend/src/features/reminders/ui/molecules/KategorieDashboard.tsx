import { useState } from 'react';
import { PiCaretDown, PiCaretRight } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { ErinnerungResponseDto } from '@/shared';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';
import { useKategorieStatistik } from '../../hooks/use-kategorie-statistik';
import { useKategorieFilter, setKategorieFilter } from '../../stores';
import { KategorieStatCard } from '../atoms/KategorieStatCard';

interface KategorieDashboardProps {
  erinnerungen: ErinnerungResponseDto[];
  kategorien: KategorieResponseDto[];
  className?: string;
}

/**
 * Dashboard fuer Kategorie-Statistiken mit Filter-Funktionalitaet.
 *
 * Zeigt ein Grid von KategorieStatCard-Komponenten an, ueber die
 * Erinnerungen nach Kategorie gefiltert werden koennen.
 * Collapsible mit Toggle-Button.
 *
 * **Story 8.10 Task 3:**
 * - Rendert Statistik-Karten fuer alle Kategorien + "Ohne Kategorie"
 * - Klick auf Karte setzt Kategorie-Filter (Toggle-Logik)
 * - Rendert nichts bei leeren Kategorien (AC4)
 */
export function KategorieDashboard({ erinnerungen, kategorien, className }: KategorieDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const stats = useKategorieStatistik(erinnerungen, kategorien);
  const currentFilter = useKategorieFilter();

  // AC4: Nichts rendern wenn keine Kategorien vorhanden
  if (kategorien.length === 0) {
    return null;
  }

  const isKategorieActive = (kategorieId: string | null): boolean => {
    if (kategorieId === null) {
      return currentFilter.type === 'untagged';
    }
    return currentFilter.type === 'kategorie' && currentFilter.kategorieId === kategorieId;
  };

  const handleKategorieClick = (kategorieId: string | null) => {
    // Toggle: Wenn bereits aktiv -> zurueck auf 'all'
    if (isKategorieActive(kategorieId)) {
      setKategorieFilter({ type: 'all' });
      return;
    }

    if (kategorieId === null) {
      setKategorieFilter({ type: 'untagged' });
    } else {
      setKategorieFilter({ type: 'kategorie', kategorieId });
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 text-sm font-medium text-text-secondary" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        Kategorien
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <KategorieStatCard
              key={stat.kategorieId ?? 'untagged'}
              name={stat.name}
              farbe={stat.farbe}
              activeCount={stat.activeCount}
              overdueCount={stat.overdueCount}
              isActive={isKategorieActive(stat.kategorieId)}
              onClick={() => handleKategorieClick(stat.kategorieId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
