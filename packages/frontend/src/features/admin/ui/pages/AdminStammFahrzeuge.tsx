import { useState, useEffect } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiPlus } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminStammFahrzeugeManagement, type StammFahrzeugDto, type CreateStammFahrzeugDto, type UpdateStammFahrzeugDto } from '@/features/admin/api';
import { useFahrzeugtypen } from '@/features/einsatz/api/use-fahrzeugtypen';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { StammFahrzeugeTable } from '../organisms/StammFahrzeugeTable';
import { CreateStammFahrzeugDialog } from '../organisms/CreateStammFahrzeugDialog';
import { EditStammFahrzeugDialog } from '../organisms/EditStammFahrzeugDialog';
import { ArchiveStammFahrzeugDialog } from '../organisms/ArchiveStammFahrzeugDialog';

/**
 * Admin Stamm-Fahrzeuge Page.
 *
 * Zeigt Tabelle aller Stamm-Fahrzeuge mit CRUD-Operationen.
 * Nur für authentifizierte Admins zugänglich.
 *
 * Keyboard Shortcuts:
 * - Ctrl+N / Cmd+N: Neues Fahrzeug erstellen
 */
export function AdminStammFahrzeuge() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const {
    stammFahrzeuge,
    isLoading: isFahrzeugeLoading,
    error,
    refetch,
    createStammFahrzeug,
    updateStammFahrzeug,
    archiveStammFahrzeug,
    isCreating,
    isUpdating,
    isArchiving,
    updatingId,
    archivingId,
  } = useAdminStammFahrzeugeManagement();

  const { data: fahrzeugtypen, isLoading: fahrzeugtypenLoading } = useFahrzeugtypen();

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StammFahrzeugDto | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StammFahrzeugDto | null>(null);

  // Keyboard Shortcuts: Ctrl+N / Cmd+N öffnet Create Dialog
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

  // Auth Guard
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Handlers
  const handleCreateFahrzeug = (data: CreateStammFahrzeugDto) => {
    createStammFahrzeug(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleEditFahrzeug = (fahrzeug: StammFahrzeugDto) => {
    setEditTarget(fahrzeug);
    setIsEditDialogOpen(true);
  };

  const handleUpdateFahrzeug = (data: UpdateStammFahrzeugDto) => {
    if (!editTarget) return;
    updateStammFahrzeug(
      { id: editTarget.id, data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditTarget(null);
        },
      },
    );
  };

  const handleArchiveFahrzeug = (fahrzeug: StammFahrzeugDto) => {
    setArchiveTarget(fahrzeug);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveStammFahrzeug(archiveTarget.id, {
      onSuccess: () => {
        setArchiveTarget(null);
      },
    });
  };

  // Auth Loading State
  if (isAuthLoading) {
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
                Stamm-Fahrzeuge
              </Heading>
              <Text className="text-gray-600">Verwalten Sie die Fahrzeugflotte Ihrer Organisation.</Text>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline">
              <PiPlus className="mr-2" />
              Fahrzeug hinzufügen
            </Button>
          </div>

          {/* Table */}
          <Card padding="none">
            <StammFahrzeugeTable
              stammFahrzeuge={stammFahrzeuge || []}
              isLoading={isFahrzeugeLoading}
              error={error}
              onRetry={() => void refetch()}
              onEdit={handleEditFahrzeug}
              onArchive={handleArchiveFahrzeug}
              updatingId={updatingId}
              archivingId={archivingId}
              onCreateOpen={() => setIsCreateDialogOpen(true)}
            />
          </Card>
        </div>

        {/* Dialogs */}
        <CreateStammFahrzeugDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateFahrzeug}
          isSubmitting={isCreating}
          fahrzeugtypen={fahrzeugtypen || []}
          fahrzeugtypenLoading={fahrzeugtypenLoading}
        />

        <EditStammFahrzeugDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSubmit={handleUpdateFahrzeug}
          isSubmitting={isUpdating}
          fahrzeug={editTarget}
        />

        <ArchiveStammFahrzeugDialog isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={confirmArchive} fahrzeug={archiveTarget} isArchiving={isArchiving} />
      </Container>
    </ErrorBoundary>
  );
}
