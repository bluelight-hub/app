import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IZeichenKatalogRepository, ZeichenKatalogEintragData } from '@domain/taktische-zeichen/ports/izeichen-katalog.repository';

@Injectable()
export class PrismaZeichenKatalogRepository implements IZeichenKatalogRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async findAll(): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const data = await this.prisma.zeichenKatalogEintrag.findMany({
        orderBy: [{ kategorie: 'asc' }, { sortOrder: 'asc' }],
      });
      return Result.ok<ZeichenKatalogEintragData[]>(
        data.map((e) => ({
          id: e.id,
          name: e.name,
          kategorie: e.kategorie,
          beschreibung: e.beschreibung ?? undefined,
          zeichenDefinition: e.zeichenDefinition as Record<string, unknown>,
          tags: e.tags,
          sortOrder: e.sortOrder,
          istStandard: e.istStandard,
        })),
      );
    } catch (error) {
      this.logger.error(`Failed to find all ZeichenKatalogEintraege: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }

  async findByKategorie(kategorie: string): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const data = await this.prisma.zeichenKatalogEintrag.findMany({
        where: { kategorie },
        orderBy: { sortOrder: 'asc' },
      });
      return Result.ok<ZeichenKatalogEintragData[]>(
        data.map((e) => ({
          id: e.id,
          name: e.name,
          kategorie: e.kategorie,
          beschreibung: e.beschreibung ?? undefined,
          zeichenDefinition: e.zeichenDefinition as Record<string, unknown>,
          tags: e.tags,
          sortOrder: e.sortOrder,
          istStandard: e.istStandard,
        })),
      );
    } catch (error) {
      this.logger.error(`Failed to find ZeichenKatalogEintraege für Kategorie: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }

  async search(suchbegriff: string): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const data = await this.prisma.zeichenKatalogEintrag.findMany({
        where: {
          OR: [{ name: { contains: suchbegriff, mode: 'insensitive' } }, { tags: { has: suchbegriff } }],
        },
        orderBy: [{ kategorie: 'asc' }, { sortOrder: 'asc' }],
      });
      return Result.ok<ZeichenKatalogEintragData[]>(
        data.map((e) => ({
          id: e.id,
          name: e.name,
          kategorie: e.kategorie,
          beschreibung: e.beschreibung ?? undefined,
          zeichenDefinition: e.zeichenDefinition as Record<string, unknown>,
          tags: e.tags,
          sortOrder: e.sortOrder,
          istStandard: e.istStandard,
        })),
      );
    } catch (error) {
      this.logger.error(`Failed to search ZeichenKatalogEintraege: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }
}
