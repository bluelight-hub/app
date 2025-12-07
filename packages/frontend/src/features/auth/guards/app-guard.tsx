import { useCurrentUser } from '@/features/auth';
import { AuthLoading } from '@/features/auth/ui';
import { Outlet, useRouter } from '@tanstack/react-router';

export function AppGuard() {
  const { isLoading, user } = useCurrentUser();
  const { navigate } = useRouter();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!user) {
    void navigate({
      to: '/auth',
    });
    return null;
  }

  return <Outlet />;
}
