import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Greeting } from '@molecules/greeting.molecule.tsx';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Greeting />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
