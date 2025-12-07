import { createFileRoute } from '@tanstack/react-router';
import { LoginWindow } from '@/features/auth/ui';

export const Route = createFileRoute('/auth')({
  component: LoginWindow,
});
