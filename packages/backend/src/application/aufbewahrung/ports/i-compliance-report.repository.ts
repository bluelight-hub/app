import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';

/**
 * Compliance-Report Daten fuer Persistence.
 */
export interface ComplianceReportData {
  id: string;
  einsatzId: string;
  typ: 'ANONYMISIERUNG' | 'LOESCHUNG';
  befehlCount: number;
  empfaengerCount: number;
  kommentarCount: number;
  durchgefuehrtAm: Date;
  durchgefuehrtVon: string;
  details: Record<string, unknown>;
}

/**
 * Repository Port Interface fuer Compliance-Report Persistence.
 *
 * Speichert DSGVO-Compliance-Berichte als Audit-Trail.
 * Berichte dokumentieren Anonymisierungs- und Loeschvorgaenge.
 *
 * @remarks Story 5.5 AC4
 */
export interface IComplianceReportRepository {
  /**
   * Speichert einen Compliance-Report.
   */
  save(report: ComplianceReportData, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Gibt alle Compliance-Reports zurueck, sortiert nach durchgefuehrtAm DESC.
   */
  findAll(tx?: TransactionContext): Promise<Result<ComplianceReportData[]>>;

  /**
   * Gibt Compliance-Reports fuer einen bestimmten Einsatz zurueck.
   */
  findByEinsatzId(einsatzId: string, tx?: TransactionContext): Promise<Result<ComplianceReportData[]>>;
}
