import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { useThemeStore } from '../src/stores/useThemeStore';
import '../src/index.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/montserrat';
import '@fontsource-variable/nunito';

// Initialize MSW
initialize({
  onUnhandledRequest: 'bypass',
});

// Create a client for each story
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Theme wrapper component
const ThemeWrapper = ({ theme, children }: { theme: string; children: React.ReactNode }) => {
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setTheme(theme as 'light' | 'dark');
    // Update document class for Tailwind
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, setTheme]);

  return <>{children}</>;
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
      },
    },
    docs: {
      autodocs: 'tag',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'dark', value: '#111827' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ThemeProvider>
              <ThemeWrapper theme={theme}>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                  <Story />
                </div>
              </ThemeWrapper>
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
  loaders: [mswLoader],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;