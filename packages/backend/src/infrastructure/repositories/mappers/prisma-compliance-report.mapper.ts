import type { ComplianceReport } from '@domain/entities/compliance-report.entity';
import type { ComplianceReport as PrismaComplianceReport, Prisma } from '@/generated/prisma/client';

/**
 * Bidirektionaler Mapper: ComplianceReport ↔ Prisma Model.
 *
 * @remarks Story 5.5
 */
export class PrismaComplianceReportMapper {
  /**
   * Konvertiert Prisma Record zu Domain Entity.
   */
  static toDomain(prisma: PrismaComplianceReport): ComplianceReport {
    return {
      id: prisma.id,
      einsatzId: prisma.einsatzId,
      einsatzName: prisma.einsatzName ?? null,
      beendetAm: prisma.beendetAm ?? null,
      befehlCount: prisma.befehlCount,
      empfaengerCount: prisma.empfaengerCount,
      kommentarCount: prisma.kommentarCount,
      aufbewahrungsfrist: prisma.aufbewahrungsfrist,
      anonymisiertAm: prisma.anonymisiertAm,
      reportData: (prisma.reportData as Record<string, unknown>) ?? null,
      createdAt: prisma.createdAt,
    };
  }

  /**
   * Konvertiert Domain Entity zu Prisma-kompatiblen Daten.
   */
  static toPersistence(report: ComplianceReport): Prisma.ComplianceReportUncheckedCreateInput {
    return {
      id: report.id,
      einsatzId: report.einsatzId,
      einsatzName: report.einsatzName,
      beendetAm: report.beendetAm,
      befehlCount: report.befehlCount,
      empfaengerCount: report.empfaengerCount,
      kommentarCount: report.kommentarCount,
      aufbewahrungsfrist: report.aufbewahrungsfrist,
      anonymisiertAm: report.anonymisiertAm,
      reportData: (report.reportData as Prisma.InputJsonValue) ?? undefined,
    };
  }
}
