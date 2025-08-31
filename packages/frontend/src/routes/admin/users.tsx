import { AdminUsers } from '@pages/admin/settings/AdminUsers';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
});
