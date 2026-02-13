# Architektur-Prinzipien

> **Verbindlich** fuer alle Entwickler im Bluelight Hub Projekt.
> Basierend auf [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon), angepasst an unseren Stack (NestJS, Prisma, React, TanStack).

---

## 1. Ueberblick

Bluelight Hub kombiniert mehrere Architekturmuster:

- **Domain-Driven Design (DDD)** -- Geschaeftslogik in Entities, Aggregates, Value Objects
- **Hexagonal Architecture (Ports & Adapters)** -- Technologie-Unabhaengigkeit durch Interfaces
- **CQRS** -- Trennung von Commands (Schreiben) und Queries (Lesen)
- **Transactional Outbox** -- Zuverlaessige Event-Publikation

### Layer-Struktur (Backend)

```
modules/           HTTP Controller (NestJS-spezifisch)
    |
infrastructure/    DB, Events, Adapters (Technologie-Details)
    |
application/       Use Cases, Commands, Queries (Orchestrierung)
    |
domain/            Business Rules (Framework-agnostisch)
```

**Abhaengigkeiten fliessen IMMER nach innen.** Aeussere Layer duerfen innere importieren, niemals umgekehrt.

---

## 2. Domain Layer

Der Domain Layer enthaelt die Geschaeftslogik. Er kennt kein Framework, keine Datenbank, kein HTTP.

### 2.1 Aggregate Roots

Aggregate Roots sind die transaktionalen Grenzen im Domain Model. Ein Aggregate = eine Transaktion.

**Regeln:**

- Erben von `AggregateRoot<TId>` mit type-safe `EntityId`
- Erstellt ueber statische Factory Methods mit `Result<T>` Pattern (niemals public Constructor)
- Schuetzen ihre Invarianten: kein public Setter, State-Aenderungen nur ueber Business Methods
- Sammeln Domain Events in-memory (`addDomainEvent()`) bis zur Persistierung
- Identitaets-Gleichheit: Zwei Aggregates sind gleich wenn ihre IDs gleich sind

```typescript
// domain/entities/einsatz.entity.ts
class Einsatz extends AggregateRoot<EinsatzId> {
  // Private Constructor erzwingt Factory Method
  private constructor(id: EinsatzId, private _name: string) {
    super(id);
  }

  // Factory Method mit Validierung
  static create(props: CreateEinsatzProps): Result<Einsatz> {
    if (!props.name?.trim()) {
      return Result.fail('Name ist erforderlich');
    }
    const id = EinsatzId.create();
    if (id.isFailure) return Result.fail(id.error!);

    const einsatz = new Einsatz(id.value!, props.name);
    einsatz.addDomainEvent(new EinsatzErstelltEvent(id.value!.value));
    return Result.ok(einsatz);
  }

  // Business Method aendert State und emittiert Event
  updateName(name: string): Result<void> {
    if (!name?.trim()) return Result.fail('Name darf nicht leer sein');
    this._name = name;
    this.updateTimestamp();
    this.addDomainEvent(new EinsatzAktualisiertEvent(this.id.value, { name }));
    return Result.ok(undefined);
  }
}
```

### 2.2 Value Objects

Value Objects sind immutabel, haben keine Identitaet und werden ueber ihre Struktur verglichen.

**Regeln:**

- Erben von `ValueObject<TProps>`
- Immer immutabel -- nach Erstellung keine Aenderung moeglich
- Validierung im Constructor oder Factory Method
- Ersetzen primitive Typen fuer bedeutsame Domain-Konzepte

```typescript
// Statt string fuer E-Mail -> eigenes Value Object
class Email extends ValueObject<{ value: string }> {
  static create(email: string): Result<Email> {
    if (!email.includes('@')) return Result.fail('Ungueltige E-Mail');
    return Result.ok(new Email({ value: email.toLowerCase() }));
  }
}
```

**Wann Value Objects statt Primitives?**

- Wenn Validierungsregeln existieren (E-Mail, Koordinaten, Status)
- Wenn mehrere zusammengehoerende Werte gruppiert werden (Adresse, Geo-Koordinaten)
- Wenn Business-Logik an einen Wert gekoppelt ist
- Nicht fuer triviale Werte ohne Regeln (einfache Strings ohne Constraints)

