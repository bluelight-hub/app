import { useCurrentUser } from '@/features/auth';
import { setRedirectAfterLogin } from '@/features/auth/stores/auth.store';
import { getCurrentPathWithQueryAndHash, sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';
import { AuthLoading } from '@/features/auth/ui';
import { Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';

export function AppGuard() {
  const { authStatus, user } = useCurrentUser();
  const { navigate } = useRouter();
  const location = useLocation();

  const redirectTarget = useMemo(() => {
    return sanitizeInternalRedirectPath(getCurrentPathWithQueryAndHash(location.pathname)) ?? '/';
  }, [location.pathname]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      setRedirectAfterLogin(redirectTarget);
      void navigate({
        to: '/auth',
        search: {
          redirect: redirectTarget,
        },
        replace: true,
      });
    }
  }, [authStatus, navigate, redirectTarget]);

  if (authStatus === 'pending') {
    return <AuthLoading />;
  }

  if (authStatus === 'unauthenticated' || !user) {
    return <AuthLoading />;
  }

  return <Outlet />;
}
