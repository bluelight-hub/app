# Backend-Architektur

> **Package:** @bluelight-hub/backend
> **Pfad:** `packages/backend/`
> **Framework:** NestJS 11 + TypeScript 5.8

---

## 1. Hexagonal Architecture (Ports & Adapters)

```
packages/backend/src/
├── domain/           # Geschäftslogik (Framework-agnostisch)
├── application/      # Use Cases (Commands, Queries)
├── infrastructure/   # Technische Implementierungen
└── modules/          # HTTP Controller Layer
```

### Layer-Verantwortlichkeiten

| Layer | Verantwortung | Abhängigkeiten |
|-------|---------------|----------------|
| **Domain** | Business Rules, Invarianten | Keine |
| **Application** | Use Case Orchestration | → Domain |
| **Infrastructure** | DB, Events, External APIs | → Domain, → Application |
| **Modules** | HTTP Endpoints | → Application |

**Regel:** Abhängigkeiten fließen IMMER nach innen (Dependency Inversion).

---

## 2. Domain Layer (`src/domain/`)

### 2.1 Entities & Aggregates

```
domain/
├── aggregates/
│   └── einsatz/      # Einsatz als Aggregate Root
├── entities/
│   ├── einsatz.entity.ts
│   ├── etb-eintrag.entity.ts
│   ├── einsatz-fahrzeug.entity.ts
│   ├── einsatz-person.entity.ts
│   └── lagekarte-poi.entity.ts
├── value-objects/
│   ├── einsatz-id.vo.ts
│   ├── einsatz-status.vo.ts
│   ├── koordinaten.vo.ts
│   └── ...
└── events/
    └── einsatz-events.ts
```

### 2.2 Entity Base Classes

```typescript
// Entity mit ID-Gleichheit
abstract class Entity<T> {
  protected readonly _id: T;
  equals(entity?: Entity<T>): boolean;
}

// Aggregate Root mit Domain Events
abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];
  addDomainEvent(event: DomainEvent): void;
  getDomainEvents(): DomainEvent[];
  clearDomainEvents(): void;
}
```

### 2.3 Value Objects

Immutable Wertobjekte mit Validierung:

```typescript
// Beispiel: Koordinaten
class Koordinaten extends ValueObject<{ lat: number; lng: number }> {
  static create(lat: number, lng: number): Result<Koordinaten> {
    if (lat < -90 || lat > 90) return Result.fail('Invalid latitude');
    if (lng < -180 || lng > 180) return Result.fail('Invalid longitude');
    return Result.ok(new Koordinaten({ lat, lng }));
  }
}
```

### 2.4 Repository Interfaces

```typescript
// domain/repositories/i-einsatz.repository.ts
interface IEinsatzRepository {
  findById(id: EinsatzId): Promise<Einsatz | null>;
  findAll(): Promise<Einsatz[]>;
  save(einsatz: Einsatz): Promise<void>;
  delete(id: EinsatzId): Promise<void>;
}
```

---

## 3. Application Layer (`src/application/`)

### 3.1 CQRS Pattern

```
application/
├── einsatz/
│   ├── commands/
│   │   ├── create-einsatz.handler.ts
│   │   └── update-einsatz.handler.ts
│   ├── queries/
│   │   └── get-einsaetze.query.ts
│   └── dto/
│       ├── einsatz.dto.ts
│       └── create-einsatz.dto.ts
```

### 3.2 Command Handler mit Transaktionen

```typescript
@Injectable()
export class CreateEinsatzHandler extends TransactionalCommandHandler<
  CreateEinsatzCommand,
  string
> {
  protected async executeInTransaction(
    command: CreateEinsatzCommand,
    tx: TransactionContext
  ): Promise<{ result: string; events: DomainEvent[] }> {
    const einsatz = Einsatz.create(command);
    if (einsatz.isFailure) return { result: '', events: [] };

    await this.repository.save(einsatz.value, tx);

    const events = einsatz.value.getDomainEvents();
    einsatz.value.clearDomainEvents();

    return { result: einsatz.value.id.value, events };
  }
}
```

### 3.3 Result Pattern

```typescript
class Result<T> {
  isSuccess: boolean;
  isFailure: boolean;
  error?: string;

  static ok<U>(value: U): Result<U>;
  static fail<U>(error: string): Result<U>;

  get value(): T;
}

// Verwendung
const result = Einsatz.create(data);
if (result.isFailure) {
  return Result.fail(result.error);
}
```

---

## 4. Infrastructure Layer (`src/infrastructure/`)

### 4.1 Repository Implementierungen

```typescript
// infrastructure/repositories/prisma-einsatz.repository.ts
@Injectable()
export class PrismaEinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: EinsatzId): Promise<Einsatz | null> {
    const data = await this.prisma.einsatz.findUnique({
      where: { id: id.value }
    });
    return data ? EinsatzMapper.toDomain(data) : null;
  }
}
```