### 2.3 Domain Events

Events repraesentieren historische Fakten im System. Sie sind immutabel.

**Regeln:**

- Past Tense Benennung: `EinsatzErstelltEvent`, nicht `ErstelleEinsatzEvent`
- Erben von `DomainEvent` (auto-generiert `eventId` via CUID2 und `occurredAt`)
- Ueberschreiben `static eventName()` mit eindeutigem Namen
- Enthalten alle relevanten Daten (vermeidet DB-Queries in Event Handlern)
- **Muessen in `event-deserializer.ts` registriert werden** (sonst gehen Events verloren)

```typescript
class EinsatzErstelltEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly name: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return 'EinsatzErstellt';
  }
}
```

### 2.4 Result Pattern

Erwartete Fehler (Validierung, Business Rules) werden ueber `Result<T>` zurueckgegeben, nicht ueber Exceptions.

**Regeln:**

- `Result.ok(value)` fuer Erfolg
- `Result.fail(error)` fuer erwartete Fehler
- Exceptions nur fuer unerwartete/technische Fehler (DB-Fehler, Netzwerk, Programming Errors)
- Domain Layer wirft keine HTTP Exceptions

```typescript
// Domain: Result zurueckgeben
static create(name: string): Result<Einsatz> {
  if (!name) return Result.fail('Name erforderlich');
  return Result.ok(new Einsatz(name));
}

// Controller: Result zu HTTP mappen
const result = await handler.execute(command);
if (result.isFailure) throw new BadRequestException(result.error);
return result.value;
```

### 2.5 Repository Interfaces (Ports)

Der Domain Layer definiert Repository Interfaces. Er weiss nicht, welche Datenbank verwendet wird.

```typescript
// domain/repositories/i-einsatz.repository.ts
interface IEinsatzRepository {
  findById(id: EinsatzId, tx?: TransactionContext): Promise<Einsatz | null>;
  save(einsatz: Einsatz, tx?: TransactionContext): Promise<Result<void>>;
}
```

`TransactionContext` ist ein opaker Type -- kein Prisma-Bezug im Domain Layer.

---

## 3. Application Layer

Orchestriert Use Cases. Ruft Domain-Logik auf, nutzt Ports fuer Infrastructure.

### 3.1 Commands und Queries (CQRS)

**Commands** aendern State, **Queries** lesen nur.

**Regeln:**

- Ein Handler pro Use Case
- Commands verwenden `TransactionalCommandHandler` (siehe 3.2)
- Queries duerfen die Datenbank direkt abfragen (ohne Domain-Objekte oder Repositories)
- Command Handler sollten keine anderen Command Handler aufrufen. Stattdessen: Events nutzen

```
Command -> Event -> naechster Command (ueber Event Handler)
```

**Verzeichnisstruktur pro Feature:**

```
application/{feature}/
  commands/
    create-{feature}/
      create-{feature}.command.ts      # Command Objekt
      create-{feature}.handler.ts      # Handler Implementierung
  queries/
    get-{feature}/
      get-{feature}.handler.ts
  event-handlers/
    {event-name}.handler.ts
  dto/
    create-{feature}.dto.ts
    {feature}-response.dto.ts
    {feature}-response.factory.ts
  errors/
    {feature}-error.codes.ts
```

### 3.2 TransactionalCommandHandler

Unsere zentrale Base Class fuer state-aendernde Operationen. Garantiert atomare Persistierung von Aggregates und Events.

**Regeln:**

- Erweitere `TransactionalCommandHandler<TCommand, TResult>`
- Implementiere `executeInTransaction(command, tx)`
- Verwende den `tx` Parameter fuer alle DB-Operationen (nicht `this.prisma`)
- Gib `Result.fail()` zurueck fuer Business-Fehler oder `{ result, events }` fuer Erfolg
- Events werden automatisch im Outbox persistiert (gleiche Transaktion)

