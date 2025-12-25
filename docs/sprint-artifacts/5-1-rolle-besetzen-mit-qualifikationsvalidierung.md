# Story 5.1: Rolle besetzen mit Qualifikationsvalidierung

Status: ready-for-review

## Story

Als FüKw (Sandra),
möchte ich Führungsrollen (LNA, OrgL, Leiter BHP) mit qualifizierten Personen besetzen,
damit nur geeignete Personen Führungsaufgaben übernehmen und ETBs automatisch aktualisiert werden.

## Business Rules - Qualifikationsvalidierung

### Hard Constraints (MUST - AC2 Blockiert)

| Rolle | Erforderliche Qualifikation | Verhalten |
|-------|----------------------------|-----------|
| LNA | Qualifikation mit `istPflicht=true` | **Blockiert** wenn fehlend |
| OrgL | Qualifikation mit `istPflicht=true` | **Blockiert** wenn fehlend |
| Leiter BHP | Qualifikation mit `istPflicht=true` | **Blockiert** wenn fehlend |

### Validierungs-Entscheidungsbaum

```
Person für Rolle auswählen
    │
    ├── Hat Person ALLE istPflicht=true Qualifikationen?
    │   ├── JA → Besetzung erlaubt ✅
    │   └── NEIN → Result.fail(PERSON_NOT_QUALIFIED) ❌
    │
    └── Rolle hat keine Pflicht-Qualifikationen?
        └── Besetzung erlaubt ✅
```

**Kein Override-Mechanismus** - Pflicht-Qualifikationen sind zwingend.

## Acceptance Criteria

### AC1: Rollenauswahl mit Qualifikationsfilter

**Given** ich bin im Einsatz-Detail-Dialog
**When** ich auf "Rolle besetzen" klicke und eine Rolle (LNA/OrgL/Leiter BHP) auswähle
**Then** sehe ich nur Personen mit passender Qualifikation (aus `kräfte.qualifikationen`) zur Auswahl

### AC2: Qualifikationswarnung bei fehlender Berechtigung

**Given** ich versuche eine Person ohne passende Qualifikation auszuwählen
**When** ich die Auswahl bestätige
**Then** erscheint eine Warnung "Person nicht qualifiziert für diese Rolle" und die Auswahl wird blockiert

### AC3: Automatische ETB-Aktualisierung bei Rollenbesetzung

**Given** ich besetze die Rolle "LNA" mit Person A
**When** die Besetzung gespeichert wird
**Then** wird der ETB automatisch aktualisiert mit Eintrag "Person [Name] zur Rolle [Rollenname] zugewiesen"
**And** die Rolle erscheint in der Kräfte-Übersicht und im Dashboard

### AC4: Nur eine Person pro Rolle

**Given** die Rolle "OrgL" ist bereits besetzt
**When** ich versuche eine zweite Person als OrgL zu besetzen
**Then** erscheint die Meldung "Rolle bereits besetzt. Vorherige Besetzung wird aufgehoben"
**And** die alte Besetzung wird automatisch freigegeben

## WICHTIG: Existierender Code (NICHT neu erstellen!)

**Diese Komponenten existieren bereits aus Story 5.0:**

| Komponente | Pfad | Status |
|------------|------|--------|
| `RollenBesetzungId` Value Object | `domain/kraefte/value-objects/rollen-besetzung-id.ts` | ✅ Existiert |
| `IRollenBesetzungRepository` Interface | `domain/kraefte/repositories/i-rollen-besetzung.repository.ts` | ✅ Existiert |
| `PrismaRollenBesetzungRepository` | `infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts` | ✅ Skeleton existiert |
| `PrismaRollenBesetzungMapper` | `infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts` | ✅ Skeleton existiert |
| `ROLLEN_BESETZUNG_ERROR_CODES` | `domain/kraefte/common/rollen-besetzung-error-codes.ts` | ✅ Existiert |
| DI Token `KRAEFTE.ROLLEN_BESETZUNG` | `infrastructure/di-tokens.ts` | ✅ Registriert |
| Prisma Schema `EinsatzRollenbesetzung` | `prisma/schema.prisma` | ✅ Migriert |

**Fokus dieser Story:** Application Layer (Commands, Handlers, Controller) + Domain Events

## Error Codes

| Code | HTTP | Szenario | Aktion |
|------|------|----------|--------|
| `ROLLE_NOT_FOUND` | 404 | RollenDefinition ID ungültig | Validierung fehlgeschlagen |
| `PERSON_NOT_FOUND` | 404 | EinsatzPerson ID ungültig | Validierung fehlgeschlagen |
| `PERSON_NOT_QUALIFIED` | 400 | Person fehlt Pflicht-Qualifikation | AC2 Blockierung |
| `BEREITS_FREIGEGEBEN` | 400 | Rolle war bereits freigegeben | Idempotenz-Check |

## Tasks / Subtasks

### Task 1: Domain Events erstellen (AC: 3)

- [ ] **1.1 RolleBesetzt Event** - `domain/kraefte/events/rolle-besetzt.event.ts`
  ```typescript
  import { DomainEvent } from '@/domain/common/domain-event';

  export class RolleBesetzt extends DomainEvent {
    constructor(
      public readonly einsatzId: string,
      public readonly einsatzPersonId: string,
      public readonly rollenDefinitionId: string,
      public readonly rollenName: string,      // Snapshot
      public readonly personVorname: string,   // Snapshot
      public readonly personNachname: string,  // Snapshot
      public readonly besetztVon: string,      // User ID
      occurredOn?: Date,
    ) {
      super(einsatzPersonId, occurredOn);
    }

    static override eventName(): string {
      return 'rollen_besetzung.besetzt';
    }
  }
  ```

