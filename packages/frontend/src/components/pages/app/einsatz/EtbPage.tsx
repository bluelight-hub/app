import { ErrorState } from '@/components/atoms/ErrorState';
import { LoadingState } from '@/components/atoms/LoadingState';
import { EtbEntryForm } from '@/components/organisms/etb/EtbEntryForm';
import { EtbEntryList } from '@/components/organisms/etb/EtbEntryList';
import { useCreateEtb, useEtb } from '@/hooks/useEtb';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

/**
 * ETB-Seite mit Eingabeformular und Eintragliste
 *
 * Zeigt das Einsatztagebuch für einen spezifischen Einsatz an.
 */
export function EtbPage() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/führung/etb' });
  const { data: etbResponse, isLoading, error, refetch } = useEtb(einsatzId, 1, 50);
  const createEtb = useCreateEtb();
  const [editingEntry, setEditingEntry] = useState<EtbEintragDto | null>(null);

  // Erstelle automatisch ein ETB, wenn noch keins existiert (404 bedeutet kein ETB vorhanden)
  useEffect(() => {
    if (!isLoading && error && (error as any)?.response?.status === 404 && !createEtb.isPending && !createEtb.isSuccess) {
      createEtb.mutate(
        {
          einsatzId,
        },
        {
          onSuccess: () => {
            // Nach Erstellung das ETB neu laden
            refetch();
          },
        },
      );
    }
  }, [isLoading, error, einsatzId, createEtb, refetch]);

  if (isLoading || createEtb.isPending) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade Einsatztagebuch..." />
      </div>
    );
  }

  if (error && (error as any)?.response?.status !== 404) {
    return <ErrorState title="Fehler beim Laden" description="Das Einsatztagebuch konnte nicht geladen werden." />;
  }

  const etb = etbResponse?.data;

  if (!etb) {
    return <ErrorState title="ETB nicht verfügbar" description="Das Einsatztagebuch konnte nicht erstellt werden." />;
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">{editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
            {editingEntry && (
              <button type="button" onClick={() => setEditingEntry(null)} className="text-gray-500 text-sm hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Abbrechen
              </button>
            )}
          </div>
          <EtbEntryForm etbId={etb.id} editingEntry={editingEntry} onSuccess={() => setEditingEntry(null)} onCancel={() => setEditingEntry(null)} />
        </div>

        {/* Eintragliste */}
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-gray-200 border-b px-6 py-4 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">Einträge ({etb.eintraege?.length || 0})</h2>
          </div>
          <EtbEntryList entries={etb.eintraege || []} isLoading={isLoading} onEditEntry={(entry) => setEditingEntry(entry)} />
        </div>
      </div>
    </div>
  );
}
