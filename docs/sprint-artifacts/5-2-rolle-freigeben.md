# Story 5.2: Rolle freigeben

Status: in-progress

## Story

Als FüKw (Sandra),
möchte ich besetzte Führungsrollen wieder freigeben,
damit Personen wieder als reguläre Einsatzkräfte verfügbar sind und der ETB korrekt aktualisiert wird.

## Business Rules

### Freigabe-Logik

| Szenario | Verhalten |
|----------|-----------|
| Rolle ist aktiv besetzt | Freigabe erlaubt → `freigegebenAm` setzen |
| Rolle bereits freigegeben | `Result.fail(BEREITS_FREIGEGEBEN)` → 400 Bad Request |
| RollenBesetzung existiert nicht | `Result.fail(ROLLEN_BESETZUNG_NOT_FOUND)` → 404 Not Found |

### Soft-Delete Pattern

Die Freigabe nutzt das **Soft-Delete Pattern** (KEIN physisches Löschen):
- `freigegebenAm: Date` wird gesetzt (vorher `null` = aktiv)
- `freigegebenVon: string` speichert User-ID für Audit Trail
- Historische Daten bleiben für Reporting erhalten

## Acceptance Criteria

### AC1: Rolle freigeben mit Bestätigung

**Given** eine Rolle (LNA/OrgL/Leiter BHP) ist besetzt
**When** ich `DELETE /einsaetze/:einsatzId/rollen-besetzung/:rollenBesetzungId` aufrufe
**Then** wird die Rolle freigegeben (`freigegebenAm` gesetzt)
**And** Domain Event `RolleFreigegeben` wird emittiert
**And** ETB-Eintrag wird erstellt: "{Name} gibt Rolle {Rollenname} ab"

### AC2: ETB-Eintrag bei Freigabe

**Given** die Rolle "LNA" wurde freigegeben
**When** das Event verarbeitet wird
**Then** wird ETB-Eintrag erstellt mit Text: "{Vorname} {Nachname} gibt Rolle {Rollenname} ab"
**And** Kategorie ist "PERSONAL"
**And** Metadata enthält `eventType: 'RolleFreigegeben'`

### AC3: Idempotenz - Doppelte Freigabe abweisen

**Given** die Rolle wurde bereits freigegeben
**When** ich erneut DELETE aufrufe
**Then** erhalte ich HTTP 400 mit Error-Code `BEREITS_FREIGEGEBEN`
**And** keine neue ETB-Einträge werden erstellt

### AC4: Rolle verschwindet aus aktiver Übersicht

**Given** die Rolle "OrgL" wurde freigegeben
**When** ich `GET /einsaetze/:einsatzId/rollen-besetzung` aufrufe
**Then** wird die freigegebene Rolle NICHT mehr in der Liste der aktiven Besetzungen angezeigt

## WICHTIG: Existierender Code (NICHT neu erstellen!)

**Diese Komponenten existieren bereits aus Story 5.0/5.1:**

| Komponente | Pfad | Status |
|------------|------|--------|
| `RollenBesetzung.freigeben()` | `domain/kraefte/aggregates/rollen-besetzung.aggregate.ts` | ✅ Existiert (Zeile 193-205) |
| `RolleFreigegeben` Domain Event | `domain/kraefte/events/rolle-freigegeben.event.ts` | ✅ Existiert |
| `RolleFreigegebenEventHandler` (ETB) | `application/etb/event-handlers/rolle-freigegeben.handler.ts` | ✅ Existiert |
| `BEREITS_FREIGEGEBEN` Error Code | `domain/kraefte/common/rollen-besetzung-error-codes.ts` | ✅ Existiert |
| Event Serializer/Deserializer | `infrastructure/outbox/event-*.ts` | ✅ Registriert |
| Event Adapter | `infrastructure/events/adapters/rolle-freigegeben-event.adapter.ts` | ✅ Existiert |
| DI Token `ROLLE_FREIGEGEBEN_ETB` | `infrastructure/di-tokens.ts` | ✅ Registriert |
| Controller DELETE Endpoint | `modules/kraefte/controllers/rollen-besetzung.controller.ts` | ⚠️ Placeholder (wirft NOT_IMPLEMENTED) |

**Fokus dieser Story:** Schema Migration + Mapper Update + Application Layer (Command, Handler) + Controller

## Error Codes

