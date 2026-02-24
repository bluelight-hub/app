import type { IAufbewahrungsKonfigurationRepository } from '@domain/repositories/i-aufbewahrungs-konfiguration.repository';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaAufbewahrungsKonfigurationMapper } from './mappers/prisma-aufbewahrungs-konfiguration.mapper';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { Result } from '@domain/common/result';

/**
 * Prisma Implementation des IAufbewahrungsKonfigurationRepository.
 *
 * Singleton-Pattern: Es gibt immer genau eine Konfiguration.
 * get() gibt Default-Werte zurück wenn die Tabelle leer ist.
 * save() verwendet Upsert für atomare Create-or-Update Semantik.
 *
 * @remarks Story 5.5 AC1
 */
@Injectable()
export class PrismaAufbewahrungsKonfigurationRepository implements IAufbewahrungsKonfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Result<AufbewahrungsKonfiguration>> {
    try {
      const record = await this.prisma.aufbewahrungsKonfiguration.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return Result.ok<AufbewahrungsKonfiguration>(AufbewahrungsKonfiguration.default());
      }

      return Result.ok<AufbewahrungsKonfiguration>(PrismaAufbewahrungsKonfigurationMapper.toDomain(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<AufbewahrungsKonfiguration>(`Fehler beim Laden der AufbewahrungsKonfiguration: ${message}`);
    }
  }

  async save(config: AufbewahrungsKonfiguration, updatedBy: string): Promise<Result<void>> {
    try {
      const data = PrismaAufbewahrungsKonfigurationMapper.toPersistence(config, updatedBy);

      // Singleton: Finde existierende oder erstelle neue
      const existing = await this.prisma.aufbewahrungsKonfiguration.findFirst();

      if (existing) {
        await this.prisma.aufbewahrungsKonfiguration.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.aufbewahrungsKonfiguration.create({
          data,
        });
      }

      return Result.ok<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<void>(`Fehler beim Speichern der AufbewahrungsKonfiguration: ${message}`);
    }
  }
}
