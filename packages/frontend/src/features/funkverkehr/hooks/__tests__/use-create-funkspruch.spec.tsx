/**
 * Tests für `useCreateFunkspruch`.
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const etbCqrsControllerAddEintragVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    etb: () => ({ etbCqrsControllerAddEintragVAlpha }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'err'),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useCreateFunkspruch } from '../use-create-funkspruch';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

describe('useCreateFunkspruch', () => {
  beforeEach(() => etbCqrsControllerAddEintragVAlpha.mockReset());

  it('erstellt ETB-Eintrag mit kontext.type=funkspruch + Default-Kategorie', async () => {
    etbCqrsControllerAddEintragVAlpha.mockResolvedValue({ id: 'e-1' });

    const client = makeClient();
    const { result } = renderHook(() => useCreateFunkspruch({ einsatzId: 'e1', etbId: 'etb-1' }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        text: 'Eintreffen am Einsatzort',
        absender: 'Rotkreuz 83/1',
        empfaenger: 'LST',
        kanalId: 'k1',
        funkPrioritaet: 'routine',
      });
    });

    expect(etbCqrsControllerAddEintragVAlpha).toHaveBeenCalledWith({
      etbId: 'etb-1',
      addEintragDto: expect.objectContaining({
        text: 'Eintreffen am Einsatzort',
        absender: 'Rotkreuz 83/1',
        empfaenger: 'LST',
        kategorie: 'KOMMUNIKATION',
        einsatzId: 'e1',
        kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'routine' },
      }),
    });
  });
});