| Code | HTTP | Szenario | Aktion |
|------|------|----------|--------|
| `ROLLEN_BESETZUNG_NOT_FOUND` | 404 | RollenBesetzung ID ungültig | Validierung fehlgeschlagen |
| `BEREITS_FREIGEGEBEN` | 400 | Rolle war bereits freigegeben | Idempotenz-Fehler |
| `UNAUTHORIZED` | 401 | Kein gültiger JWT Token | Auth fehlgeschlagen |

## Tasks / Subtasks

### Task 0: Prisma Schema Migration (BLOCKER!)

**KRITISCH:** Das Schema fehlt die Soft-Delete Felder! Ohne diese Migration funktioniert `save()` nicht.

- [x] **0.1 Schema aktualisieren** - `packages/backend/prisma/schema.prisma`
  ```prisma
  model EinsatzRollenbesetzung {
    // ... existierende Felder ...

    // Soft-Delete Felder (NEU für Story 5.2)
    freigegebenAm  DateTime?  @map("freigegeben_am")
    freigegebenVon String?    @map("freigegeben_von") @db.VarChar(100)

    // ... Relations ...
  }
  ```

- [x] **0.2 Migration erstellen**
  ```bash
  pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_soft_delete_to_rollen_besetzung
  ```

- [x] **0.3 Schema validieren**
  ```bash
  pnpm --filter @bluelight-hub/backend exec prisma validate
  ```

### Task 0.5: Mapper Update für Soft-Delete

- [x] **0.5.1 toDomain aktualisieren** - `infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts`
  ```typescript
  // Ersetze die TODO-Zeilen (68-69):
  freigegebenAm: entity.freigegebenAm ?? undefined,
  freigegebenVon: entity.freigegebenVon ?? undefined,
  ```

- [x] **0.5.2 toUpdatePersistence hinzufügen** - Neue Methode für Updates
  ```typescript
  /**
   * Konvertiert Domain Aggregate zu Prisma Update Input für Freigabe.
   */
  static toUpdatePersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungUpdateInput {
    return {
      freigegebenAm: aggregate.freigegebenAm ?? null,
      freigegebenVon: aggregate.freigegebenVon ?? null,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }
  ```

- [x] **0.5.3 Repository save() aktualisieren** - `prisma-rollen-besetzung.repository.ts`
  ```typescript
  async save(aggregate: RollenBesetzung, tx?: TransactionContext): Promise<Result<void>> {
    const client = tx ?? this.prisma;

    // Prüfe ob Update oder Create
    const existing = await client.einsatzRollenbesetzung.findUnique({
      where: { id: aggregate.id.value },
    });

    if (existing) {
      // UPDATE für Freigabe
      await client.einsatzRollenbesetzung.update({
        where: { id: aggregate.id.value },
        data: PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate),
      });
    } else {
      // CREATE für neue Besetzung
      await client.einsatzRollenbesetzung.create({
        data: PrismaRollenBesetzungMapper.toPersistence(aggregate),
      });
    }

    return Result.ok(undefined);
  }
  ```

### Task 1: Error Code hinzufügen (Dependency für Handler)

- [x] **1.1 ROLLEN_BESETZUNG_NOT_FOUND hinzufügen** - `domain/kraefte/common/rollen-besetzung-error-codes.ts`
  ```typescript
  export const ROLLEN_BESETZUNG_ERROR_CODES = {
    // Existierend:
    ROLLE_ALREADY_BESETZT: 'ROLLE_ALREADY_BESETZT',
    PERSON_NOT_FOUND: 'PERSON_NOT_FOUND',
    ROLLE_NOT_FOUND: 'ROLLE_NOT_FOUND',
    PERSON_NOT_QUALIFIED: 'PERSON_NOT_QUALIFIED',
    INVALID_EINSATZ_CONTEXT: 'INVALID_EINSATZ_CONTEXT',
    BEREITS_FREIGEGEBEN: 'BEREITS_FREIGEGEBEN',
    // NEU für Story 5.2:
    ROLLEN_BESETZUNG_NOT_FOUND: 'ROLLEN_BESETZUNG_NOT_FOUND',
  } as const;
  ```

### Task 2: GebeRolleFrei Command erstellen (AC: 1)

