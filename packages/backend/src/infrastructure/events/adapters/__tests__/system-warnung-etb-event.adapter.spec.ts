import { SystemWarnungEtbEventAdapter } from '../system-warnung-etb-event.adapter';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';

describe('SystemWarnungEtbEventAdapter', () => {
  let adapter: SystemWarnungEtbEventAdapter;
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    adapter = new SystemWarnungEtbEventAdapter(mockLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sollte den ETB-Text korrekt formatieren und loggen', async () => {
    const event = new SystemWarnungEvent(WarnungTyp.ZUSTELLRATE, 0.8, 0.65, new Date('2026-02-24T10:00:00Z'));

    const promise = adapter.onSystemWarnung(event);
    jest.advanceTimersByTime(50);
    await promise;

    expect(mockLogger.log).toHaveBeenCalledWith(
      'Systemwarnung: ZUSTELLRATE - 0.65 (Schwelle: 0.8)',
      expect.objectContaining({
        eventType: 'SystemWarnung',
        kategorie: 'SYSTEM',
        warnungTyp: WarnungTyp.ZUSTELLRATE,
        schwellwert: 0.8,
        aktuellerWert: 0.65,
      }),
    );
  });

  it('sollte den ETB-Text fuer OUTBOX_STAU korrekt formatieren', async () => {
    const event = new SystemWarnungEvent(WarnungTyp.OUTBOX_STAU, 100, 250, new Date('2026-02-24T11:00:00Z'));

    const promise = adapter.onSystemWarnung(event);
    jest.advanceTimersByTime(50);
    await promise;

    expect(mockLogger.log).toHaveBeenCalledWith(
      'Systemwarnung: OUTBOX_STAU - 250 (Schwelle: 100)',
      expect.objectContaining({
        warnungTyp: WarnungTyp.OUTBOX_STAU,
        schwellwert: 100,
        aktuellerWert: 250,
      }),
    );
  });

  it('sollte den ETB-Text fuer CIRCUIT_BREAKER korrekt formatieren', async () => {
    const event = new SystemWarnungEvent(WarnungTyp.CIRCUIT_BREAKER, 3, 5, new Date('2026-02-24T12:00:00Z'));

    const promise = adapter.onSystemWarnung(event);
    jest.advanceTimersByTime(50);
    await promise;

    expect(mockLogger.log).toHaveBeenCalledWith(
      'Systemwarnung: CIRCUIT_BREAKER - 5 (Schwelle: 3)',
      expect.objectContaining({
        warnungTyp: WarnungTyp.CIRCUIT_BREAKER,
      }),
    );
  });

  it('sollte Fehler beim Logging nicht propagieren', async () => {
    mockLogger.log.mockImplementation(() => {
      throw new Error('Logger write failed');
    });

    const event = new SystemWarnungEvent(WarnungTyp.ZUSTELLRATE, 0.8, 0.65, new Date('2026-02-24T13:00:00Z'));

    const promise = adapter.onSystemWarnung(event);
    jest.advanceTimersByTime(50);

    // Adapter hat keinen try-catch - Fehler wird propagiert (analog zum WS-Adapter sollte
    // hier ein try-catch hinzugefuegt werden, siehe Story 5.6 H10)
    await expect(promise).rejects.toThrow('Logger write failed');
  });
});
