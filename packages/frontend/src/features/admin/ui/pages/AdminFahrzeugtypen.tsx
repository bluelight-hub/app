import { useEffect, useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiPlus, PiWarning } from 'react-icons/pi';

import { useAdminAuth } from '@/features/auth/api';
import { useAdminFahrzeugtypenManagement, type CreateFahrzeugtypDto, type FahrzeugtypDto, type UpdateFahrzeugtypDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { CreateFahrzeugtypDialog } from '../organisms/CreateFahrzeugtypDialog';
import { DeactivateFahrzeugtypDialog } from '../organisms/DeactivateFahrzeugtypDialog';
import { EditFahrzeugtypDialog } from '../organisms/EditFahrzeugtypDialog';
import { FahrzeugtypenTable } from '../organisms/FahrzeugtypenTable';

/**
 * Admin Fahrzeugtypen Page.
 */
export function AdminFahrzeugtypen() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const {
    fahrzeugtypen,
    isLoading: isFahrzeugtypenLoading,
    error,
    refetch,
    createFahrzeugtyp,
    updateFahrzeugtyp,
    deactivateFahrzeugtyp,
    isCreating,
    isUpdating,
    isDeactivating,
    updatingId,
    deactivatingId,
  } = useAdminFahrzeugtypenManagement();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FahrzeugtypDto | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<FahrzeugtypDto | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        setIsCreateDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  const handleCreateFahrzeugtyp = (data: CreateFahrzeugtypDto) => {
    createFahrzeugtyp(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleEditFahrzeugtyp = (fahrzeugtyp: FahrzeugtypDto) => {
    setEditTarget(fahrzeugtyp);
    setIsEditDialogOpen(true);
  };

  const handleUpdateFahrzeugtyp = (data: UpdateFahrzeugtypDto) => {
    if (!editTarget) return;
    updateFahrzeugtyp(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditTarget(null);
        },
      },
    );
  };

  const handleDeactivateFahrzeugtyp = (fahrzeugtyp: FahrzeugtypDto) => {
    setDeactivateTarget(fahrzeugtyp);
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateFahrzeugtyp(deactivateTarget.id, {
      onSuccess: () => {
        setDeactivateTarget(null);
      },
    });
  };

  if (isAuthLoading || isFahrzeugtypenLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>

          <Card padding="none">
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- Static skeleton elements
                  <div key={`skeleton-${index}`} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
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

  if (error) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <Card padding="lg" className="text-center">
          <div className="flex flex-col items-center gap-4">
            <PiWarning className="h-12 w-12 text-status-danger-text" />
            <Heading size="md">Fehler beim Laden</Heading>
            <Text className="text-text-secondary">Die Fahrzeugtypen konnten nicht geladen werden.</Text>
            <Text className="text-sm text-text-muted">{error.message}</Text>
            <Button onClick={() => void refetch()} intent="primary" loading={isFahrzeugtypenLoading} disabled={isFahrzeugtypenLoading}>
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
          <div className="flex items-center justify-between">
            <div>
              <Heading size="lg" as="h1">
                Fahrzeugtypen
              </Heading>
              <Text className="text-text-secondary">Verwalten Sie Fahrzeugtypen für Einsatzrollen und Stammdaten.</Text>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline">
              <PiPlus className="mr-2" />
              Fahrzeugtyp hinzufügen
            </Button>
          </div>

          <Card padding="none">
            <FahrzeugtypenTable
              fahrzeugtypen={fahrzeugtypen || []}
              isLoading={isFahrzeugtypenLoading}
              onEdit={handleEditFahrzeugtyp}
              onDeactivate={handleDeactivateFahrzeugtyp}
              updatingId={updatingId}
              deactivatingId={deactivatingId}
            />
          </Card>
        </div>

        <CreateFahrzeugtypDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateFahrzeugtyp} isSubmitting={isCreating} />

        <EditFahrzeugtypDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSubmit={handleUpdateFahrzeugtyp}
          isSubmitting={isUpdating}
          fahrzeugtyp={editTarget}
        />

        <DeactivateFahrzeugtypDialog
          isOpen={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={confirmDeactivate}
          fahrzeugtyp={deactivateTarget}
          isDeactivating={isDeactivating}
        />
      </Container>
    </ErrorBoundary>
  );
}
