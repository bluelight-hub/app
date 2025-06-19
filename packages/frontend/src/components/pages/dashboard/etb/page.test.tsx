import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ETBDashboardPage from './page';

// Mock useEinsatztagebuch
const mockUseEinsatztagebuch = vi.fn();
vi.mock('../../../../hooks/etb/useEinsatztagebuch', () => ({
  useEinsatztagebuch: () => mockUseEinsatztagebuch(),
}));

// Mock für formatNatoDateTime
vi.mock('../../../../utils/date', () => ({
  formatNatoDateTime: vi.fn(() => '010800jan24'),
}));

// Mock für Ant Design Spin Component
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Spin: ({ size }: { size?: string }) => (
      <div data-testid="spin" data-size={size}>
        Loading...
      </div>
    ),
    Alert: ({ message, description }: { message: string; description?: string }) => (
      <div data-testid="alert">
        <div>{message}</div>
        {description && <div>{description}</div>}
      </div>
    ),
    Empty: ({ description }: { description: React.ReactNode }) => <div data-testid="empty">{description}</div>,
  };
});

// Mock für framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ETBDashboardPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ETBDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when data is loading without existing data', () => {
    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: true,
          error: null,
        },
        data: null,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    renderComponent();

    const spinner = screen.getByTestId('spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('data-size', 'large');
  });

  it('should show error alert when query has error', () => {
    const mockError = new Error('Test error');
    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: false,
          error: mockError,
        },
        data: null,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    renderComponent();

    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Fehler beim Laden des Einsatztagebuchs');
  });

  it('should show data when loaded', () => {
    const mockData = {
      id: 'test-id',
      entries: [
        {
          id: 'entry-1',
          laufendeNummer: 1,
          erstelltZeit: '2024-01-01T10:00:00Z',
          timestampEreignis: '2024-01-01T10:00:00Z',
          kategorie: 'USER',
          status: 'ABGESCHLOSSEN',
          autorName: 'Test User',
          beschreibung: 'Test Beschreibung',
          anUser: null,
          abgeschlossenVon: null,
        },
      ],
      pagination: {
        totalItems: 1,
        currentPage: 1,
        pageSize: 20,
        totalPages: 1,
      },
    };

    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: false,
          error: null,
        },
        data: mockData,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    renderComponent();

    // Should not show spinner
    expect(screen.queryByTestId('spin')).not.toBeInTheDocument();

    // Should show the dashboard container
    const dashboardContainer = document.querySelector('.etb-dashboard');
    expect(dashboardContainer).toBeInTheDocument();
  });

  it('should show dashboard even when loading with existing data', () => {
    const mockData = {
      id: 'test-id',
      entries: [],
      pagination: {
        totalItems: 0,
        currentPage: 1,
        pageSize: 20,
        totalPages: 0,
      },
    };

    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: true,
          error: null,
        },
        data: mockData,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    renderComponent();

    // Should not show spinner when data exists
    expect(screen.queryByTestId('spin')).not.toBeInTheDocument();

    // Should show the dashboard container
    const dashboardContainer = document.querySelector('.etb-dashboard');
    expect(dashboardContainer).toBeInTheDocument();
  });

  it('should display loading spinner in correct container with centered layout', () => {
    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: true,
          error: null,
        },
        data: null,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    const { container } = renderComponent();

    const spinnerContainer = container.querySelector('.flex.justify-center.items-center.h-64');
    expect(spinnerContainer).toBeInTheDocument();

    const spinner = screen.getByTestId('spin');
    expect(spinnerContainer).toContainElement(spinner);
  });

  it('should show empty state when no entries exist', () => {
    const mockData = {
      id: 'test-id',
      entries: [],
      pagination: {
        totalItems: 0,
        currentPage: 1,
        pageSize: 20,
        totalPages: 0,
      },
    };

    mockUseEinsatztagebuch.mockReturnValue({
      einsatztagebuch: {
        query: {
          isLoading: false,
          error: null,
        },
        data: mockData,
      },
      fahrzeuge: {
        data: null,
        query: {
          isLoading: false,
          error: null,
        },
      },
    });

    renderComponent();

    const emptyState = screen.getByTestId('empty');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('Keine Einträge verfügbar');
  });
});
