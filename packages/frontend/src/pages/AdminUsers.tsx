import { useState } from 'react';
import { Box, Button, Center, Container, HStack, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { FiAlertTriangle, FiPlus } from 'react-icons/fi';
import { Navigate } from '@tanstack/react-router';
import type { CreateUserDto, UserDto } from '@bluelight-hub/shared/client';
import { UsersTable } from '@/components/organisms/admin/UsersTable';
import { useCreateUser, useDeleteUser, useUsers } from '@/hooks/useUserManagement';
import { CreateUserDialog } from '@/components/organisms/admin/CreateUserDialog';
import { ConfirmDeleteDialog } from '@/components/organisms/admin/ConfirmDeleteDialog';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminUsers() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const { data: usersData, isLoading: isUsersLoading, error } = useUsers();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  // Redirect if not admin
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  const handleCreateUser = (data: CreateUserDto) => {
    createUserMutation.mutate(data, {
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
      deleteUserMutation.mutate(deleteTarget.id, {
        onSettled: () => {
          setDeleteTarget(null);
        },
      });
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <Container py={8}>
        <Center h="50vh">
          <Spinner size="xl" />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container py={8}>
        <Center h="50vh">
          <VStack>
            <FiAlertTriangle size={48} color="var(--colors-red-500)" />
            <Text>Fehler beim Laden der Benutzer</Text>
            <Text fontSize="sm" color="fg.muted">
              {error.message}
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Benutzerverwaltung</Heading>
          <Button onClick={() => setIsCreateDialogOpen(true)} colorPalette="blue">
            <FiPlus />
            Benutzer hinzufügen
          </Button>
        </HStack>

        <Box bg="bg.panel" borderRadius="lg" p={6} shadow="sm">
          <UsersTable users={usersData?.data} isLoading={isUsersLoading} onDelete={handleDeleteUser} />
        </Box>
      </VStack>

      <CreateUserDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onSubmit={handleCreateUser} isSubmitting={createUserMutation.isPending} />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        userName={deleteTarget?.username || ''}
        userRole={deleteTarget?.role || ''}
        isDeleting={deleteUserMutation.isPending}
      />
    </Container>
  );
}