- [x] **2.1 Command** - `application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.command.ts`
  ```typescript
  import { Result } from '@domain/common/result';
  import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';

  export class GebeRolleFreiCommand {
    private constructor(
      public readonly rollenBesetzungId: RollenBesetzungId,
      public readonly freigegebenVon: string,
    ) {}

    static create(props: {
      rollenBesetzungId: string;
      freigegebenVon: string;
    }): Result<GebeRolleFreiCommand> {
      const idResult = RollenBesetzungId.create(props.rollenBesetzungId);
      if (idResult.isFailure || !idResult.value) {
        return Result.fail(idResult.error ?? 'Invalid rollenBesetzungId');
      }

      if (!props.freigegebenVon || props.freigegebenVon.trim() === '') {
        return Result.fail('freigegebenVon is required');
      }

      return Result.ok(new GebeRolleFreiCommand(
        idResult.value,
        props.freigegebenVon,
      ));
    }
  }
  ```

### Task 3: GebeRolleFrei Handler erstellen (AC: 1, 3)

- [x] **3.1 Handler** - `application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler.ts`
  ```typescript
  import { Inject, Injectable } from '@nestjs/common';
  import type { DomainEvent } from '@domain/common/domain-event';
  import type { TransactionContext } from '@domain/common';
  import { Result } from '@domain/common/result';
  import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
  // biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime (AC1)
  import { PrismaService } from '@/infrastructure/database/prisma.service';
  import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
  import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
  import type { ILogger } from '@domain/ports/i-logger.port';
  import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
  import type { GebeRolleFreiCommand } from './gebe-rolle-frei.command';

  /**
   * Handler für die Freigabe einer besetzten Führungsrolle.
   *
   * Implementiert Soft-Delete Pattern: Setzt `freigegebenAm` statt physisches Löschen.
   * Fire-and-Forget ETB: Event wird emittiert, ETB-Handler erstellt Eintrag asynchron.
   */
  @Injectable()
  export class GebeRolleFreiHandler extends TransactionalCommandHandler<
    GebeRolleFreiCommand,
    void
  > {
    constructor(
      prisma: PrismaService,
      @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
      @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
      private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
      @Inject(LOGGER)
      private readonly logger: ILogger,
    ) {
      super(prisma, outboxRepository);
    }

    protected async executeInTransaction(
      command: GebeRolleFreiCommand,
      tx: TransactionContext,
    ): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
      // 1. Lade RollenBesetzung
      const besetzungResult = await this.rollenBesetzungRepository.findById(
        command.rollenBesetzungId,
        tx,
      );

      if (besetzungResult.isFailure || !besetzungResult.value) {
        return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
      }
      const besetzung = besetzungResult.value;

      // 2. Freigeben (Aggregate-Methode prüft BEREITS_FREIGEGEBEN)
      const freigebenResult = besetzung.freigeben(command.freigegebenVon);
      if (freigebenResult.isFailure) {
        return Result.fail(freigebenResult.error);
      }

      // 3. Speichern
      const saveResult = await this.rollenBesetzungRepository.save(besetzung, tx);
      if (saveResult.isFailure) {
        return Result.fail(saveResult.error ?? 'Fehler beim Speichern');
      }

      this.logger.log(
        `Rolle ${besetzung.rollenName} freigegeben von ${command.freigegebenVon}`,
        'GebeRolleFreiHandler',
      );

      // 4. Events extrahieren
      const events = besetzung.getDomainEvents();
      besetzung.clearDomainEvents();

      return { result: undefined, events };
    }
  }
  ```

### Task 4: Controller DELETE Endpoint implementieren (AC: 1, 3, 4)

- [x] **4.1 Controller Update** - `modules/kraefte/controllers/rollen-besetzung.controller.ts`
  ```typescript
  // Ersetze den NOT_IMPLEMENTED Placeholder:

  @Delete(':rollenBesetzungId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rolle freigeben' })
  @ApiNoContentResponse({ description: 'Rolle erfolgreich freigegeben' })
  @ApiBadRequestResponse({ description: 'Rolle bereits freigegeben' })
  @ApiNotFoundResponse({ description: 'RollenBesetzung nicht gefunden' })
  async freigebenRolle(
    @Param('einsatzId', ParseCuidPipe) _einsatzId: string,
    @Param('rollenBesetzungId', ParseCuidPipe) rollenBesetzungId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const commandResult = GebeRolleFreiCommand.create({
      rollenBesetzungId,
      freigegebenVon: user.id,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.gebeRolleFreiHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND) {
        throw new NotFoundException('RollenBesetzung nicht gefunden');
      }
      if (result.error === ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN) {
        throw new BadRequestException('Rolle wurde bereits freigegeben');
      }
      throw new BadRequestException(result.error);
    }
  }
  ```

