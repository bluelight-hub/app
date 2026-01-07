import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { InviteCode } from '../aggregates/invite-code.aggregate';
import type { InviteCodeId } from '../value-objects/invite-code-id';
import type { InviteCodeStatus } from '../value-objects/invite-code-status';
import type { InviteCodeValue } from '../value-objects/invite-code-value';

// ============================================================================
// Pagination & Filter Types für InviteCode Repository
// ============================================================================

/**
 * Filter-Optionen für die InviteCode-Abfrage.
 *
 * Ermöglicht serverseitige Filterung der InviteCodes nach Status und Ersteller.
 *
 * @example
 * ```typescript
 * const filters: InviteCodeFilters = {
 *   status: InviteCodeStatus.ACTIVE,
 *   createdById: 'admin-user-123',
 * };
 * ```
 */
export interface InviteCodeFilters {
  /** Filtert nach berechnetem Status (ACTIVE, USED, EXPIRED, REVOKED) */
  status?: InviteCodeStatus;
  /** Filtert nach dem Ersteller des Codes (User-ID) */
  createdById?: string;
}

/**
 * Sortier-Optionen für die InviteCode-Abfrage.
 *
 * Definiert das Sortierfeld und die Richtung für die Ergebnisliste.
 *
 * @example
 * ```typescript
 * const sort: InviteCodeSortOptions = {
 *   field: 'createdAt',
 *   direction: 'desc',
 * };
 * ```
 */
export interface InviteCodeSortOptions {
  /** Feld nach dem sortiert werden soll */
  field: 'createdAt' | 'expiresAt' | 'useCount';
  /** Sortierrichtung: aufsteigend oder absteigend */
  direction: 'asc' | 'desc';
}

/**
 * Pagination-Optionen für die InviteCode-Abfrage.
 *
 * Ermöglicht seitenbasierte Abfragen mit konfigurierbarer Seitengröße.
 *
 * @example
 * ```typescript
 * const pagination: InviteCodePaginationOptions = {
 *   page: 1,
 *   pageSize: 20,
 * };
 * ```
 */
export interface InviteCodePaginationOptions {
  /** Seitennummer (1-basiert) */
  page: number;
  /** Anzahl der Einträge pro Seite */
  pageSize: number;
}

/**
 * Paginiertes Ergebnis für InviteCode-Abfragen.
 *
 * Enthält die Ergebnisliste sowie Metadaten für Pagination-Navigation.
 *
 * @typeParam T - Typ der Listeneinträge (typischerweise InviteCode)
 *
 * @example
 * ```typescript
 * const result: InviteCodePaginatedResult<InviteCode> = {
 *   items: [inviteCode1, inviteCode2],
 *   total: 50,
 *   page: 1,
 *   pageSize: 20,
 *   totalPages: 3,
 * };
 * ```
 */
export interface InviteCodePaginatedResult<T> {
  /** Liste der Einträge für die aktuelle Seite */
  items: T[];
  /** Gesamtanzahl aller Einträge (über alle Seiten) */
  total: number;
  /** Aktuelle Seitennummer (1-basiert) */
  page: number;
  /** Anzahl der Einträge pro Seite */
  pageSize: number;
  /** Gesamtanzahl der Seiten (berechnet: Math.ceil(total / pageSize)) */
  totalPages: number;
}

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

  /**
   * Findet alle InviteCodes mit Pagination, Filterung und Sortierung.
   *
   * **Warum paginiert statt findAll():**
   * - Performance: Verhindert Memory Overflow bei vielen Codes
   * - UX: Frontend kann Infinite Scroll oder Table Pagination implementieren
   * - Flexibilität: Serverseitige Filterung reduziert Datentransfer
   *
   * **Status-Filterung:**
   * Der Status wird zur Laufzeit berechnet (InviteCode.computeStatus()).
   * Bei Datenbankfilterung muss die Repository-Implementierung die Status-Logik
   * nachbilden:
   * - REVOKED: isRevoked = true
   * - EXPIRED: expiresAt <= now AND NOT revoked
   * - USED: usedCount >= maxUses AND NOT expired AND NOT revoked
   * - ACTIVE: Alle anderen
   *
   * **Defaults (wenn nicht angegeben):**
   * - filters: keine Filterung (alle Codes)
   * - sort: { field: 'createdAt', direction: 'desc' }
   * - pagination: { page: 1, pageSize: 20 }
   *
   * @param filters - Optional: Filter nach Status und/oder Ersteller
   * @param sort - Optional: Sortierung nach Feld und Richtung
   * @param pagination - Optional: Seitennummer und Seitengröße
   * @param tx - Optional Transaction Context
   * @returns Result mit paginiertem Ergebnis oder Failure bei DB-Fehler
   *
   * @example
   * ```typescript
   * // Alle aktiven Codes, neueste zuerst
   * const result = await repository.findAll(
   *   { status: InviteCodeStatus.ACTIVE },
   *   { field: 'createdAt', direction: 'desc' },
   *   { page: 1, pageSize: 20 },
   * );
   *
   * if (result.isSuccess) {
   *   const { items, total, totalPages } = result.value!;
   *   console.log(`Seite 1 von ${totalPages} (${total} Codes gesamt)`);
   * }
   * ```
   */
  findAll(filters?: InviteCodeFilters, sort?: InviteCodeSortOptions, pagination?: InviteCodePaginationOptions, tx?: TransactionContext): Promise<Result<InviteCodePaginatedResult<InviteCode>>>;
}