### 4.2 Outbox Pattern

Zuverlässige Event-Publikation innerhalb derselben Transaktion:

```typescript
// infrastructure/outbox/outbox.service.ts
@Injectable()
export class OutboxService {
  async storeEvents(events: DomainEvent[], tx: TransactionContext): Promise<void> {
    await tx.outboxEvent.createMany({
      data: events.map(event => ({
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.constructor.name,
        payload: JSON.stringify(event),
        occurredAt: event.occurredAt,
      })),
    });
  }
}
```

### 4.3 DI Token Constants

```typescript
// infrastructure/di-tokens.ts
export const DI_TOKENS = {
  REPOSITORIES: {
    EINSATZ: Symbol('IEinsatzRepository'),
    ETB: Symbol('IEtbRepository'),
  },
  PORTS: {
    LOGGER: Symbol('ILoggerPort'),
  },
} as const;
```

---

## 5. Modules Layer (`src/modules/`)

### 5.1 Controller Pattern

```typescript
@Controller('einsaetze')
@ApiTags('einsaetze')
@UseGuards(JwtAuthGuard)
export class EinsatzController {
  constructor(
    private readonly createHandler: CreateEinsatzHandler,
    private readonly queryHandler: GetEinsaetzeQueryHandler,
  ) {}

  @Get()
  @ApiWrappedResponse(EinsatzDto, { isArray: true })
  async findAll(): Promise<WrappedResponse<EinsatzDto[]>> {
    return { data: await this.queryHandler.execute() };
  }

  @Post()
  @ApiWrappedCreatedResponse(EinsatzDto)
  async create(@Body() dto: CreateEinsatzDto): Promise<WrappedResponse<EinsatzDto>> {
    const result = await this.createHandler.execute(dto);
    if (result.isFailure) throw new BadRequestException(result.error);
    return { data: result.value };
  }
}
```

### 5.2 Custom Response Decorator (AC7)

```typescript
// IMMER @ApiWrappedResponse statt @ApiOkResponse verwenden!
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste' })
@ApiWrappedCreatedResponse(EinsatzDto, { description: 'Erstellt' })
```

---

## 6. Testing

### 6.1 Unit Test Pattern (AAA + Given-When-Then)

```typescript
describe('CreateEinsatzHandler', () => {
  let handler: CreateEinsatzHandler;
  let mockRepository: jest.Mocked<IEinsatzRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    handler = new CreateEinsatzHandler(mockRepository);
  });

  it('should create einsatz successfully', async () => {
    // Given
    const command = { nummer: 'E-2025-001', stichwort: 'Brand' };
    mockRepository.save.mockResolvedValue(undefined);

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

---

## 7. Datenbank

### 7.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
model Einsatz {
  id              String         @id @default(cuid())
  nummer          String         @unique
  stichwort       String
  status          EinsatzStatus  @default(OFFEN)
  alarmiertAm     DateTime
  archiviertAm    DateTime?

  etbEintraege    EtbEintrag[]
  lagekartePois   LagekartePoi[]
  fahrzeuge       EinsatzFahrzeug[]
  personen        EinsatzPerson[]

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([status])
  @@index([alarmiertAm])
}
```

### 7.2 Migrationen

**Anzahl:** 35 Migrationen (Stand: 2026-01-04)

Wichtige Migrationen:
- `20250801181334_init` - Initiales Schema
- `20250827155124_add_einsatz_module` - Einsatz-Modul
- `20251126192142_add_outbox_events` - Outbox Pattern
- `20251216155919_add_kraefte_stammdaten` - Kräfte-Stammdaten

---

## 8. Code Review Checkliste

### AC1: DI Import Check
```typescript
// ✅ RICHTIG: Regular import für DI
import { MyService } from './my.service';

// ❌ FALSCH: import type bricht NestJS DI
import type { MyService } from './my.service';
```

### AC2: DI Token Constants
```typescript
// ✅ RICHTIG: Symbol-based Constants
@Inject(DI_TOKENS.REPOSITORIES.EINSATZ)

// ❌ FALSCH: Inline Strings
@Inject('IEinsatzRepository')
```

### AC3: Framework-Agnostizität (Application Layer)
```typescript
// ✅ Erlaubt: @Injectable, @Inject, @Optional
// ❌ Verboten: @Controller, HttpException, Response
```

### AC4: Result Pattern
```typescript
// ✅ RICHTIG: Result für erwartete Fehler
return Result.fail('Validation failed');

// ❌ FALSCH: Exceptions für Business-Fehler
throw new ValidationException('...');
```

---

*Dokumentation generiert durch BMad Document-Project Workflow v1.2.0*
