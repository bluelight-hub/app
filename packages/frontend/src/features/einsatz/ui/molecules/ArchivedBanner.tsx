import { PiArchive } from 'react-icons/pi';

export function ArchivedBanner() {
  return (
    <div className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-surface p-4">
      <div className="flex items-center">
        <PiArchive className="mr-3 h-5 w-5 text-status-warning-text" />
        <div>
          <p className="font-medium text-status-warning-text">Dieser Einsatz wurde archiviert</p>
          <p className="mt-1 text-body-sm text-status-warning-text">Archivierte Einsätze können nicht mehr bearbeitet oder wiederhergestellt werden.</p>
        </div>
      </div>
    </div>
  );
}
