// @ts-nocheck
import { GetComplianceReportsQueryHandler } from '../get-compliance-reports.handler';
import { GetComplianceReportsQuery } from '../get-compliance-reports.query';
import { Result } from '@domain/common/result';
import type { ComplianceReportData } from '@/application/aufbewahrung/ports/i-compliance-report.repository';

describe('GetComplianceReportsQueryHandler', () => {
  let handler: GetComplianceReportsQueryHandler;
  let mockRepository: { findAll: jest.Mock; findByEinsatzId: jest.Mock };

  const testReport: ComplianceReportData = {
    id: 'report-1',
    einsatzId: 'einsatz-1',
    typ: 'ANONYMISIERUNG',
    befehlCount: 5,
    empfaengerCount: 10,
    kommentarCount: 3,
    durchgefuehrtAm: new Date('2026-01-15'),
    durchgefuehrtVon: 'SYSTEM',
    details: {},
  };

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findByEinsatzId: jest.fn(),
    };

    handler = new GetComplianceReportsQueryHandler(mockRepository as never);
  });

  describe('execute', () => {
    it('sollte alle Reports zurueckgeben wenn keine einsatzId', async () => {
      mockRepository.findAll.mockResolvedValue(Result.ok([testReport]));

      const result = await handler.execute(new GetComplianceReportsQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value?.[0]?.typ).toBe('ANONYMISIERUNG');
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEinsatzId).not.toHaveBeenCalled();
    });

    it('sollte Reports nach einsatzId filtern', async () => {
      mockRepository.findByEinsatzId.mockResolvedValue(Result.ok([testReport]));

      const result = await handler.execute(new GetComplianceReportsQuery('einsatz-1'));

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });

    it('sollte leeres Array zurueckgeben wenn keine Reports', async () => {
      mockRepository.findAll.mockResolvedValue(Result.ok([]));

      const result = await handler.execute(new GetComplianceReportsQuery());

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('sollte bei Repository-Fehler fehlschlagen', async () => {
      mockRepository.findAll.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(new GetComplianceReportsQuery());

      expect(result.isFailure).toBe(true);
    });
  });
});
