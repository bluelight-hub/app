import { AuthLoading } from '@/components/molecules/auth/AuthLoading';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Outlet, useRouter } from '@tanstack/react-router';

export function AppGuard() {
  const { isLoading, user } = useAuth();
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
