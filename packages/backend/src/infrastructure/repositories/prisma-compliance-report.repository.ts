import type { IComplianceReportRepository } from '@domain/repositories/i-compliance-report.repository';
import type { ComplianceReport } from '@domain/entities/compliance-report.entity';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaComplianceReportMapper } from './mappers/prisma-compliance-report.mapper';
import { Result } from '@domain/common/result';

/**
 * Prisma Implementation des IComplianceReportRepository.
 *
 * Speichert und liest DSGVO-Compliance-Reports für Anonymisierungsläufe.
 *
 * @remarks Story 5.5 AC2
 */
@Injectable()
export class PrismaComplianceReportRepository implements IComplianceReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(report: ComplianceReport): Promise<Result<void>> {
    try {
      const data = PrismaComplianceReportMapper.toPersistence(report);

      await this.prisma.complianceReport.create({
        data,
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<void>(`Fehler beim Speichern des ComplianceReports: ${message}`);
    }
  }

  async findAll(): Promise<Result<ComplianceReport[]>> {
    try {
      const records = await this.prisma.complianceReport.findMany({
        orderBy: { anonymisiertAm: 'desc' },
      });

      return Result.ok<ComplianceReport[]>(records.map((r) => PrismaComplianceReportMapper.toDomain(r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<ComplianceReport[]>(`Fehler beim Laden der ComplianceReports: ${message}`);
    }
  }

  async findByEinsatzId(einsatzId: string): Promise<Result<ComplianceReport[]>> {
    try {
      const records = await this.prisma.complianceReport.findMany({
        where: { einsatzId },
        orderBy: { anonymisiertAm: 'desc' },
      });

      return Result.ok<ComplianceReport[]>(records.map((r) => PrismaComplianceReportMapper.toDomain(r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<ComplianceReport[]>(`Fehler beim Laden der ComplianceReports: ${message}`);
    }
  }
}
