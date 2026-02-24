import { BefehlMetricsService } from '../befehl-metrics.service';

describe('BefehlMetricsService', () => {
  let service: BefehlMetricsService;
  let erstelltCounter: { inc: jest.Mock };
  let quittiertCounter: { inc: jest.Mock };
  let korrigiertCounter: { inc: jest.Mock };

  beforeEach(() => {
    erstelltCounter = { inc: jest.fn() };
    quittiertCounter = { inc: jest.fn() };
    korrigiertCounter = { inc: jest.fn() };

    service = new BefehlMetricsService(erstelltCounter as any, quittiertCounter as any, korrigiertCounter as any);
  });

  describe('handleBefehlErstellt', () => {
    it('sollte den Erstellt-Counter inkrementieren', () => {
      service.handleBefehlErstellt();

      expect(erstelltCounter.inc).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBefehlQuittiert', () => {
    it('sollte den Quittiert-Counter inkrementieren', () => {
      service.handleBefehlQuittiert();

      expect(quittiertCounter.inc).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBefehlStatusGeaendert', () => {
    it('sollte den Korrigiert-Counter inkrementieren wenn newStatus KORRIGIERT ist', () => {
      service.handleBefehlStatusGeaendert({ newStatus: { value: 'KORRIGIERT' } });

      expect(korrigiertCounter.inc).toHaveBeenCalledTimes(1);
    });

    it('sollte den Korrigiert-Counter NICHT inkrementieren bei anderen Status', () => {
      service.handleBefehlStatusGeaendert({ newStatus: { value: 'ZUGESTELLT' } });

      expect(korrigiertCounter.inc).not.toHaveBeenCalled();
    });

    it('sollte den Korrigiert-Counter NICHT inkrementieren bei QUITTIERT', () => {
      service.handleBefehlStatusGeaendert({ newStatus: { value: 'QUITTIERT' } });

      expect(korrigiertCounter.inc).not.toHaveBeenCalled();
    });
  });
});
