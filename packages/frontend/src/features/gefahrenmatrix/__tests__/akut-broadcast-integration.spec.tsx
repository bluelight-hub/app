/**
 * Integration-Test: Matrix-Update auf AKUT → Confirm-Dialog → (Confirm) →
 * Broadcast via Socket → zweiter Client erhält Toast + pushAlert.
 *
 * Wir mocken: Matrix-Mutation-API (REST) + socket.io-client (WebSocket).
 * Zwei „Clients" simulieren wir als zwei gerenderte Komponenten-Bäume; der
 * Broadcast-Schritt ist der Socket-Emit, den wir manuell zurückspielen.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const updateBewertungMock = vi.fn();
const listMatrixMock = vi.fn();
const listZonenMock = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    gefahrenmatrix: () => ({
      gefahrenmatrixControllerGetVAlpha: listMatrixMock,
      gefahrenmatrixControllerUpdateBewertungVAlpha: updateBewertungMock,
    }),
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: listZonenMock,
    }),
  },
}));

type Handler = (payload: unknown) => void;
const socketHandlers: Record<string, Handler> = {};
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, handler: Handler) => {
      socketHandlers[event] = handler;
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return { ...actual, useNavigate: () => vi.fn() };
});

import { GefahrenmatrixGrid } from '../ui/organisms/GefahrenmatrixGrid';
import { AkutBroadcastToast } from '../ui/organisms/AkutBroadcastToast';
import { useGefahrenmatrixWebSocket } from '../api/use-gefahrenmatrix-websocket';
import { akutBroadcastActions, akutBroadcastStore } from '../stores/akut-broadcast.store';

function ReceiverHarness({ einsatzId, userId }: { einsatzId: string; userId: string }) {
  useGefahrenmatrixWebSocket({ einsatzId, currentUserId: userId });
  return <AkutBroadcastToast />;
}

function wrapperWith(): ({ children }: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Integration: Matrix → AKUT-Dialog → WebSocket → Toast', () => {
  beforeEach(() => {
    akutBroadcastActions.clearAll();
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    updateBewertungMock.mockReset();
    listMatrixMock.mockReset();
    listZonenMock.mockReset();
  });

  afterEach(() => {
    akutBroadcastActions.clearAll();
  });

  it('ganzer Flow: Hochstufen auf AKUT zeigt Dialog, Confirm → Mutation, Broadcast → Toast beim zweiten Client', async () => {
    // Sender-Client: Matrix mit einer NIEDRIG-Bewertung auf (BRAND, MENSCHEN).
    listMatrixMock.mockResolvedValue({
      data: {
        einsatzId: 'e1',
        bewertungen: [{ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'NIEDRIG' }],
      },
    });
    listZonenMock.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [] } });
    updateBewertungMock.mockResolvedValue({ data: { ok: true } });

    const user = userEvent.setup();

    const SenderWrapper = wrapperWith();
    render(<GefahrenmatrixGrid einsatzId="e1" />, { wrapper: SenderWrapper });

    // Erste Zelle (BRAND × MENSCHEN) hochstufen auf AKUT.
    const niedrigBtn = await screen.findByRole('button', { name: /niedrig/i });
    await user.click(niedrigBtn);
    await user.click(await screen.findByRole('option', { name: /akut/i }));

    // Dialog ist offen.
    expect(screen.getByText('AKUT-Warnstufe senden?')).toBeInTheDocument();
    expect(updateBewertungMock).not.toHaveBeenCalled();

    // Confirm → Mutation wird ausgelöst.
    await user.click(screen.getByText('AKUT senden'));
    expect(updateBewertungMock).toHaveBeenCalled();

    // --- Receiver-Client: separater Tree mit anderem User-ID ---
    const ReceiverWrapper = wrapperWith();
    render(<ReceiverHarness einsatzId="e1" userId="receiver-user" />, { wrapper: ReceiverWrapper });

    // WebSocket-Event zurückspielen (Absender: nicht der Receiver).
    act(() =>
      socketHandlers['gefahrenmatrix:aktualisiert']?.({
        einsatzId: 'e1',
        gefahrentyp: 'BRAND',
        schutzobjekt: 'MENSCHEN',
        warnstufe: 'AKUT',
        aktualisiertVon: 'sender-user',
      }),
    );

    expect(akutBroadcastStore.state.activeAlerts).toHaveLength(1);
    expect(await screen.findByText(/AKUT:/)).toBeInTheDocument();
  });

  it('Abbrechen im Dialog feuert keine Mutation', async () => {
    listMatrixMock.mockResolvedValue({
      data: {
        einsatzId: 'e1',
        bewertungen: [{ gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', warnstufe: 'HOCH' }],
      },
    });
    listZonenMock.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [] } });

    const user = userEvent.setup();

    const Wrapper = wrapperWith();
    render(<GefahrenmatrixGrid einsatzId="e1" />, { wrapper: Wrapper });

    const hochBtn = await screen.findByRole('button', { name: /hoch/i });
    await user.click(hochBtn);
    await user.click(await screen.findByRole('option', { name: /akut/i }));

    expect(screen.getByText('AKUT-Warnstufe senden?')).toBeInTheDocument();
    await user.click(screen.getByText('Abbrechen'));
    expect(updateBewertungMock).not.toHaveBeenCalled();
  });
});
