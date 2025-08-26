import type { CreateUserDto, UserDto } from '@bluelight-hub/shared/client';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PiPlus, PiWarning } from 'react-icons/pi';
import { Alert } from '@/components/atoms/alert.atom';
import { Button } from '@/components/atoms/button.atom';
import { Card } from '@/components/atoms/card.atom';
import { Container } from '@/components/atoms/container.atom';
import { Heading } from '@/components/atoms/heading.atom';
import { Spinner } from '@/components/atoms/spinner.atom';
import { ConfirmDeleteDialog } from '@/components/organisms/admin/ConfirmDeleteDialog';
import { CreateUserDialog } from '@/components/organisms/admin/CreateUserDialog';
import { UsersTable } from '@/components/organisms/admin/UsersTable';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';

export function AdminUsers() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const { usersData, isLoading: isUsersLoading, error, createUser, deleteUser, isCreating, isDeleting } = useAdminUserManagement();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  // Redirect if not admin
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  const handleCreateUser = (data: CreateUserDto) => {
    createUser(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleDeleteUser = (user: UserDto) => {
    setDeleteTarget(user);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteUser(deleteTarget.id, {
        onSettled: () => {
          setDeleteTarget(null);
        },
      });
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Alert status="error" title="Fehler beim Laden der Benutzer" description={error.message} icon={<PiWarning className="h-6 w-6" />} />
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="6xl" className="py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Heading size="lg" as="h1">
            Benutzerverwaltung
          </Heading>
          <Button onClick={() => setIsCreateDialogOpen(true)} variant="primary">
            <PiPlus className="mr-2" />
            Benutzer hinzufügen
          </Button>
        </div>

        <Card padding="md">
          <UsersTable users={usersData?.data} isLoading={isUsersLoading} onDelete={handleDeleteUser} />
        </Card>
      </div>

      <CreateUserDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateUser} isSubmitting={isCreating} />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        userName={deleteTarget?.username || ''}
        userRole={deleteTarget?.role || 'user'}
        isDeleting={isDeleting}
      />
    </Container>
  );
}
