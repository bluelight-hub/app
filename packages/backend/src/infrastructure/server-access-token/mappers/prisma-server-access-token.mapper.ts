import type { ServerAccessToken as PrismaServerAccessToken } from '@prisma/client';
import { ServerAccessToken, type ReconstructServerAccessTokenProps } from '@domain/aggregates/server-access-token.aggregate';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';

/**
 * Persistence Data Transfer Object für ServerAccessToken.
 *
 * Repräsentiert die Datenstruktur für Prisma-Operationen.
 * Unterscheidet sich von Domain-Model durch primitive Types.
 *
 * @security NIEMALS tokenHash vollständig loggen!
 * Nutze nur die ersten 8 Zeichen für Logs: `tokenHash.substring(0, 8) + '...'`
 */
export interface ServerAccessTokenPersistenceDto {
  id: string;
  tokenHash: string;
  name: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapper zwischen Prisma-Model und Domain-Aggregate für ServerAccessToken.
 *
 * Implementiert das Repository Mapper Pattern für saubere Trennung
 * zwischen Infrastructure Layer (Prisma Types) und Domain Layer (Aggregates).
 *
 * **Warum Mapper Pattern:**
 * - Hexagonal Architecture: Domain bleibt framework-agnostic
 * - Type Safety: Explizite Transformation verhindert Mapping-Fehler
 * - Testability: Mapper kann isoliert getestet werden
 * - Encapsulation: Prisma-spezifische Details bleiben in Infrastructure Layer
 *
 * @example
 * ```typescript
 * // Prisma → Domain (Repository.findById)
 * const aggregate = PrismaServerAccessTokenMapper.toAggregate(prismaRecord);
 *
 * // Domain → Prisma (Repository.save)
 * const data = PrismaServerAccessTokenMapper.toPersistence(aggregate);
 * ```
 */
export class PrismaServerAccessTokenMapper {
  /**
   * Transformiert Prisma-Record zu Domain Aggregate.
   *
   * Verwendet ServerAccessToken.reconstruct() für sichere Aggregate-Erstellung
   * ohne erneute Validation (Daten sind bereits in DB validiert).
   *
   * @param record - Prisma ServerAccessToken Record
   * @returns ServerAccessToken Aggregate
   * @throws Error wenn Value Object Validation fehlschlägt (sollte nicht passieren bei validen DB-Daten)
   */
  static toAggregate(record: PrismaServerAccessToken): ServerAccessToken {
    // Value Objects rekonstruieren
    const idResult = AccessTokenId.create(record.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Invalid AccessTokenId in database: ${record.id}`);
    }

    const tokenHashResult = TokenHash.create(record.tokenHash);
    if (tokenHashResult.isFailure || !tokenHashResult.value) {
      throw new Error(`Invalid TokenHash in database for token: ${record.id}`);
    }

    // Reconstruct Props erstellen
    const props: ReconstructServerAccessTokenProps = {
      id: idResult.value,
      tokenHash: tokenHashResult.value,
      name: record.name,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      isRevoked: record.isRevoked,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return ServerAccessToken.reconstruct(props);
  }

  /**
   * Transformiert Domain Aggregate zu Prisma-kompatiblem DTO.
   *
   * Extrahiert primitive Values aus Value Objects für Prisma-Operationen.
   *
   * @param aggregate - ServerAccessToken Aggregate
   * @returns ServerAccessTokenPersistenceDto für Prisma-Queries
   */
  static toPersistence(aggregate: ServerAccessToken): ServerAccessTokenPersistenceDto {
    return {
      id: aggregate.id.value,
      tokenHash: aggregate.tokenHash.value,
      name: aggregate.name,
      lastUsedAt: aggregate.lastUsedAt,
      expiresAt: aggregate.expiresAt,
      isRevoked: aggregate.isRevoked,
      revokedAt: aggregate.revokedAt,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }
}
