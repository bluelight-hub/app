/**
 * Tests für ZuordnungsManager.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const funkkanalZuordnungControllerCreateVAlpha = vi.fn();
const funkkanalZuordnungControllerUpdateRolleVAlpha = vi.fn();
const funkkanalZuordnungControllerRemoveVAlpha = vi.fn();
const rufnameVorschlaegeControllerListVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({
      funkkanalZuordnungControllerCreateVAlpha,
      funkkanalZuordnungControllerUpdateRolleVAlpha,
      funkkanalZuordnungControllerRemoveVAlpha,
      rufnameVorschlaegeControllerListVAlpha,
    }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'error-message'),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import type { ZuordnungResponseDto } from '@bluelight-hub/shared/client';
import { ZuordnungsManager } from '../ZuordnungsManager.organism';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

beforeEach(() => {
  funkkanalZuordnungControllerCreateVAlpha.mockReset();
  funkkanalZuordnungControllerUpdateRolleVAlpha.mockReset();
  funkkanalZuordnungControllerRemoveVAlpha.mockReset();
  rufnameVorschlaegeControllerListVAlpha.mockResolvedValue({
    data: {
      fahrzeuge: [{ id: 'f1', funkrufname: 'Florian 1' }],
      personen: [],
      einheiten: [{ id: 'e1', name: 'SEG Alpha' }],
    },
    meta: {},
  });
});

describe('ZuordnungsManager', () => {
  it('rendert Leermeldung wenn keine Zuordnungen', () => {
    const client = makeClient();
    render(<ZuordnungsManager einsatzId="e1" kanalId="k1" zuordnungen={[]} />, { wrapper: wrapper(client) });
    expect(screen.getByText(/Noch keine Zuordnungen/)).toBeInTheDocument();
  });

  it('rendert Liste vorhandener Zuordnungen mit Rollen-Segmented', () => {
    const client = makeClient();
    const zuordnungen: ZuordnungResponseDto[] = [
      {
        id: 'z1',
        kanalId: 'k1',
        kraftKind: 'fahrzeug' as ZuordnungResponseDto['kraftKind'],
        fahrzeugId: 'f1' as unknown as object,
        rufnameSnapshot: 'Florian 1',
        rolle: 'primaer' as ZuordnungResponseDto['rolle'],
        createdAt: new Date(),
      } as ZuordnungResponseDto,
    ];
    render(<ZuordnungsManager einsatzId="e1" kanalId="k1" zuordnungen={zuordnungen} />, { wrapper: wrapper(client) });
    expect(screen.getByText('Florian 1')).toBeInTheDocument();
    // Rolle "Primär" ist aktiv (aria-checked=true)
    const primaer = screen.getAllByRole('radio', { name: 'Primär' }).find((el) => el.getAttribute('aria-checked') === 'true');
    expect(primaer).toBeTruthy();
  });

  it('löst Entfernen per Remove-Button aus', async () => {
    funkkanalZuordnungControllerRemoveVAlpha.mockResolvedValue(undefined);
    const client = makeClient();
    const zuordnungen: ZuordnungResponseDto[] = [
      {
        id: 'z1',
        kanalId: 'k1',
        kraftKind: 'fahrzeug' as ZuordnungResponseDto['kraftKind'],
        rufnameSnapshot: 'Florian 1',
        rolle: 'primaer' as ZuordnungResponseDto['rolle'],
        createdAt: new Date(),
      } as ZuordnungResponseDto,
    ];
    render(<ZuordnungsManager einsatzId="e1" kanalId="k1" zuordnungen={zuordnungen} />, { wrapper: wrapper(client) });
    fireEvent.click(screen.getByRole('button', { name: /Zuordnung Florian 1 entfernen/i }));
    await waitFor(() => expect(funkkanalZuordnungControllerRemoveVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1', kanalId: 'k1', zuordnungId: 'z1' }));
  });
});
