import { useState, useEffect } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiPlus } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminBefehlsgeberVorschlaegeManagement, type BefehlsgeberVorschlagDto, type CreateBefehlsgeberVorschlagDto, type UpdateBefehlsgeberVorschlagDto } from '@/features/admin/api';
import { DeleteBefehlsgeberVorschlagDialog } from '../organisms/DeactivateBefehlsgeberVorschlagDialog';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { BefehlsgeberVorschlaegeTable } from '../organisms/BefehlsgeberVorschlaegeTable';
import { CreateBefehlsgeberVorschlagDialog } from '../organisms/CreateBefehlsgeberVorschlagDialog';
import { EditBefehlsgeberVorschlagDialog } from '../organisms/EditBefehlsgeberVorschlagDialog';

/**
 * Admin Befehlsgeber-Vorschlaege Page.
 *
 * Zeigt Tabelle aller Befehlsgeber-Vorschlaege mit CRUD-Operationen.
 * Nur fuer authentifizierte Admins zugaenglich.
 *
 * Keyboard Shortcuts:
 * - Ctrl+N / Cmd+N: Neuen Befehlsgeber-Vorschlag erstellen
 */
export function AdminBefehlsgeberVorschlaege() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const {
    befehlsgeberVorschlaege,
    isLoading: isBefehlsgeberVorschlaegeLoading,
    error,
    refetch,
    createBefehlsgeberVorschlag,
    updateBefehlsgeberVorschlag,
    deleteBefehlsgeberVorschlag,
    isCreating,
    isUpdating,
    isDeleting,
    updatingId,
    deletingId,
  } = useAdminBefehlsgeberVorschlaegeManagement();

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BefehlsgeberVorschlagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BefehlsgeberVorschlagDto | null>(null);

  // Keyboard Shortcuts: Ctrl+N / Cmd+N oeffnet Create Dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+N (Windows/Linux) oder Cmd+N (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault(); // Verhindert Browser "Neues Fenster"
        setIsCreateDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: Event Listener entfernen beim Unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Leeres Dependency Array - nur beim Mount/Unmount

  // Auth Guard
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Handlers
  const handleCreateBefehlsgeberVorschlag = (data: CreateBefehlsgeberVorschlagDto) => {
    createBefehlsgeberVorschlag(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleEditBefehlsgeberVorschlag = (vorschlag: BefehlsgeberVorschlagDto) => {
    setEditTarget(vorschlag);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBefehlsgeberVorschlag = (data: UpdateBefehlsgeberVorschlagDto) => {
    if (!editTarget) return;
    updateBefehlsgeberVorschlag(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditTarget(null);
        },
      },
    );
  };

  const handleDeleteBefehlsgeberVorschlag = (vorschlag: BefehlsgeberVorschlagDto) => {
    setDeleteTarget(vorschlag);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteBefehlsgeberVorschlag(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  // Loading State
  if (isAuthLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex flex-col gap-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="6xl" className="py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Heading size="lg" as="h1">
                Befehlsgeber-Vorschläge
              </Heading>
              <Text className="text-gray-600">Verwalten Sie die verfügbaren Vorschläge für Befehlsgeber.</Text>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline">
              <PiPlus className="mr-2" />
              Vorschlag hinzufügen
            </Button>
          </div>

          {/* Table */}
          <Card padding="lg">
            <BefehlsgeberVorschlaegeTable
              befehlsgeberVorschlaege={befehlsgeberVorschlaege || []}
              isLoading={isBefehlsgeberVorschlaegeLoading}
              error={error}
              onRetry={() => void refetch()}
              onEdit={handleEditBefehlsgeberVorschlag}
              onDelete={handleDeleteBefehlsgeberVorschlag}
              updatingId={updatingId}
              deletingId={deletingId}
              onCreateOpen={() => setIsCreateDialogOpen(true)}
            />
          </Card>
        </div>

        {/* Dialogs */}
        <CreateBefehlsgeberVorschlagDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateBefehlsgeberVorschlag} isSubmitting={isCreating} />

        <EditBefehlsgeberVorschlagDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSubmit={handleUpdateBefehlsgeberVorschlag}
          isSubmitting={isUpdating}
          vorschlag={editTarget}
        />

        <DeleteBefehlsgeberVorschlagDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} vorschlag={deleteTarget} isDeleting={isDeleting} />
      </Container>
    </ErrorBoundary>
  );
}