```typescript
@Injectable()
export class CreateEinsatzHandler extends TransactionalCommandHandler<
  CreateEinsatzCommand,
  string
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    @Inject(EINSATZ_REPOSITORY) private readonly repo: IEinsatzRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateEinsatzCommand,
    tx: TransactionContext,
  ): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    const einsatz = Einsatz.create(command);
    if (einsatz.isFailure) return Result.fail(einsatz.error!);

    await this.repo.save(einsatz.value!, tx);
    const events = einsatz.value!.getDomainEvents();

    return { result: einsatz.value!.id.value, events };
  }
}
```

### 3.3 Framework-Agnostizitaet (AC3)

Der Application Layer darf NestJS-DI-Decorators verwenden (`@Injectable`, `@Inject`), aber keine Framework-spezifischen HTTP-Konzepte.

**Erlaubt:** `@Injectable()`, `@Inject()`, `@Optional()`
**Verboten:** `@Controller`, `HttpException`, `Response`, `Request`, `@Get`/`@Post`

### 3.4 DTOs

- **Request DTOs**: Definieren den Vertrag fuer eingehende Daten (Validierung via Zod im Frontend)
- **Response DTOs**: Definieren was zurueckgegeben wird (Whitelist-Prinzip -- nur explizite Felder)
- **Response Factories**: Mappen Domain-Objekte auf Response DTOs

DTOs enthalten keine Domain-Logik. Sie sind reine Datenstrukturen.

---

## 4. Infrastructure Layer

Implementiert technische Details: Datenbank, Events, externe APIs.

### 4.1 Repository Implementierungen

Implementieren die Interfaces aus dem Domain Layer mit Prisma.

**Regeln:**

- Jedes Repository hat einen zugehoerigen Mapper (z.B. `PrismaEinsatzMapper`)
- Mapper konvertieren zwischen Domain-Format und Datenbank-Format
- Repositories sind ueber DI Tokens registriert (Symbols, keine Strings)

```typescript
@Injectable()
export class PrismaEinsatzRepository implements IEinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: EinsatzId, tx?: TransactionContext): Promise<Einsatz | null> {
    const client = tx ?? this.prisma;
    const data = await client.einsatz.findUnique({ where: { id: id.value } });
    return data ? PrismaEinsatzMapper.toDomain(data) : null;
  }
}
```

### 4.2 DI Tokens

Symbol-basierte Tokens fuer type-safe Dependency Injection.

```typescript
// infrastructure/di-tokens.ts
export const EINSATZ_REPOSITORY = Symbol('IEinsatzRepository');
export const ETB_REPOSITORY = Symbol('IEtbRepository');
```

**Regeln:**

- Immer Symbols verwenden, niemals Strings
- Neue Tokens in `di-tokens.ts` deklarieren
- Bei `@Inject()` den Token verwenden: `@Inject(EINSATZ_REPOSITORY)`

### 4.3 Transactional Outbox Pattern

Events werden in der gleichen Datenbank-Transaktion wie das Aggregate gespeichert (Outbox-Tabelle). Ein Poller publiziert sie asynchron.

**Warum:**

- Keine verlorenen Events bei DB-Fehlern
- Keine Inkonsistenz zwischen Aggregate-State und publizierten Events
- Retry-safe und idempotent

**Flow:**

1. Command Handler aendert Aggregate
2. Events landen in Outbox-Tabelle (Status: PENDING) -- gleiche Transaktion
3. `OutboxEventPublisher` pollt und publiziert asynchron
4. Status wechselt auf PUBLISHED

### 4.4 Event Adapters

Event Adapters transformieren Domain Events in NestJS Event Handler Aufrufe.

**Regeln:**

- Pro Domain Event ein Adapter
- Adapter registriert sich via `@OnEvent()` (NestJS)
- Adapter delegiert an Application Layer Event Handler (ueber DI Token)
- Neue Events muessen in `event-deserializer.ts` UND `event-adapters.module.ts` registriert werden

### 4.5 Persistence Models

Domain Models und Datenbank-Schema sind getrennt. Aenderungen am Schema erfordern keine Aenderungen an Domain-Entities, solange der Mapper angepasst wird.

---

## 5. Modules Layer (Controller)

NestJS-spezifische HTTP Controller. Duennste Schicht -- nur Parsing, Delegation, Response.

### 5.1 Controller Pattern

**Regeln:**

