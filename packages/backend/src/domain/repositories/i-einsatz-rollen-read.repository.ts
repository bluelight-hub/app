import type { Result } from '@domain/common/result';

/**
 * DTO fuer die eigene Rollenzuweisung im Einsatz.
 *
 * Verwendet von IEinsatzRollenReadRepository als leichtgewichtiges
 * Read-Model ohne Domain-Entity-Overhead.
 */
export interface MeineRolleReadDto {
  /** Rolle als String (z.B. 'BEFEHLSGEBER', 'ERSTELLER', ...) oder null wenn keine Zuweisung. */
  rolle: string | null;
}

/**
 * Read-Only Repository Port fuer Einsatz-Rollen-Queries.
 *
 * Story 4.3 AC1: Separates Port-Interface fuer Read-Only Rollen-Abfragen.
 * Entkoppelt Application Layer (Handler) vom Infrastructure Layer (Prisma).
 *
 * **Design Constraints:**
 * - KEINE Prisma Types in Signaturen (Domain Layer bleibt framework-agnostisch)
 * - Result<T> Pattern fuer explizite Error Handling
 * - Alle Methods async (I/O Boundary)
 * - Read-Only: Keine Mutations-Methoden
 */
export interface IEinsatzRollenReadRepository {
  /**
   * Findet die Rollenzuweisung eines Users in einem Einsatz.
   *
   * @param einsatzId - ID des Einsatzes
   * @param userId - ID des Users
   * @returns Result mit MeineRolleReadDto (rolle=null wenn keine Zuweisung)
   */
  findMeineRolle(einsatzId: string, userId: string): Promise<Result<MeineRolleReadDto>>;

  /**
   * Prueft ob im Einsatz ueberhaupt Rollenzuweisungen existieren.
   *
   * Wird genutzt um zu unterscheiden:
   * - Rollensystem nicht konfiguriert (0 Zuweisungen) → volle Permissions
   * - Rollensystem aktiv, User hat keine Rolle → keine Permissions
   */
  hasAnyRollen(einsatzId: string): Promise<Result<boolean>>;
}