- [ ] **1.2 RolleFreigegeben Event** - `domain/kraefte/events/rolle-freigegeben.event.ts`
  ```typescript
  import { DomainEvent } from '@/domain/common/domain-event';

  export class RolleFreigegeben extends DomainEvent {
    constructor(
      public readonly einsatzId: string,
      public readonly einsatzPersonId: string,
      public readonly rollenDefinitionId: string,
      public readonly rollenName: string,      // Snapshot
      public readonly personVorname: string,   // Snapshot
      public readonly personNachname: string,  // Snapshot
      public readonly freigegebenVon: string,  // User ID
      occurredOn?: Date,
    ) {
      super(einsatzPersonId, occurredOn);
    }

    static override eventName(): string {
      return 'rollen_besetzung.freigegeben';
    }
  }
  ```

- [ ] **1.3 Event Registration (Epic 4 Learning!)** - Checklist für neue Events:
  - [ ] Deserializer registrieren in `DomainEventDeserializer`
  - [ ] Serializer registrieren in `DomainEventSerializer`
  - [ ] Event Adapter erstellen (falls Integration Event nötig)
  - [ ] Handler in Module providers registrieren
  - [ ] Tests schreiben

### Task 2: RollenBesetzung Aggregate erstellen (AC: 1, 2, 4)

- [ ] **2.1 Aggregate** - `domain/kraefte/aggregates/rollen-besetzung.aggregate.ts`
  ```typescript
  import { AggregateRoot } from '@/domain/common/aggregate-root';
  import { Result } from '@/domain/common/result';
  import { RollenBesetzungId } from '@/domain/kraefte/value-objects/rollen-besetzung-id';
  import { EinsatzId } from '@/domain/value-objects/einsatz-id';
  import { EinsatzPersonId } from '@/domain/kraefte/value-objects/einsatz-person-id';
  import { RolleId } from '@/domain/kraefte/value-objects/rolle-id';
  import { RolleBesetzt } from '@/domain/kraefte/events/rolle-besetzt.event';
  import { RolleFreigegeben } from '@/domain/kraefte/events/rolle-freigegeben.event';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@/domain/kraefte/common/rollen-besetzung-error-codes';

  export class RollenBesetzung extends AggregateRoot<RollenBesetzungId> {
    private _einsatzId: EinsatzId;
    private _rollenDefinitionId: RolleId;
    private _einsatzPersonId: EinsatzPersonId;
    private _personVorname: string;      // Snapshot (KOPIE!)
    private _personNachname: string;     // Snapshot (KOPIE!)
    private _rollenName: string;         // Snapshot (KOPIE!)
    private _besetztAm: Date;
    private _freigegebenAm?: Date;       // undefined = aktiv
    private _createdBy: string;
    private _updatedBy: string;

    private constructor(/* ... alle Props */) {
      super(id);
      // Assign all props
    }

    // Factory Method
    static create(props: {
      einsatzId: EinsatzId;
      rollenDefinitionId: RolleId;
      einsatzPersonId: EinsatzPersonId;
      personVorname: string;   // SNAPSHOT - kopiert bei Erstellung
      personNachname: string;  // SNAPSHOT - kopiert bei Erstellung
      rollenName: string;      // SNAPSHOT - kopiert bei Erstellung
      createdBy: string;
    }): Result<RollenBesetzung> {
      const idResult = RollenBesetzungId.create();
      if (idResult.isFailure) return Result.fail(idResult.error);

      const besetzung = new RollenBesetzung(
        idResult.value,
        props.einsatzId,
        props.rollenDefinitionId,
        props.einsatzPersonId,
        props.personVorname,
        props.personNachname,
        props.rollenName,
        new Date(),
        undefined,
        props.createdBy,
        props.createdBy,
      );

      besetzung.addDomainEvent(
        new RolleBesetzt(
          props.einsatzId.value,
          props.einsatzPersonId.value,
          props.rollenDefinitionId.value,
          props.rollenName,
          props.personVorname,
          props.personNachname,
          props.createdBy,
        ),
      );

      return Result.ok(besetzung);
    }

    freigeben(userId: string): Result<void> {
      if (this._freigegebenAm) {
        return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
      }

      this._freigegebenAm = new Date();
      this._updatedBy = userId;

      this.addDomainEvent(
        new RolleFreigegeben(
          this._einsatzId.value,
          this._einsatzPersonId.value,
          this._rollenDefinitionId.value,
          this._rollenName,
          this._personVorname,
          this._personNachname,
          userId,
        ),
      );

      return Result.ok();
    }

    // Getters
    get einsatzId(): EinsatzId { return this._einsatzId; }
    get rollenDefinitionId(): RolleId { return this._rollenDefinitionId; }
    get einsatzPersonId(): EinsatzPersonId { return this._einsatzPersonId; }
    get personVorname(): string { return this._personVorname; }
    get personNachname(): string { return this._personNachname; }
    get rollenName(): string { return this._rollenName; }
    get besetztAm(): Date { return this._besetztAm; }
    get freigegebenAm(): Date | undefined { return this._freigegebenAm; }
    get isActive(): boolean { return !this._freigegebenAm; }

    // Reconstitute für Mapper
    static reconstitute(props: {
      id: RollenBesetzungId;
      einsatzId: EinsatzId;
      rollenDefinitionId: RolleId;
      einsatzPersonId: EinsatzPersonId;
      personVorname: string;
      personNachname: string;
      rollenName: string;
      besetztAm: Date;
      freigegebenAm: Date | undefined;
      createdBy: string;
      updatedBy: string;
    }): RollenBesetzung {
      return new RollenBesetzung(
        props.id,
        props.einsatzId,
        props.rollenDefinitionId,
        props.einsatzPersonId,
        props.personVorname,
        props.personNachname,
        props.rollenName,
        props.besetztAm,
        props.freigegebenAm,
        props.createdBy,
        props.updatedBy,
      );
    }
  }
  ```

