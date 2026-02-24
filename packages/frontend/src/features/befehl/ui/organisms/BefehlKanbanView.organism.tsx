/**
 * BefehlKanbanView Organism
 *
 * 4-Spalten Kanban-Board fuer die Befehlsuebersicht.
 * Responsive: Desktop = 4-Spalten Grid, Tablet = 2x2 Grid, Mobile = Tabs.
 * KORRIGIERT-Befehle werden in ihrer logischen Spalte gedimmt dargestellt.
 */

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { cn } from '@/shared/ui/cn';
import { useBefehleByEinsatz } from '../../api/use-befehle-by-einsatz';
import { useKanbanGruppierung, type KanbanGruppierung } from '../../hooks/use-kanban-gruppierung';
import { KanbanSpalte, type KanbanSpalteConfig } from '../molecules/KanbanSpalte.molecule';
import type { BefehlDto } from '@bluelight-hub/shared/client';

/** Spalten-Konfiguration mit Farbschema */
const KANBAN_SPALTEN_CONFIG: { key: keyof KanbanGruppierung<BefehlDto>; config: KanbanSpalteConfig }[] = [
  {
    key: 'ERTEILT',
    config: { label: 'Erteilt', headerBg: 'bg-blue-100 dark:bg-blue-900/40', headerText: 'text-blue-800 dark:text-blue-200' },
  },
  {
    key: 'ZUGESTELLT',
    config: { label: 'Zugestellt', headerBg: 'bg-yellow-100 dark:bg-yellow-900/40', headerText: 'text-yellow-800 dark:text-yellow-200' },
  },
  {
    key: 'TEILWEISE_QUITTIERT',
    config: { label: 'Teilweise quittiert', headerBg: 'bg-orange-100 dark:bg-orange-900/40', headerText: 'text-orange-800 dark:text-orange-200' },
  },
  {
    key: 'VOLLSTAENDIG_QUITTIERT',
    config: { label: 'Vollständig quittiert', headerBg: 'bg-green-100 dark:bg-green-900/40', headerText: 'text-green-800 dark:text-green-200' },
  },
];

interface BefehlKanbanViewProps {
  einsatzId: string;
  /** Vorgefilterte Befehle vom Parent. Wenn nicht uebergeben, werden alle Befehle geladen. */
  befehle?: BefehlDto[];
  className?: string;
}

/** Kanban-Board mit 4 Spalten fuer Befehlsstatus */
export function BefehlKanbanView({ einsatzId, befehle: externalBefehle, className }: BefehlKanbanViewProps) {
  const { data: fetchedBefehle = [] } = useBefehleByEinsatz(einsatzId);
  const befehle = externalBefehle ?? fetchedBefehle;
  const gruppierung = useKanbanGruppierung(befehle);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Desktop + Tablet: Responsives Grid (>=768px) */}
      <div className="hidden h-full gap-4 p-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {KANBAN_SPALTEN_CONFIG.map(({ key, config }) => (
          <KanbanSpalte key={key} config={config} befehle={gruppierung[key]} einsatzId={einsatzId} />
        ))}
      </div>

      {/* Mobile: Tabs (<768px) */}
      <div className="h-full md:hidden">
        <TabGroup>
          <TabList className="flex border-b border-gray-200 dark:border-gray-700">
            {KANBAN_SPALTEN_CONFIG.map(({ key, config }) => (
              <Tab
                key={key}
                className={({ selected }) =>
                  cn(
                    'flex-1 px-2 py-2.5 text-center text-xs font-medium transition-colors motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                    selected ? 'border-b-2 border-primary-500 text-primary-700 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  )
                }
              >
                {config.label} ({gruppierung[key].length})
              </Tab>
            ))}
          </TabList>
          <TabPanels className="flex-1 overflow-y-auto p-4">
            {KANBAN_SPALTEN_CONFIG.map(({ key, config }) => (
              <TabPanel key={key}>
                <KanbanSpalte config={config} befehle={gruppierung[key]} einsatzId={einsatzId} className="border-0" />
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
