import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IComplianceReportRepository } from '@/application/aufbewahrung/ports/i-compliance-report.repository';
import { COMPLIANCE_REPORT_REPOSITORY } from '@infrastructure/di-tokens';
import { ComplianceReportDto } from '@/application/aufbewahrung/dto/compliance-report.dto';
import type { GetComplianceReportsQuery } from './get-compliance-reports.query';

/**
 * Handler fuer GetComplianceReportsQuery.
 *
 * Laedt Compliance-Reports, optional gefiltert nach Einsatz-ID.
 *
 * @remarks Story 5.5 AC4
 */
@Injectable()
export class GetComplianceReportsQueryHandler {
  constructor(
    @Inject(COMPLIANCE_REPORT_REPOSITORY)
    private readonly repository: IComplianceReportRepository,
  ) {}

  async execute(query: GetComplianceReportsQuery): Promise<Result<ComplianceReportDto[]>> {
    const result = query.einsatzId ? await this.repository.findByEinsatzId(query.einsatzId) : await this.repository.findAll();

    if (result.isFailure) {
      return Result.fail(result.error ?? 'Compliance-Reports konnten nicht geladen werden');
    }

    const reports = (result.value ?? []).map((r) => {
      const dto = new ComplianceReportDto();
      dto.id = r.id;
      dto.einsatzId = r.einsatzId;
      dto.typ = r.typ;
      dto.befehlCount = r.befehlCount;
      dto.empfaengerCount = r.empfaengerCount;
      dto.kommentarCount = r.kommentarCount;
      dto.durchgefuehrtAm = r.durchgefuehrtAm;
      dto.durchgefuehrtVon = r.durchgefuehrtVon;
      return dto;
    });

    return Result.ok(reports);
  }
}