### Task 3: BesetzeRolle Command & Handler (AC: 1, 2, 3, 4)

- [ ] **3.1 Command** - `application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.command.ts`
  ```typescript
  import { Result } from '@/domain/common/result';
  import { EinsatzId } from '@/domain/value-objects/einsatz-id';
  import { RolleId } from '@/domain/kraefte/value-objects/rolle-id';
  import { EinsatzPersonId } from '@/domain/kraefte/value-objects/einsatz-person-id';

  export class BesetzeRolleCommand {
    private constructor(
      public readonly einsatzId: EinsatzId,
      public readonly rollenDefinitionId: RolleId,
      public readonly einsatzPersonId: EinsatzPersonId,
      public readonly userId: string,
    ) {}

    static create(props: {
      einsatzId: string;
      rollenDefinitionId: string;
      einsatzPersonId: string;
      userId: string;
    }): Result<BesetzeRolleCommand> {
      const einsatzIdResult = EinsatzId.create(props.einsatzId);
      if (einsatzIdResult.isFailure) return Result.fail(einsatzIdResult.error);

      const rolleIdResult = RolleId.create(props.rollenDefinitionId);
      if (rolleIdResult.isFailure) return Result.fail(rolleIdResult.error);

      const personIdResult = EinsatzPersonId.create(props.einsatzPersonId);
      if (personIdResult.isFailure) return Result.fail(personIdResult.error);

      return Result.ok(new BesetzeRolleCommand(
        einsatzIdResult.value,
        rolleIdResult.value,
        personIdResult.value,
        props.userId,
      ));
    }
  }
  ```

- [ ] **3.2 Handler** - `application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler.ts`
  ```typescript
  import { Injectable, Inject } from '@nestjs/common';
  import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
  import type { TransactionContext } from '@/infrastructure/database/transaction-context';
  import type { DomainEvent } from '@/domain/common/domain-event';
  import { Result } from '@/domain/common/result';
  import { DI_TOKENS } from '@/infrastructure/di-tokens';
  import { PrismaService } from '@/infrastructure/database/prisma.service';
  import { IRollenBesetzungRepository } from '@/domain/kraefte/repositories/i-rollen-besetzung.repository';
  import { IRollenDefinitionRepository } from '@/domain/kraefte/repositories/i-rollen-definition.repository';
  import { IEinsatzPersonenRepository } from '@/domain/kraefte/repositories/i-einsatz-personen.repository';
  import { IOutboxRepository } from '@/domain/repositories/i-outbox.repository';
  import { RollenBesetzung } from '@/domain/kraefte/aggregates/rollen-besetzung.aggregate';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@/domain/kraefte/common/rollen-besetzung-error-codes';
  import { BesetzeRolleCommand } from './besetze-rolle.command';

  @Injectable()
  export class BesetzeRolleHandler extends TransactionalCommandHandler<
    BesetzeRolleCommand,
    string
  > {
    constructor(
      prisma: PrismaService,
      @Inject(DI_TOKENS.REPOSITORIES.OUTBOX)
      outboxRepository: IOutboxRepository,
      @Inject(DI_TOKENS.REPOSITORIES.KRAEFTE.ROLLEN_BESETZUNG)
      private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
      @Inject(DI_TOKENS.REPOSITORIES.KRAEFTE.ROLLEN_DEFINITION)
      private readonly rollenDefinitionRepository: IRollenDefinitionRepository,
      @Inject(DI_TOKENS.REPOSITORIES.KRAEFTE.EINSATZ_PERSONEN)
      private readonly einsatzPersonenRepository: IEinsatzPersonenRepository,
    ) {
      super(prisma, outboxRepository);
    }

    protected async executeInTransaction(
      command: BesetzeRolleCommand,
      tx: TransactionContext,
    ): Promise<{ result: string; events: DomainEvent[] }> {
      // 1. Lade RollenDefinition (inkl. erforderlicheQualifikationen)
      const rolle = await this.rollenDefinitionRepository.findById(
        command.rollenDefinitionId,
        tx,
      );
      if (!rolle) {
        throw new Error(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND);
      }

      // 2. Lade EinsatzPerson (inkl. qualifikationen)
      const person = await this.einsatzPersonenRepository.findById(
        command.einsatzPersonId,
        tx,
      );
      if (!person) {
        throw new Error(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND);
      }

      // 3. QUALIFIKATIONSVALIDIERUNG (AC2)
      const erforderlicheQualIds = rolle.erforderlicheQualifikationen
        .filter((q) => q.istPflicht)
        .map((q) => q.qualifikationId);

      const personQualIds = person.qualifikationen.map((q) => q.qualifikationId);

      const hasAllRequired = erforderlicheQualIds.every((reqId) =>
        personQualIds.includes(reqId),
      );

      if (!hasAllRequired) {
        throw new Error(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED);
      }

      // 4. Prüfe ob Rolle bereits besetzt (AC4)
      const existing = await this.rollenBesetzungRepository.findByEinsatzIdAndRolleId(
        command.einsatzId,
        command.rollenDefinitionId,
        tx,
      );

      const allEvents: DomainEvent[] = [];

      if (existing && existing.isActive) {
        // Alte Besetzung freigeben
        const freigebenResult = existing.freigeben(command.userId);
        if (freigebenResult.isFailure) {
          throw new Error(freigebenResult.error);
        }

        await this.rollenBesetzungRepository.save(existing, tx);
        allEvents.push(...existing.getDomainEvents());
        existing.clearDomainEvents();
      }

      // 5. Neue Besetzung erstellen (mit Snapshots!)
      const besetzungResult = RollenBesetzung.create({
        einsatzId: command.einsatzId,
        rollenDefinitionId: command.rollenDefinitionId,
        einsatzPersonId: command.einsatzPersonId,
        personVorname: person.vorname,    // SNAPSHOT
        personNachname: person.nachname,  // SNAPSHOT
        rollenName: rolle.name,           // SNAPSHOT
        createdBy: command.userId,
      });

      if (besetzungResult.isFailure) {
        throw new Error(besetzungResult.error);
      }

      const besetzung = besetzungResult.value;

      // 6. Speichern
      await this.rollenBesetzungRepository.save(besetzung, tx);

      // 7. Events sammeln
      allEvents.push(...besetzung.getDomainEvents());
      besetzung.clearDomainEvents();

      return {
        result: besetzung.id.value,
        events: allEvents,
      };
    }
  }
  ```