- [x] **4.2 Handler in Controller injizieren**
  ```typescript
  constructor(
    private readonly besetzeRolleHandler: BesetzeRolleHandler,
    private readonly gebeRolleFreiHandler: GebeRolleFreiHandler, // NEU
    private readonly findAllQuery: FindAllRollenBesetzungQuery,
  ) {}
  ```

### Task 5: Module Registration (AC: 1)

- [x] **5.1 Handler in Application Module registrieren** - `application/kraefte/rollen-besetzung/rollen-besetzung-application.module.ts`
  ```typescript
  import { GebeRolleFreiHandler } from './commands/gebe-rolle-frei/gebe-rolle-frei.handler';

  @Module({
    providers: [
      BesetzeRolleHandler,
      GebeRolleFreiHandler,  // NEU
      FindAllRollenBesetzungQuery,
    ],
    exports: [
      BesetzeRolleHandler,
      GebeRolleFreiHandler,  // NEU
      FindAllRollenBesetzungQuery,
    ],
  })
  ```

- [x] **5.2 Index Export hinzufügen** - `application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/index.ts`
  ```typescript
  export * from './gebe-rolle-frei.command';
  export * from './gebe-rolle-frei.handler';
  ```

### Task 6: Repository findByEinsatzId Filter aktualisieren (AC: 4)

- [x] **6.1 Active-Only Filter hinzufügen** - `prisma-rollen-besetzung.repository.ts`
  ```typescript
  async findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<RollenBesetzung[]>> {
    const client = tx ?? this.prisma;
    const entities = await client.einsatzRollenbesetzung.findMany({
      where: {
        einsatzId: einsatzId.value,
        freigegebenAm: null,  // NEU: Nur aktive Besetzungen (AC4)
      },
      orderBy: { createdAt: 'asc' },
    });
    // ... rest of implementation
  }
  ```

### Task 7: Tests (AC: 1, 2, 3)

- [x] **7.1 Command Unit Tests** - `__tests__/gebe-rolle-frei.command.spec.ts`
  ```typescript
  describe('GebeRolleFreiCommand', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('create', () => {
      it('should create command with valid data', () => {
        // Given
        const props = {
          rollenBesetzungId: 'cm5h8k2x1000008l87v8g3c5a',
          freigegebenVon: 'cm5h8k2x1000008l87v8g3c5b',
        };

        // When
        const result = GebeRolleFreiCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.freigegebenVon).toBe('cm5h8k2x1000008l87v8g3c5b');
      });

      it('should fail with invalid rollenBesetzungId', () => {
        // Given
        const props = {
          rollenBesetzungId: 'invalid-not-cuid2',
          freigegebenVon: 'cm5h8k2x1000008l87v8g3c5b',
        };

        // When
        const result = GebeRolleFreiCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty freigegebenVon', () => {
        // Given
        const props = {
          rollenBesetzungId: 'cm5h8k2x1000008l87v8g3c5a',
          freigegebenVon: '',
        };

        // When
        const result = GebeRolleFreiCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
      });
    });
  });
  ```

- [x] **7.2 Handler Unit Tests** - `__tests__/gebe-rolle-frei.handler.spec.ts`
  ```typescript
  describe('GebeRolleFreiHandler', () => {
    let handler: GebeRolleFreiHandler;
    let mockRollenBesetzungRepo: jest.Mocked<IRollenBesetzungRepository>;
    let mockPrisma: jest.Mocked<PrismaService>;
    let mockOutboxRepo: jest.Mocked<IOutboxRepository>;
    let mockLogger: jest.Mocked<ILogger>;

    const validCuid = 'cm5h8k2x1000008l87v8g3c5a';
    const validUserId = 'cm5h8k2x1000008l87v8g3c5b';

    beforeEach(() => {
      jest.clearAllMocks();
      // Setup mocks...
      mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      handler = new GebeRolleFreiHandler(
        mockPrisma,
        mockOutboxRepo,
        mockRollenBesetzungRepo,
        mockLogger,
      );
    });

    describe('Erfolgreiche Freigabe (AC1)', () => {
      it('should release role and emit RolleFreigegeben event', async () => {
        // Given
        const besetzung = createMockRollenBesetzung({ isActive: true });
        mockRollenBesetzungRepo.findById.mockResolvedValue(Result.ok(besetzung));
        mockRollenBesetzungRepo.save.mockResolvedValue(Result.ok(undefined));

        const command = GebeRolleFreiCommand.create({
          rollenBesetzungId: validCuid,
          freigegebenVon: validUserId,
        }).value!;

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(besetzung.freigeben).toHaveBeenCalledWith(validUserId);
        expect(mockRollenBesetzungRepo.save).toHaveBeenCalled();
      });
    });

    describe('Idempotenz (AC3)', () => {
      it('should fail when role is already released', async () => {
        // Given
        const besetzung = createMockRollenBesetzung({ isActive: false });
        besetzung.freigeben.mockReturnValue(
          Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN)
        );
        mockRollenBesetzungRepo.findById.mockResolvedValue(Result.ok(besetzung));

        const command = GebeRolleFreiCommand.create({
          rollenBesetzungId: validCuid,
          freigegebenVon: validUserId,
        }).value!;

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
        expect(mockRollenBesetzungRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should fail when RollenBesetzung not found', async () => {
        // Given
        mockRollenBesetzungRepo.findById.mockResolvedValue(Result.ok(null));

        const command = GebeRolleFreiCommand.create({
          rollenBesetzungId: validCuid,
          freigegebenVon: validUserId,
        }).value!;

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
      });
    });
  });
  ```

