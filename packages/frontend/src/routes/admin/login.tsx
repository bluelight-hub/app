import { createFileRoute } from '@tanstack/react-router';
import { AdminLogin } from '@/pages/AdminLogin';

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
});