### Task 4: ETB Event Handler (AC: 3)

- [ ] **4.1 Handler** - `application/etb/event-handlers/rollen-besetzung-etb.handler.ts`
  ```typescript
  import { Injectable, Inject } from '@nestjs/common';
  import { OnEvent } from '@nestjs/event-emitter';
  import { IEventHandler } from '@/application/common/interfaces/event-handler.interface';
  import { LOGGER, ILogger } from '@/domain/ports/logger.port';
  import { RolleBesetzt } from '@/domain/kraefte/events/rolle-besetzt.event';
  import { AddEintragHandler } from '@/application/etb/commands/add-eintrag/add-eintrag.handler';
  import { AddEintragCommand } from '@/application/etb/commands/add-eintrag/add-eintrag.command';

  @Injectable()
  export class RollenBesetzungEtbHandler implements IEventHandler<RolleBesetzt> {
    constructor(
      private readonly addEintragHandler: AddEintragHandler,
      @Inject(LOGGER) private readonly logger: ILogger,
    ) {}

    @OnEvent(RolleBesetzt.eventName())
    async handle(event: RolleBesetzt): Promise<void> {
      // Fire-and-Forget Pattern (Epic 4 Learning #3)
      try {
        const text = `${event.personVorname} ${event.personNachname} zur Rolle "${event.rollenName}" zugewiesen`;

        const commandResult = AddEintragCommand.create({
          einsatzId: event.einsatzId,
          text,
          userId: event.besetztVon,
          kategorie: 'PERSONAL',
          metadata: {
            eventType: 'RolleBesetzt',
            einsatzPersonId: event.einsatzPersonId,
            rollenDefinitionId: event.rollenDefinitionId,
          },
        });

        if (commandResult.isFailure) {
          this.logger.error(`ETB Command creation failed: ${commandResult.error}`);
          return; // Fire-and-Forget: NICHT propagieren!
        }

        const result = await this.addEintragHandler.execute(commandResult.value);
        if (result.isFailure) {
          this.logger.error(`ETB entry creation failed: ${result.error}`);
          return; // Fire-and-Forget
        }

        this.logger.log(`ETB entry created for role assignment: ${event.rollenName}`);
      } catch (error) {
        this.logger.error(`Unexpected error in ETB handler: ${error}`);
        // NIEMALS propagieren - Business Operation ist bereits erfolgreich!
      }
    }
  }
  ```

- [ ] **4.2 Handler in ETB Module registrieren** - `application/etb/etb-application.module.ts`
- [ ] **4.3 Infrastructure Adapter** - `@OnEvent()` Decorator bereits im Handler

### Task 5: Repository erweitern (AC: 4)

- [ ] **5.1 Interface erweitern** - Falls `findByEinsatzIdAndRolleId` fehlt:
  ```typescript
  // In: domain/kraefte/repositories/i-rollen-besetzung.repository.ts
  findByEinsatzIdAndRolleId(
    einsatzId: EinsatzId,
    rolleId: RolleId,
    tx?: TransactionContext,
  ): Promise<RollenBesetzung | null>;
  ```

- [ ] **5.2 Implementation** - `prisma-rollen-besetzung.repository.ts`
  ```typescript
  async findByEinsatzIdAndRolleId(
    einsatzId: EinsatzId,
    rolleId: RolleId,
    tx?: TransactionContext,
  ): Promise<RollenBesetzung | null> {
    const client = tx ?? this.prisma;

    const data = await client.einsatzRollenbesetzung.findFirst({
      where: {
        einsatzId: einsatzId.value,
        rollenDefinitionId: rolleId.value,
        freigegebenAm: null, // Nur aktive Besetzungen
      },
    });

    if (!data) return null;
    return PrismaRollenBesetzungMapper.toDomain(data);
  }
  ```

