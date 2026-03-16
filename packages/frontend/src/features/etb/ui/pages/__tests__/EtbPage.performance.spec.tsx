import { renderWithProviders, screen, fireEvent } from '@/test/utils';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EtbPage } from '../EtbPage';

const mockRefetch = vi.fn();
let mockRefetchDelayMs = 0;

const mockEtbPageState = {
  isLoading: false,
  error: null as Error | null,
  data: {
    pages: [
      {
        data: {
          id: 'etb-1',
          status: 'OPEN',
          eintraege: [],
        },
        pagination: {
          total: 0,
        },
      },
    ],
  },
};

vi.mock('@/features/etb', async () => {
  const React = await import('react');

  return {
    EtbEntryForm: () => <div data-testid="etb-entry-form" />,
    EtbEntryList: () => <div data-testid="etb-entry-list" />,
    EtbFullscreenView: () => <div data-testid="etb-fullscreen-view" />,
    EtbLockButton: () => <button type="button">Sperren</button>,
    EtbSnapshotHistoryModal: () => null,
    EtbStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    EditEtbEntryModal: () => null,
    useEtbInfinite: () => {
      const [isRefetching, setIsRefetching] = React.useState(false);

      const refetch = React.useCallback(async () => {
        mockRefetch();
        setIsRefetching(true);
        await new Promise((resolve) => setTimeout(resolve, mockRefetchDelayMs));
        setIsRefetching(false);
      }, []);

      return {
        data: mockEtbPageState.data,
        isLoading: mockEtbPageState.isLoading,
        error: mockEtbPageState.error,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch,
        isRefetching,
      };
    },
  };
});

describe('EtbPage Performance-Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRefetchDelayMs = 0;
    Object.assign(mockEtbPageState, {
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('zeigt beim initialen ETB-Laden einen textlichen Status an', () => {
    mockEtbPageState.isLoading = true;

    renderWithProviders(<EtbPage einsatzId="einsatz-1" mode="standard" />);

    expect(screen.getByRole('status')).toHaveTextContent('Lade Einsatztagebuch...');
  });

  it('zeigt bei einer verzögerten Aktualisierung innerhalb von 300 ms einen Produktstatus an', async () => {
    mockRefetchDelayMs = 600;

    renderWithProviders(<EtbPage einsatzId="einsatz-1" mode="standard" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aktualisieren' }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(screen.getByRole('button', { name: 'Aktualisiere ETB…' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole('button', { name: 'Aktualisieren' })).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
