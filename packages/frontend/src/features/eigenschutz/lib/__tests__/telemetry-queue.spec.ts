import { __resetSessionIdForTests, eigenschutzTelemetryQueue, getOrCreateSessionId } from '../telemetry-queue';

describe('telemetry-queue (Story 3.1 AC10)', () => {
  beforeEach(() => {
    eigenschutzTelemetryQueue.drain();
    __resetSessionIdForTests();
  });

  it('push() hängt Event an, snapshot() liefert eine immutable Kopie', () => {
    const event = {
      eventName: 'assess_started' as const,
      propagationGroupIdCandidate: 'cand-1',
      abschnittCount: 1,
      userId: 'user-1',
      sessionId: 'session-1',
      clientTime: '2026-04-24T10:00:00.000Z',
    };
    eigenschutzTelemetryQueue.push(event);

    const snapshot = eigenschutzTelemetryQueue.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toEqual(event);
  });

  it('drain() entleert die Queue', () => {
    eigenschutzTelemetryQueue.push({
      eventName: 'cbrn_announced',
      propagationGroupIdCandidate: 'cand-2',
      abschnittCount: 3,
      userId: 'u',
      sessionId: 's',
      clientTime: 'now',
    });
    expect(eigenschutzTelemetryQueue.snapshot()).toHaveLength(1);
    eigenschutzTelemetryQueue.drain();
    expect(eigenschutzTelemetryQueue.snapshot()).toHaveLength(0);
  });

  it('getOrCreateSessionId() liefert konsistent die gleiche ID innerhalb der Session', () => {
    const a = getOrCreateSessionId();
    const b = getOrCreateSessionId();
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(8);
  });

  it('akzeptiert psa_quittung_abgegeben als gültiges eventName (Story 3.4 AC14)', () => {
    eigenschutzTelemetryQueue.push({
      eventName: 'psa_quittung_abgegeben',
      propagationGroupIdCandidate: 'group-3-4-1',
      abschnittCount: 1,
      userId: 'user-empfaenger',
      sessionId: 'session-3-4',
      clientTime: '2026-04-24T11:30:00.000Z',
      metadata: { einheitIdCandidate: 'einheit-3' },
    });

    const snapshot = eigenschutzTelemetryQueue.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.eventName).toBe('psa_quittung_abgegeben');
    expect(snapshot[0]?.metadata?.einheitIdCandidate).toBe('einheit-3');
  });

  it('akzeptiert all_banners_delivered als gültiges eventName (Story 3.3 AC9)', () => {
    eigenschutzTelemetryQueue.push({
      eventName: 'all_banners_delivered',
      propagationGroupIdCandidate: 'group-3-3-1',
      abschnittCount: 1,
      userId: 'user-empfanger',
      sessionId: 'session-3-3',
      clientTime: '2026-04-24T11:00:00.000Z',
      metadata: { receivedToggles: 2 },
    });

    const snapshot = eigenschutzTelemetryQueue.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.eventName).toBe('all_banners_delivered');
    expect(snapshot[0]?.metadata?.receivedToggles).toBe(2);
  });
});
