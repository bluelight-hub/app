import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Test utilities for consistent testing patterns across the frontend package
 */

// Mock Query Client for React Query tests
export const createTestQueryClient = (): QueryClient => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
};

// Wrapper component for tests that need React Query
interface ReactQueryWrapperProps {
    children: React.ReactNode;
    queryClient?: QueryClient;
}

const ReactQueryWrapper = ({ children, queryClient }: ReactQueryWrapperProps) => {
    const client = queryClient || createTestQueryClient();
    return (
        <QueryClientProvider client={client}>
            {children}
        </QueryClientProvider>
    );
};

// Wrapper component for tests that need React Router
interface RouterWrapperProps {
    children: React.ReactNode;
    initialEntries?: string[];
}

const RouterWrapper = ({ children, initialEntries = ['/'] }: RouterWrapperProps) => {
    return (
        <MemoryRouter initialEntries={initialEntries}>
            {children}
        </MemoryRouter>
    );
};

// Combined wrapper for tests that need both React Query and Router
interface AllProvidersWrapperProps {
    children: React.ReactNode;
    queryClient?: QueryClient;
    initialEntries?: string[];
}

const AllProvidersWrapper = ({
    children,
    queryClient,
    initialEntries = ['/']
}: AllProvidersWrapperProps) => {
    const client = queryClient || createTestQueryClient();
    return (
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={initialEntries}>
                {children}
            </MemoryRouter>
        </QueryClientProvider>
    );
};

// Enhanced render functions
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    queryClient?: QueryClient;
    initialEntries?: string[];
}

/**
 * Render component with React Query provider
 */
export const renderWithQuery = (
    ui: ReactElement,
    options: CustomRenderOptions = {}
) => {
    const { queryClient, ...renderOptions } = options;

    return render(ui, {
        wrapper: ({ children }) => (
            <ReactQueryWrapper queryClient={queryClient}>
                {children}
            </ReactQueryWrapper>
        ),
        ...renderOptions,
    });
};

/**
 * Render component with React Router provider
 */
export const renderWithRouter = (
    ui: ReactElement,
    options: CustomRenderOptions = {}
) => {
    const { initialEntries, ...renderOptions } = options;

    return render(ui, {
        wrapper: ({ children }) => (
            <RouterWrapper initialEntries={initialEntries}>
                {children}
            </RouterWrapper>
        ),
        ...renderOptions,
    });
};

/**
 * Render component with both React Query and React Router providers
 */
export const renderWithProviders = (
    ui: ReactElement,
    options: CustomRenderOptions = {}
) => {
    const { queryClient, initialEntries, ...renderOptions } = options;

    return render(ui, {
        wrapper: ({ children }) => (
            <AllProvidersWrapper
                queryClient={queryClient}
                initialEntries={initialEntries}
            >
                {children}
            </AllProvidersWrapper>
        ),
        ...renderOptions,
    });
};

// Mock data generators for testing
export const mockEinsatz = (overrides = {}) => ({
    id: 'test-einsatz-1',
    name: 'Test Einsatz',
    beschreibung: 'Test Description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

export const mockEtbEntry = (overrides = {}) => ({
    id: 'test-etb-1',
    laufendeNummer: 1,
    kategorie: 'Meldung',
    meldung: 'Test ETB Entry',
    absender: 'Test Sender',
    empfaenger: 'Test Receiver',
    zeitstempel: new Date().toISOString(),
    einsatzId: 'test-einsatz-1',
    status: 'aktiv',
    ...overrides,
});

export const mockUser = (overrides = {}) => ({
    id: 'test-user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
});

// Common test data
export const testNavigationItems = [
    {
        type: 'item' as const,
        key: '/test',
        path: '/test',
        label: 'Test Item',
    },
];

// Wait utilities for async operations
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock localStorage for tests
export const mockLocalStorage = () => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
            return Object.keys(store).length;
        },
    };
};

// Setup function for localStorage mock
export const setupMockLocalStorage = () => {
    const mockStorage = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
    });
    return mockStorage;
}; 