import { useState } from 'react';
import { PiPlus, PiTrash } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

import { useKategorienByEinsatz, useDeleteKategorie } from '../../api';
import { KategorieChip } from '@/features/kategorien';
import { CreateKategorieDialog } from '@/features/kategorien';

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
        <h3 className="text-lg font-semibold text-text-primary">Kategorien</h3>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1.5 h-4 w-4" />
          Neue Kategorie
        </Button>
      </div>

      {/* Liste */}
      {kategorien && kategorien.length > 0 ? (
        <div className="space-y-2">
          {kategorien.map((kategorie) => (
            <div key={kategorie.id} className={cn('flex items-center justify-between rounded-panel border-2 border-border-subtle bg-surface-panel p-3', 'hover:border-border-strong')}>
              <KategorieChip name={kategorie.name} farbe={kategorie.farbe} />
              <button
                type="button"
                onClick={() => handleDeleteClick(kategorie)}
                disabled={isDeleting}
                className={cn(
                  'rounded-control p-2 text-text-muted transition-colors',
                  'hover:bg-status-danger-surface hover:text-status-danger-text',
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
        <div className="rounded-panel border-2 border-dashed border-border-subtle bg-surface-raised p-8 text-center">
          <PiPlus className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-2 text-sm text-text-secondary">Noch keine Kategorien vorhanden</p>
          <p className="mt-1 text-xs text-text-muted">Erstellen Sie eine neue Kategorie mit dem Button oben</p>
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
