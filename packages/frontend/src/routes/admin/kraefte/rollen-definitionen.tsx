import { createFileRoute } from '@tanstack/react-router';
import { AdminRollenDefinitionen } from '@/features/admin';

export const Route = createFileRoute('/admin/kraefte/rollen-definitionen')({
  component: AdminRollenDefinitionen,
  meta: () => [{ title: 'Rollen-Definitionen' }],
});
