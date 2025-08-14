import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TanstackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ResponseError } from '@bluelight-hub/shared/client';
import { Provider } from '@/components/ui/provider.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';

interface RootContext {
  pageTitle?: string;
}

export const Route = createRootRouteWithContext<RootContext>()({
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
        <Outlet />
        <TanstackDevtools
          plugins={[
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Toaster />
      </QueryClientProvider>
    </Provider>
  );
}
