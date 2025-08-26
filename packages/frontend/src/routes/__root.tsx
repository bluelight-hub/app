import { TanstackDevtools } from '@tanstack/react-devtools';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { Provider } from '@/components/ui/provider.tsx';
import { handleQueryError } from '@/utils/error-handler';

interface RootContext {
  pageTitle?: string;
}

export const Route = createRootRouteWithContext<RootContext>()({
  component: RootComponent,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Handle all query errors globally
      handleQueryError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Handle all mutation errors globally
      handleQueryError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Try to get status from error if it's a ResponseError
        const status = (error as { response?: { status?: number } })?.response?.status;

        // Don't retry on 401 (authentication) errors
        if (status === 401) {
          return false;
        }
        // Don't retry on 4xx client errors
        if (status && status >= 400 && status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      // Don't throw errors globally (we handle them in onError)
      throwOnError: false,
    },
    mutations: {
      retry: false,
      // Don't throw errors globally (we handle them in onError)
      throwOnError: false,
    },
  },
});

function RootComponent() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <div className="absolute">
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
        </div>
        <Toaster duration={5000} position="bottom-right" closeButton />
      </QueryClientProvider>
    </Provider>
  );
}
