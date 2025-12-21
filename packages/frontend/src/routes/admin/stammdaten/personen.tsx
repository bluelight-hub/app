import { AdminStammPersonen } from '@/features/admin/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/stammdaten/personen')({
  component: AdminStammPersonen,
  meta: () => [{ title: 'Stamm-Personen' }],
});