- [x] **7.3 ETB Handler Tests prüfen** (bereits existieren!)
  - `application/etb/event-handlers/__tests__/rolle-freigegeben.handler.spec.ts` ✅ (5 Tests)

- [x] **7.4 Integration Tests (optional, empfohlen)** - Skipped (Unit Tests decken Funktionalität ab)
  ```typescript
  describe('RollenBesetzung Soft-Delete Integration', () => {
    it('should persist freigegebenAm when calling freigeben()', async () => { ... });
    it('should filter released roles in findByEinsatzId()', async () => { ... });
  });
  ```

### Task 8: TypeScript Check & API Client

- [x] **8.1 TypeScript Check** - `pnpm --filter @bluelight-hub/backend exec tsc --noEmit`
- [x] **8.2 API Client generieren** - `pnpm run generate-api`

## Transaction Scope

### Atomare Einheit

```
BEGIN TRANSACTION
  1. Lade RollenBesetzung via Repository.findById()
  2. Prüfe ob RollenBesetzung existiert (NOT_FOUND Guard)
  3. Rufe Aggregate.freigeben() auf (BEREITS_FREIGEGEBEN Guard)
  4. Speichere Aggregate via Repository.save() (UPDATE mit freigegebenAm/Von)
  5. Events in Outbox speichern (automatisch durch Base Class)
COMMIT
```

### Event Flow

```
1. GebeRolleFreiHandler speichert Events in Outbox (atomar mit TX)
2. OutboxPublisher pollt Events
3. NestJS EventEmitter emittiert 'rollen_besetzung.freigegeben'
4. RolleFreigegebenEventAdapter (Infrastructure) empfängt Event
5. RolleFreigegebenEventHandler (Application) erstellt ETB-Eintrag
```

## Dev Notes

### Architecture Patterns (aus Story 5.1 übernommen)

| Pattern | Implementierung |
|---------|-----------------|
| TransactionalCommandHandler | `Result<void> \| { result: void; events: DomainEvent[] }` Return Type |
| DI Tokens | Symbols aus `KRAEFTE_REPOSITORIES.*`, `LOGGER`, `OUTBOX_REPOSITORY` |
| Soft-Delete Pattern | `freigegebenAm` statt physisches DELETE |
| Fire-and-Forget ETB | Handler loggt Fehler, propagiert NICHT |
| Result Pattern | Domain/Handler nutzen `Result<T>`, Controller wirft Exceptions |

### Existierender Code zur Wiederverwendung

| Vorlage | Pfad |
|---------|------|
| TransactionalCommandHandler | `application/common/handlers/transactional-command.handler.ts` |
| BesetzeRolleHandler (Vorlage) | `application/kraefte/rollen-besetzung/commands/besetze-rolle/` |
| ETB Handler Pattern | `application/etb/event-handlers/rolle-freigegeben.handler.ts` |
| RollenBesetzung Aggregate | `domain/kraefte/aggregates/rollen-besetzung.aggregate.ts` |
| Error Codes | `domain/kraefte/common/rollen-besetzung-error-codes.ts` |

### File Structure

