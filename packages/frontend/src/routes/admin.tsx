import { createFileRoute } from '@tanstack/react-router';
import { AdminLayout } from '@/shared/ui/templates/AdminLayout';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});
