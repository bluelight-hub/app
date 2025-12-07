import { PiArchive } from 'react-icons/pi';

export function ArchivedBanner() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-center">
        <PiArchive className="mr-3 h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">Dieser Einsatz wurde archiviert</p>
          <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">Archivierte Einsätze können nicht mehr bearbeitet oder wiederhergestellt werden.</p>
        </div>
      </div>
    </div>
  );
}
