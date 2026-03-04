import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useErinnerungKonfiguration } from '../use-erinnerung-konfiguration';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ErinnerungKonfigurationControllerGetConfigVAlpha200Response, ErinnerungKonfigurationDto, UpdateEskalationsTimeoutDto } from '@bluelight-hub/shared/client';

const { mockGetConfig, mockUpdateTimeout } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockUpdateTimeout: vi.fn(),
}));

vi.mock('@/shared', () => ({
  api: {
    erinnerung: () => ({
      erinnerungKonfigurationControllerGetConfigVAlpha: mockGetConfig,
      erinnerungKonfigurationControllerUpdateTimeoutVAlpha: mockUpdateTimeout,
    }),
  },
}));

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('useErinnerungKonfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('should fetch configuration', async () => {
    const mockConfig: ErinnerungKonfigurationDto = { eskalationsTimeoutMinutes: 10, eskalationsTimeoutSeconds: 600 };
    const mockResponse: ErinnerungKonfigurationControllerGetConfigVAlpha200Response = {
      data: mockConfig,
      meta: {
        timestamp: new Date('2026-03-04T10:00:00.000Z'),
        version: '1.0.0-alpha.56-alpha',
        requestId: 'req-fetch-config',
      },
    };
    mockGetConfig.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useErinnerungKonfiguration(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.config).toEqual(mockConfig);
    expect(mockGetConfig).toHaveBeenCalledTimes(1);
  });

  it('should update timeout', async () => {
    const mockConfig: ErinnerungKonfigurationDto = { eskalationsTimeoutMinutes: 10, eskalationsTimeoutSeconds: 600 };
    const mockResponse: ErinnerungKonfigurationControllerGetConfigVAlpha200Response = {
      data: mockConfig,
      meta: {
        timestamp: new Date('2026-03-04T10:00:00.000Z'),
        version: '1.0.0-alpha.56-alpha',
        requestId: 'req-update-timeout',
      },
    };
    const updateDto: UpdateEskalationsTimeoutDto = { timeoutMinutes: 15 };

    mockGetConfig.mockResolvedValue(mockResponse);
    mockUpdateTimeout.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useErinnerungKonfiguration(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateTimeout(updateDto);
    });

    await waitFor(() => {
      expect(mockUpdateTimeout).toHaveBeenCalledWith({
        updateEskalationsTimeoutDto: updateDto,
      });
    });
  });
});
