import '@mdxeditor/editor/style.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './providers/ThemeProvider';
import { Router } from './router';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <ThemeProvider>
          <Router />
        </ThemeProvider>
      </AntdApp>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
