import { ComplianceReportService } from '../compliance-report.service';
import { Result } from '@domain/common/result';

describe('ComplianceReportService', () => {
  let service: ComplianceReportService;
  let mockRepository: { save: jest.Mock };

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    service = new ComplianceReportService(mockRepository as any);
  });

  describe('erstelleAnonymisierungsReport', () => {
    it('sollte Anonymisierungs-Report erstellen', async () => {
      const ergebnis = {
        einsatzId: 'einsatz-1',
        befehlCount: 5,
        empfaengerCount: 10,
        kommentarCount: 3,
      };

      await service.erstelleAnonymisierungsReport(ergebnis, 'SYSTEM');

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedReport = mockRepository.save.mock.calls[0][0];
      expect(savedReport.einsatzId).toBe('einsatz-1');
      expect(savedReport.typ).toBe('ANONYMISIERUNG');
      expect(savedReport.befehlCount).toBe(5);
      expect(savedReport.empfaengerCount).toBe(10);
      expect(savedReport.kommentarCount).toBe(3);
      expect(savedReport.durchgefuehrtVon).toBe('SYSTEM');
      expect(savedReport.id).toBeDefined();
    });

    it('sollte Transaction-Context weiterleiten', async () => {
      const ergebnis = {
        einsatzId: 'einsatz-1',
        befehlCount: 1,
        empfaengerCount: 1,
        kommentarCount: 0,
      };
      const fakeTx = { fake: 'tx' };

      await service.erstelleAnonymisierungsReport(ergebnis, 'SYSTEM', fakeTx);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Object), fakeTx);
    });
  });

  describe('erstelleLoeschungsReport', () => {
    it('sollte Loeschungs-Report erstellen', async () => {
      const ergebnis = {
        einsatzId: 'einsatz-1',
        befehlCount: 5,
      };

      await service.erstelleLoeschungsReport(ergebnis, 'SYSTEM');

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedReport = mockRepository.save.mock.calls[0][0];
      expect(savedReport.einsatzId).toBe('einsatz-1');
      expect(savedReport.typ).toBe('LOESCHUNG');
      expect(savedReport.befehlCount).toBe(5);
      expect(savedReport.empfaengerCount).toBe(0);
      expect(savedReport.kommentarCount).toBe(0);
      expect(savedReport.durchgefuehrtVon).toBe('SYSTEM');
    });
  });
});
