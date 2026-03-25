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
    <div className="flex h-[600px] items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-panel">
      <div className="flex flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-surface-raised p-3">
          <PiClock className="h-8 w-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
