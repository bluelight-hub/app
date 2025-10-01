import { ErrorState } from '@/components/atoms/ErrorState';
import { LoadingState } from '@/components/atoms/LoadingState';
import { EtbEntryForm } from '@/components/organisms/etb/EtbEntryForm';
import { EtbEntryList } from '@/components/organisms/etb/EtbEntryList';
import { useEtbInfinite } from '@/hooks/useEtb';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

/**
 * ETB-Seite mit Eingabeformular und Eintragliste
 *
 * Zeigt das Einsatztagebuch für einen spezifischen Einsatz an.
 */
export function EtbPage() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/führung/etb' });
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useEtbInfinite(einsatzId, 30, sortBy, sortOrder, showDeleted); // 30 Einträge pro Seite

  const [editingEntry, setEditingEntry] = useState<EtbEintragDto | null>(null);

  // Handler für Sortierungsänderung
  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const allEntries = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data?.eintraege || []);
  }, [data]);

  const etb = data?.pages?.[0]?.data;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex h-96 items-center justify-center">
          <LoadingState message="Lade Einsatztagebuch..." />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Das Einsatztagebuch konnte nicht geladen werden." />;
  }

  if (!etb) {
    return <ErrorState title="ETB nicht verfügbar" description="Das Einsatztagebuch existiert nicht. Es sollte automatisch bei der Einsatz-Erstellung angelegt worden sein." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-semibold text-2xl text-gray-900 dark:text-gray-100">Einsatztagebuch</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Dokumentiere alle wichtigen Ereignisse und Maßnahmen während des Einsatzes.</p>
        </div>

        {/* Eingabeformular */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">{editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
            {editingEntry && (
              <button type="button" onClick={() => setEditingEntry(null)} className="text-gray-500 text-sm hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Abbrechen
              </button>
            )}
          </div>
          <EtbEntryForm
            etbId={etb?.id || ''}
            editingEntry={editingEntry}
            onSuccess={() => {
              setEditingEntry(null);
            }}
            onCancel={() => setEditingEntry(null)}
          />
        </div>

        {/* Eintragliste mit Infinite Scrolling */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-gray-200 border-b px-6 py-4 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">
              Einträge
              {data?.pages?.[0]?.pagination?.total ? (
                <span className="ml-2 text-gray-500 text-sm dark:text-gray-400">
                  ({allEntries.length} von {data.pages[0].pagination.total} geladen)
                </span>
              ) : (
                <span className="ml-2 text-gray-500 text-sm dark:text-gray-400">({allEntries.length})</span>
              )}
            </h2>
          </div>
          <div className="p-6" style={{ minHeight: '700px' }}>
            <EtbEntryList
              entries={allEntries}
              einsatzId={einsatzId}
              isLoading={isLoading}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEditEntry={(entry) => setEditingEntry(entry)}
              onSortChange={handleSortChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              enableInlineEdit={true}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
