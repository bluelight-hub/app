import { AuthLoading } from '@/components/molecules/auth/AuthLoading';
import { useCurrentUser } from '@/features/auth';
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
