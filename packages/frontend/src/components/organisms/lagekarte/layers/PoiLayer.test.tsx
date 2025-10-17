import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { MapContainer } from 'react-leaflet';
import { PoiLayer } from './PoiLayer';
import * as useLagekarteApi from '@/api/hooks/useLagekarteApi';
import type { PoiResponseDto } from '@bluelight-hub/shared/client';

// Mock react-leaflet components
vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Popup: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  };
});

// Mock POI-Icon utility
vi.mock('@/utils/poi-icons', () => ({
  getPoiIcon: vi.fn(() => ({})),
}));

describe('PoiLayer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MapContainer center={[51.1657, 10.4515]} zoom={6}>
          {component}
        </MapContainer>
      </QueryClientProvider>,
    );
  };

  it('should render markers for all POIs', () => {
    // Arrange
    const mockPois = [
      {
        id: '1',
        type: 'EINSATZORT' as const,
        name: 'Hauptort',
        latitude: 51.1,
        longitude: 10.1,
        adresse: 'Hauptstraße 1',
        icon: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        type: 'FAHRZEUG' as const,
        name: 'Fahrzeug 1',
        latitude: 51.2,
        longitude: 10.2,
        adresse: null,
        icon: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: mockPois,
      isLoading: false,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    // Check for POI names (markers rendered inside popups)
    expect(screen.getByText('Hauptort')).toBeInTheDocument();
    expect(screen.getByText('Fahrzeug 1')).toBeInTheDocument();
    // Check for dialog roles (popups)
    const popups = screen.getAllByRole('dialog');
    expect(popups.length).toBeGreaterThanOrEqual(2);
  });

  it('should show loading spinner while fetching POIs', () => {
    // Arrange
    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    // Spinner is rendered (check for container with specific classes)
    const spinnerContainer = document.querySelector('.absolute.top-4.right-4.z-50');
    expect(spinnerContainer).toBeInTheDocument();
  });

  it('should handle empty POI list without errors', () => {
    // Arrange
    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    // No popups should be rendered for empty list
    const popups = screen.queryAllByRole('dialog');
    expect(popups).toHaveLength(0);
  });

  it('should skip POIs with invalid coordinates', () => {
    // Arrange
    const mockPois = [
      {
        id: '1',
        type: 'EINSATZORT' as const,
        name: 'Valid POI',
        latitude: 51.1,
        longitude: 10.1,
        adresse: null,
        icon: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        type: 'FAHRZEUG' as const,
        name: 'Invalid POI',
        latitude: NaN,
        longitude: 10.2,
        adresse: null,
        icon: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: mockPois,
      isLoading: false,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    // Only valid POI should be rendered
    expect(screen.getByText('Valid POI')).toBeInTheDocument();
    expect(screen.queryByText('Invalid POI')).not.toBeInTheDocument();
    // Only one popup for valid POI
    const popups = screen.getAllByRole('dialog');
    expect(popups).toHaveLength(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid coordinates'), expect.any(Object));

    consoleWarnSpy.mockRestore();
  });

  it('should display POI details in popup', () => {
    // Arrange
    const mockPoi = {
      id: '1',
      type: 'EINSATZORT' as const,
      name: 'Hauptort',
      latitude: 51.1,
      longitude: 10.1,
      adresse: 'Hauptstraße 1',
      icon: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: [mockPoi],
      isLoading: false,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    expect(screen.getByText('Hauptort')).toBeInTheDocument();
    expect(screen.getByText('EINSATZORT')).toBeInTheDocument();
    expect(screen.getByText('Hauptstraße 1')).toBeInTheDocument();
  });

  it('should not display address if not available', () => {
    // Arrange
    const mockPoi = {
      id: '1',
      type: 'FAHRZEUG' as const,
      name: 'Fahrzeug 1',
      latitude: 51.1,
      longitude: 10.1,
      adresse: null,
      icon: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(useLagekarteApi, 'usePois').mockReturnValue({
      data: [mockPoi],
      isLoading: false,
      error: null,
    } as UseQueryResult<PoiResponseDto[], Error>);

    // Act
    renderWithProviders(<PoiLayer einsatzId="test-123" />);

    // Assert
    expect(screen.getByText('Fahrzeug 1')).toBeInTheDocument();
    expect(screen.getByText('FAHRZEUG')).toBeInTheDocument();
    // No address text should be rendered
    const popupContent = screen.getByRole('dialog');
    expect(popupContent.textContent).not.toContain('Straße');
  });
});
