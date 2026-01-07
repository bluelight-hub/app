import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { InviteCode } from '../aggregates/invite-code.aggregate';
import type { InviteCodeId } from '../value-objects/invite-code-id';
import type { InviteCodeValue } from '../value-objects/invite-code-value';

/**
 * Repository Port Interface für InviteCode Aggregates (Hexagonal Architecture).
 *
 * Definiert die Persistenz-Schnittstelle für InviteCode Aggregates ohne
 * technische Details der Implementierung. Die konkrete Umsetzung erfolgt in der
 * Infrastructure Layer (PrismaInviteCodeRepository).
 *
 * **Warum Port Interface:**
 * - Dependency Inversion Principle: Domain Layer hängt von Abstraktion ab
 * - Testability: Mock-Repository für Unit Tests ohne echte Datenbankverbindung
 * - Framework-Agnostic: Keine Prisma-Typen in Domain Layer Signaturen
 *
 * **Security Considerations:**
 * - Invite-Codes werden in Logs maskiert (nutze InviteCodeValue.toMasked())
 * - Rate Limiting sollte auf Application Layer implementiert werden
 *
 * @example
 * ```typescript
 * // In Application Layer (Use Case)
 * async validateCode(codeString: string): Promise<Result<InviteCode | null>> {
 *   const codeResult = InviteCodeValue.fromString(codeString);
 *   if (codeResult.isFailure) {
 *     return Result.fail(codeResult.error!);
 *   }
 *
 *   const inviteResult = await this.inviteCodeRepository.findByCode(codeResult.value!);
 *   if (inviteResult.isFailure) {
 *     return Result.fail(inviteResult.error!);
 *   }
 *
 *   const invite = inviteResult.value;
 *   if (!invite || !invite.isValid()) {
 *     return Result.ok(null);
 *   }
 *
 *   return Result.ok(invite);
 * }
 * ```
 */
export interface IInviteCodeRepository {
  /**
   * Findet einen InviteCode anhand seiner Type-Safe ID.
   *
   * Gibt null zurück wenn kein Code mit dieser ID existiert.
   *
   * @param id - InviteCodeId Value Object
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<InviteCode | null> - Success mit InviteCode oder null
   */
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>>;

  /**
   * Findet einen InviteCode anhand des 8-stelligen Codes.
   *
   * Diese Methode wird bei der Registrierung verwendet,
   * wenn ein Nutzer seinen Invite-Code eingibt.
   *
   * @param code - InviteCodeValue Value Object (8-stelliger Code)
   * @param tx - Optional Transaction Context
   * @returns Result<InviteCode | null> - Success mit InviteCode oder null
   */
  findByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<Result<InviteCode | null>>;

  /**
   * Lädt alle aktiven (nicht-abgelaufenen, nicht-widerrufenen) InviteCodes.
   *
   * **Use Case:**
   * - Admin Dashboard: Code-Übersicht
   * - Monitoring: Aktive Codes prüfen
   *
   * @param tx - Optional Transaction Context
   * @returns Result<InviteCode[]> - Success mit Array (kann leer sein)
   */
  findAllActive(tx?: TransactionContext): Promise<Result<InviteCode[]>>;

  /**
   * Lädt alle InviteCodes eines bestimmten Admins.
   *
   * **Use Case:**
   * - Admin sieht seine eigenen erstellten Codes
   *
   * @param createdById - User ID des Erstellers
   * @param tx - Optional Transaction Context
   * @returns Result<InviteCode[]> - Success mit Array
   */
  findByCreator(createdById: string, tx?: TransactionContext): Promise<Result<InviteCode[]>>;

  /**
   * Persistiert ein InviteCode Aggregate (Create oder Update).
   *
   * @param inviteCode - InviteCode Aggregate
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<void> - Success oder Failure bei Persistenz-Fehler
   */
  save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Prüft ob ein Code bereits existiert.
   *
   * **Uniqueness Constraint Enforcement:**
   * - Code MUSS unique sein
   * - Prüfung erfolgt VOR save() um DB Constraint Violation zu vermeiden
   *
   * @param code - InviteCodeValue Value Object
   * @param tx - Optional Transaction Context
   * @returns Result<boolean> - true wenn Code existiert
   */
  existsByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<Result<boolean>>;

  /**
   * Zählt die Anzahl aktiver (nicht-abgelaufener, nicht-widerrufener) Codes.
   *
   * **Use Case:**
   * - Dashboard: Code Statistics
   * - Rate Limiting: Maximale Code-Anzahl
   *
   * @param tx - Optional Transaction Context
   * @returns Result<number> - Anzahl aktiver Codes
   */
  countActive(tx?: TransactionContext): Promise<Result<number>>;
}
