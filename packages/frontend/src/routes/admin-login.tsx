import { Spinner } from '@/shared/ui/atoms/spinner.atom.tsx';
import { createFileRoute } from '@tanstack/react-router';
import { sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

const AdminLogin = lazy(() => import('@/features/admin/ui').then((m) => ({ default: m.AdminLogin })));
const searchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .transform((value) => sanitizeInternalRedirectPath(value)),
});

// Separate Route für Admin-Login, die das AdminLayout umgeht
export const Route = createFileRoute('/admin-login')({
  validateSearch: searchSchema,
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
