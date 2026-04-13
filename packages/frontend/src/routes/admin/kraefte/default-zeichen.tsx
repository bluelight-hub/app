import { AdminDefaultZeichen } from '@/features/admin/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/kraefte/default-zeichen')({
  component: AdminDefaultZeichen,
  meta: () => [{ title: 'Default-Zeichen' }],
});