### Task 6: Controller & DTO (AC: 1, 2)

- [ ] **6.1 Request DTO** - `application/kraefte/rollen-besetzung/dto/besetze-rolle.dto.ts`
  ```typescript
  import { ApiProperty } from '@nestjs/swagger';
  import { IsCuid } from '@/common/validators/is-cuid.validator';

  export class BesetzeRolleDto {
    @ApiProperty({
      description: 'RollenDefinition ID',
      example: 'cm5h8k...',
    })
    @IsCuid()
    rollenDefinitionId: string;

    @ApiProperty({
      description: 'EinsatzPerson ID',
      example: 'cm5h8l...',
    })
    @IsCuid()
    einsatzPersonId: string;
  }
  ```

- [ ] **6.2 Response DTO** - `application/kraefte/rollen-besetzung/dto/rollen-besetzung.dto.ts`
  ```typescript
  import { ApiProperty } from '@nestjs/swagger';

  export class RollenBesetzungDto {
    @ApiProperty({ description: 'Besetzung ID' })
    id: string;

    @ApiProperty({ description: 'Einsatz ID' })
    einsatzId: string;

    @ApiProperty({ description: 'Rollen-Name (Snapshot)' })
    rollenName: string;

    @ApiProperty({ description: 'Person Vorname (Snapshot)' })
    personVorname: string;

    @ApiProperty({ description: 'Person Nachname (Snapshot)' })
    personNachname: string;

    @ApiProperty({ description: 'Besetzt am (ISO 8601)' })
    besetztAm: string;
  }
  ```

- [ ] **6.3 Controller** - `modules/kraefte/controllers/rollen-besetzung.controller.ts`
  ```typescript
  import { Controller, Post, Get, Param, Body, Request, BadRequestException } from '@nestjs/common';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
  import { AuthenticatedRequest } from '@/modules/auth/interfaces/authenticated-request.interface';
  import { WrappedResponse } from '@/modules/common/interfaces/wrapped-response.interface';
  import { BesetzeRolleHandler } from '@/application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler';
  import { BesetzeRolleCommand } from '@/application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.command';
  import { BesetzeRolleDto } from '@/application/kraefte/rollen-besetzung/dto/besetze-rolle.dto';
  import { RollenBesetzungDto } from '@/application/kraefte/rollen-besetzung/dto/rollen-besetzung.dto';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@/domain/kraefte/common/rollen-besetzung-error-codes';

  @Controller('kraefte/einsatz/:einsatzId/rollen-besetzung')
  @ApiTags('kraefte-rollen-besetzung')
  export class RollenBesetzungController {
    constructor(
      private readonly besetzeRolleHandler: BesetzeRolleHandler,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Rolle mit Person besetzen' })
    @ApiWrappedCreatedResponse(RollenBesetzungDto, {
      description: 'Rolle wurde erfolgreich besetzt',
    })
    async besetzeRolle(
      @Param('einsatzId') einsatzId: string,
      @Body() dto: BesetzeRolleDto,
      @Request() req: AuthenticatedRequest,
    ): Promise<WrappedResponse<{ id: string }>> {
      const commandResult = BesetzeRolleCommand.create({
        einsatzId,
        rollenDefinitionId: dto.rollenDefinitionId,
        einsatzPersonId: dto.einsatzPersonId,
        userId: req.user.id,
      });

      if (commandResult.isFailure) {
        throw new BadRequestException(commandResult.error);
      }

      try {
        const result = await this.besetzeRolleHandler.execute(commandResult.value);

        return {
          data: { id: result },
          meta: { message: 'Rolle wurde erfolgreich besetzt' },
        };
      } catch (error) {
        // Spezifische Fehlermeldungen (AC2)
        if (error.message === ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED) {
          throw new BadRequestException('Person nicht qualifiziert für diese Rolle');
        }
        throw new BadRequestException(error.message);
      }
    }
  }
  ```

### Task 7: Tests (AC: 1, 2, 3, 4)

