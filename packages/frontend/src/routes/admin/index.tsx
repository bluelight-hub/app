import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    // Leite von /admin zu /admin/dashboard weiter
    throw redirect({
      to: '/admin/dashboard',
    });
  },
});
