import type { InviteCode as PrismaInviteCode } from '@/generated/prisma/client';
import { InviteCode, type ReconstructInviteCodeProps } from '@domain/aggregates/invite-code.aggregate';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';

/**
 * Persistence Data Transfer Object fuer InviteCode.
 *
 * Repraesentiert die Datenstruktur fuer Prisma-Operationen.
 * Unterscheidet sich vom Domain-Model durch primitive Types.
 *
 * @security NIEMALS den vollstaendigen Invite-Code loggen!
 * Nutze InviteCodeValue.toMasked() fuer Logs: "ABC1****"
 */
export interface InviteCodePersistenceDto {
  id: string;
  code: string;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
  createdById: string;
  label: string | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapper zwischen Prisma-Model und Domain-Aggregate fuer InviteCode.
 *
 * Implementiert das Repository Mapper Pattern fuer saubere Trennung
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
 * const aggregate = PrismaInviteCodeMapper.toAggregate(prismaRecord);
 *
 * // Domain → Prisma (Repository.save)
 * const data = PrismaInviteCodeMapper.toPersistence(aggregate);
 * ```
 */
export class PrismaInviteCodeMapper {
  /**
   * Transformiert Prisma-Record zu Domain Aggregate.
   *
   * Verwendet InviteCode.reconstruct() fuer sichere Aggregate-Erstellung
   * ohne erneute Validation (Daten sind bereits in DB validiert).
   *
   * @param record - Prisma InviteCode Record
   * @returns InviteCode Aggregate
   * @throws Error wenn Value Object Validation fehlschlaegt (sollte nicht passieren bei validen DB-Daten)
   */
  static toAggregate(record: PrismaInviteCode): InviteCode {
    // Value Objects rekonstruieren
    const idResult = InviteCodeId.create(record.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Invalid InviteCodeId in database: ${record.id}`);
    }

    const codeResult = InviteCodeValue.fromString(record.code);
    if (codeResult.isFailure || !codeResult.value) {
      throw new Error(`Invalid InviteCodeValue in database for id: ${record.id}`);
    }

    // Reconstruct Props erstellen
    const props: ReconstructInviteCodeProps = {
      id: idResult.value,
      code: codeResult.value,
      expiresAt: record.expiresAt,
      maxUses: record.maxUses,
      usedCount: record.useCount,
      createdById: record.createdById,
      label: record.label,
      isRevoked: record.isRevoked,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return InviteCode.reconstruct(props);
  }

  /**
   * Transformiert Domain Aggregate zu Prisma-kompatiblem DTO.
   *
   * Extrahiert primitive Values aus Value Objects fuer Prisma-Operationen.
   *
   * @param aggregate - InviteCode Aggregate
   * @returns InviteCodePersistenceDto fuer Prisma-Queries
   */
  static toPersistence(aggregate: InviteCode): InviteCodePersistenceDto {
    return {
      id: aggregate.id.value,
      code: aggregate.code.value,
      expiresAt: aggregate.expiresAt,
      maxUses: aggregate.maxUses,
      useCount: aggregate.usedCount,
      createdById: aggregate.createdById,
      label: aggregate.label,
      isRevoked: aggregate.isRevoked,
      revokedAt: aggregate.revokedAt,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }
}
