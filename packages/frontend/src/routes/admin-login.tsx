import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { Spinner } from '@atoms/spinner.atom.tsx';

const AdminLogin = lazy(() => import('@/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

// Separate Route für Admin-Login, die das AdminLayout umgeht
export const Route = createFileRoute('/admin-login')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <AdminLogin />
    </Suspense>
  ),
});