- Ein Controller pro Feature/Resource
- Controller parst Request, erstellt Command/Query, delegiert an Handler
- Controller mappt `Result` auf HTTP Response/Exception
- Controller enthaelt keine Business-Logik

### 5.2 Response Decorators (AC7)

**Immer** Custom Decorators fuer korrekte OpenAPI-Generierung verwenden:

```typescript
// RICHTIG
@ApiWrappedResponse(EinsatzDto, { isArray: true, description: 'Liste' })
@ApiWrappedCreatedResponse(EinsatzDto, { description: 'Erstellt' })

// FALSCH -- bricht API-Client-Generierung!
@ApiOkResponse({ type: EinsatzDto })
```

---

## 6. Frontend-Architektur

### 6.1 Feature-basierte Struktur

Jedes Feature ist ein eigenstaendiges Modul mit klarer interner Struktur:

```
features/{feature}/
  api/
    queries.ts       # TanStack Query Hooks (Read)
    mutations.ts     # TanStack Query Mutations (Write)
  ui/
    atoms/           # Basis-Elemente
    molecules/       # Zusammengesetzte Komponenten
    organisms/       # Komplexe Komponenten
    pages/           # Route-Komponenten
  schemas/           # Zod Validierung
  stores/            # TanStack Store (Client State)
```

### 6.2 API-Integration

```
Backend Endpoint -> pnpm run generate-api -> shared/client/ -> TanStack Query Hook -> Komponente
```

**Regeln:**

- Niemals manuelles `fetch()` oder API-Helper
- Immer generierten Client + TanStack Query verwenden
- Nach Backend-Aenderungen: `pnpm run generate-api`
- `shared/client/` niemals manuell bearbeiten

### 6.3 Erlaubter Tech Stack

| Bereich | Erlaubt | Verboten |
|---------|---------|----------|
| UI | Tailwind CSS + Headless UI | CSS-in-JS, andere Frameworks |
| Forms | @tanstack/react-form + Zod | HTML Forms, Formik |
| Server State | @tanstack/react-query | Redux, manuelles fetch |
| Client State | @tanstack/react-store | Redux, Zustand |
| Linting | Biome | ESLint, Prettier |

---

## 7. Modul-Kommunikation

### 7.1 Lose Kopplung

Module sollen minimal gekoppelt sein.

**Regeln:**

- Keine direkten Imports zwischen Modulen (keine `import X from '../SomeOtherModule'`)
- Kommunikation ueber Events (Domain Events, Event Bus)
- Gemeinsame Logik in separate Dateien auslagern, von denen beide Module abhaengen
- Jedes Modul hat eine oeffentliche Schnittstelle (public API / index.ts)

### 7.2 Event-basierte Kommunikation

```
Modul A: Command -> Event -> Modul B: Event Handler -> Command
```

Nicht: `Modul A -> Modul B.service.doSomething()`

---

## 8. DI Import Regel (AC1)

NestJS Dependency Injection benoetigt Runtime-Symbole. `import type` wird zur Compile-Time entfernt und bricht DI.

```typescript
// RICHTIG: regulaerer Import fuer Injectable Classes
import { MyService } from './my.service';

// FALSCH: bricht NestJS DI zur Laufzeit
import type { MyService } from './my.service';
```

Pre-Commit Hook prueft automatisch. Manuell: `pnpm --filter @bluelight-hub/backend check:di:imports`

---

## 9. Fehlerbehandlung

### 9.1 Domain Layer

- `Result.fail()` fuer erwartete Business-Fehler
- Domain-spezifische Error Codes in `errors/{feature}-error.codes.ts`
- Keine HTTP-Konzepte (Status Codes, Exceptions)

### 9.2 Application Layer

- Propagiert `Result<T>` vom Domain Layer
- Kann eigene `Result.fail()` zurueckgeben (z.B. "Entity nicht gefunden")
- Keine HTTP Exceptions

### 9.3 Controller (Modules Layer)

- Mappt `Result.isFailure` auf HTTP Exceptions (`BadRequestException`, `NotFoundException`, etc.)
- Unerwartete Fehler werden vom Framework als 500 behandelt

