import { SystemWarnungWebSocketEventAdapter } from '../system-warnung-websocket-event.adapter';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';

describe('SystemWarnungWebSocketEventAdapter', () => {
  let adapter: SystemWarnungWebSocketEventAdapter;
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let mockGateway: { emitSystemWarnung: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    mockGateway = {
      emitSystemWarnung: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('mit MonitoringGateway', () => {
    beforeEach(() => {
      adapter = new SystemWarnungWebSocketEventAdapter(mockLogger, mockGateway);
    });

    it('sollte das Event nach 50ms Delay via Gateway emittieren', async () => {
      const event = new SystemWarnungEvent(WarnungTyp.ZUSTELLRATE, 0.8, 0.65, new Date('2026-02-24T10:00:00Z'));

      const promise = adapter.onSystemWarnung(event);
      jest.advanceTimersByTime(50);
      await promise;

      expect(mockGateway.emitSystemWarnung).toHaveBeenCalledWith({
        warnungTyp: 'ZUSTELLRATE',
        schwellwert: 0.8,
        aktuellerWert: 0.65,
        timestamp: '2026-02-24T10:00:00.000Z',
      });
    });

    it('sollte Fehler beim Emittieren loggen statt propagieren', async () => {
      mockGateway.emitSystemWarnung.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      const event = new SystemWarnungEvent(WarnungTyp.OUTBOX_STAU, 100, 150, new Date('2026-02-24T10:00:00Z'));

      const promise = adapter.onSystemWarnung(event);
      jest.advanceTimersByTime(50);
      await promise;

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('ohne MonitoringGateway', () => {
    beforeEach(() => {
      adapter = new SystemWarnungWebSocketEventAdapter(mockLogger, undefined);
    });

    it('sollte das Event loggen wenn kein Gateway verfuegbar ist', async () => {
      const event = new SystemWarnungEvent(WarnungTyp.LATENZ, 2000, 3500, new Date('2026-02-24T10:00:00Z'));

      const promise = adapter.onSystemWarnung(event);
      jest.advanceTimersByTime(50);
      await promise;

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('no MonitoringGateway'), 'SystemWarnungWebSocketAdapter');
    });
  });
});
