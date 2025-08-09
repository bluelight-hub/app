import { createFileRoute } from '@tanstack/react-router';
import { LoginWindow } from '@/components/organisms/auth/LoginWindow';

export const Route = createFileRoute('/auth')({
  component: LoginWindow,
});
