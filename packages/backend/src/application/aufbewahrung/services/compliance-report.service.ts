import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '@domain/common/transaction';
import type { IComplianceReportRepository, ComplianceReportData } from '@/application/aufbewahrung/ports/i-compliance-report.repository';
import { COMPLIANCE_REPORT_REPOSITORY } from '@infrastructure/di-tokens';
import { createId } from '@paralleldrive/cuid2';

/**
 * Service zur Erstellung von DSGVO-Compliance-Reports.
 *
 * Generiert Audit-Reports fuer Anonymisierungs- und Loeschvorgaenge.
 * Reports werden als JSON im Compliance-Report-Repository persistiert.
 *
 * @remarks Story 5.5 AC4
 */
@Injectable()
export class ComplianceReportService {
  constructor(
    @Inject(COMPLIANCE_REPORT_REPOSITORY)
    private readonly repository: IComplianceReportRepository,
  ) {}

  /**
   * Erstellt einen Compliance-Report fuer einen Anonymisierungsvorgang.
   */
  async erstelleAnonymisierungsReport(
    ergebnis: { einsatzId: string; befehlCount: number; empfaengerCount: number; kommentarCount: number },
    durchgefuehrtVon: string,
    tx?: TransactionContext,
  ): Promise<void> {
    const report: ComplianceReportData = {
      id: createId(),
      einsatzId: ergebnis.einsatzId,
      typ: 'ANONYMISIERUNG',
      befehlCount: ergebnis.befehlCount,
      empfaengerCount: ergebnis.empfaengerCount,
      kommentarCount: ergebnis.kommentarCount,
      durchgefuehrtAm: new Date(),
      durchgefuehrtVon,
      details: {
        art: 'DSGVO-Anonymisierung',
        beschreibung: `${ergebnis.befehlCount} Befehle, ${ergebnis.empfaengerCount} Empfaenger, ${ergebnis.kommentarCount} Kommentare anonymisiert`,
      },
    };

    await this.repository.save(report, tx);
  }

  /**
   * Erstellt einen Compliance-Report fuer einen Loeschvorgang.
   */
  async erstelleLoeschungsReport(ergebnis: { einsatzId: string; befehlCount: number }, durchgefuehrtVon: string, tx?: TransactionContext): Promise<void> {
    const report: ComplianceReportData = {
      id: createId(),
      einsatzId: ergebnis.einsatzId,
      typ: 'LOESCHUNG',
      befehlCount: ergebnis.befehlCount,
      empfaengerCount: 0,
      kommentarCount: 0,
      durchgefuehrtAm: new Date(),
      durchgefuehrtVon,
      details: {
        art: 'DSGVO-Loeschung (Soft-Delete)',
        beschreibung: `${ergebnis.befehlCount} anonymisierte Befehle soft-deleted`,
      },
    };

    await this.repository.save(report, tx);
  }
}
