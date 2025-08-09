import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { Center, Spinner } from '@chakra-ui/react';

const AdminLogin = lazy(() => import('@/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

export const Route = createFileRoute('/admin/login')({
  component: () => (
    <Suspense
      fallback={
        <Center py={8}>
          <Spinner size="lg" thickness="3px" />
        </Center>
      }
    >
      <AdminLogin />
    </Suspense>
  ),
});
