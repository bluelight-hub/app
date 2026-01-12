import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ServerAccessToken } from '../aggregates/server-access-token.aggregate';
import type { AccessTokenId } from '../value-objects/access-token-id';
import type { TokenHash } from '../value-objects/token-hash';

/**
 * Repository Port Interface für ServerAccessToken Aggregates (Hexagonal Architecture).
 *
 * Definiert die Persistenz-Schnittstelle für ServerAccessToken Aggregates ohne
 * technische Details der Implementierung. Die konkrete Umsetzung erfolgt in der
 * Infrastructure Layer (PrismaServerAccessTokenRepository).
 *
 * **Warum Port Interface:**
 * - Dependency Inversion Principle: Domain Layer hängt von Abstraktion ab
 * - Testability: Mock-Repository für Unit Tests ohne echte Datenbankverbindung
 * - Framework-Agnostic: Keine Prisma-Typen in Domain Layer Signaturen
 *
 * **Security Considerations:**
 * - Token-Hashes werden NIEMALS vollständig geloggt
 * - Sensitive Daten werden maskiert in Logs (nutze TokenHash.toMaskedString())
 *
 * **Timing-Safe Token Validation (Story 1.3):**
 * Die eigentliche Token-Validierung erfolgt in der Application Layer:
 * 1. Klartext-Token wird mit bcrypt.compare() gegen gespeicherten Hash geprüft
 * 2. bcrypt.compare() ist inherent timing-safe (konstante Vergleichszeit)
 * 3. Siehe: ValidateTokenHandler in Story 1.3 für Implementierung
 *
 * @example
 * ```typescript
 * // In Application Layer (Use Case)
 * async validateToken(tokenHash: TokenHash): Promise<Result<boolean>> {
 *   const tokenResult = await this.tokenRepository.findByTokenHash(tokenHash);
 *   if (tokenResult.isFailure) return Result.fail(tokenResult.error);
 *   if (!tokenResult.value) return Result.ok(false);
 *
 *   const token = tokenResult.value;
 *   if (!token.isValid()) return Result.ok(false);
 *
 *   token.recordUsage();
 *   await this.tokenRepository.save(token);
 *   return Result.ok(true);
 * }
 * ```
 */
export interface IServerAccessTokenRepository {
  /**
   * Findet ein Token anhand seiner Type-Safe ID.
   *
   * Gibt null zurück wenn kein Token mit dieser ID existiert (KEIN Fehler!).
   * "Not found" ist ein valides Business-Resultat.
   *
   * @param id - AccessTokenId Value Object (blh_ prefix)
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<ServerAccessToken | null> - Success mit Token oder null
   */
  findById(id: AccessTokenId, tx?: TransactionContext): Promise<Result<ServerAccessToken | null>>;

  /**
   * Findet ein Token anhand seines bcrypt-Hashes.
   *
   * **Wichtig:** Diese Methode sucht nach dem exakten Hash-Wert.
   * Sie wird verwendet nachdem ein Klartext-Token gehashed wurde.
   *
   * **Security:**
   * - Token-Hash wird nicht geloggt (nutzt TokenHash.toMaskedString())
   * - Exact match erforderlich (keine partielle Suche)
   *
   * @param tokenHash - TokenHash Value Object (bcrypt-Hash)
   * @param tx - Optional Transaction Context
   * @returns Result<ServerAccessToken | null> - Success mit Token oder null
   */
  findByTokenHash(tokenHash: TokenHash, tx?: TransactionContext): Promise<Result<ServerAccessToken | null>>;

  /**
   * Lädt alle nicht-widerrufenen Tokens.
   *
   * **Use Case:**
   * - Admin Dashboard: Token-Übersicht
   * - Security Audit: Aktive Tokens prüfen
   *
   * **Performance Note:**
   * Für produktive Systeme sollte Pagination hinzugefügt werden.
   *
   * @param tx - Optional Transaction Context
   * @returns Result<ServerAccessToken[]> - Success mit Array (kann leer sein)
   */
  findAllActive(tx?: TransactionContext): Promise<Result<ServerAccessToken[]>>;

