import { renderWithProviders, screen, fireEvent } from '@/test/utils';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EtbPage } from '../EtbPage';

const mockRefetch = vi.fn().mockResolvedValue(undefined);

const mockEtbPageState = {
  isLoading: false,
  isRefetching: false,
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

vi.mock('@/features/etb', () => ({
  EtbEntryForm: () => <div data-testid="etb-entry-form" />,
  EtbEntryList: () => <div data-testid="etb-entry-list" />,
  EtbFullscreenView: () => <div data-testid="etb-fullscreen-view" />,
  EtbLockButton: () => <button type="button">Sperren</button>,
  EtbSnapshotHistoryModal: () => null,
  EtbStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  EditEtbEntryModal: () => null,
  useEtbInfinite: () => ({
    data: mockEtbPageState.data,
    isLoading: mockEtbPageState.isLoading,
    error: mockEtbPageState.error,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: mockRefetch,
    isRefetching: mockEtbPageState.isRefetching,
  }),
}));

describe('EtbPage Performance-Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.assign(mockEtbPageState, {
      isLoading: false,
      isRefetching: false,
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
    renderWithProviders(<EtbPage einsatzId="einsatz-1" mode="standard" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aktualisieren' }));
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'Aktualisiere ETB…' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'Aktualisieren' })).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
