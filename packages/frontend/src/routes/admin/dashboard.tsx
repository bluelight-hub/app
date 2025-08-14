import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const AdminDashboard = lazy(() =>
  import('@/components/pages/dashboard/admin/page').then((m) => ({
    default: m.AdminDashboard,
  })),
);

export const Route = createFileRoute('/admin/dashboard')({
  component: () => (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  ),
});
