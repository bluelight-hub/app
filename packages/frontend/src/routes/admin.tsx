import { createFileRoute } from '@tanstack/react-router';
import { AdminLayout } from '@templates/AdminLayout';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});
