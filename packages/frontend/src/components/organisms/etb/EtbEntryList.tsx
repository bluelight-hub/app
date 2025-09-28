import { useDeleteEtbEintrag } from '@/hooks/useEtb';
import { useUserNames } from '@/hooks/useUsers';
import { cn } from '@/utils/cn';
import { Button } from '@atoms/button.atom';
import { CreateEtbEintragDtoKategorieEnum as EtbKategorie, type EtbEintragDto } from '@bluelight-hub/shared/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo, useRef } from 'react';
import { PiClock, PiPencil, PiTrash, PiUser } from 'react-icons/pi';

interface EtbEntryListProps {
  entries: EtbEintragDto[];
  isLoading?: boolean;
  onEditEntry?: (entry: EtbEintragDto) => void;
}

/**
 * Farben für verschiedene Kategorien
 */
const kategorieFarben: Record<EtbKategorie, string> = {
  [EtbKategorie.Alarmierung]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EtbKategorie.Ankunft]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [EtbKategorie.Befehl]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [EtbKategorie.Erkundung]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EtbKategorie.Lage]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EtbKategorie.Massnahme]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  [EtbKategorie.Personal]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EtbKategorie.Fahrzeug]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  [EtbKategorie.Material]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  [EtbKategorie.Kommunikation]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  [EtbKategorie.Wetter]: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  [EtbKategorie.Sonstiges]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [EtbKategorie.System]: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

/**
 * Kategorie-Labels für bessere Lesbarkeit
 */
const kategorieLabels: Record<EtbKategorie, string> = {
  [EtbKategorie.Alarmierung]: 'Alarmierung',
  [EtbKategorie.Ankunft]: 'Ankunft',
  [EtbKategorie.Befehl]: 'Befehl',
  [EtbKategorie.Erkundung]: 'Erkundung',
  [EtbKategorie.Lage]: 'Lage',
  [EtbKategorie.Massnahme]: 'Maßnahme',
  [EtbKategorie.Personal]: 'Personal',
  [EtbKategorie.Fahrzeug]: 'Fahrzeug',
  [EtbKategorie.Material]: 'Material',
  [EtbKategorie.Kommunikation]: 'Kommunikation',
  [EtbKategorie.Wetter]: 'Wetter',
  [EtbKategorie.Sonstiges]: 'Sonstiges',
  [EtbKategorie.System]: 'System',
};

/**
 * ETB-Einträge-Liste mit Virtual Scrolling
 *
 * Zeigt ETB-Einträge in chronologischer Reihenfolge (neueste zuerst) mit
 * virtualisiertem Rendering für bessere Performance bei vielen Einträgen.
 */
export function EtbEntryList({ entries, isLoading, onEditEntry }: EtbEntryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const deleteEintrag = useDeleteEtbEintrag();

  // Sortiere Einträge nach Zeitstempel (neueste zuerst)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  }, [entries]);

  // Virtual Scrolling Setup
  const virtualizer = useVirtualizer({
    count: sortedEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Geschätzte Höhe eines Eintrags
    overscan: 5, // Anzahl der Einträge außerhalb des sichtbaren Bereichs zu rendern
  });

  const handleDelete = (entry: EtbEintragDto) => {
    if (window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      deleteEintrag.mutate({
        eintragId: entry.id,
        einsatzId: entry.etbId,
      });
    }
  };

  // Empty State
  if (!isLoading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-700">
          <PiClock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-medium text-gray-900 text-lg dark:text-gray-100">Keine Einträge vorhanden</h3>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Fügen Sie den ersten Eintrag zum Einsatztagebuch hinzu.</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto px-6 py-4" style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = sortedEntries[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EtbEntryCard entry={entry} onEdit={() => onEditEntry?.(entry)} onDelete={() => handleDelete(entry)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EtbEntryCardProps {
  entry: EtbEintragDto;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Einzelne ETB-Eintragskarte
 */
function EtbEntryCard({ entry, onEdit, onDelete }: EtbEntryCardProps) {
  const { getUserName } = useUserNames();

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header mit Zeitstempel und Kategorie */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-medium font-mono text-gray-900 text-sm dark:text-gray-100">#{entry.sequenceNumber}</span>
            <time className="text-gray-500 text-sm dark:text-gray-400">{format(new Date(entry.timestamp), 'HH:mm:ss', { locale: de })}</time>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs', kategorieFarben[entry.kategorie])}>{kategorieLabels[entry.kategorie]}</span>
            {entry.funkrufname && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700 text-xs dark:bg-gray-700 dark:text-gray-300">📻 {entry.funkrufname}</span>}
            {entry.standort && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700 text-xs dark:bg-gray-700 dark:text-gray-300">📍 {entry.standort}</span>}
            {entry.isAutomatic && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">🤖 Automatisch</span>}
          </div>

          {/* Text-Inhalt */}
          <p className="whitespace-pre-wrap text-gray-900 text-sm dark:text-gray-100">{entry.text}</p>

          {/* Footer mit Meta-Infos */}
          <div className="mt-2 flex items-center gap-4 text-gray-500 text-xs dark:text-gray-400">
            <div className="flex items-center gap-1">
              <PiUser className="h-3 w-3" />
              <span>Erstellt von {getUserName(entry.createdBy)}</span>
            </div>
            {entry.updatedBy && entry.updatedAt !== entry.createdAt && (
              <div className="flex items-center gap-1">
                <PiPencil className="h-3 w-3" />
                <span>
                  Bearbeitet von {getUserName(entry.updatedBy)} um {format(new Date(entry.updatedAt), 'HH:mm', { locale: de })}
                </span>
              </div>
            )}
            {entry.version > 1 && <span className="text-gray-400">Version {entry.version}</span>}
          </div>
        </div>

        {/* Aktionsbuttons */}
        <div className="ml-4 flex gap-1">
          <Button appearance="ghost" size="xs" onClick={onEdit} className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400" aria-label="Eintrag bearbeiten">
            <PiPencil className="h-4 w-4" />
          </Button>
          <Button appearance="ghost" size="xs" onClick={onDelete} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" aria-label="Eintrag löschen">
            <PiTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
