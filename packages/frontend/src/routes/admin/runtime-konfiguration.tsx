import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const AdminRuntimeConfig = lazy(() =>
  import('@/features/admin/ui').then((module) => ({
    default: module.AdminRuntimeConfig,
  })),
);

export const Route = createFileRoute('/admin/runtime-konfiguration')({
  head: () => ({
    meta: [{ title: 'Admin | Secret-Verwaltung' }],
  }),
  component: () => (
    <Suspense fallback={null}>
      <AdminRuntimeConfig />
    </Suspense>
  ),
});
