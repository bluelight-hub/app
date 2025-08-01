import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Provider } from '@/components/ui/provider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const Route = createRootRoute({
  component: RootComponent,
});

const queryClient = new QueryClient();

function RootComponent() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <div>Hello "__root"!</div>
        <Outlet />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </Provider>
  );
}
