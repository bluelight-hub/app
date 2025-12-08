import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { PiCheckCircle, PiClock, PiPhone, PiTruck, PiUser, PiUserPlus, PiUsers, PiWarning } from 'react-icons/pi';

interface Resource {
  id: string;
  name: string;
  type: 'einheit' | 'fahrzeug' | 'person';
  status: 'verfuegbar' | 'im-einsatz' | 'anfahrt' | 'nicht-verfuegbar';
  personnel?: number;
  arrivalTime?: string;
  funkrufname?: string;
}

interface EinsatzResourceWidgetProps {
  resources: Resource[];
  className?: string;
  onAddResource?: () => void;
}

export function EinsatzResourceWidget({ resources, className, onAddResource }: EinsatzResourceWidgetProps) {
  const getStatusBadge = (status: Resource['status']) => {
    switch (status) {
      case 'verfuegbar':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 font-medium text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
            <PiCheckCircle className="h-3 w-3" />
            Verfügbar
          </span>
        );
      case 'im-einsatz':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400">
            <PiTruck className="h-3 w-3" />
            Im Einsatz
          </span>
        );
      case 'anfahrt':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
            <PiClock className="h-3 w-3" />
            Anfahrt
          </span>
        );
      case 'nicht-verfuegbar':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 text-xs dark:bg-gray-800 dark:text-gray-400">
            <PiWarning className="h-3 w-3" />
            Nicht verfügbar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 text-xs dark:bg-gray-800 dark:text-gray-400">
            <PiWarning className="h-3 w-3" />
            Unbekannt
          </span>
        );
    }
  };

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'einheit':
        return <PiUsers className="h-5 w-5 text-gray-400" />;
      case 'fahrzeug':
        return <PiTruck className="h-5 w-5 text-gray-400" />;
      case 'person':
        return <PiUser className="h-5 w-5 text-gray-400" />;
    }
  };

  // Define fixed type order for consistent rendering
  const typeOrder: Resource['type'][] = ['einheit', 'fahrzeug', 'person'];

  // Group resources by type
  const groupedResources = resources.reduce(
    (acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource);
      return acc;
    },
    {} as Record<Resource['type'], Resource[]>,
  );

  const totalPersonnel = resources.reduce((sum, r) => sum + (r.personnel || 0), 0);
  const activeResources = resources.filter((r) => r.status === 'im-einsatz').length;

  return (
    <div className={cn('rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Eingesetzte Kräfte</h3>
        {onAddResource && (
          <Button appearance="ghost" size="sm" onClick={onAddResource}>
            <PiUserPlus className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">{resources.length}</p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Ressourcen</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">{totalPersonnel}</p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Personal</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">{activeResources}</p>
          <p className="text-gray-500 text-xs dark:text-gray-400">Aktiv</p>
        </div>
      </div>

      {/* Resource List */}
      <div className="space-y-4">
        {typeOrder
          .filter((type) => groupedResources[type])
          .map((type) => (
            <div key={type}>
              <h4 className="mb-2 font-semibold text-gray-500 text-xs uppercase dark:text-gray-400">{type === 'einheit' ? 'Einheiten' : type === 'fahrzeug' ? 'Fahrzeuge' : 'Personal'}</h4>
              <div className="space-y-2">
                {groupedResources[type].map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3">
                      {getResourceIcon(resource.type)}
                      <div>
                        <p className="font-medium text-gray-900 text-sm dark:text-gray-100">{resource.name}</p>
                        <div className="mt-1 flex flex-col items-start">
                          {resource.funkrufname && (
                            <span className="text-gray-500 text-xs dark:text-gray-400">
                              <PiPhone className="mr-1 inline h-3 w-3" />
                              {resource.funkrufname}
                            </span>
                          )}
                          {resource.personnel && (
                            <span className="text-gray-500 text-xs dark:text-gray-400">
                              <PiUsers className="mr-1 inline h-3 w-3" />
                              {resource.personnel} Personen
                            </span>
                          )}
                          {resource.arrivalTime && (
                            <span className="text-gray-500 text-xs dark:text-gray-400">
                              <PiClock className="mr-1 inline h-3 w-3" />
                              ETA: {resource.arrivalTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(resource.status)}
                  </div>
                ))}
              </div>
            </div>
          ))}

        {resources.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <PiUsers className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Noch keine Kräfte zugeordnet</p>
            {onAddResource && (
              <Button appearance="outline" size="sm" className="mt-4" onClick={onAddResource}>
                <PiUserPlus className="mr-2 h-4 w-4" />
                Erste Einheit hinzufügen
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