```
packages/backend/src/
├── domain/kraefte/
│   ├── aggregates/
│   │   └── rollen-besetzung.aggregate.ts      # freigeben() existiert ✅
│   ├── events/
│   │   └── rolle-freigegeben.event.ts         # Existiert ✅
│   └── common/
│       └── rollen-besetzung-error-codes.ts    # Task 1: ROLLEN_BESETZUNG_NOT_FOUND hinzufügen
│
├── application/kraefte/rollen-besetzung/
│   ├── commands/gebe-rolle-frei/              # NEU
│   │   ├── gebe-rolle-frei.command.ts         # Task 2.1
│   │   ├── gebe-rolle-frei.handler.ts         # Task 3.1
│   │   ├── index.ts                           # Task 5.2
│   │   └── __tests__/
│   │       ├── gebe-rolle-frei.command.spec.ts  # Task 7.1
│   │       └── gebe-rolle-frei.handler.spec.ts  # Task 7.2
│   └── rollen-besetzung-application.module.ts # Task 5.1 (Handler registrieren)
│
├── infrastructure/kraefte/
│   ├── mappers/
│   │   └── prisma-rollen-besetzung.mapper.ts  # Task 0.5: toUpdatePersistence()
│   └── repositories/
│       └── prisma-rollen-besetzung.repository.ts  # Task 0.5.3 + Task 6.1
│
├── application/etb/event-handlers/
│   └── rolle-freigegeben.handler.ts           # Existiert ✅
│
└── modules/kraefte/controllers/
    └── rollen-besetzung.controller.ts         # Task 4.1 (DELETE implementieren)
```

## Test Szenarien Übersicht

| AC | Test Szenario | Erwartetes Ergebnis |
|----|---------------|---------------------|
| AC1 | Aktive Rolle freigeben | 204 No Content, Event emittiert |
| AC1 | ETB-Eintrag Text | "{Vorname} {Nachname} gibt Rolle {Name} ab" |
| AC2 | ETB mit korrekten Metadaten | Kategorie=PERSONAL, eventType=RolleFreigegeben |
| AC3 | Bereits freigegebene Rolle erneut freigeben | 400 BEREITS_FREIGEGEBEN |
| AC4 | FindAll nach Freigabe | Freigegebene Rolle nicht in Liste |
| - | Ungültige RollenBesetzungId | 404 ROLLEN_BESETZUNG_NOT_FOUND |
| - | Kein Auth Token | 401 Unauthorized |

## Komplexitäts-Einschätzung

| Aspekt | Bewertung | Begründung |
|--------|-----------|------------|
| Schema Migration | 🟢 Gering | 2 neue nullable Felder |
| Mapper Update | 🟢 Gering | 2 Methoden aktualisieren |
| Domain Logic | 🟢 Gering | `freigeben()` existiert bereits |
| Application Logic | 🟢 Gering | Standard TransactionalCommandHandler Pattern |
| Repository Update | 🟢 Gering | Filter + save() Update |
| Controller | 🟢 Gering | DELETE Placeholder ersetzen |
| Tests | 🟡 Mittel | Handler + Command Tests schreiben |
| **Gesamt** | 🟢 **Gering** | ~0.5-1 Tag Aufwand |

## Dependencies

| Abhängigkeit | Status |
|--------------|--------|
| Story 5.0 (Prisma Schema Basis) | ✅ Done |
| Story 5.1 (Rolle besetzen) | ✅ Done |
| RollenBesetzung Aggregate | ✅ `freigeben()` existiert |
| RolleFreigegeben Event | ✅ Existiert |
| ETB Event Handler | ✅ Existiert |
| Event Serializer/Deserializer | ✅ Registriert |
| **Schema Soft-Delete Felder** | ⚠️ Task 0 dieser Story |

## References

| Dokument | Link |
|----------|------|
| Story 5.1 (Vorlage) | `docs/sprint-artifacts/5-1-rolle-besetzen-mit-qualifikationsvalidierung.md` |
| Epic 4 Retrospektive | `docs/sprint-artifacts/epic-4-retro-2025-12-23.md` |
| Project Context | `docs/project-context.md` |
| CLAUDE.md | `CLAUDE.md` |
| Validierungsbericht | `docs/sprint-artifacts/validation-report-5-2-2025-12-26.md` |

## Epic 4 Learnings angewendet

| Learning | Anwendung in Story 5.2 |
|----------|------------------------|
| Event Outbox Return Type | `Result<void> \| { result: void; events }` Pattern verwendet |
| Fire-and-Forget ETB | Handler existiert bereits mit korrektem Pattern |
| Logger DI Pattern | `@Inject(LOGGER)` im Handler eingefügt |
| Event Registration Checklist | Events bereits registriert ✅ |
| Result Pattern konsequent | Handler nutzt `Result.fail()` statt `throw` |