- [ ] **7.1 Handler Unit Tests** - `__tests__/besetze-rolle.handler.spec.ts`
  ```typescript
  import { jest } from '@jest/globals';
  import { BesetzeRolleHandler } from '../besetze-rolle.handler';
  import { BesetzeRolleCommand } from '../besetze-rolle.command';
  import { ROLLEN_BESETZUNG_ERROR_CODES } from '@/domain/kraefte/common/rollen-besetzung-error-codes';
  import { Result } from '@/domain/common/result';

  describe('BesetzeRolleHandler', () => {
    let handler: BesetzeRolleHandler;
    let mockRollenBesetzungRepo: jest.Mocked<IRollenBesetzungRepository>;
    let mockRollenDefinitionRepo: jest.Mocked<IRollenDefinitionRepository>;
    let mockEinsatzPersonenRepo: jest.Mocked<IEinsatzPersonenRepository>;

    beforeEach(() => {
      jest.clearAllMocks();
      // Setup mocks...
    });

    describe('Erfolgreiche Besetzung', () => {
      it('should create RollenBesetzung when person has required qualifications', async () => {
        // Given
        const rolle = createMockRollenDefinition({
          erforderlicheQualifikationen: [{ qualifikationId: 'qual-1', istPflicht: true }],
        });
        const person = createMockEinsatzPerson({
          qualifikationen: [{ qualifikationId: 'qual-1' }],
        });

        mockRollenDefinitionRepo.findById.mockResolvedValue(rolle);
        mockEinsatzPersonenRepo.findById.mockResolvedValue(person);
        mockRollenBesetzungRepo.findByEinsatzIdAndRolleId.mockResolvedValue(null);

        const command = BesetzeRolleCommand.create({
          einsatzId: 'einsatz-1',
          rollenDefinitionId: 'rolle-1',
          einsatzPersonId: 'person-1',
          userId: 'user-1',
        }).value!;

        // When
        const result = await handler.execute(command);

        // Then
        expect(result).toBeDefined();
        expect(mockRollenBesetzungRepo.save).toHaveBeenCalled();
      });
    });

    describe('Qualifikationsvalidierung (AC2)', () => {
      it('should reject when person lacks required qualification', async () => {
        // Given
        const rolle = createMockRollenDefinition({
          erforderlicheQualifikationen: [{ qualifikationId: 'qual-1', istPflicht: true }],
        });
        const person = createMockEinsatzPerson({
          qualifikationen: [], // Keine Qualifikationen!
        });

        mockRollenDefinitionRepo.findById.mockResolvedValue(rolle);
        mockEinsatzPersonenRepo.findById.mockResolvedValue(person);

        const command = BesetzeRolleCommand.create({...}).value!;

        // When / Then
        await expect(handler.execute(command)).rejects.toThrow(
          ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED
        );
        expect(mockRollenBesetzungRepo.save).not.toHaveBeenCalled();
      });

      it('should succeed when role has no required qualifications', async () => {
        // Given
        const rolle = createMockRollenDefinition({
          erforderlicheQualifikationen: [], // Keine Anforderungen
        });
        const person = createMockEinsatzPerson({
          qualifikationen: [],
        });

        mockRollenDefinitionRepo.findById.mockResolvedValue(rolle);
        mockEinsatzPersonenRepo.findById.mockResolvedValue(person);
        mockRollenBesetzungRepo.findByEinsatzIdAndRolleId.mockResolvedValue(null);

        const command = BesetzeRolleCommand.create({...}).value!;

        // When
        const result = await handler.execute(command);

        // Then
        expect(result).toBeDefined();
      });
    });

    describe('Besetzungsprüfung (AC4)', () => {
      it('should release existing assignment before new assignment', async () => {
        // Given
        const existingBesetzung = createMockRollenBesetzung({ isActive: true });
        mockRollenBesetzungRepo.findByEinsatzIdAndRolleId.mockResolvedValue(existingBesetzung);

        const command = BesetzeRolleCommand.create({...}).value!;

        // When
        await handler.execute(command);

        // Then
        expect(existingBesetzung.freigeben).toHaveBeenCalled();
        expect(mockRollenBesetzungRepo.save).toHaveBeenCalledTimes(2); // Old + New
      });
    });

    describe('Error Handling', () => {
      it('should fail when role not found', async () => {
        mockRollenDefinitionRepo.findById.mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(
          ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND
        );
      });

      it('should fail when person not found', async () => {
        mockRollenDefinitionRepo.findById.mockResolvedValue(rolle);
        mockEinsatzPersonenRepo.findById.mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(
          ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND
        );
      });
    });
  });
  ```

- [ ] **7.2 Aggregate Unit Tests** - `domain/kraefte/aggregates/__tests__/rollen-besetzung.aggregate.spec.ts`
  ```typescript
  describe('RollenBesetzung Aggregate', () => {
    describe('create', () => {
      it('should create with valid data and emit RolleBesetzt event', () => {
        // Given
        const props = createValidProps();

        // When
        const result = RollenBesetzung.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value.getDomainEvents()).toHaveLength(1);
        expect(result.value.getDomainEvents()[0]).toBeInstanceOf(RolleBesetzt);
      });

      it('should store snapshot values (not references)', () => {
        // Given
        const originalName = 'Max';
        const props = createValidProps({ personVorname: originalName });

        // When
        const besetzung = RollenBesetzung.create(props).value!;

        // Then - Snapshot ist Kopie
        expect(besetzung.personVorname).toBe(originalName);
      });
    });

    describe('freigeben', () => {
      it('should emit RolleFreigegeben event', () => {
        // Given
        const besetzung = createActiveBesetzung();

        // When
        const result = besetzung.freigeben('user-1');

        // Then
        expect(result.isSuccess).toBe(true);
        expect(besetzung.isActive).toBe(false);
        expect(besetzung.getDomainEvents()).toContainEqual(
          expect.any(RolleFreigegeben)
        );
      });

      it('should fail when already released', () => {
        // Given
        const besetzung = createReleasedBesetzung();

        // When
        const result = besetzung.freigeben('user-1');

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
      });
    });
  });
  ```

- [ ] **7.3 ETB Handler Tests** - `application/etb/event-handlers/__tests__/rollen-besetzung-etb.handler.spec.ts`
  ```typescript
  describe('RollenBesetzungEtbHandler', () => {
    it('should create ETB entry with correct text', async () => {
      // Given
      const event = new RolleBesetzt(
        'einsatz-1', 'person-1', 'rolle-1',
        'Gruppenführer', 'Max', 'Mustermann', 'user-1'
      );

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Max Mustermann zur Rolle "Gruppenführer" zugewiesen',
        })
      );
    });

    it('should NOT throw when ETB creation fails (fire-and-forget)', async () => {
      // Given
      mockAddEintragHandler.execute.mockRejectedValue(new Error('DB Error'));

      // When / Then - Kein Error propagiert!
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  ```

