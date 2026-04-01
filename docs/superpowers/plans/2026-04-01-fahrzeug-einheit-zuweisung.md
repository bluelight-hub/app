# Fahrzeug→Einheit Zuweisung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fahrzeuge können Einheiten/Abschnitten zugewiesen werden + fehlende Tests + Registry-Fix

**Architecture:** Direkter FK `einheitId` auf `EinsatzFahrzeug` Aggregate. Neue Methode `assignToEinheit()` auf dem Aggregate emittiert Domain Event. TransactionalCommandHandler + ETB-Integration folgt dem existierenden AssignPersonToEinheit-Pattern. Frontend: EinheitZuweisungsDropdown auf der Fahrzeuge-Seite.

**Tech Stack:** NestJS, Prisma, React 19, TanStack Query, Headless UI, Tailwind CSS

**Parallelisierung:** Tasks 1-8 sind sequentiell (Backend). Task 9 (Registry-Fix) ist unabhängig. Tasks 10-12 (Frontend) hängen von Task 8 ab. Tasks 13-14 (Tests) können nach den jeweiligen Implementierungen parallel laufen.

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `packages/backend/prisma/schema.prisma:1050-1085` (EinsatzFahrzeug model)
- Modify: `packages/backend/prisma/schema.prisma:1257-1297` (EinsatzEinheit model, inverse Relation)

- [ ] **Step 1: Schema erweitern — EinsatzFahrzeug**

In `packages/backend/prisma/schema.prisma`, nach Zeile 1058 (`position`) einfügen:

```prisma
  einheitId     String? @map("einheit_id") // Issue #411: Optional zugewiesene Einheit
```

In den Relations-Block (nach Zeile 1071, `updater`), einfügen:

```prisma
  einheit     EinsatzEinheit?  @relation(fields: [einheitId], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

In den Indexes-Block (nach Zeile 1082), einfügen:

```prisma
  @@index([einheitId])
  @@index([einsatzId, einheitId])
```

- [ ] **Step 2: Schema erweitern — EinsatzEinheit inverse Relation**

In `packages/backend/prisma/schema.prisma`, im `EinsatzEinheit` Model nach der `personen` Relation (Zeile 1285), einfügen:

```prisma
  // Zugewiesene Fahrzeuge (1:N über FK auf EinsatzFahrzeug)
  fahrzeuge EinsatzFahrzeug[]
```

- [ ] **Step 3: Migration erstellen und ausführen**

```bash
cd packages/backend && pnpm prisma:migrate --name add_fahrzeug_einheit_relation
```

- [ ] **Step 4: Prisma Client generieren**

```bash
cd packages/backend && pnpm prisma:generate
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/prisma/ && git commit -m "✨(backend): Fahrzeug→Einheit Relation im Prisma Schema"
```

---

### Task 2: Domain Event

**Files:**
- Create: `packages/backend/src/domain/kraefte/events/fahrzeug-einheit-zugewiesen.event.ts`

- [ ] **Step 1: Event erstellen**

Erstelle `packages/backend/src/domain/kraefte/events/fahrzeug-einheit-zugewiesen.event.ts`:

```typescript
import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein Fahrzeug einer Einheit zugewiesen oder entfernt wird.
 *
 * Triggert automatischen ETB-Eintrag:
 * - Zuweisung: "Fahrzeug {funkrufname} der Einheit {einheitName} zugewiesen"
 * - Entfernung: "Fahrzeug {funkrufname} von Einheit entfernt"
 *
 * Rich Data Pattern: Enthält denormalisierte Daten damit Event Handler ohne DB-Query arbeiten.
 */
export class FahrzeugEinheitZugewiesenEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) */
    public readonly einsatzId: string,
    /** Fahrzeug-ID (CUID2) */
    public readonly fahrzeugId: string,
    /** Funkrufname des Fahrzeugs (denormalisiert für ETB) */
    public readonly funkrufname: string,
    /** Neue Einheit-ID (CUID2) oder null bei Entfernung */
    public readonly einheitId: string | null,
    /** Name der neuen Einheit (denormalisiert für ETB) oder null */
    public readonly einheitName: string | null,
    /** Vorherige Einheit-ID oder null */
    public readonly previousEinheitId: string | null,
    /** User-ID (CUID2) der die Zuweisung vorgenommen hat */
    public readonly updatedBy: string,
  ) {
    super(fahrzeugId);
  }

  static override eventName(): string {
    return 'einsatz_fahrzeug.einheit_zugewiesen';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/domain/kraefte/events/ && git commit -m "✨(backend): FahrzeugEinheitZugewiesenEvent Domain Event"
```

---

### Task 3: Domain Aggregate erweitern

**Files:**
- Modify: `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`

- [ ] **Step 1: Import + privates Feld hinzufügen**

In `einsatz-fahrzeug.aggregate.ts`, Import hinzufügen (nach Zeile 7):

```typescript
import { FahrzeugEinheitZugewiesenEvent } from '../events/fahrzeug-einheit-zugewiesen.event';
```

Neues privates Feld (nach `_position`, Zeile 118):

```typescript
  private _einheitId?: string; // Issue #411: Optional zugewiesene Einheit
```

- [ ] **Step 2: Constructor-Parameter erweitern**

In `private constructor(...)`, neuen Parameter nach `position?` hinzufügen:

```typescript
    einheitId?: string,
```

Im Constructor Body (nach `this._position = position;`):

```typescript
    this._einheitId = einheitId;
```

- [ ] **Step 3: Getter hinzufügen**

Nach dem `position` Getter:

```typescript
  /** Zugewiesene Einheit-ID (CUID2, optional) */
  get einheitId(): string | undefined {
    return this._einheitId;
  }
```

- [ ] **Step 4: Factory Methods anpassen**

In `createFromStammdaten()` und `createTemporary()`: Der Constructor-Aufruf bekommt `undefined` als `einheitId` (letzter Parameter vor optionalen Timestamps):

```typescript
// In createFromStammdaten() — Zeile ~304:
const einsatzFahrzeug = new EinsatzFahrzeug(id, trimmedEinsatzId, trimmedFahrzeugtypId, trimmedFunkrufname, initialFmsStatus, trimmedCreatedBy, trimmedStammId, trimmedKennzeichen, geoPosition, undefined);
```

Gleiche Anpassung für `createTemporary()`.

- [ ] **Step 5: reconstitute() erweitern**

`ReconstituteEinsatzFahrzeugProps` Interface um `einheitId?: string` erweitern.

In `reconstitute()` am Constructor-Aufruf:

```typescript
return Result.ok<EinsatzFahrzeug>(
  new EinsatzFahrzeug(
    id,
    props.einsatzId.trim(),
    props.fahrzeugtypId.trim(),
    props.funkrufname.trim(),
    props.fmsStatus,
    props.createdBy.trim(),
    props.stammId?.trim(),
    kennzeichen,
    geoPosition,
    props.einheitId?.trim(), // NEU
    props.createdAt,
    props.updatedAt,
    props.updatedBy?.trim(),
  ),
);
```

**ACHTUNG:** Constructor-Signatur muss angepasst werden — `einheitId` nach `position`, vor `createdAt`:

```typescript
private constructor(
  id: EinsatzFahrzeugId,
  einsatzId: string,
  fahrzeugtypId: string,
  funkrufname: string,
  fmsStatus: number,
  createdBy: string,
  stammId?: string,
  kennzeichen?: string,
  position?: GeoPosition,
  einheitId?: string,    // NEU
  createdAt?: Date,
  updatedAt?: Date,
  updatedBy?: string,
)
```

- [ ] **Step 6: Business Method assignToEinheit()**

Nach `updateFmsStatus()`:

```typescript
  /**
   * Weist das Fahrzeug einer Einheit zu oder entfernt die Zuweisung.
   *
   * Idempotent: Bei unveränderter Zuweisung kein Event.
   *
   * @param einheitId - Einheit-ID (CUID2) oder null zum Entfernen
   * @param einheitName - Name der Einheit (für ETB Event, null bei Entfernung)
   * @param updatedBy - User-ID des Bearbeiters
   * @returns Result<void>
   */
  assignToEinheit(einheitId: string | null, einheitName: string | null, updatedBy: string): Result<void> {
    // Validation: updatedBy
    const trimmedUpdatedBy = updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail<void>('updatedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail<void>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: einheitId (wenn nicht null)
    const trimmedEinheitId = einheitId?.trim() ?? null;
    if (trimmedEinheitId !== null && !isCuid(trimmedEinheitId)) {
      return Result.fail<void>('einheitId muss ein gültiger CUID2-Identifier sein');
    }

    // Idempotenz: Keine Änderung wenn bereits zugewiesen
    const currentEinheitId = this._einheitId ?? null;
    if (currentEinheitId === trimmedEinheitId) {
      return Result.ok<void>(undefined);
    }

    const previousEinheitId = currentEinheitId;
    this._einheitId = trimmedEinheitId ?? undefined;
    this._updatedBy = trimmedUpdatedBy;
    this.updateTimestamp();

    this.addDomainEvent(
      new FahrzeugEinheitZugewiesenEvent(
        this._einsatzId,
        this._id.value,
        this._funkrufname,
        trimmedEinheitId,
        einheitName,
        previousEinheitId,
        trimmedUpdatedBy,
      ),
    );

    return Result.ok<void>(undefined);
  }
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/domain/kraefte/ && git commit -m "✨(backend): assignToEinheit() auf EinsatzFahrzeug Aggregate"
```

---

### Task 4: Infrastructure — Mapper, Repository, Serializer, Deserializer

**Files:**
- Modify: `packages/backend/src/infrastructure/kraefte/mappers/prisma-einsatz-fahrzeug.mapper.ts`
- Modify: `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-fahrzeug.repository.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-serializer.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`

- [ ] **Step 1: Mapper anpassen — toPersistence()**

In `prisma-einsatz-fahrzeug.mapper.ts`, im `toPersistence()` Return-Object nach `updatedBy`:

```typescript
      einheitId: aggregate.einheitId ?? null,
```

- [ ] **Step 2: Mapper anpassen — toDomain()**

In `toDomain()`, im `reconstitute()` Aufruf, nach `position: positionProps`:

```typescript
      einheitId: (entity.einheitId as string | null) ?? undefined,
```

- [ ] **Step 3: Repository anpassen — save() upsert update block**

In `prisma-einsatz-fahrzeug.repository.ts`, im `update:` Block des upsert (nach `position:`):

```typescript
          einheitId: persistenceData.einheitId,
```

Im `create:` Block ebenfalls:

```typescript
          einheitId: persistenceData.einheitId,
```

- [ ] **Step 4: Event Serializer erweitern**

In `event-serializer.ts`:

Import hinzufügen:

```typescript
import type { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
```

Im `serializePayload()` switch, nach dem `einsatz_fahrzeug.fms_status_geaendert` case:

```typescript
      case 'einsatz_fahrzeug.einheit_zugewiesen':
        return this.serializeFahrzeugEinheitZugewiesen(event as unknown as FahrzeugEinheitZugewiesenEvent);
```

Private Serializer-Methode:

```typescript
  private serializeFahrzeugEinheitZugewiesen(event: FahrzeugEinheitZugewiesenEvent): Record<string, unknown> {
    return {
      einsatzId: event.einsatzId,
      fahrzeugId: event.fahrzeugId,
      funkrufname: event.funkrufname,
      einheitId: event.einheitId,
      einheitName: event.einheitName,
      previousEinheitId: event.previousEinheitId,
      updatedBy: event.updatedBy,
    };
  }
```

- [ ] **Step 5: Event Deserializer erweitern**

In `event-deserializer.ts`:

Import hinzufügen:

```typescript
import { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
```

Im `eventRegistry` Map constructor (nach `['einsatz_fahrzeug.fms_status_geaendert', ...]`):

```typescript
      ['einsatz_fahrzeug.einheit_zugewiesen', deserializeFahrzeugEinheitZugewiesen],
```

Private Deserializer-Funktion (als Standalone-Funktion vor der Klasse, wie die anderen):

```typescript
function deserializeFahrzeugEinheitZugewiesen(payload: Record<string, unknown>, aggregateId?: string): Result<DomainEvent> {
  return Result.ok<DomainEvent>(
    new FahrzeugEinheitZugewiesenEvent(
      payload.einsatzId as string,
      payload.fahrzeugId as string,
      payload.funkrufname as string,
      (payload.einheitId as string | null) ?? null,
      (payload.einheitName as string | null) ?? null,
      (payload.previousEinheitId as string | null) ?? null,
      payload.updatedBy as string,
    ),
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure/ && git commit -m "✨(backend): Fahrzeug-Einheit in Mapper, Repository, Serializer/Deserializer"
```

---

### Task 5: Application — Command + Handler

**Files:**
- Create: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.command.ts`
- Create: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler.ts`
- Modify: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module.ts`

- [ ] **Step 1: Command erstellen**

Erstelle `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.command.ts`:

```typescript
import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Command für das Zuweisen eines EinsatzFahrzeugs zu einer taktischen Einheit.
 *
 * Setzt den einheitId FK auf dem EinsatzFahrzeug Aggregate.
 * einheitId=null entfernt die Zuweisung.
 */
export class AssignFahrzeugToEinheitCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly fahrzeugId: string,
    public readonly einheitId: string | null,
    public readonly updatedBy: string,
  ) {}

  static create(props: {
    einsatzId: string;
    fahrzeugId: string;
    einheitId: string | null;
    updatedBy: string;
  }): Result<AssignFahrzeugToEinheitCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    const trimmedFahrzeugId = props.fahrzeugId?.trim() ?? '';
    if (trimmedFahrzeugId.length === 0) {
      return Result.fail('fahrzeugId ist erforderlich');
    }
    if (!isCuid(trimmedFahrzeugId)) {
      return Result.fail('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    }

    // einheitId: null erlaubt (Entfernung), ansonsten CUID2
    const trimmedEinheitId = props.einheitId?.trim() ?? null;
    if (trimmedEinheitId !== null && !isCuid(trimmedEinheitId)) {
      return Result.fail('einheitId muss ein gültiger CUID2-Identifier sein');
    }

    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(
      new AssignFahrzeugToEinheitCommand(trimmedEinsatzId, trimmedFahrzeugId, trimmedEinheitId, trimmedUpdatedBy),
    );
  }
}
```

- [ ] **Step 2: Handler erstellen**

Erstelle `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { Result } from '@domain/common/result';
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { AssignFahrzeugToEinheitCommand } from './assign-fahrzeug-to-einheit.command';

/**
 * Handler für AssignFahrzeugToEinheitCommand.
 *
 * Weist ein EinsatzFahrzeug einer taktischen Einheit zu (oder entfernt die Zuweisung).
 * Setzt den einheitId FK auf dem Aggregate und emittiert FahrzeugEinheitZugewiesenEvent.
 */
@Injectable()
export class AssignFahrzeugToEinheitHandler extends TransactionalCommandHandler<AssignFahrzeugToEinheitCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: AssignFahrzeugToEinheitCommand,
    tx: TransactionContext,
  ): Promise<Result<void>> {
    // 1. Fahrzeug laden
    const fahrzeugIdResult = EinsatzFahrzeugId.create(command.fahrzeugId);
    if (fahrzeugIdResult.isFailure || !fahrzeugIdResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `Ungültige Fahrzeug-ID: ${command.fahrzeugId}`));
    }

    const fahrzeugResult = await this.einsatzFahrzeugRepository.findById(fahrzeugIdResult.value, tx);
    if (fahrzeugResult.isFailure || !fahrzeugResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, `Fahrzeug mit ID '${command.fahrzeugId}' nicht gefunden`));
    }
    const fahrzeug = fahrzeugResult.value;

    // 2. einsatzId prüfen
    if (fahrzeug.einsatzId !== command.einsatzId) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND, 'Fahrzeug gehört nicht zum angegebenen Einsatz'));
    }

    // 3. Einheit laden (wenn einheitId nicht null)
    let einheitName: string | null = null;
    if (command.einheitId !== null) {
      const einheitResult = await this.einsatzEinheitRepository.findById(command.einheitId, tx);
      if (einheitResult.isFailure || !einheitResult.value) {
        return Result.fail('Einheit nicht gefunden');
      }
      const einheit = einheitResult.value;
      if (einheit.einsatzId !== command.einsatzId) {
        return Result.fail('Einheit gehört nicht zum selben Einsatz');
      }
      einheitName = einheit.name;
    }

    // 4. Zuweisung auf Aggregate ausführen
    const assignResult = fahrzeug.assignToEinheit(command.einheitId, einheitName, command.updatedBy);
    if (assignResult.isFailure) {
      return Result.fail(assignResult.error ?? 'Fehler beim Zuweisen');
    }

    // 5. Speichern (Events werden von TransactionalCommandHandler verarbeitet)
    const saveResult = await this.einsatzFahrzeugRepository.save(fahrzeug, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern');
    }

    this.logger.log(
      `Fahrzeug ${fahrzeug.funkrufname} ${command.einheitId ? `der Einheit ${einheitName} zugewiesen` : 'von Einheit entfernt'}`,
    );

    return Result.ok(undefined);
  }
}
```

- [ ] **Step 3: Application Module erweitern**

In `packages/backend/src/application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module.ts`:

Import hinzufügen:

```typescript
import { AssignFahrzeugToEinheitHandler } from './commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler';
```

In `providers` Array und `exports` Array `AssignFahrzeugToEinheitHandler` hinzufügen.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/kraefte/einsatz-fahrzeuge/ && git commit -m "✨(backend): AssignFahrzeugToEinheit Command + Handler"
```

---

### Task 6: ETB Event Handler + Infrastructure Adapters + DI Tokens

**Files:**
- Create: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/event-handlers/fahrzeug-einheit-zugewiesen-etb.handler.ts`
- Create: `packages/backend/src/infrastructure/events/adapters/fahrzeug-einheit-zugewiesen-etb-event.adapter.ts`
- Modify: `packages/backend/src/infrastructure/di-tokens.ts`
- Modify: `packages/backend/src/infrastructure/events/adapters/index.ts`
- Modify: `packages/backend/src/infrastructure/events/event-adapters.module.ts`
- Modify: `packages/backend/src/application/etb/etb-application.module.ts`

- [ ] **Step 1: DI Token hinzufügen**

In `packages/backend/src/infrastructure/di-tokens.ts`, nach `PERSON_VON_EINHEIT_ENTFERNT_ETB` (Zeile ~295):

```typescript
  /** FahrzeugEinheitZugewiesen ETB-Eintrag Handler Token (Issue #411) */
  FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB: Symbol('IEventHandler<FahrzeugEinheitZugewiesenEvent>:EtbEintrag'),
```

- [ ] **Step 2: ETB Event Handler erstellen**

Erstelle `packages/backend/src/application/kraefte/einsatz-fahrzeuge/event-handlers/fahrzeug-einheit-zugewiesen-etb.handler.ts`:

```typescript
/**
 * ETB-Eintrag Auto-Creation bei Fahrzeug-Einheit-Zuweisung.
 *
 * Fire-and-Forget Pattern: Fehler werden geloggt aber NICHT propagiert.
 *
 * Eintrag-Text:
 * - Zuweisung: "Fahrzeug {funkrufname} der Einheit {einheitName} zugewiesen"
 * - Entfernung: "Fahrzeug {funkrufname} von Einheit entfernt"
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

@Injectable()
export class FahrzeugEinheitZugewiesenEtbHandler implements IEventHandler<FahrzeugEinheitZugewiesenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: FahrzeugEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, einheitId=${event.einheitId}`,
      'FahrzeugEinheitZugewiesenEtbHandler',
    );

    try {
      const etbId = event.einsatzId;
      const text = event.einheitId
        ? `Fahrzeug ${event.funkrufname} der Einheit ${event.einheitName} zugewiesen`
        : `Fahrzeug ${event.funkrufname} von Einheit entfernt`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.updatedBy,
        'FAHRZEUGE',
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'FahrzeugEinheitZugewiesen',
          fahrzeugId: event.fahrzeugId,
          einheitId: event.einheitId,
          einheitName: event.einheitName,
          previousEinheitId: event.previousEinheitId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${commandResult.error}`,
          'FahrzeugEinheitZugewiesenEtbHandler',
        );
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${result.error}`,
          'FahrzeugEinheitZugewiesenEtbHandler',
        );
        return;
      }

      this.logger.log(
        `ETB entry created for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}`,
        'FahrzeugEinheitZugewiesenEtbHandler',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${errorMessage}, stack=${stack}`,
        'FahrzeugEinheitZugewiesenEtbHandler',
      );
    }
  }
}
```

- [ ] **Step 3: Infrastructure Event Adapter erstellen**

Erstelle `packages/backend/src/infrastructure/events/adapters/fahrzeug-einheit-zugewiesen-etb-event.adapter.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class FahrzeugEinheitZugewiesenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB)
    private readonly handler: IEventHandler<FahrzeugEinheitZugewiesenEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(FahrzeugEinheitZugewiesenEvent.eventName())
  async onFahrzeugEinheitZugewiesen(event: FahrzeugEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(`Received FahrzeugEinheitZugewiesenEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      fahrzeugId: event.fahrzeugId,
      einheitId: event.einheitId,
      funkrufname: event.funkrufname,
      eventName: FahrzeugEinheitZugewiesenEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(`Unerwarteter Fehler im FahrzeugEinheitZugewiesen Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
```

- [ ] **Step 4: Adapter-Index exportieren**

In `packages/backend/src/infrastructure/events/adapters/index.ts`, hinzufügen:

```typescript
export * from './fahrzeug-einheit-zugewiesen-etb-event.adapter';
```

- [ ] **Step 5: Event Adapters Module registrieren**

In `packages/backend/src/infrastructure/events/event-adapters.module.ts`, den neuen Adapter als Provider hinzufügen (Pattern wie andere Adapter).

- [ ] **Step 6: ETB Application Module registrieren**

In `packages/backend/src/application/etb/etb-application.module.ts`:

Import:
```typescript
import { FahrzeugEinheitZugewiesenEtbHandler } from '@application/kraefte/einsatz-fahrzeuge/event-handlers/fahrzeug-einheit-zugewiesen-etb.handler';
```

Provider:
```typescript
{
  provide: EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB,
  useClass: FahrzeugEinheitZugewiesenEtbHandler,
},
```

Export: `EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB`

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/ && git commit -m "✨(backend): ETB-Handler + Event-Adapter für Fahrzeug-Einheit-Zuweisung"
```

---

### Task 7: Controller Endpoint

**Files:**
- Modify: `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts`
- Create: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/assign-fahrzeug-to-einheit.dto.ts` (falls DTO-Datei nicht bereits existiert, sonst in bestehende DTO-Datei einfügen)

- [ ] **Step 1: DTO erstellen**

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignFahrzeugToEinheitDto {
  @ApiPropertyOptional({ description: 'Einheit-ID (CUID2) oder null zum Entfernen', example: 'clx1234567890abcdef12345' })
  @IsString()
  @IsOptional()
  einheitId?: string | null;
}
```

- [ ] **Step 2: Controller-Endpoint hinzufügen**

In `einsatz-fahrzeuge.controller.ts`:

Imports hinzufügen:

```typescript
import { AssignFahrzeugToEinheitHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler';
import { AssignFahrzeugToEinheitCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.command';
import { AssignFahrzeugToEinheitDto } from '@application/kraefte/einsatz-fahrzeuge/dto/assign-fahrzeug-to-einheit.dto';
```

Handler im Constructor hinzufügen:

```typescript
private readonly assignFahrzeugToEinheitHandler: AssignFahrzeugToEinheitHandler,
```

Neuer Endpoint (nach `updateFmsStatus`):

```typescript
  /**
   * Fahrzeug einer taktischen Einheit zuweisen.
   *
   * Setzt den einheitId FK auf dem EinsatzFahrzeug.
   * einheitId=null entfernt die Zuweisung.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 des EinsatzFahrzeugs
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - AssignFahrzeugToEinheitDto
   */
  @Patch(':id/einheit')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fahrzeug einer taktischen Einheit zuweisen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'CUID2 des Einsatz-Fahrzeugs' })
  @ApiOkResponse({ description: 'Fahrzeug erfolgreich zugewiesen' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Fahrzeug oder Einheit nicht gefunden' })
  async assignToEinheit(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: AssignFahrzeugToEinheitDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const commandResult = AssignFahrzeugToEinheitCommand.create({
      einsatzId,
      fahrzeugId: id,
      einheitId: dto.einheitId ?? null,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.assignFahrzeugToEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Zuweisen des Fahrzeugs');
    }

    this.logger.log(`Fahrzeug ${id} ${dto.einheitId ? `Einheit ${dto.einheitId} zugewiesen` : 'von Einheit entfernt'} für Einsatz ${einsatzId} von User ${user.userId}`);
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/modules/ packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/ && git commit -m "✨(backend): PATCH /fahrzeuge/:id/einheit Controller-Endpoint"
```

---

### Task 8: API Client generieren

**Files:**
- Generated: `packages/shared/client/` (NIEMALS manuell ändern!)

- [ ] **Step 1: Backend starten und API generieren**

```bash
pnpm run generate-api
```

- [ ] **Step 2: Verifizieren**

Prüfen dass `packages/shared/client/models/EinsatzFahrzeugDto.ts` jetzt ein `einheitId` Feld hat, und `packages/shared/client/apis/EinsatzFahrzeugeApi.ts` eine neue `assignToEinheit` Methode.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/client/ && git commit -m "♻️(shared): API Client nach Fahrzeug-Einheit-Endpoint regeneriert"
```

---

### Task 9: Registry-Fix (UNABHÄNGIG, parallelisierbar)

**Files:**
- Modify: `packages/frontend/src/features/workspace/registry/__tests__/einsatz-workspace.registry.spec.ts:61-63`

- [ ] **Step 1: Test anpassen**

In `einsatz-workspace.registry.spec.ts`, Zeilen 61-63 ändern von:

```typescript
    expect(kraefteModule?.subPages.find((page) => page.id === 'einheiten')?.visibility).toMatchObject({
      default: 'disabled',
    });
```

Zu:

```typescript
    expect(kraefteModule?.subPages.find((page) => page.id === 'einheiten')?.visibility.default).toBe('visible');
```

- [ ] **Step 2: Test ausführen**

```bash
pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="einsatz-workspace.registry" --no-coverage
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/workspace/ && git commit -m "🐛(frontend): Einheiten-Seite als visible im Registry-Test"
```

---

### Task 10: Frontend — Mutation Hook

**Files:**
- Create: `packages/frontend/src/features/kraefte/api/use-assign-fahrzeug-zu-einheit.ts`
- Modify: `packages/frontend/src/features/kraefte/api/index.ts`

**Depends on:** Task 8 (API Client)

- [ ] **Step 1: Hook erstellen**

Erstelle `packages/frontend/src/features/kraefte/api/use-assign-fahrzeug-zu-einheit.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { KRAEFTE_QUERY_KEYS } from './queries';

interface AssignFahrzeugZuEinheitParams {
  fahrzeugId: string;
  einheitId: string | null;
}

/**
 * Mutation Hook für Fahrzeug→Einheit Zuweisung.
 * einheitId=null entfernt die Zuweisung.
 */
export const useAssignFahrzeugZuEinheit = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fahrzeugId, einheitId }: AssignFahrzeugZuEinheitParams) => {
      // Exakter Methodenname wird nach generate-api bekannt
      // Pattern: einsatzFahrzeugeControllerAssignToEinheitVAlpha
      await api.einsatzFahrzeuge().einsatzFahrzeugeControllerAssignToEinheitVAlpha({
        einsatzId,
        id: fahrzeugId,
        assignFahrzeugToEinheitDto: { einheitId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KRAEFTE_QUERY_KEYS.fahrzeuge(einsatzId) });
      queryClient.invalidateQueries({ queryKey: KRAEFTE_QUERY_KEYS.einheiten(einsatzId) });
    },
    onError: (error) => {
      logger.error('Fehler beim Zuweisen des Fahrzeugs zur Einheit', error);
    },
  });
};
```

**HINWEIS:** Den exakten Methodennamen in `packages/shared/client/apis/EinsatzFahrzeugeApi.ts` nachschlagen und ggf. anpassen.

- [ ] **Step 2: Index exportieren**

In `packages/frontend/src/features/kraefte/api/index.ts`, hinzufügen:

```typescript
export { useAssignFahrzeugZuEinheit } from './use-assign-fahrzeug-zu-einheit';
```

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/kraefte/api/ && git commit -m "✨(frontend): useAssignFahrzeugZuEinheit Mutation Hook"
```

---

### Task 11: Frontend — EinheitZuweisungsDropdown

**Files:**
- Create: `packages/frontend/src/features/kraefte/ui/molecules/EinheitZuweisungsDropdown.tsx`

**Depends on:** Task 10

- [ ] **Step 1: Komponente erstellen**

Erstelle `packages/frontend/src/features/kraefte/ui/molecules/EinheitZuweisungsDropdown.tsx`.

Folge dem Pattern von `packages/frontend/src/features/einsatz/ui/molecules/FahrzeugZuweisungsDropdown.molecule.tsx`:
- Headless UI `Listbox` mit `ListboxButton`, `ListboxOptions`, `ListboxOption`
- `anchor="bottom end"`, `transition`, `z-[100]`, `[--anchor-gap:4px]`
- Props: `currentEinheitId`, `einheiten` (Array), `onAssign`, `isLoading`, `disabled`
- Erste Option: "Keine Einheit" mit `value={null}`
- Jede Einheit zeigt Name + `EinheitTypBadge`
- Button zeigt aktuelle Einheit oder "Zuweisen"
- Icon: `PiTreeStructure`

```typescript
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiCheck, PiCaretDown, PiTreeStructure } from 'react-icons/pi';
import { EinheitTypBadge } from './EinheitTypBadge';

interface EinheitZuweisungsDropdownProps {
  currentEinheitId?: string | null;
  einheiten: Array<{ id: string; name: string; typ: string }>;
  onAssign: (einheitId: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function EinheitZuweisungsDropdown({
  currentEinheitId,
  einheiten,
  onAssign,
  isLoading,
  disabled,
}: EinheitZuweisungsDropdownProps) {
  const currentEinheit = einheiten.find((e) => e.id === currentEinheitId);

  return (
    <Listbox value={currentEinheitId ?? null} onChange={onAssign} disabled={disabled || isLoading}>
      <div className="relative">
        <ListboxButton
          className={`inline-flex w-full items-center gap-2 rounded-control px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
            currentEinheit
              ? 'bg-status-success-surface text-status-success-text ring-status-success-border'
              : 'bg-surface-raised text-text-secondary ring-border-subtle hover:bg-surface-panel'
          } ${isLoading ? 'animate-pulse' : ''}`}
        >
          <PiTreeStructure className="h-3.5 w-3.5" />
          <span className="truncate">{isLoading ? '...' : currentEinheit ? currentEinheit.name : 'Zuweisen'}</span>
          <PiCaretDown className="ml-auto h-3 w-3" />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom end"
          transition
          className="z-[100] mt-1 max-h-60 w-56 overflow-auto rounded-control bg-surface-panel py-1 shadow-lg ring-1 ring-border-subtle [--anchor-gap:4px]"
        >
          <ListboxOption
            value={null}
            className="group flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-text-muted data-[focus]:bg-surface-raised"
          >
            <PiCheck className="h-3.5 w-3.5 opacity-0 group-data-[selected]:opacity-100" />
            Keine Einheit
          </ListboxOption>

          {einheiten.map((einheit) => (
            <ListboxOption
              key={einheit.id}
              value={einheit.id}
              className="group flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-text-primary data-[focus]:bg-surface-raised"
            >
              <PiCheck className="h-3.5 w-3.5 opacity-0 group-data-[selected]:opacity-100" />
              <span className="truncate">{einheit.name}</span>
              <EinheitTypBadge typ={einheit.typ} className="ml-auto" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/features/kraefte/ui/molecules/ && git commit -m "✨(frontend): EinheitZuweisungsDropdown Komponente"
```

---

### Task 12: Frontend — Fahrzeuge-Seite integrieren

**Files:**
- Modify: `packages/frontend/src/routes/app/einsatz/$einsatzId/kräfte/fahrzeuge.tsx`

**Depends on:** Tasks 10, 11

- [ ] **Step 1: Imports hinzufügen**

```typescript
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { useAssignFahrzeugZuEinheit } from '@/features/kraefte/api';
import { EinheitZuweisungsDropdown } from '@/features/kraefte/ui/molecules/EinheitZuweisungsDropdown';
```

- [ ] **Step 2: State + Hooks in FahrzeugeContent**

Nach `const updateFmsStatus = ...` (Zeile 44):

```typescript
  // Einheiten laden für Zuweisung
  const { data: einheiten = [] } = useEinsatzEinheiten(einsatzId);
  const assignToEinheit = useAssignFahrzeugZuEinheit(einsatzId);

  // Race-Condition-Guard für parallele Zuweisungen (Pattern von personal.tsx)
  const [assigningFahrzeugIds, setAssigningFahrzeugIds] = useState<Set<string>>(new Set());

  const handleEinheitAssign = useCallback(
    (fahrzeugId: string, einheitId: string | null) => {
      setAssigningFahrzeugIds((prev) => {
        if (prev.has(fahrzeugId)) return prev;
        const next = new Set(prev).add(fahrzeugId);

        const onSettled = () => {
          setAssigningFahrzeugIds((p) => {
            const n = new Set(p);
            n.delete(fahrzeugId);
            return n;
          });
        };

        assignToEinheit.mutate({ fahrzeugId, einheitId }, { onSettled });
        return next;
      });
    },
    [assignToEinheit],
  );
```

- [ ] **Step 3: Dropdown in Fahrzeug-Cards einfügen**

In jeder Fahrzeug-Card (alle drei Gruppen: `fahrzeugeImEinsatz`, `fahrzeugeBereit`, `fahrzeugeAndere`) nach dem bestehenden Content-`div`, vor dem schließenden `</div>` des `flex items-start justify-between`:

```tsx
<div className="ml-4 flex-shrink-0 w-48">
  <EinheitZuweisungsDropdown
    currentEinheitId={fahrzeug.einheitId}
    einheiten={einheiten}
    onAssign={(einheitId) => handleEinheitAssign(fahrzeug.id, einheitId)}
    isLoading={assigningFahrzeugIds.has(fahrzeug.id)}
  />
</div>
```

**HINWEIS:** Für die `fahrzeugeBereit` und `fahrzeugeAndere` Gruppen muss das `flex items-center` zu `flex items-start justify-between` geändert werden, damit der Dropdown Platz hat.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/routes/ && git commit -m "✨(frontend): Einheit-Zuweisung auf der Fahrzeuge-Seite"
```

---

### Task 13: Backend Tests — Neuer Handler + Bestehende Einheiten-Handler

**Files:**
- Create: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler.spec.ts`
- Create: `packages/backend/src/application/kraefte/einsatz-einheiten/commands/create-einheit/create-einheit.handler.spec.ts`
- Create: (weitere spec-Dateien für alle 8 bestehenden + 1 neuen Handler)

**Depends on:** Tasks 5, 6, 7

Die Tests folgen alle demselben Pattern. Hier das Pattern für den neuen Handler und einen bestehenden:

- [ ] **Step 1: AssignFahrzeugToEinheit Handler Test**

Erstelle `assign-fahrzeug-to-einheit.handler.spec.ts`:

```typescript
import { AssignFahrzeugToEinheitHandler } from './assign-fahrzeug-to-einheit.handler';
import { AssignFahrzeugToEinheitCommand } from './assign-fahrzeug-to-einheit.command';
import { Result } from '@domain/common/result';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';

describe('AssignFahrzeugToEinheitHandler', () => {
  let handler: AssignFahrzeugToEinheitHandler;
  let mockPrisma: { $transaction: jest.Mock };
  let mockOutboxRepository: { save: jest.Mock };
  let mockFahrzeugRepository: { findById: jest.Mock; save: jest.Mock };
  let mockEinheitRepository: { findById: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  const mockTx = {};
  const validEinsatzId = 'test-einsatz-id';
  const validUserId = 'clxxxxxxxxxxxxxxxxxxxxxxxxx'; // Gültiger CUID2

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (callback) => callback(mockTx)),
    };
    mockOutboxRepository = { save: jest.fn().mockResolvedValue(undefined) };
    mockFahrzeugRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };
    mockEinheitRepository = { findById: jest.fn() };
    mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

    handler = new AssignFahrzeugToEinheitHandler(
      mockPrisma as any,
      mockOutboxRepository as any,
      mockFahrzeugRepository as any,
      mockEinheitRepository as any,
      mockLogger as any,
    );
  });

  it('weist ein Fahrzeug einer Einheit zu', async () => {
    // Arrange: Fahrzeug und Einheit existieren
    const fahrzeug = createMockFahrzeug({ einsatzId: validEinsatzId });
    const einheit = createMockEinheit({ einsatzId: validEinsatzId, name: 'Löschgruppe 1' });
    mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
    mockEinheitRepository.findById.mockResolvedValue(Result.ok(einheit));

    const command = AssignFahrzeugToEinheitCommand.create({
      einsatzId: validEinsatzId,
      fahrzeugId: fahrzeug.id.value,
      einheitId: einheit.id.value,
      updatedBy: validUserId,
    });

    // Act
    const result = await handler.execute(command.value!);

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(mockFahrzeugRepository.save).toHaveBeenCalled();
  });

  it('gibt Fehler wenn Fahrzeug nicht gefunden', async () => {
    mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(null));

    const command = AssignFahrzeugToEinheitCommand.create({
      einsatzId: validEinsatzId,
      fahrzeugId: validUserId, // Gültige CUID2 aber nicht existent
      einheitId: validUserId,
      updatedBy: validUserId,
    });

    const result = await handler.execute(command.value!);
    expect(result.isFailure).toBe(true);
  });

  it('gibt Fehler wenn Einheit nicht zum selben Einsatz gehört', async () => {
    const fahrzeug = createMockFahrzeug({ einsatzId: validEinsatzId });
    const einheit = createMockEinheit({ einsatzId: 'anderer-einsatz' });
    mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));
    mockEinheitRepository.findById.mockResolvedValue(Result.ok(einheit));

    const command = AssignFahrzeugToEinheitCommand.create({
      einsatzId: validEinsatzId,
      fahrzeugId: fahrzeug.id.value,
      einheitId: einheit.id.value,
      updatedBy: validUserId,
    });

    const result = await handler.execute(command.value!);
    expect(result.isFailure).toBe(true);
  });

  it('entfernt Zuweisung wenn einheitId null', async () => {
    const fahrzeug = createMockFahrzeug({ einsatzId: validEinsatzId });
    mockFahrzeugRepository.findById.mockResolvedValue(Result.ok(fahrzeug));

    const command = AssignFahrzeugToEinheitCommand.create({
      einsatzId: validEinsatzId,
      fahrzeugId: fahrzeug.id.value,
      einheitId: null,
      updatedBy: validUserId,
    });

    const result = await handler.execute(command.value!);
    expect(result.isSuccess).toBe(true);
    expect(mockEinheitRepository.findById).not.toHaveBeenCalled();
  });
});

// Helper: Mock-Fahrzeug via reconstitute()
function createMockFahrzeug(overrides: { einsatzId: string }) {
  return EinsatzFahrzeug.reconstitute({
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    einsatzId: overrides.einsatzId,
    fahrzeugtypId: 'clxxxxxxxxxxxxxxxxxxxxxxxxy',
    funkrufname: 'Florian 1/46',
    fmsStatus: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'clxxxxxxxxxxxxxxxxxxxxxxxxz',
  }).value!;
}

// Helper: Mock-Einheit (vereinfacht - nur die benötigten Felder)
function createMockEinheit(overrides: { einsatzId: string; name?: string }) {
  return {
    id: { value: 'cleinheitxxxxxxxxxxxxxxxxx' },
    einsatzId: overrides.einsatzId,
    name: overrides.name ?? 'Test-Einheit',
  };
}
```

- [ ] **Step 2: Test ausführen**

```bash
cd packages/backend && pnpx jest --testPathPatterns="assign-fahrzeug-to-einheit" --no-coverage
```

- [ ] **Step 3: Bestehende Handler-Tests erstellen**

Erstelle Tests für die 8 bestehenden Einheiten-Handler nach demselben Pattern. Jeder Handler bekommt seine eigene `.spec.ts` Datei mit:
- Happy Path Test
- Validierungsfehler Test
- Not-Found Test
- Spezifische Business-Rule Tests (z.B. Zirkel-Check für MoveEinheit, Duplikat für AssignPerson)

Die Handler sind:
1. `create-einheit.handler.spec.ts`
2. `update-einheit.handler.spec.ts`
3. `change-einheit-status.handler.spec.ts`
4. `set-einheitenfuehrer.handler.spec.ts`
5. `assign-person-to-einheit.handler.spec.ts`
6. `remove-person-from-einheit.handler.spec.ts`
7. `move-einheit.handler.spec.ts`
8. `delete-einheit.handler.spec.ts`

**Pattern:** Wie Step 1, mit Mock-Injection über Constructor, `mockPrisma.$transaction` ruft Callback direkt auf.

- [ ] **Step 4: Alle Tests ausführen**

```bash
cd packages/backend && pnpx jest --testPathPatterns="einsatz-einheiten|assign-fahrzeug-to-einheit" --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/kraefte/ && git commit -m "🧪(backend): Tests für Einheiten-Handler + AssignFahrzeugToEinheit"
```

---

### Task 14: Frontend Tests

**Files:**
- Create: `packages/frontend/src/features/kraefte/ui/molecules/__tests__/EinheitZuweisungsDropdown.spec.tsx`

**Depends on:** Task 11

- [ ] **Step 1: Dropdown-Tests erstellen**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EinheitZuweisungsDropdown } from '../EinheitZuweisungsDropdown';

const mockEinheiten = [
  { id: 'e1', name: '1. Löschgruppe', typ: 'GRUPPE' },
  { id: 'e2', name: 'Abschnitt Nord', typ: 'ABSCHNITT' },
];

describe('EinheitZuweisungsDropdown', () => {
  it('zeigt "Zuweisen" wenn keine Einheit zugewiesen', () => {
    render(
      <EinheitZuweisungsDropdown
        currentEinheitId={null}
        einheiten={mockEinheiten}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText('Zuweisen')).toBeInTheDocument();
  });

  it('zeigt Einheit-Name wenn zugewiesen', () => {
    render(
      <EinheitZuweisungsDropdown
        currentEinheitId="e1"
        einheiten={mockEinheiten}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText('1. Löschgruppe')).toBeInTheDocument();
  });

  it('zeigt "..." wenn isLoading', () => {
    render(
      <EinheitZuweisungsDropdown
        currentEinheitId={null}
        einheiten={mockEinheiten}
        onAssign={vi.fn()}
        isLoading
      />,
    );
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('ruft onAssign mit Einheit-ID auf bei Auswahl', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();

    render(
      <EinheitZuweisungsDropdown
        currentEinheitId={null}
        einheiten={mockEinheiten}
        onAssign={onAssign}
      />,
    );

    await user.click(screen.getByText('Zuweisen'));
    await user.click(screen.getByText('1. Löschgruppe'));

    expect(onAssign).toHaveBeenCalledWith('e1');
  });
});
```

- [ ] **Step 2: Test ausführen**

```bash
pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="EinheitZuweisungsDropdown" --no-coverage
```

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/kraefte/ && git commit -m "🧪(frontend): EinheitZuweisungsDropdown Tests"
```

---

### Parallelisierungs-Übersicht

```
Tasks 1-8: Backend (sequentiell)
  ├── Task 1: Schema + Migration
  ├── Task 2: Domain Event
  ├── Task 3: Aggregate erweitern
  ├── Task 4: Infrastructure (Mapper, Repo, Serializer)
  ├── Task 5: Command + Handler
  ├── Task 6: ETB + Adapters + DI
  ├── Task 7: Controller
  └── Task 8: API generieren

Task 9: Registry-Fix (UNABHÄNGIG)

Tasks 10-12: Frontend (sequentiell, nach Task 8)
  ├── Task 10: Mutation Hook
  ├── Task 11: EinheitZuweisungsDropdown
  └── Task 12: fahrzeuge.tsx Integration

Task 13: Backend Tests (nach Task 7)
Task 14: Frontend Tests (nach Task 11)
```

**Empfohlene Agent-Aufteilung:**
- **Agent A:** Tasks 1-8 (Backend, sequentiell)
- **Agent B:** Task 9 (Registry-Fix, sofort parallelisierbar)
- **Agent C:** Tasks 10-12 (Frontend, nach Agent A fertig)
- **Agent D:** Task 13 (Backend Tests, nach Agent A fertig)
- **Agent E:** Task 14 (Frontend Tests, nach Agent C fertig)
