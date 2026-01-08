import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Erstellt einen neuen QueryClient für Tests mit deaktivierten Retries
 * und ohne Fehlerlogging.
 *
 * Nutze diese Factory für jeden Test um isolierte QueryClient-Instanzen
 * zu garantieren und Test-Pollution zu vermeiden.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

interface TestProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper-Komponente die alle notwendigen Provider für Tests bereitstellt.
 *
 * Standardmäßig wird ein neuer QueryClient erstellt. Alternativ kann ein
 * eigener QueryClient übergeben werden um Query-State zu mocken.
 */
export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render Funktion die automatisch TestProviders wrapped.
 *
 * Nutze diese Funktion statt @testing-library/react render() um
 * konsistente Test-Umgebung mit QueryClient zu garantieren.
 *
 * @example
 * ```typescript
 * const { getByText } = renderWithProviders(<MyComponent />);
 * expect(getByText('Hello')).toBeInTheDocument();
 * ```
 */
export function renderWithProviders(ui: ReactElement, { queryClient, ...options }: CustomRenderOptions = {}) {
  return render(ui, {
    wrapper: ({ children }) => <TestProviders queryClient={queryClient}>{children}</TestProviders>,
    ...options,
  });
}

/**
 * Factory für Mock-User-Objekte in Tests.
 *
 * Erstellt ein valides User-Objekt mit Default-Werten die
 * in Tests überschrieben werden können.
 */
export function createMockUser(overrides?: Partial<any>) {
  return {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user'],
    ...overrides,
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