```typescript
const result = await handler.execute(command);
if (result.isFailure) {
  if (result.error?.includes('nicht gefunden'))
    throw new NotFoundException(result.error);
  throw new BadRequestException(result.error);
}
return { data: result.value };
```

---

## 10. Testing

### 10.1 Backend

- **Unit Tests**: Domain-Logik und Handler isoliert testen (Mock Repositories)
- **Pattern**: Given-When-Then (AAA: Arrange-Act-Assert)
- **Mocking**: Repository Interfaces (Ports) werden gemockt, nicht Prisma direkt
- **Framework**: Jest

### 10.2 Frontend

- **Komponenten-Tests**: Vitest + Testing Library
- **Hook-Tests**: Query/Mutation Mocking
- **Framework**: Vitest

---

## 11. Checkliste: Neues Feature implementieren

### Backend

1. **Domain**: Entity/Aggregate mit Factory Method + Value Objects erstellen
2. **Domain**: Domain Events definieren (Past Tense)
3. **Domain**: Repository Interface (Port) definieren
4. **Application**: Command/Query + Handler implementieren
5. **Application**: DTOs (Request + Response) + Response Factory erstellen
6. **Infrastructure**: Repository Implementierung + Mapper
7. **Infrastructure**: DI Token in `di-tokens.ts` registrieren
8. **Infrastructure**: Events in `event-deserializer.ts` registrieren
9. **Infrastructure**: Event Adapter erstellen und in `event-adapters.module.ts` registrieren
10. **Modules**: Controller mit `@ApiWrappedResponse` Decorators
11. **Modules**: Module-Definition mit Provider-Registrierung

### Frontend

1. `pnpm run generate-api` ausfuehren
2. Feature-Verzeichnis mit `api/`, `ui/`, `schemas/` anlegen
3. TanStack Query Hooks (`queries.ts`, `mutations.ts`) erstellen
4. Zod Schema fuer Validierung definieren
5. UI-Komponenten implementieren (Atomic Design)

---

## 12. Anti-Patterns (Vermeiden!)

| Anti-Pattern | Stattdessen |
|---|---|
| Business-Logik in Services statt Entities | Logik in Aggregate/Entity kapseln |
| Public Setter auf Entities | Business Methods mit Validierung |
| Exceptions fuer erwartete Fehler | `Result<T>` Pattern |
| Direkte DB-Zugriffe im Application Layer | Repository Ports (Interfaces) |
| `import type` fuer Injectable Classes | Regulaerer `import` (AC1) |
| `@ApiOkResponse` Decorator | `@ApiWrappedResponse` (AC7) |
| Manuelles `fetch()` im Frontend | Generierter Client + TanStack Query |
| Cross-Modul-Imports | Events oder geteilte Abstraktion |
| Framework-Code im Domain Layer | Domain bleibt Framework-agnostisch |
| Anemic Domain Model (leere Entities + fette Services) | Rich Domain Model |
| Command ruft anderen Command auf | Command -> Event -> Command |

---

## 13. Wann NICHT die volle Architektur anwenden

Diese Architektur ist fuer komplexe Business-Logik optimiert. Fuer einfache CRUD-Operationen ohne Invarianten kann vereinfacht werden:

- Einfache Queries duerfen die DB direkt abfragen (ohne Repository/Domain-Objekte)
- Nicht jeder primitive Wert braucht ein Value Object -- nur wenn Validierungsregeln existieren
- Nicht jede Aenderung braucht ein Domain Event -- nur wenn andere Teile des Systems reagieren muessen
- Die Anzahl der Layer sollte zum Problem passen, nicht umgekehrt

> "It's easier to refactor over-design than it is to refactor no design."

---

## Referenzen

- [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon) -- Basis-Architektur
- [Secure by Design](https://www.manning.com/books/secure-by-design) -- Value Objects, Domain Primitives
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) -- Dependency Rule
- `backend/src/application/common/handlers/transactional-command.handler.ts` -- TransactionalCommandHandler
- `backend/src/domain/common/result.ts` -- Result Pattern
- `backend/src/domain/common/aggregate-root.ts` -- AggregateRoot Base Class
- `backend/src/infrastructure/di-tokens.ts` -- DI Token Registry
- `backend/src/infrastructure/outbox/event-deserializer.ts` -- Event Registry