---

## Review Follow-ups (AI)

**Code Review durchgeführt:** 2025-12-26 (Amelia - Dev Agent mit Subagents)
**Review Fixes durchgeführt:** 2025-12-28 (Amelia - Dev Agent)
**Code Review #2 durchgeführt:** 2025-12-28 (Amelia - Dev Agent mit 5 parallelen Subagents)
**Review Fixes #2 durchgeführt:** 2025-12-28 (Amelia - Dev Agent)

### 🔴 HIGH Priority (Must-Fix)

- [x] [AI-Review][HIGH] Race Condition - Optimistic Locking implementieren `prisma-rollen-besetzung.repository.ts:97-112`
  - **Fix #1:** updateMany mit WHERE clause `freigegebenAm: existing.freigegebenAm` für Optimistic Locking
  - **Fix #2 (2025-12-28):** Geändert zu `updatedAt: existing.updatedAt` - korrektes Optimistic Locking Pattern
- [x] [AI-Review][HIGH] Hexagonal Architecture - Query Handler für GET erstellen, Repository aus Controller entfernen
  - **Fix:** `FindAllRollenBesetzungQuery` + `FindAllRollenBesetzungQueryHandler` erstellt in `queries/find-all-rollen-besetzung/`
- [x] [AI-Review][HIGH] AC7 Violation - DELETE auf HTTP 200 + @ApiWrappedResponse ändern
  - **Fix:** DELETE gibt HTTP 200 mit `RolleFreigegebenResponseDto` zurück, nutzt `@ApiWrappedResponse`
- [x] [AI-Review][HIGH] Event Tests - Handler Tests ergänzt
  - **Fix:** Test für Aggregate freigeben() mit freigegebenAm Validation hinzugefügt
- [x] [AI-Review][HIGH] Error Handling - Unterscheide null (not found) von Result.fail() (DB error)
  - **Fix:** Handler unterscheidet jetzt DB Errors (isFailure + logging) von Not Found (ok(null))