  /**
   * Persistiert ein ServerAccessToken Aggregate (Create oder Update).
   *
   * Entscheidung zwischen Create/Update erfolgt automatisch basierend
   * auf dem Aggregate State (neue ID vs. existierendes Token).
   *
   * **Event Handling:**
   * - Aggregate enthält Domain Events
   * - Infrastructure Layer dispatched Events NACH erfolgreicher Persistierung
   * - Transaktionale Konsistenz über Outbox Pattern
   *
   * @param token - ServerAccessToken Aggregate
   * @param tx - Optional Transaction Context für Atomizität
   * @returns Result<void> - Success oder Failure bei Persistenz-Fehler
   */
  save(token: ServerAccessToken, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Löscht ein Token permanent aus der Datenbank.
   *
   * **ACHTUNG:** Hard Delete! Für normale Fälle sollte revoke() verwendet werden.
   *
   * **Use Case:**
   * - DSGVO-Löschung
   * - Datenbereinigung alter/widerrufener Tokens
   *
   * @param id - AccessTokenId des zu löschenden Tokens
   * @param tx - Optional Transaction Context
   * @returns Result<void> - Success oder Failure
   */
  delete(id: AccessTokenId, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Prüft ob ein Token mit dem gegebenen Hash bereits existiert.
   *
   * **Uniqueness Constraint Enforcement:**
   * - Token-Hash MUSS unique sein (verhindert Hash-Kollisionen)
   * - Prüfung erfolgt VOR save() um DB Constraint Violation zu vermeiden
   *
   * @param tokenHash - TokenHash Value Object
   * @param tx - Optional Transaction Context
   * @returns Result<boolean> - true wenn Hash existiert
   */
  existsByTokenHash(tokenHash: TokenHash, tx?: TransactionContext): Promise<Result<boolean>>;

  /**
   * Zählt die Anzahl aktiver (nicht-widerrufener, nicht-abgelaufener) Tokens.
   *
   * **Use Case:**
   * - Monitoring: Anzahl aktiver API-Tokens
   * - Rate Limiting: Maximale Token-Anzahl pro Tenant
   * - Dashboard: Token Statistics
   *
   * @param tx - Optional Transaction Context
   * @returns Result<number> - Anzahl aktiver Tokens
   */
  countActive(tx?: TransactionContext): Promise<Result<number>>;

  /**
   * Lädt alle Tokens mit Pagination (sowohl aktive als auch widerrufene).
   *
   * **Use Case:**
   * - Admin Dashboard: Token-Übersicht mit allen Tokens
   * - Token-Verwaltung: Liste aller Tokens zur Administration
   *
   * **Sortierung:**
   * - Tokens werden nach createdAt DESC sortiert (neueste zuerst)
   *
   * @param page - Seitennummer (1-basiert)
   * @param limit - Anzahl der Einträge pro Seite
   * @param tx - Optional Transaction Context
   * @returns Result<ServerAccessTokenPaginatedResult> - Success mit paginiertem Ergebnis
   */
  findAllPaginated(page: number, limit: number, tx?: TransactionContext): Promise<Result<ServerAccessTokenPaginatedResult>>;
}

/**
 * Paginiertes Ergebnis für ServerAccessToken Queries.
 */
export interface ServerAccessTokenPaginatedResult {
  /** Liste der Tokens auf der aktuellen Seite */
  items: ServerAccessToken[];
  /** Gesamtzahl aller Tokens */
  total: number;
  /** Aktuelle Seitennummer */
  page: number;
  /** Anzahl der Einträge pro Seite */
  pageSize: number;
  /** Gesamtzahl der Seiten */
  totalPages: number;
}
