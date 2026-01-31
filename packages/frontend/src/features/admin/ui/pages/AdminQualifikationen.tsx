import { useState, useEffect } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiPlus, PiWarning } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api/use-current-user';
import { useAdminQualifikationenManagement, type QualifikationDto, type CreateQualifikationDto, type UpdateQualifikationDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { QualifikationenTable } from '../organisms/QualifikationenTable';
import { CreateQualifikationDialog } from '../organisms/CreateQualifikationDialog';
import { EditQualifikationDialog } from '../organisms/EditQualifikationDialog';
import { DeactivateQualifikationDialog } from '../organisms/DeactivateQualifikationDialog';

/**
 * Admin Qualifikationen Page.
 *
 * Zeigt Tabelle aller Qualifikationen mit CRUD-Operationen.
 * Nur für authentifizierte Admins zugänglich.
 *
 * Keyboard Shortcuts:
 * - Ctrl+N / Cmd+N: Neue Qualifikation erstellen
 */
export function AdminQualifikationen() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const {
    qualifikationen,
    isLoading: isQualifikationenLoading,
    error,
    refetch,
    createQualifikation,
    updateQualifikation,
    deactivateQualifikation,
    isCreating,
    isUpdating,
    isDeactivating,
    updatingId,
    deactivatingId,
  } = useAdminQualifikationenManagement();

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QualifikationDto | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<QualifikationDto | null>(null);

  // Keyboard Shortcuts: Ctrl+N / Cmd+N öffnet Create Dialog
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
  const handleCreateQualifikation = (data: CreateQualifikationDto) => {
    createQualifikation(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleEditQualifikation = (qualifikation: QualifikationDto) => {
    setEditTarget(qualifikation);
    setIsEditDialogOpen(true);
  };

  const handleUpdateQualifikation = (data: UpdateQualifikationDto) => {
    if (!editTarget) return;
    updateQualifikation(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditTarget(null);
        },
      },
    );
  };

  const handleDeactivateQualifikation = (qualifikation: QualifikationDto) => {
    setDeactivateTarget(qualifikation);
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateQualifikation(deactivateTarget.id, {
      onSuccess: () => {
        setDeactivateTarget(null);
      },
    });
  };

  // Loading State
  if (isAuthLoading || isQualifikationenLoading) {
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

          {/* Table Skeleton */}
          <Card padding="none">
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton elements - order never changes
                  <div key={`skeleton-${index}`} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  // Error State
  if (error) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <Card padding="lg" className="text-center">
          <div className="flex flex-col items-center gap-4">
            <PiWarning className="h-12 w-12 text-red-500" />
            <Heading size="md">Fehler beim Laden</Heading>
            <Text className="text-gray-600">Die Qualifikationen konnten nicht geladen werden.</Text>
            <Text className="text-gray-500 text-sm">{error.message}</Text>
            <Button onClick={() => void refetch()} intent="primary" loading={isQualifikationenLoading} disabled={isQualifikationenLoading}>
              Erneut versuchen
            </Button>
          </div>
        </Card>
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
                Qualifikationen
              </Heading>
              <Text className="text-gray-600">Verwalten Sie die verfügbaren Qualifikationen für Kräfte.</Text>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline">
              <PiPlus className="mr-2" />
              Qualifikation hinzufügen
            </Button>
          </div>

          {/* Table */}
          <Card padding="none">
            <QualifikationenTable
              qualifikationen={qualifikationen || []}
              isLoading={isQualifikationenLoading}
              onEdit={handleEditQualifikation}
              onDeactivate={handleDeactivateQualifikation}
              updatingId={updatingId}
              deactivatingId={deactivatingId}
            />
          </Card>
        </div>

        {/* Dialogs */}
        <CreateQualifikationDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateQualifikation} isSubmitting={isCreating} />

        <EditQualifikationDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSubmit={handleUpdateQualifikation}
          isSubmitting={isUpdating}
          qualifikation={editTarget}
        />

        <DeactivateQualifikationDialog
          isOpen={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={confirmDeactivate}
          qualifikation={deactivateTarget}
          isDeactivating={isDeactivating}
        />
      </Container>
    </ErrorBoundary>
  );
}
