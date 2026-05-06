import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ISicherungspostenVersionRepository, SicherungspostenVersionReadModel } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaSicherungspostenMapper } from './mappers/sicherungsposten.mapper';

/**
 * Read-Adapter für die Versions-Chain (`sicherungsposten_versionen`).
 *
 * Story 4.1 nutzt nur den Read-Pfad — die Schreibseite liegt im Haupt-Repo
 * (`PrismaSicherungspostenRepository.save`), das Aggregate + Versions-Zeile
 * atomar in einer Transaktion persistiert.
 */
@Injectable()
export class PrismaSicherungspostenVersionRepository implements ISicherungspostenVersionRepository {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly prisma: PrismaService,
  ) {}

  async findHistoryByPostenId(postenId: string): Promise<Result<SicherungspostenVersionReadModel[]>> {
    try {
      const rows = await this.prisma.sicherungspostenVersion.findMany({
        where: { postenId },
        orderBy: [{ version: 'desc' }],
      });
      return Result.ok(rows.map((row) => PrismaSicherungspostenMapper.toVersionReadModel(row)));
    } catch (error) {
      this.logger.error('Fehler beim Laden der Sicherungsposten-Versions-Chain', {
        postenId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<SicherungspostenVersionReadModel[]>('InfrastructureError:LoadVersions');
    }
  }
}
