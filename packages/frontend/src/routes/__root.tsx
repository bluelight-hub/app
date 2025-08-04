import { Outlet, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider } from '@/components/ui/provider.tsx';
import { AuthProvider } from '@/provider/auth.provider.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { useAdminRefresh } from '@/hooks/useAdminRefresh';

export const Route = createRootRoute({
  component: RootComponent,
});

const queryClient = new QueryClient();

function RootComponent() {
  return (
    <Provider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppWithAdminRefresh />
          <ReactQueryDevtools />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </Provider>
  );
}

function AppWithAdminRefresh() {
  // Admin-Token-Verifizierung beim App-Start
  useAdminRefresh();

  return <Outlet />;
}
