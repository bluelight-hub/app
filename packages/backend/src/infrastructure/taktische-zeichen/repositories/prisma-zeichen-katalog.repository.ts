import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IZeichenKatalogRepository, ZeichenKatalogEintragData } from '@domain/taktische-zeichen/ports/izeichen-katalog.repository';

/**
 * Organisations-Sortierung: Hilfsorganisationen → THW → Feuerwehr → Rest.
 * Wird als SQL-Fragment in allen Queries verwendet.
 */
const ORGANISATION_SORT_SQL = `
  CASE (zeichen_definition->>'organisation')
    WHEN 'hilfsorganisation' THEN 1
    WHEN 'fuehrung' THEN 2
    WHEN 'thw' THEN 3
    WHEN 'feuerwehr' THEN 4
    WHEN 'polizei' THEN 5
    ELSE 0
  END
`;

interface RawKatalogRow {
  id: string;
  name: string;
  kategorie: string;
  beschreibung: string | null;
  zeichen_definition: Record<string, unknown>;
  tags: string[];
  sort_order: number;
  ist_standard: boolean;
}

function mapRow(e: RawKatalogRow): ZeichenKatalogEintragData {
  return {
    id: e.id,
    name: e.name,
    kategorie: e.kategorie,
    beschreibung: e.beschreibung ?? undefined,
    zeichenDefinition: e.zeichen_definition,
    tags: e.tags,
    sortOrder: e.sort_order,
    istStandard: e.ist_standard,
  };
}

@Injectable()
export class PrismaZeichenKatalogRepository implements IZeichenKatalogRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async findAll(): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "zeichen_katalog_eintraege"
         ORDER BY "kategorie" ASC, ${ORGANISATION_SORT_SQL}, "name" ASC`,
      )) as RawKatalogRow[];
      return Result.ok(rows.map(mapRow));
    } catch (error) {
      this.logger.error(`Failed to find all ZeichenKatalogEintraege: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }

  async findByKategorie(kategorie: string): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "zeichen_katalog_eintraege"
         WHERE "kategorie" = $1
         ORDER BY ${ORGANISATION_SORT_SQL}, "name" ASC`,
        kategorie,
      )) as RawKatalogRow[];
      return Result.ok(rows.map(mapRow));
    } catch (error) {
      this.logger.error(`Failed to find ZeichenKatalogEintraege für Kategorie: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }

  async search(suchbegriff: string): Promise<Result<ZeichenKatalogEintragData[]>> {
    try {
      const term = suchbegriff.toLowerCase();
      const pattern = `%${term}%`;
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "zeichen_katalog_eintraege"
         WHERE "name" ILIKE $1
            OR EXISTS (SELECT 1 FROM unnest("tags") AS t WHERE lower(t) LIKE $1)
         ORDER BY "kategorie" ASC, ${ORGANISATION_SORT_SQL}, "name" ASC`,
        pattern,
      )) as RawKatalogRow[];
      return Result.ok(rows.map(mapRow));
    } catch (error) {
      this.logger.error(`Failed to search ZeichenKatalogEintraege: ${error}`, 'PrismaZeichenKatalogRepository');
      return Result.fail<ZeichenKatalogEintragData[]>(`Database error: ${error}`);
    }
  }
}
