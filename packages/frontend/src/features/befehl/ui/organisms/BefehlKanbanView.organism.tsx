/**
 * BefehlKanbanView Organism
 *
 * 4-Spalten Kanban-Board fuer die Befehlsuebersicht.
 * Responsive: Desktop = 4-Spalten Grid, Tablet = 2x2 Grid, Mobile = Tabs.
 * KORRIGIERT-Befehle werden in ihrer logischen Spalte gedimmt dargestellt.
 */

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useCallback } from 'react';
import { cn } from '@/shared/ui/cn';
import { useAendereEmpfaengerStatus } from '../../api/use-aendere-empfaenger-status';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';
import { useBefehleByEinsatz } from '../../api/use-befehle-by-einsatz';
import { useBefehlPermissions } from '../../hooks/use-befehl-permissions';
import { useKanbanGruppierung, type KanbanGruppierung } from '../../hooks/use-kanban-gruppierung';
import { KanbanSpalte, type KanbanSpalteConfig } from '../molecules/KanbanSpalte.molecule';
import type { BefehlDto } from '@bluelight-hub/shared/client';

/** Spalten-Konfiguration mit Farbschema */
const KANBAN_SPALTEN_CONFIG: { key: keyof KanbanGruppierung<BefehlDto>; config: KanbanSpalteConfig }[] = [
  {
    key: 'ERTEILT',
    config: { label: 'Erteilt', headerBg: 'bg-status-info-surface', headerText: 'text-status-info-text' },
  },
  {
    key: 'ZUGESTELLT',
    config: { label: 'Zugestellt', headerBg: 'bg-status-warning-surface', headerText: 'text-status-warning-text' },
  },
  {
    key: 'TEILWEISE_QUITTIERT',
    config: { label: 'Teilweise quittiert', headerBg: 'bg-status-warning-surface', headerText: 'text-status-warning-text' },
  },
  {
    key: 'VOLLSTAENDIG_QUITTIERT',
    config: { label: 'Vollständig quittiert', headerBg: 'bg-status-success-surface', headerText: 'text-status-success-text' },
  },
];

interface BefehlKanbanViewProps {
  einsatzId: string;
  /** Vorgefilterte Befehle vom Parent. Wenn nicht uebergeben, werden alle Befehle geladen. */
  befehle?: BefehlDto[];
  className?: string;
  /** Callback fuer Befehl-Auswahl (Detail-Panel oeffnen) */
  onBefehlSelect?: (befehlId: string) => void;
  /** Callback fuer Quittierung */
  onQuittieren?: (befehlId: string) => void;
  /** ID des aktuellen Users (fuer Quittierungs-Anzeige) */
  currentUserId?: string;
  /** RBAC: Darf der aktuelle User quittieren? */
  canQuittieren?: boolean;
}

/** Kanban-Board mit 4 Spalten fuer Befehlsstatus */
export function BefehlKanbanView({ einsatzId, befehle: externalBefehle, className, onBefehlSelect, onQuittieren, currentUserId, canQuittieren }: BefehlKanbanViewProps) {
  const { data: fetchedBefehle = [] } = useBefehleByEinsatz(einsatzId);
  const befehle = externalBefehle ?? fetchedBefehle;
  const gruppierung = useKanbanGruppierung(befehle);
  const { canManageStatus } = useBefehlPermissions(einsatzId);
  const statusMutation = useAendereEmpfaengerStatus(einsatzId);

  const handleStatusChange = useCallback(
    (input: AendereEmpfaengerStatusInput) => {
      statusMutation.mutate(input);
    },
    [statusMutation],
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Desktop + Tablet: Responsives Grid (>=768px) */}
      <div className="hidden h-full gap-4 p-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {KANBAN_SPALTEN_CONFIG.map(({ key, config }) => (
          <KanbanSpalte
            key={key}
            config={config}
            befehle={gruppierung[key]}
            einsatzId={einsatzId}
            onStatusChange={handleStatusChange}
            canManageStatus={canManageStatus}
            onBefehlSelect={onBefehlSelect}
            onQuittieren={onQuittieren}
            currentUserId={currentUserId}
            canQuittieren={canQuittieren}
          />
        ))}
      </div>

      {/* Mobile: Tabs (<768px) */}
      <div className="h-full md:hidden">
        <TabGroup>
          <TabList className="flex border-b border-border-subtle">
            {KANBAN_SPALTEN_CONFIG.map(({ key, config }) => (
              <Tab
                key={key}
                className={({ selected }) =>
                  cn(
                    'flex-1 px-2 py-2.5 text-center text-xs font-medium transition-colors motion-reduce:transition-none',
                    'focus-visible:shadow-focus-ring focus-visible:outline-none',
                    selected ? 'border-b-2 border-action-primary text-action-primary' : 'text-text-muted hover:text-text-secondary',
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
                <KanbanSpalte
                  config={config}
                  befehle={gruppierung[key]}
                  einsatzId={einsatzId}
                  className="border-0"
                  onStatusChange={handleStatusChange}
                  canManageStatus={canManageStatus}
                  onBefehlSelect={onBefehlSelect}
                  onQuittieren={onQuittieren}
                  currentUserId={currentUserId}
                  canQuittieren={canQuittieren}
                />
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
