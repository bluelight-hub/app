import { PiUser, PiPencil } from 'react-icons/pi';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { formatDisplayDateTime } from '@/utils/dateFormatter';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EtbEntryDetailsProps {
  entry: EtbEintragDto;
  getUserName: (id: string) => string | undefined;
}

/**
 * Expandierte Details für einen ETB-Eintrag
 */
export function EtbEntryDetails({ entry, getUserName }: EtbEntryDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Vollständiger Text */}
      <div className="rounded-lg bg-white p-4 dark:bg-gray-950">
        <h4 className="mb-2 font-medium text-gray-500 text-xs dark:text-gray-400">Vollständiger Eintrag</h4>
        <p className="whitespace-pre-wrap break-words text-gray-900 text-sm dark:text-gray-100">{entry.text}</p>
      </div>

      {/* Meta-Informationen */}
      <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-3">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Erstellt von:</span>
          <p className="mt-1 flex items-center gap-1 text-gray-900 dark:text-gray-100">
            <PiUser className="h-3 w-3" />
            {getUserName(entry.createdBy) ?? 'Unbekannt'}
          </p>
        </div>

        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Zeitstempel:</span>
          <p className="mt-1 text-gray-900 dark:text-gray-100">{formatDisplayDateTime(entry.timestamp)}</p>
        </div>

        {entry.funkrufname && (
          <div>
            <span className="font-medium text-gray-500 dark:text-gray-400">Funkrufname:</span>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{entry.funkrufname}</p>
          </div>
        )}

        {entry.standort && (
          <div>
            <span className="font-medium text-gray-500 dark:text-gray-400">Standort:</span>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{entry.standort}</p>
          </div>
        )}

        {entry.updatedBy && entry.updatedAt !== entry.createdAt && (
          <div>
            <span className="font-medium text-gray-500 dark:text-gray-400">Bearbeitet von:</span>
            <p className="mt-1 flex items-center gap-1 text-gray-900 dark:text-gray-100">
              <PiPencil className="h-3 w-3" />
              {getUserName(entry.updatedBy) ?? 'Unbekannt'}
              <span className="text-gray-500 dark:text-gray-400">({format(new Date(entry.updatedAt), 'HH:mm', { locale: de })})</span>
            </p>
          </div>
        )}

        {entry.version > 1 && (
          <div>
            <span className="font-medium text-gray-500 dark:text-gray-400">Version:</span>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{entry.version}</p>
          </div>
        )}

        {entry.isAutomatic && (
          <div>
            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">🤖 Automatisch generiert</span>
          </div>
        )}
      </div>
    </div>
  );
}
