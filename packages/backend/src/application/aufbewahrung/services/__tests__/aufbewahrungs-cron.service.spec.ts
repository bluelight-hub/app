// @ts-nocheck
import { AufbewahrungsCronService } from '../aufbewahrungs-cron.service';
import { AufbewahrungsKonfigurationDto } from '@/application/aufbewahrung/dto/aufbewahrungs-konfiguration.dto';
import { Result } from '@domain/common/result';

describe('AufbewahrungsCronService', () => {
  let service: AufbewahrungsCronService;
  let mockLogger: { log: jest.Mock; debug: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let mockAnonymisiereHandler: { execute: jest.Mock };
  let mockLoescheHandler: { execute: jest.Mock };
  let mockKonfigurationHandler: { execute: jest.Mock };

  function createKonfigDto(aktiv: boolean): AufbewahrungsKonfigurationDto {
    const dto = new AufbewahrungsKonfigurationDto();
    dto.aufbewahrungsfristJahre = 10;
    dto.freigabeperiodeTage = 30;
    dto.automatischLoeschenAktiv = aktiv;
    return dto;
  }

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockAnonymisiereHandler = {
      execute: jest.fn(),
    };

    mockLoescheHandler = {
      execute: jest.fn(),
    };

    mockKonfigurationHandler = {
      execute: jest.fn(),
    };

    service = new AufbewahrungsCronService(mockLogger as never, mockAnonymisiereHandler as never, mockLoescheHandler as never, mockKonfigurationHandler as never);
  });

  describe('handleAnonymisierung', () => {
    it('sollte Anonymisierung ausfuehren wenn aktiviert', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(true)));
      mockAnonymisiereHandler.execute.mockResolvedValue(Result.ok([{ einsatzId: 'e1', befehlCount: 3, empfaengerCount: 5, kommentarCount: 2 }]));

      await service.handleAnonymisierung();

      expect(mockAnonymisiereHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Anonymisierung abgeschlossen'), expect.any(String));
    });

    it('sollte nichts tun wenn deaktiviert', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(false)));

      await service.handleAnonymisierung();

      expect(mockAnonymisiereHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('deaktiviert'), expect.any(String));
    });

    it('sollte Fehler loggen bei Konfiguration-Ladefehler', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.fail('DB-Fehler'));

      await service.handleAnonymisierung();

      expect(mockAnonymisiereHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte Fehler loggen bei Handler-Fehler', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(true)));
      mockAnonymisiereHandler.execute.mockResolvedValue(Result.fail('Anonymisierung fehlgeschlagen'));

      await service.handleAnonymisierung();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('fehlgeschlagen'), expect.any(String));
    });

    it('sollte Exception abfangen und loggen', async () => {
      mockKonfigurationHandler.execute.mockRejectedValue(new Error('Unerwarteter Fehler'));

      await service.handleAnonymisierung();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unerwarteter Fehler'), expect.any(String));
    });

    it('sollte bei leeren Ergebnissen debug-loggen', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(true)));
      mockAnonymisiereHandler.execute.mockResolvedValue(Result.ok([]));

      await service.handleAnonymisierung();

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Keine abgelaufenen'), expect.any(String));
    });
  });

  describe('handleLoeschung', () => {
    it('sollte Loeschung ausfuehren wenn aktiviert', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(true)));
      mockLoescheHandler.execute.mockResolvedValue(Result.ok([{ einsatzId: 'e1', befehlCount: 3 }]));

      await service.handleLoeschung();

      expect(mockLoescheHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Loeschung abgeschlossen'), expect.any(String));
    });

    it('sollte nichts tun wenn deaktiviert', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(false)));

      await service.handleLoeschung();

      expect(mockLoescheHandler.execute).not.toHaveBeenCalled();
    });

    it('sollte Fehler loggen bei Handler-Fehler', async () => {
      mockKonfigurationHandler.execute.mockResolvedValue(Result.ok(createKonfigDto(true)));
      mockLoescheHandler.execute.mockResolvedValue(Result.fail('Loeschung fehlgeschlagen'));

      await service.handleLoeschung();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('fehlgeschlagen'), expect.any(String));
    });
  });
});
