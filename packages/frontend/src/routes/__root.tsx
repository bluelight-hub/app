import { Provider } from '@/components/ui/provider.tsx';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { handleQueryError } from '@/utils/error-handler';
import { TanstackDevtools } from '@tanstack/react-devtools';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';

interface RootContext {
  pageTitle?: string;
}

export const Route = createRootRouteWithContext<RootContext>()({
  component: RootComponent,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: async (error, query) => {
      // Handle all query errors globally (with query context for 401 handling)
      await handleQueryError(error, query);

      // If it was a 401 error and token refresh was successful, retry the query
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        // Small delay to ensure cookies are updated
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: query.queryKey });
        }, 100);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: async (error) => {
      // Handle all mutation errors globally
      await handleQueryError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Try to get status from error if it's a ResponseError
        const response = (error as { response?: { status?: number; url: string } })?.response;
        const status = response?.status;

        // Check if this is an auth-related query with robust path boundary detection
        const isAuthQuery = !!response?.url && /\/auth(\/|$)/i.test(response.url);

        // Never retry auth-related queries
        if (isAuthQuery) {
          return false;
        }

        // Allow one retry for 401 errors (after token refresh) for non-auth queries
        if (status === 401) {
          return failureCount < 1;
        }
        // Don't retry on other 4xx client errors
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
        <ConfirmProvider>
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
        </ConfirmProvider>
      </QueryClientProvider>
    </Provider>
  );
}
