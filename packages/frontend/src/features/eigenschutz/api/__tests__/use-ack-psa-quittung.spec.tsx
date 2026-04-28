import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuittieren = vi.fn();
const mockListQuittungen = vi.fn();
const mockListOffeneBekanntgaben = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerQuittierenVAlpha: mockQuittieren,
      psaProfilControllerListQuittungenVAlpha: mockListQuittungen,
      psaProfilControllerListOffeneBekanntgabenVAlpha: mockListOffeneBekanntgaben,
    }),
  },
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'user-empfaenger' } }),
}));

import { EIGENSCHUTZ_QUERY_KEYS, useAckPsaQuittung, useEigenschutzPsaQuittungen, useOffenePsaBekanntgaben } from '../queries';
import { eigenschutzTelemetryQueue } from '../../lib/telemetry-queue';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

const EINSATZ_ID = 'einsatz-1';
const PROPAGATION_GROUP_ID = 'group-1';
const EINHEIT_ID = 'einheit-1';

describe('useAckPsaQuittung (Story 3.4 AC9)', () => {
  beforeEach(() => {
    mockQuittieren.mockReset();
    mockListQuittungen.mockReset();
    mockListOffeneBekanntgaben.mockReset();
    eigenschutzTelemetryQueue.drain();
  });

  afterEach(() => {
    eigenschutzTelemetryQueue.drain();
  });

  it('sendet Mutation an quittieren-Endpoint und invalidiert relevante Caches', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockQuittieren.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAckPsaQuittung(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuittieren).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
      ackPsaQuittungDto: { einheitId: EINHEIT_ID },
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        EIGENSCHUTZ_QUERY_KEYS.psaQuittungen(EINSATZ_ID, PROPAGATION_GROUP_ID),
        EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(EINSATZ_ID),
        EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(EINSATZ_ID, EINHEIT_ID),
      ]),
    );
  });

  it('pushed bei Erfolg genau ein psa_quittung_abgegeben-Telemetrie-Event (AC14)', async () => {
    const client = makeClient();
    mockQuittieren.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAckPsaQuittung(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'psa_quittung_abgegeben');
    expect(events).toHaveLength(1);
    expect(events[0]?.propagationGroupIdCandidate).toBe(PROPAGATION_GROUP_ID);
    expect(events[0]?.userId).toBe('user-empfaenger');
    expect(events[0]?.metadata).toEqual(expect.objectContaining({ einheitIdCandidate: EINHEIT_ID }));
  });

  it('pushed bei Fehler KEIN Telemetrie-Event (AC14)', async () => {
    const client = makeClient();
    mockQuittieren.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAckPsaQuittung(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'psa_quittung_abgegeben');
    expect(events).toHaveLength(0);
  });

  it('reicht Fehler unverändert weiter (silentError, kein Toast)', async () => {
    const client = makeClient();
    const fetchError = new Error('network');
    mockQuittieren.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useAckPsaQuittung(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(fetchError);
  });
});

describe('useEigenschutzPsaQuittungen (Story 3.4 AC8)', () => {
  beforeEach(() => {
    mockListQuittungen.mockReset();
  });

  it('liefert die Quittungs-Liste über den generierten Endpoint', async () => {
    mockListQuittungen.mockResolvedValue({
      data: [
        { einheitId: 'e-1', einheitName: 'Sangruppe 1', status: 'QUITTIERT', quittiertAm: '2026-04-24T10:30:00Z', quittiertVonUserId: 'u-1' },
        { einheitId: 'e-2', einheitName: 'Sangruppe 2', status: 'AUSSTEHEND' },
      ],
    });
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaQuittungen(EINSATZ_ID, PROPAGATION_GROUP_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.status).toBe('QUITTIERT');
    expect(result.current.data?.[1]?.status).toBe('AUSSTEHEND');
  });

  it('liefert leeres Array bei null-Response (Defensive)', async () => {
    mockListQuittungen.mockResolvedValue({ data: null });
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaQuittungen(EINSATZ_ID, PROPAGATION_GROUP_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useOffenePsaBekanntgaben (Story 3.4 AC15)', () => {
  beforeEach(() => {
    mockListOffeneBekanntgaben.mockReset();
  });

  it('liefert offene Bekanntgaben mit aggregiertem Status', async () => {
    mockListOffeneBekanntgaben.mockResolvedValue({
      data: [
        {
          propagationGroupId: 'g1',
          occurredAt: '2026-04-24T10:00:00Z',
          begruendungAnriss: 'Verdacht auf Kontamination',
          profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
          betroffeneEinheitIds: ['e1', 'e2'],
          ackCount: 1,
          totalCount: 2,
          status: 'partial',
        },
      ],
    });
    const client = makeClient();
    const { result } = renderHook(() => useOffenePsaBekanntgaben(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.status).toBe('partial');
    expect(result.current.data?.[0]?.ackCount).toBe(1);
  });

  it('reicht den optionalen seitISO-Parameter durch', async () => {
    mockListOffeneBekanntgaben.mockResolvedValue({ data: [] });
    const client = makeClient();
    const seitISO = '2026-04-24T00:00:00Z';
    renderHook(() => useOffenePsaBekanntgaben(EINSATZ_ID, { seitISO }), { wrapper: wrapper(client) });

    await waitFor(() => expect(mockListOffeneBekanntgaben).toHaveBeenCalled());
    expect(mockListOffeneBekanntgaben).toHaveBeenCalledWith({ einsatzId: EINSATZ_ID, seit: seitISO });
  });
});
