import { AdminFahrzeugtypen } from '@/features/admin/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/kraefte/fahrzeugtypen')({
  component: AdminFahrzeugtypen,
  meta: () => [{ title: 'Fahrzeugtypen' }],
});
