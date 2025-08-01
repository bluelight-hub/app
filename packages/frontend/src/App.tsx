import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Greeting } from '@molecules/greeting.molecule';
import { Provider } from '@/components/ui/provider';

const queryClient = new QueryClient();

function App() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <Greeting />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
