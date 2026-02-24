import type { ComplianceReport } from '@domain/entities/compliance-report.entity';
import type { Result } from '@domain/common/result';

/**
 * Repository Port Interface für ComplianceReport Persistence.
 *
 * ComplianceReports dokumentieren DSGVO-Anonymisierungsläufe
 * und dienen als Audit-Trail für den Datenschutzbeauftragten.
 *
 * @remarks Story 5.5 AC2
 */
export interface IComplianceReportRepository {
  /**
   * Speichert einen neuen ComplianceReport.
   */
  save(report: ComplianceReport): Promise<Result<void>>;

  /**
   * Gibt alle ComplianceReports zurück, sortiert nach anonymisiertAm DESC.
   */
  findAll(): Promise<Result<ComplianceReport[]>>;

  /**
   * Findet ComplianceReports für einen bestimmten Einsatz.
   */
  findByEinsatzId(einsatzId: string): Promise<Result<ComplianceReport[]>>;
}
