import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>Hey Bluelight hub!</div>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
