import { Injectable } from '@nestjs/common';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import type { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import type { TransactionContext } from '@domain/common/transaction';
import type { PrismaClient } from '@/generated/prisma/client';
// biome-ignore lint/style/useImportType: PrismaService ist Injectable - kein "import type" verwenden (bricht NestJS DI)
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaFuehrungsrhythmusTemplateMapper } from './mappers/prisma-fuehrungsrhythmus-template.mapper';

/**
 * Prisma-basierte Implementierung des FuehrungsrhythmusTemplate Repository.
 *
 * **Persistence Strategy:**
 * - save(): Upsert Template + deleteMany/createMany fuer Eintraege (Replace-All-Strategie)
 * - findAll(): Nur nicht-geloeschte Templates, mit Eintraegen sortiert nach sortOrder
 * - findById(): Template mit Eintraegen sortiert nach sortOrder
 * - exists(): COUNT Query fuer Performance
 *
 * **Transaction Support:**
 * - save() akzeptiert optionalen TransactionContext
 * - Cast zu PrismaClient im Infrastructure Layer (Opaque Type Pattern)
 */
@Injectable()
export class PrismaFuehrungsrhythmusTemplateRepository implements IFuehrungsrhythmusTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert ein FuehrungsrhythmusTemplate (Upsert mit Replace-All fuer Eintraege).
   *
   * **Strategie:**
   * 1. Upsert des Templates (create oder update)
   * 2. deleteMany alte Eintraege
   * 3. createMany neue Eintraege
   *
   * Alle Operationen innerhalb derselben Transaction.
   */
  async save(template: FuehrungsrhythmusTemplate, tx?: TransactionContext): Promise<void> {
    const client = (tx as PrismaClient | undefined) ?? this.prisma;
    const data = PrismaFuehrungsrhythmusTemplateMapper.toPersistence(template);

    // 1. Upsert Template
    await client.fuehrungsrhythmusTemplate.upsert({
      where: { id: data.template.id },
      create: {
        id: data.template.id,
        name: data.template.name,
        beschreibung: data.template.beschreibung,
        createdBy: data.template.createdBy,
        isDeleted: data.template.isDeleted,
        deletedAt: data.template.deletedAt,
        deletedBy: data.template.deletedBy,
      },
      update: {
        name: data.template.name,
        beschreibung: data.template.beschreibung,
        isDeleted: data.template.isDeleted,
        deletedAt: data.template.deletedAt,
        deletedBy: data.template.deletedBy,
      },
    });

    // 2. Alte Eintraege loeschen (Replace-All Strategie)
    await client.fuehrungsrhythmusEintrag.deleteMany({
      where: { fuehrungsrhythmusTemplateId: data.template.id },
    });

    // 3. Neue Eintraege erstellen
    if (data.eintraege.length > 0) {
      await client.fuehrungsrhythmusEintrag.createMany({
        data: data.eintraege,
      });
    }
  }

  /**
   * Gibt alle nicht-geloeschten FuehrungsrhythmusTemplates zurueck.
   * Eintraege werden nach sortOrder sortiert inkludiert.
   */
  async findAll(): Promise<FuehrungsrhythmusTemplate[]> {
    const templates = await this.prisma.fuehrungsrhythmusTemplate.findMany({
      where: { isDeleted: false },
      include: {
        eintraege: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(PrismaFuehrungsrhythmusTemplateMapper.toDomain);
  }

  /**
   * Findet ein FuehrungsrhythmusTemplate anhand seiner ID.
   * Eintraege werden nach sortOrder sortiert inkludiert.
   */
  async findById(id: FuehrungsrhythmusTemplateId): Promise<FuehrungsrhythmusTemplate | null> {
    const raw = await this.prisma.fuehrungsrhythmusTemplate.findUnique({
      where: { id: id.toString() },
      include: {
        eintraege: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!raw) return null;
    return PrismaFuehrungsrhythmusTemplateMapper.toDomain(raw);
  }

  /**
   * Prueft ob ein nicht-geloeschtes FuehrungsrhythmusTemplate mit der ID existiert.
   * Nutzt COUNT Query fuer Performance (keine Row Materialization).
   */
  async exists(id: FuehrungsrhythmusTemplateId): Promise<boolean> {
    const count = await this.prisma.fuehrungsrhythmusTemplate.count({
      where: { id: id.toString(), isDeleted: false },
    });
    return count > 0;
  }
}