- [ ] **7.4 Integration Tests** - Repository & Mapper in `infrastructure/kraefte/__tests__/`

### Task 8: Module Registration & API Client

- [ ] **8.1 KraefteApplicationModule** - Handler registrieren
- [ ] **8.2 KraefteModule** - Controller registrieren
- [ ] **8.3 API Client** - `pnpm run generate-api`
- [ ] **8.4 TypeScript Check** - `pnpm exec tsc --noEmit`

## Transaction Scope & Concurrency

### Atomare Einheit

```
BEGIN TRANSACTION
  1. Lade RollenDefinition (mit erforderlicheQualifikationen)
  2. Lade EinsatzPerson (mit qualifikationen)
  3. Qualifikationsvalidierung (IN-MEMORY, kein DB-Call)
  4. Prüfe existierende Besetzung
  5. Falls existiert: freigeben() + save()
  6. Neue Besetzung create() + save()
  7. Events in Outbox speichern
COMMIT
```

### Concurrency Control

Das Prisma Schema hat `@@unique([einsatzId, rollenDefinitionId])`:
- Bei Race Condition: Zweiter Request bekommt `P2002 Unique Constraint Violation`
- Handler prüft vorher und gibt alte Besetzung frei → verhindert Constraint-Fehler

## Dev Notes

### Architecture Patterns

| Pattern | Implementierung |
|---------|-----------------|
| TransactionalCommandHandler | `{ result: T; events: DomainEvent[] }` Return Type |
| DI Tokens | Symbols aus `DI_TOKENS.REPOSITORIES.KRAEFTE.*` |
| Snapshot Pattern | Namen/Labels KOPIERT, nie Referenzen |
| Fire-and-Forget ETB | Fehler loggen, NIEMALS propagieren |
| Result Pattern | Domain nutzt `Result<T>`, Controller wirft Exceptions |

### Existierender Code zur Wiederverwendung

| Vorlage | Pfad |
|---------|------|
| TransactionalCommandHandler | `/application/common/handlers/transactional-command.handler.ts` |
| Ähnlicher Handler | `/application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug-zu/` |
| ETB Handler Pattern | `/application/etb/event-handlers/person-zu-fahrzeug-zugewiesen.handler.ts` |
| RollenDefinition Repo | `/infrastructure/kraefte/repositories/prisma-rollen-definition.repository.ts` |

### File Structure

```
packages/backend/src/
├── domain/kraefte/
│   ├── aggregates/
│   │   └── rollen-besetzung.aggregate.ts      # Task 2
│   └── events/
│       ├── rolle-besetzt.event.ts             # Task 1.1
│       └── rolle-freigegeben.event.ts         # Task 1.2
│
├── application/kraefte/rollen-besetzung/
│   ├── commands/besetze-rolle/
│   │   ├── besetze-rolle.command.ts           # Task 3.1
│   │   ├── besetze-rolle.handler.ts           # Task 3.2
│   │   └── __tests__/besetze-rolle.handler.spec.ts  # Task 7.1
│   └── dto/
│       ├── besetze-rolle.dto.ts               # Task 6.1
│       └── rollen-besetzung.dto.ts            # Task 6.2
│
├── application/etb/event-handlers/
│   └── rollen-besetzung-etb.handler.ts        # Task 4.1
│
└── modules/kraefte/controllers/
    └── rollen-besetzung.controller.ts         # Task 6.3
```

## References

| Dokument | Link |
|----------|------|
| Story 5.0 (Prisma Schema) | `docs/sprint-artifacts/5-0-prisma-schema-rollenbesetzung.md` |
| Epic 4 Retrospektive | `docs/sprint-artifacts/epic-4-retro-2025-12-23.md` |
| Project Context | `docs/project-context.md` |
| CLAUDE.md | `CLAUDE.md` |

## Review Follow-ups (AI)

**Code Review:** 2025-12-24 durch 5 parallele Subagents

### 🔴 CRITICAL (18 Issues - ✅ ALLE BEHOBEN!)

#### Domain Layer ✅
- [x] [AI-Review][CRITICAL] Events haben `eventName()` Methode ✅ `rolle-besetzt.event.ts:39-41`, `rolle-freigegeben.event.ts:38-40`
- [x] [AI-Review][CRITICAL] Events haben Snapshots ✅ (personVorname, personNachname, rollenName)
- [x] [AI-Review][CRITICAL] `freigeben()` implementiert ✅ `rollen-besetzung.aggregate.ts:192-204`
- [x] [AI-Review][CRITICAL] Aggregate `reconstitute()` Factory existiert ✅ `rollen-besetzung.aggregate.ts:163-179`

#### Application Layer ✅
- [x] [AI-Review][CRITICAL] AC2 Qualifikationsvalidierung vollständig ✅ `besetze-rolle.handler.ts:108-119`
- [x] [AI-Review][CRITICAL] Transaction Context Check vorhanden ✅ `besetze-rolle.handler.ts:61-63`

