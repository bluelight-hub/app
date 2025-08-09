import { Outlet, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ResponseError } from '@bluelight-hub/shared/client';
import { Provider } from '@/components/ui/provider.tsx';
import { AuthProvider } from '@/provider/auth.provider.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';

export const Route = createRootRoute({
  component: RootComponent,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Bei 401 nicht wiederholen
        if ((error as ResponseError).response.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      // Zeige keine globalen Error-Toasts für 401-Fehler
      throwOnError: (error) => {
        const status = (error as ResponseError).response.status;
        return status !== 401;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

function RootComponent() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWithAdminRefresh />
          <ReactQueryDevtools />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

function AppWithAdminRefresh() {
  // User-Authentifizierung beim App-Start wiederherstellen
  // Dies prüft auch den Admin-Status über das Backend
  useAuthRefresh();

  return <Outlet />;
}
