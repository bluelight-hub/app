import { useState } from 'react';
import { PiPlus, PiTrash } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

import { useKategorienByEinsatz, useDeleteKategorie } from '../../api';
import { KategorieChip } from '../atoms/KategorieChip';
import { CreateKategorieDialog } from './CreateKategorieDialog';

interface KategorieListProps {
  einsatzId: string;
  className?: string;
}

/**
 * Liste aller Kategorien eines Einsatzes mit Löschen-Button (Story 8.1).
 */
export function KategorieList({ einsatzId, className }: KategorieListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [kategorieToDelete, setKategorieToDelete] = useState<KategorieResponseDto | null>(null);
  const { data: kategorien, isLoading, isError, error } = useKategorienByEinsatz(einsatzId);
  const { mutate: deleteKategorie, isPending: isDeleting } = useDeleteKategorie();

  const handleDeleteClick = (kategorie: KategorieResponseDto) => {
    setKategorieToDelete(kategorie);
  };

  const handleConfirmDelete = () => {
    if (kategorieToDelete) {
      deleteKategorie(
        { einsatzId, kategorieId: kategorieToDelete.id },
        {
          onSuccess: () => {
            setKategorieToDelete(null);
          },
        },
      );
    }
  };

  if (isLoading) {
    return <LoadingState message="Kategorien werden geladen..." />;
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : 'Fehler beim Laden der Kategorien'} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header mit Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-lg dark:text-white">Kategorien</h3>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1.5 h-4 w-4" />
          Neue Kategorie
        </Button>
      </div>

      {/* Liste */}
      {kategorien && kategorien.length > 0 ? (
        <div className="space-y-2">
          {kategorien.map((kategorie) => (
            <div
              key={kategorie.id}
              className={cn(
                'flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-3',
                'hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600',
              )}
            >
              <KategorieChip name={kategorie.name} farbe={kategorie.farbe} />
              <button
                type="button"
                onClick={() => handleDeleteClick(kategorie)}
                disabled={isDeleting}
                className={cn(
                  'rounded-md p-2 text-gray-400 transition-colors',
                  'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
                aria-label={`${kategorie.name} löschen`}
              >
                <PiTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <PiPlus className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">Noch keine Kategorien vorhanden</p>
          <p className="mt-1 text-gray-500 text-xs dark:text-gray-500">Erstellen Sie eine neue Kategorie mit dem Button oben</p>
        </div>
      )}

      {/* Create Dialog */}
      <CreateKategorieDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} einsatzId={einsatzId} />

      {/* Delete Confirmation Dialog */}
      <Dialog.Confirm
        isOpen={!!kategorieToDelete}
        onClose={() => setKategorieToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Kategorie löschen?"
        message={
          <>
            Möchten Sie die Kategorie <strong>"{kategorieToDelete?.name}"</strong> wirklich löschen?
          </>
        }
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        variant="danger"
        isProcessing={isDeleting}
      />
    </div>
  );
}