#### Infrastructure Layer ✅
- [x] [AI-Review][CRITICAL] Repository hat `findByEinsatzIdAndRolleId` ✅ `prisma-rollen-besetzung.repository.ts:173`
- [x] [AI-Review][CRITICAL] Query Filter korrekt ✅
- [x] [AI-Review][CRITICAL] Mapper nutzt `reconstitute()` ✅ `prisma-rollen-besetzung.mapper.ts:55`
- [x] [AI-Review][CRITICAL] Events registriert in EVENT_TYPE_MAP ✅ `event-serializer.ts:216-219`, `event-deserializer.ts:188-190`

#### Controller/DTO ✅
- [x] [AI-Review][CRITICAL] Nutzt `@ApiWrappedCreatedResponse` ✅ `rollen-besetzung.controller.ts:161`
- [x] [AI-Review][CRITICAL] PERSON_NOT_QUALIFIED Error-Handling vorhanden ✅
- [x] [AI-Review][CRITICAL] Handler in Module registriert ✅ `kraefte.module.ts`, `rollen-besetzung-application.module.ts`
- [x] [AI-Review][CRITICAL] @IsCuid Validator korrekt ✅ `is-cuid.decorator.ts` nutzt official `@paralleldrive/cuid2`
- [x] [AI-Review][CRITICAL] DTO hat @IsCuid Decorator ✅ `besetze-rolle.dto.ts:26-27, 36-37` (Fix 2025-12-25)

#### Tests ✅
- [x] [AI-Review][CRITICAL] Command Handler Tests vorhanden ✅ `besetze-rolle.handler.spec.ts` (14 Tests)
- [x] [AI-Review][CRITICAL] Aggregate Tests vorhanden ✅ `rollen-besetzung.aggregate.spec.ts`
- [x] [AI-Review][CRITICAL] ETB Event Handler implementiert ✅ `rolle-besetzt.handler.ts`, `rolle-freigegeben.handler.ts` (Fix 2025-12-25)
- [x] [AI-Review][CRITICAL] ETB Event Handler Tests vorhanden ✅ (68 Tests, Fix 2025-12-25)
- [x] [AI-Review][CRITICAL] Domain Events Serializer/Deserializer korrekt ✅

#### Module Registration (Fix 2025-12-25) ✅
- [x] DI-Tokens für ETB Handler ✅ `di-tokens.ts:144-148`
- [x] ETB Handler Index Export ✅ `index.ts:14-15`
- [x] ETB Application Module Registration ✅ `etb-application.module.ts:114-123, 150-151`
- [x] PrismaService Import Fix ✅ `besetze-rolle.handler.ts:6-7` (type → normal import für DI)

### 🟡 HIGH (11 Issues - Größtenteils behoben)

- [x] [AI-Review][HIGH] Event-Namen korrekt - Underscore-Konvention `rollen_besetzung.besetzt` ✅
- [x] [AI-Review][HIGH] DI Token als Symbol ✅ `di-tokens.ts`
- [x] [AI-Review][HIGH] Mapper Properties vorhanden ✅ `prisma-rollen-besetzung.mapper.ts`
- [x] [AI-Review][HIGH] @IsCuid in DTOs ✅ `besetze-rolle.dto.ts:26, 36` (Fix 2025-12-25)
- [x] [AI-Review][HIGH] @ApiProperty mit format: 'cuid2' ✅ `besetze-rolle.dto.ts:21-22, 31-32`
- [x] [AI-Review][HIGH] Fire-and-Forget Logging vorhanden ✅ `rolle-besetzt.handler.ts`, `rolle-freigegeben.handler.ts`
- [x] [AI-Review][HIGH] Handler Tests für AC2/AC4 vorhanden ✅ `besetze-rolle.handler.spec.ts:320-414`
- [ ] [AI-Review][HIGH] Event Order Guarantee - Outbox Sequenz (Low Priority, Outbox garantiert Order)
- [ ] [AI-Review][HIGH] Repository Integration Tests unvollständig

### 🟢 MEDIUM (7 Issues)

- [ ] [AI-Review][MEDIUM] Error Codes definiert aber ungenutzt (BEREITS_FREIGEGEBEN)
- [ ] [AI-Review][MEDIUM] Event Constructor Validation fehlt
- [ ] [AI-Review][MEDIUM] Edge Case Tests (Timezone, Orphans) fehlen
- [ ] [AI-Review][MEDIUM] Performance Tests fehlen
- [ ] [AI-Review][MEDIUM] E2E Tests fehlen
- [ ] [AI-Review][MEDIUM] Integration Tests unvollständig
- [ ] [AI-Review][MEDIUM] Story File List nicht aktualisiert (35+ Dateien geändert!)

---

## Validation Report

**Validierung:** 2025-12-24 durch 4 parallele Subagents (Pattern Detection, Codebase Analysis, Document Review, Test Coverage)

**Fixes Applied:**
- ✅ Wheel Reinvention Prevention: Existierenden Code dokumentiert
- ✅ TransactionalCommandHandler Return Type korrigiert
- ✅ DI Token Pattern (Symbols) durchgehend
- ✅ Business Rules Section hinzugefügt
- ✅ Event Timestamps standardisiert (Date)
- ✅ Error Codes tabellarisch
- ✅ Test-Szenarien für AC2/AC4 dokumentiert
- ✅ Aggregate Tests dokumentiert
- ✅ Fire-and-Forget Pattern explizit
- ✅ Event Registration Checklist
- ✅ Transaction Scope dokumentiert
- ✅ Imports in Code-Beispielen
- ✅ Token-effiziente Struktur
