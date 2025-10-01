import { PiClock } from 'react-icons/pi';

interface EtbEmptyStateProps {
  title?: string;
  description?: string;
}

/**
 * ETB Empty State - Anzeige wenn keine Einträge vorhanden
 */
export function EtbEmptyState({ title = 'Keine Einträge vorhanden', description = 'Fügen Sie den ersten Eintrag zum Einsatztagebuch hinzu.' }: EtbEmptyStateProps) {
  return (
    <div className="flex h-[600px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-700">
          <PiClock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-medium text-gray-900 text-lg dark:text-gray-100">{title}</h3>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