- [x] [AI-Review #2][HIGH] AC1 Violation - `import type` für Query/DTO im Handler `find-all-rollen-besetzung.handler.ts:6-7`
  - **Fix (2025-12-28):** `import type` → `import` für FindAllRollenBesetzungQuery und RollenBesetzungListItemDto
- [x] [AI-Review #2][HIGH] Missing `updatedBy` im Mapper - Audit Trail unvollständig `prisma-rollen-besetzung.mapper.ts:118`
  - **Fix (2025-12-28):** updater Relation hinzugefügt via `{ connect: { id: aggregate.updatedBy } }`

### 🟡 MEDIUM Priority (Should-Fix)

- [x] [AI-Review][MEDIUM] Inkonsistenter eventType - `RolleFreigegeben.eventName()` nutzen
  - **Fix:** ETB Handler nutzt jetzt `RolleFreigegeben.eventName()` statt String-Literal
- [x] [AI-Review][MEDIUM] Input Validation - freigegebenVon als CUID validieren
  - **Fix:** Command validiert freigegebenVon mit `UserId.create()` für CUID Format
- [x] [AI-Review][MEDIUM] Logger Pattern - DI Token verwendet (bereits korrekt)
  - **Info:** Logger wird via `@Inject(LOGGER)` injiziert, Pattern ist konsistent
- [x] [AI-Review][MEDIUM] Transaction Validation - P2025 bereits implementiert
  - **Info:** Repository hat bereits P2025 Error Handling in `handlePrismaError()`:287-289
- [ ] [AI-Review][MEDIUM] Handler Return Type - Union Type vereinheitlichen `gebe-rolle-frei.handler.ts:48`
  - **Info:** Warnung von Biome (void vs undefined), Base Class Pattern erfordert aktuellen Type
- [ ] [AI-Review][MEDIUM] Layer Separation - Logger nach Infrastructure verschieben
  - **Defer:** Low priority refactoring, funktioniert aktuell korrekt
- [x] [AI-Review][MEDIUM] Repository Error Handling - Konsistent Result.fail()
  - **Info:** Repository nutzt konsequent Result.fail() mit handlePrismaError()
- [x] [AI-Review][MEDIUM] Controller Error Mapping - Alle Error Codes mappen
  - **Info:** Controller mappt alle bekannten Error Codes (NOT_FOUND, BEREITS_FREIGEGEBEN)

### 🟢 LOW Priority (Nice-to-Fix)

- [ ] [AI-Review][LOW] Defensive Programming - isActive Filter im Controller
  - **Defer:** Query Handler filtert bereits im Repository via `freigegebenAm: null`
- [ ] [AI-Review][LOW] Performance - Upsert statt findUnique+save
  - **Defer:** Aktuelles Pattern mit Optimistic Locking erfordert findUnique für WHERE clause
- [x] [AI-Review][LOW] Test Style - Given-When-Then Kommentare
  - **Info:** Tests haben bereits Given-When-Then Kommentare
- [x] [AI-Review][LOW] JSDoc - Error Codes dokumentieren
  - **Fix:** Command JSDoc enthält jetzt Error Codes Dokumentation

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**2025-12-26 (Amelia - Dev Agent):**
- Story 5.2 vollständig implementiert
- Alle 10 Tasks abgeschlossen
- 66 Tests bestanden (inkl. aller RollenBesetzung-Tests)
- TypeScript kompiliert ohne Fehler
- API Client erfolgreich generiert
- Status: review-ready

**2025-12-28 (Amelia - Dev Agent) - Review Fixes #1:**
- Alle HIGH Priority Review Items behoben (5/5)
- MEDIUM Priority: 6/8 behoben, 2 deferred (low impact)
- LOW Priority: 2/4 behoben, 2 deferred
- **Neue Features implementiert:**
  - `FindAllRollenBesetzungQuery` + Handler (Hexagonal Architecture)
  - `RolleFreigegebenResponseDto` für AC7-konformer DELETE Response
  - Optimistic Locking in Repository mit WHERE clause
  - DB Error vs Not Found Unterscheidung im Handler
  - CUID Validation für freigegebenVon
  - `RolleFreigegeben.eventName()` statt String-Literal
- 67 Tests bestanden
- TypeScript kompiliert ohne Fehler

**2025-12-28 (Amelia - Dev Agent) - Review Fixes #2:**
- Code Review #2 mit 5 parallelen Subagents durchgeführt
- 3 neue HIGH Priority Issues gefunden und behoben:
  - AC1 Violation: `import type` → `import` für Query/DTO
  - Optimistic Locking: `freigegebenAm` → `updatedAt` (korrektes Pattern)
  - Missing `updatedBy`: Hinzugefügt via `updater` Relation
- Test Fix: `RolleFreigegeben.eventName()` statt hardcodiertem String im Test
- 101 Tests bestanden
- TypeScript kompiliert ohne Fehler
- Status: done

### File List

**Neue Dateien erstellt:**
- `packages/backend/prisma/migrations/20251226093217_add_soft_delete_to_rollen_besetzung/migration.sql`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.command.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/index.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/__tests__/gebe-rolle-frei.command.spec.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/__tests__/gebe-rolle-frei.handler.spec.ts`

**Neue Dateien (Review Fixes 2025-12-28):**
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.query.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/index.ts`
- `packages/backend/src/application/kraefte/rollen-besetzung/dto/rolle-freigegeben-response.dto.ts`

**Geänderte Dateien:**
- `packages/backend/prisma/schema.prisma` - Soft-Delete Felder hinzugefügt
- `packages/backend/src/domain/kraefte/common/rollen-besetzung-error-codes.ts` - ROLLEN_BESETZUNG_NOT_FOUND hinzugefügt
- `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts` - toDomain + toUpdatePersistence
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts` - save() Update + findByEinsatzId Filter + Optimistic Locking
- `packages/backend/src/application/kraefte/rollen-besetzung/rollen-besetzung-application.module.ts` - GebeRolleFreiHandler + FindAllRollenBesetzungQueryHandler registriert
- `packages/backend/src/modules/kraefte/controllers/rollen-besetzung.controller.ts` - DELETE Endpoint + Query Handler Integration
- `packages/backend/src/application/kraefte/rollen-besetzung/dto/index.ts` - RolleFreigegebenResponseDto Export
- `packages/backend/src/application/etb/event-handlers/rolle-freigegeben.handler.ts` - RolleFreigegeben.eventName() nutzen
- `docs/sprint-artifacts/sprint-status.yaml` - Status auf done

**Geänderte Dateien (Review Fixes #2 - 2025-12-28):**
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler.ts` - import type → import für Query/DTO
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts` - Optimistic Locking: freigegebenAm → updatedAt
- `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts` - updater Relation für Audit Trail hinzugefügt
- `packages/backend/src/application/etb/event-handlers/__tests__/rolle-freigegeben.handler.spec.ts` - RolleFreigegeben.eventName() im Test

