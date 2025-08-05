import { createFileRoute } from '@tanstack/react-router';
import AdminUsers from '@/pages/AdminUsers';

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
});
