import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { Center, Spinner } from '@chakra-ui/react';

const AdminLogin = lazy(() => import('@/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

// Separate Route für Admin-Login, die das AdminLayout umgeht
export const Route = createFileRoute('/admin-login')({
  component: () => (
    <Suspense
      fallback={
        <Center minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <Spinner size="lg" borderWidth="3px" />
        </Center>
      }
    >
      <AdminLogin />
    </Suspense>
  ),
});
