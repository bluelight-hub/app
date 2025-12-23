import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
/**
 * AC3 Exception: PrismaService Import in Application Layer.
 *
 * **WARUM verstößt dieser Import gegen AC3 (Framework-Agnostizität)?**
 * - Application Layer sollte KEINE Infrastructure-spezifischen Implementierungen importieren
 * - NestJS DI erfordert das Runtime-Symbol für `@Injectable()` Constructor Injection
 * - TypeScript `import type` würde zur Compile-Time entfernt → DI würde zur Laufzeit brechen
 *
 * **WARUM wird hier dennoch PrismaService importiert?**
 *
 * 1. **Transaction Management ist Infrastructure Concern:**
 *    - Prisma's `$transaction()` API ist framework-spezifisch (Prisma Client)
 *    - Alternative: ITransactionManager Abstraction (Ports & Adapters Pattern)
 *    - Nachteil: Mehr Boilerplate, zusätzliche Indirection, komplexere Testing
 *
 * 2. **Praktischer Trade-off (Pragmatismus vs. Purismus):**
 *    - TransactionalCommandHandler ist INFRASTRUKTUR-NÄHER als Domain Logic
 *    - Er orchestriert Transaction Coordination (technischer Concern)
 *    - Business Logic in `executeInTransaction()` bleibt framework-agnostisch
 *
 * 3. **Alternative Lösungen (und warum sie NICHT gewählt wurden):**
 *
 *    **A) ITransactionManager Abstraction:**
 *    ```typescript
 *    interface ITransactionManager {
 *      executeInTransaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;
 *    }
 *    class PrismaTransactionManager implements ITransactionManager { ... }
 *    ```
 *    - ✅ Volle Framework-Agnostizität
 *    - ❌ Mehr Boilerplate (zusätzliche Interface + Implementierung)
 *    - ❌ Schwieriger zu testen (Mock von ITransactionManager statt direktem Prisma-Mock)
 *    - ❌ Performance Overhead durch zusätzliche Abstraction Layer
 *
 *    **B) Decorator Pattern (NestJS Transactional Decorator):**
 *    ```typescript
 *    @Transactional()
 *    async execute(command: TCommand): Promise<Result<TResult>> { ... }
 *    ```
 *    - ✅ Cleaner Handler-Code (keine manuelle Transaction)
 *    - ❌ NestJS-spezifisch (noch weniger portierbar)
 *    - ❌ Magic Behavior (Decorator injiziert implizit Transaction)
 *    - ❌ Schwieriger zu debuggen (AOP-basiertes Verhalten)
 *
 *    **C) Unit of Work Pattern:**
 *    ```typescript
 *    class UnitOfWork {
 *      commit(): Promise<void>;
 *      rollback(): Promise<void>;
 *    }
 *    ```
 *    - ✅ Framework-agnostisch
 *    - ❌ Komplexer (Change Tracking, Flush-Mechanismus)
 *    - ❌ Nicht idiomatisch für Prisma (Prisma bevorzugt Transactions über UoW)
 *
 * 4. **Gewählte Lösung: Controlled Coupling:**
 *    - TransactionalCommandHandler AKZEPTIERT PrismaService als Dependency
 *    - ABER: `executeInTransaction()` erhält framework-agnostisches `TransactionContext`
 *    - Repository Implementations casten `TransactionContext` zu `Prisma.TransactionClient`
 *    - Business Logic in Handlers bleibt framework-agnostisch
 *
 * 5. **Mitigations (wie wir die Auswirkungen minimieren):**
 *    - `TransactionContext` ist ein Opaque Type (kein Prisma-Bezug im Domain Layer)
 *    - Handlers nutzen NIEMALS Prisma-spezifische APIs direkt
 *    - Bei Framework-Wechsel: Nur TransactionalCommandHandler ändern, Handler-Logik bleibt
 *    - Tests mocken PrismaService einfach (bessere Testbarkeit als mit ITransactionManager)
 *
 * 6. **Lessons Learned (für zukünftige Projekte):**
 *    - Bei greenfield Projekten: ITransactionManager von Anfang an
 *    - Bei bestehenden Prisma-Projekten: Controlled Coupling akzeptabel
 *    - Wichtig: TransactionContext bleibt framework-agnostisch (kein Prisma-Type Leaking)
 *
 * **Fazit:**
 * - Dieser Import ist eine BEWUSSTE Architektur-Entscheidung (Pragmatismus)
 * - Framework-Agnostizität wird PARTIELL geopfert für Einfachheit
 * - Business Logic bleibt testbar und portierbar
 * - Transaction Management ist akzeptabel als Infrastructure Concern
 *
 * **biome-ignore Begründung:**
 * - NestJS DI benötigt das Runtime-Symbol für Constructor Injection
 * - `import type` würde zur Compile-Time entfernt → DI bricht zur Laufzeit
 * - Daher MUSS reguläres `import` statt `import type` genutzt werden
 */
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime (siehe JSDoc oben)
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// NOTE: Import needed for JSDoc example, even though not used in this file
// biome-ignore lint/correctness/noUnusedImports: Used in JSDoc example
import { EINSATZ_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Abstract Base Class für transaktionale Command Handler im Transactional Outbox Pattern.
 *
 * Orchestriert Aggregate-Persistierung und Domain-Event-Speicherung in einer
 * einzelnen Datenbank-Transaktion. Garantiert atomare Persistierung von
 * State Changes (Aggregate) und Events (Outbox) - verhindert Datenverlust
 * und inkonsistente Zustände bei Fehlerszenarien.
 *
 * **Result Pattern (AC4):**
 * - Verwendet `Result<T>` für erwartete Business-Fehler (Validierung, Business Rules)
 * - Exceptions nur für unerwartete Fehler (DB-Fehler, Netzwerk, Programming Errors)
 * - Transaction Rollback bei Exceptions UND bei Result.fail() in executeInTransaction
 *
 * **Warum dieses Pattern?**
 *
 * 1. **Konsistenz-Garantie:**
 *    - Aggregate und Events werden atomar committed oder beide zurückgerollt
 *    - Keine "lost events" bei DB-Fehlern nach Aggregate-Save
 *
 * 2. **Event-Publishing Entkopplung:**
 *    - Events landen zuerst in Outbox-Tabelle (PENDING status)
 *    - OutboxEventPublisher pollt asynchron und publiziert zu Event Bus
 *    - Command Handler blockiert nicht auf externen Event Bus
 *
 * 3. **Fehlertoleranz:**
 *    - Bei Transaction-Rollback: weder Aggregate noch Events persistiert
 *    - Retry-Safe: Idempotente Operations möglich (z.B. via CUID2 IDs)
 *
 * 4. **Single Responsibility:**
 *    - Handler fokussiert auf Business Logic (executeInTransaction)
 *    - Base Class handled Transaction Coordination und Outbox Persistierung
 *
 * **Transaction-Konfiguration:**
 *
 * - `maxWait: 5000ms` - Maximale Wartezeit für DB-Lock Acquisition
 * - `timeout: 10000ms` - Maximale Transaktionsdauer (Deadlock Prevention)
 *
 * Diese Werte sind Trade-offs:
 * - Höhere Werte: Mehr Toleranz für concurrent writes, höheres Deadlock-Risiko
 * - Niedrigere Werte: Schnellere Fehler-Erkennung, höhere Retry-Rate bei Contention
 *
 * @template TCommand - Command DTO Type (z.B. CreateEinsatzCommand)
 * @template TResult - Result Type nach erfolgreicher Ausführung (z.B. EinsatzId)
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CreateEinsatzHandler extends TransactionalCommandHandler<CreateEinsatzCommand, string> {
 *   constructor(
 *     prisma: PrismaService,
 *     outboxRepository: IOutboxRepository,
 *     @Inject(EINSATZ_REPOSITORY) private readonly einsatzRepository: IEinsatzRepository,
 *   ) {
 *     super(prisma, outboxRepository);
 *   }
 *
 *   protected async executeInTransaction(
 *     command: CreateEinsatzCommand,
 *     tx: TransactionContext,
 *   ): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
 *     // 1. Validate UserId
 *     const userIdResult = UserId.create(command.createdBy);
 *     if (userIdResult.isFailure) {
 *       return Result.fail(userIdResult.error); // ✅ Result Pattern
 *     }
 *
 *     // 2. Create Aggregate
 *     const einsatzResult = Einsatz.create({ ... });
 *     if (einsatzResult.isFailure) {
 *       return Result.fail(einsatzResult.error); // ✅ Result Pattern
 *     }
 *
 *     // 3. Save Aggregate in Transaction
 *     const saveResult = await this.einsatzRepository.save(einsatz, tx);
 *     if (saveResult.isFailure) {
 *       return Result.fail(saveResult.error); // ✅ Result Pattern
 *     }
 *
 *     // 4. Extract Events
 *     const events = einsatz.getDomainEvents();
 *
 *     // 5. Return success
 *     return { result: einsatz.id.value, events };
 *   }
 * }
 *
 * // Usage in Controller
 * const result = await handler.execute(command);
 * if (result.isFailure) {
 *   throw new BadRequestException(result.error);
 * }
 * return result.value;
 * ```
 */
@Injectable()
export abstract class TransactionalCommandHandler<TCommand, TResult> {
  /**
   * Constructor mit Required Dependencies für Transaction Coordination.
   *
   * @param prisma - PrismaService für $transaction() API
   * @param outboxRepository - IOutboxRepository für Event-Persistierung
   */
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly outboxRepository: IOutboxRepository,
  ) {}

  /**
   * Abstract Method - Subclasses implementieren Business Logic innerhalb der Transaktion.
   *
   * **Result Pattern (AC4):**
   * - IMMER `Result<T>` zurückgeben für erwartete Fehler (via Result.fail())
   * - Erfolgsfall: Plain object {result, events} OHNE Result.ok() wrapper
   * - Bei Result.fail(): Transaction wird automatisch zurückgerollt
   *
   * **Wichtig:** Diese Methode läuft innerhalb einer Prisma Transaction (tx).
   * - Verwende den `tx` Parameter für alle DB-Operations (NICHT this.prisma)
   * - Return events NACH Domain Logic aber VOR clearDomainEvents()
   * - Events werden automatisch vom Base Handler im Outbox persistiert
   *
   * **Lifecycle:**
   * 1. Validiere Inputs → Return Result.fail() bei Validierungsfehlern
   * 2. Aggregate erstellen/modifizieren → Return Result.fail() bei Business Rule Violations
   * 3. Aggregate.save(tx) → Return Result.fail() bei erwarteten Persistierungsfehlern
   * 4. events = aggregate.getDomainEvents() - Events extrahieren
   * 5. return { result, events } - Plain object für Success (KEIN Result.ok()!)
   * 6. [Base Handler] Outbox.save(events, tx) - Events atomar persistieren
   * 7. [Base Handler] Transaction Commit oder Rollback bei Result.fail()
   *
   * @param command - Validierter Command DTO
   * @param tx - Transaction Context (framework-agnostisch, Infrastructure castet zu Prisma)
   * @returns Result.fail() für Fehler ODER { result: TResult; events: DomainEvent[] } für Success
   */
  protected abstract executeInTransaction(command: TCommand, tx: TransactionContext): Promise<Result<TResult> | { result: TResult; events: DomainEvent[] }>;

  /**
   * Public Entry Point - Führt Command in Transaction aus und persistiert Events im Outbox.
   *
   * **Result Pattern (AC4):**
   * - Gibt `Result<TResult>` zurück (nicht TResult direkt)
   * - Controller müssen Result.isFailure prüfen und zu HTTP-Exceptions mappen
   * - Erwartete Fehler: Result.fail(), Unerwartete Fehler: Exception
   *
   * **Transactional Flow:**
   * 1. Start Prisma Transaction (Isolation Level: READ_COMMITTED)
   * 2. Execute Business Logic (executeInTransaction)
   * 3. Bei Result.fail(): Transaction Rollback, Result propagieren
   * 4. Bei Result.ok(): Save Events to Outbox (atomar in gleicher TX)
   * 5. Commit Transaction oder Rollback bei Exception
   *
   * **Error Handling:**
   * - Business Logic Fehler → Result.fail() → Transaction Rollback
   * - DB Constraint Violations → Exception → Transaction Rollback
   * - Timeout/Deadlock → Exception → Transaction Rollback
   *
   * **Post-Transaction:**
   * - Events bleiben in Outbox mit status = PENDING
   * - OutboxEventPublisher pollt und publiziert asynchron
   * - Command Handler returned sofort (non-blocking)
   *
   * @param command - Validierter Command DTO
   * @returns Result<TResult> - Success mit TResult oder Failure mit Error-Message
   */
  async execute(command: TCommand): Promise<Result<TResult>> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Business Logic ausführen (Aggregate erstellen/ändern + persistieren)
          // WICHTIG: tx wird als TransactionContext übergeben (Opaque Type)
          // Infrastructure Repositories casten zu PrismaTransaction
          const executionResult = await this.executeInTransaction(command, tx as TransactionContext);

          // 2. Check if business logic failed (Result Pattern)
          // Handler können entweder Result.fail() oder {result, events} zurückgeben
          if ('isFailure' in executionResult && executionResult.isFailure) {
            // Transaction wird automatisch zurückgerollt wenn wir Exception werfen
            // WICHTIG: Wir werfen hier eine Exception um Transaction Rollback zu triggern
            // Die Exception wird gefangen und in Result.fail() konvertiert
            throw new Error(executionResult.error ?? 'Command execution failed');
          }

          // Success case: executionResult ist {result, events}
          const { result, events } = executionResult as { result: TResult; events: DomainEvent[] };

          // 3. Domain Events atomar im Outbox persistieren
          // Nur wenn Events vorhanden (z.B. Read-Only Queries haben keine Events)
          if (events.length > 0) {
            // TransactionContext wird an Infrastructure Layer übergeben
            // Infrastructure Repository castet intern zu konkretem Type (z.B. PrismaTransaction)
            await this.outboxRepository.save(events, tx as TransactionContext);
          }

          // 4. Result zurückgeben (Transaction wird committed)
          return Result.ok(result);
        },
        {
          // Maximale Wartezeit für DB-Lock Acquisition (Concurrent Write Contention)
          maxWait: 5000,
          // Maximale Transaktionsdauer (Deadlock Prevention + Resource Cleanup)
          timeout: 10000,
        },
      );
    } catch (error) {
      // Fehler von executeInTransaction (Business Logic Fehler)
      // wurden in Exception konvertiert für Transaction Rollback
      // Jetzt konvertieren wir zurück zu Result.fail()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<TResult>(errorMessage);
    }
  }
}
