import type { Sicherheitsregel as PrismaSicherheitsregelRow } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';

/**
 * Sentinel-Präfix für Reconstitution-Fehler. Der Repository-Layer ergänzt
 * das konkrete Validierungs-Detail als Suffix (`:einsatzId ist erforderlich`
 * etc.), damit der Controller / Monitoring das Problem eingrenzen kann.
 */
export const INFRASTRUCTURE_ERROR_RECONSTITUTE_SICHERHEITSREGEL = 'InfrastructureError:ReconstituteSicherheitsregel';

/**
 * Mapper zwischen Prisma-Row (`sicherheitsregeln`) und Domain-Aggregate
 * (Story 2.6).
 *
 * Analog zur Gefährdungsbeurteilung (Story 2.1+) übernimmt `reconstitute` die
 * DB-`version` 1:1 (statt `create`, was auf Version 1 zurückfallen würde und
 * Optimistic-Concurrency-Updates danach kaputt machen würde).
 *
 * Die `propagationGroupId` ist **nicht** Teil der Row (nur im Event-Payload)
 * und wird daher im Repo aus dem Outbox-Stream nachgeladen — nicht hier.
 */
export class PrismaSicherheitsregelMapper {
  static toDomain(row: PrismaSicherheitsregelRow): Result<Sicherheitsregel> {
    return Sicherheitsregel.reconstitute({
      id: row.id,
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      titel: row.titel,
      inhalt: row.inhalt,
      version: row.version,
      erstelltVonUserId: row.erstelltVonUserId,
      aktualisiertVonUserId: row.aktualisiertVonUserId,
    });
  }

  /**
   * Prisma-`create`-Shape für {@link ISicherheitsregelRepository.save}.
   * `aktualisiertAm` wird via `@updatedAt` automatisch gesetzt; `erstelltAm`
   * via `@default(now())`.
   */
  static toPersistenceCreate(aggregate: Sicherheitsregel, aktualisiertVonUserId: string) {
    return {
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId,
      einheitId: aggregate.einheitId,
      titel: aggregate.titel,
      inhalt: aggregate.inhalt,
      version: aggregate.version,
      erstelltVonUserId: aggregate.erstelltVonUserId,
      aktualisiertVonUserId,
    };
  }

  /**
   * Prisma-`update`-`data`-Shape für
   * {@link ISicherheitsregelRepository.updateWithNewVersion}.
   * Nur mutable Felder + neue Version + `aktualisiertVonUserId`.
   */
  static toPersistenceUpdate(aggregate: Sicherheitsregel, aktualisiertVonUserId: string) {
    return {
      titel: aggregate.titel,
      inhalt: aggregate.inhalt,
      einheitId: aggregate.einheitId,
      version: aggregate.version,
      aktualisiertVonUserId,
    };
  }
}
