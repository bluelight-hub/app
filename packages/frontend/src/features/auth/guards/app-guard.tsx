import { useCurrentUser } from '@/features/auth';
import { AuthLoading } from '@/features/auth/ui';
import { Outlet, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

export function AppGuard() {
  const { isLoading, user } = useCurrentUser();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      void navigate({
        to: '/auth',
      });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AuthLoading />;
  }

  return <Outlet />;
}
