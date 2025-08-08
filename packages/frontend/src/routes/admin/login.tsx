import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const AdminLogin = lazy(() => import('@/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

export const Route = createFileRoute('/admin/login')({
  component: () => (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  ),
});
