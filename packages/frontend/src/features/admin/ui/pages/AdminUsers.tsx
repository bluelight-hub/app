import { useAdminUserManagement } from '@/features/admin';
import { useAdminAuth } from '@/features/auth';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { type CreateUserDto, type ManagedUserResponseDto, ManagedUserResponseDtoRoleEnum } from '@/shared';
import type { EditUserFormData } from '@/features/admin/ui/organisms/EditUserDialog';
import type { ChangeOperativeRoleDtoOperativeRoleEnum } from '@/shared';
import { ConfirmDeleteDialog, type UserActionType } from '@/features/admin/ui/organisms/ConfirmDeleteDialog';
import { CreateUserDialog } from '@/features/admin/ui/organisms/CreateUserDialog';
import { EditUserDialog } from '@/features/admin/ui/organisms/EditUserDialog';
import { UsersTable } from '@/features/admin/ui/organisms/UsersTable';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PiPlus, PiWarning } from 'react-icons/pi';

export function AdminUsers() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const {
    usersData,
    isLoading: isUsersLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    lockUser,
    unlockUser,
    changeOperativeRole,
    assignStammperson,
    isCreating,
    isUpdating,
    isDeleting,
    isLocking,
    isUnlocking,
    isChangingOperativeRole,
    isAssigningStammperson,
  } = useAdminUserManagement();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUserResponseDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUserResponseDto | null>(null);
  const [operativeRoleFilter, setOperativeRoleFilter] = useState('');
  const [showOnlyWithoutStammperson, setShowOnlyWithoutStammperson] = useState(false);

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

  const handleEditUser = (user: ManagedUserResponseDto) => {
    setEditTarget(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (id: string, data: EditUserFormData) => {
    try {
      // 1. Basis-Daten updaten (username + role)
      await updateUser({ id, data: { username: data.username, role: data.role } });

      // 2. Operative Rolle ändern (nur wenn geändert)
      const currentUser = usersData?.data?.find((u) => u.id === id);
      if (currentUser?.operativeRole !== data.operativeRole) {
        await changeOperativeRole({ id, operativeRole: data.operativeRole as ChangeOperativeRoleDtoOperativeRoleEnum });
      }

      // 3. Stammperson zuweisen (nur wenn geändert)
      const currentStammpersonId = currentUser?.stammperson?.id || null;
      if (currentStammpersonId !== data.stammpersonId) {
        await assignStammperson({ id, stammpersonId: data.stammpersonId });
      }

      setIsEditDialogOpen(false);
      setEditTarget(null);
    } catch {
      // Fehler werden in den Mutations per Toast gehandelt
    }
  };

  const handleDeleteUser = (user: ManagedUserResponseDto) => {
    setDeleteTarget(user);
  };

  const handleUnlockUser = (user: ManagedUserResponseDto) => {
    unlockUser(user.id);
  };

  const confirmDelete = (action: UserActionType, lockReason?: string) => {
    if (!deleteTarget) return;

    switch (action) {
      case 'delete':
        deleteUser(
          { id: deleteTarget.id, downgradeAdmin: false },
          {
            onSettled: () => {
              setDeleteTarget(null);
            },
          },
        );
        break;
      case 'downgrade':
        deleteUser(
          { id: deleteTarget.id, downgradeAdmin: true },
          {
            onSettled: () => {
              setDeleteTarget(null);
            },
          },
        );
        break;
      case 'lock':
        lockUser(
          { id: deleteTarget.id, reason: lockReason },
          {
            onSettled: () => {
              setDeleteTarget(null);
            },
          },
        );
        break;
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
          <Button onClick={() => setIsCreateDialogOpen(true)} intent="primary" appearance="outline">
            <PiPlus className="mr-2" />
            Benutzer hinzufügen
          </Button>
        </div>

        <Card padding="md">
          <UsersTable
            users={usersData?.data}
            isLoading={isUsersLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onUnlock={handleUnlockUser}
            operativeRoleFilter={operativeRoleFilter}
            onOperativeRoleFilterChange={setOperativeRoleFilter}
            showOnlyWithoutStammperson={showOnlyWithoutStammperson}
            onShowOnlyWithoutStammpersonChange={setShowOnlyWithoutStammperson}
          />
        </Card>
      </div>

      <CreateUserDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateUser} isSubmitting={isCreating} />

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleUpdateUser}
        isSubmitting={isUpdating || isChangingOperativeRole || isAssigningStammperson}
        user={editTarget}
        allUsers={usersData?.data}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        userName={deleteTarget?.username || ''}
        userRole={deleteTarget?.role || ManagedUserResponseDtoRoleEnum.User}
        isDeleting={isDeleting || isLocking || isUnlocking}
      />
    </Container>
  );
}
