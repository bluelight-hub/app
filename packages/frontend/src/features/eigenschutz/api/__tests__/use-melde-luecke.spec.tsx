/**
 * Tests für `useMeldeLuecke` (Story 3.6 AC10, AC15).
 *
 * Pattern: 1:1 zu `use-ack-psa-quittung.spec.tsx`. Verifiziert Cache-
 * Invalidation (3 Keys), Telemetrie-Push, `silentError`-Verhalten.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockMeldeLuecke = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerMeldeLueckeVAlpha: mockMeldeLuecke,
    }),
  },
}));

const userMock = { user: { id: 'user-empfaenger' } as { id: string } | null };
vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => userMock,
}));

import { EIGENSCHUTZ_QUERY_KEYS, useMeldeLuecke } from '../queries';
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
const MELDUNG = 'Schutzanzug Größe L fehlt — nachgeordert 14:28';

describe('useMeldeLuecke (Story 3.6 AC10)', () => {
  beforeEach(() => {
    mockMeldeLuecke.mockReset();
    eigenschutzTelemetryQueue.drain();
    userMock.user = { id: 'user-empfaenger' };
  });

  afterEach(() => {
    eigenschutzTelemetryQueue.drain();
  });

  it('sendet Mutation an meldeLuecke-Endpoint und invalidiert relevante Caches (3 Keys)', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockMeldeLuecke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMeldeLuecke(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID, meldung: MELDUNG });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockMeldeLuecke).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
      meldeLueckeDto: { einheitId: EINHEIT_ID, meldung: MELDUNG },
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

  it('pushed bei Erfolg genau ein luecke_gemeldet-Telemetrie-Event (AC15)', async () => {
    const client = makeClient();
    mockMeldeLuecke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMeldeLuecke(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID, meldung: MELDUNG });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'luecke_gemeldet');
    expect(events).toHaveLength(1);
    expect(events[0]?.propagationGroupIdCandidate).toBe(PROPAGATION_GROUP_ID);
    expect(events[0]?.userId).toBe('user-empfaenger');
    expect(events[0]?.metadata).toEqual(expect.objectContaining({ einheitIdCandidate: EINHEIT_ID, meldungLength: MELDUNG.length }));
  });

  it('pushed bei Fehler KEIN Telemetrie-Event (AC15)', async () => {
    const client = makeClient();
    mockMeldeLuecke.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMeldeLuecke(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID, meldung: MELDUNG });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'luecke_gemeldet');
    expect(events).toHaveLength(0);
  });

  it('skipt Telemetrie, wenn user.id noch nicht geladen ist (Race-Schutz)', async () => {
    userMock.user = null;
    const client = makeClient();
    mockMeldeLuecke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMeldeLuecke(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID, meldung: MELDUNG });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eigenschutzTelemetryQueue.snapshot()).toHaveLength(0);
  });

  it('reicht Fehler unverändert weiter (silentError, kein Toast)', async () => {
    const client = makeClient();
    const fetchError = new Error('network');
    mockMeldeLuecke.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useMeldeLuecke(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ propagationGroupId: PROPAGATION_GROUP_ID, einheitId: EINHEIT_ID, meldung: MELDUNG });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(fetchError);
  });
});
