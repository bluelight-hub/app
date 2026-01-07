# Story 1.7: Invite-Code verwalten

## Story

- **ID**: 1.7
- **Epic**: Epic 1 - Secure Server Foundation & Invite-System
- **Story Key**: 1-7-invite-code-verwalten
- **Title**: Invite-Code verwalten
- **Status**: ready-for-dev
- **Story Points**: 5
- **Depends On**: Story 1.6 (done)

## User Story

**Als** Server-Administrator
**moechte ich** alle Invite-Codes einsehen und widerrufen koennen
**damit** ich die Kontrolle ueber Onboarding-Links behalte

## Acceptance Criteria

### AC1: Invite-Code-Liste abrufen

**Given** ein authentifizierter Admin-User
**When** `GET /admin/invites` aufgerufen wird
**Then** wird eine paginierte Liste aller Invite-Codes zurueckgegeben

```json
{
  "data": [
    {
      "id": "inv_abc123...",
      "code": "A1B2****",
      "expiresAt": "2026-01-07T18:00:00Z",
      "maxUses": 1,
      "useCount": 0,
      "status": "active",
      "label": "Freiwillige Feuerwehr",
      "createdAt": "2026-01-06T12:00:00Z",
      "createdBy": {
        "id": "usr_...",
        "email": "admin@example.de"
      },
      "revokedAt": null
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

**Wichtig:** Code wird IMMER maskiert zurueckgegeben (nur erste 4 Zeichen sichtbar)

### AC2: Status-Berechnung (Computed Field)

**Given** ein Invite-Code in der Datenbank
**When** der Status berechnet wird
**Then** gilt folgende Prioritaet:

| Prioritaet | Status    | Bedingung                                        |
|------------|-----------|--------------------------------------------------|
| 1          | `revoked` | `isRevoked === true`                             |
| 2          | `expired` | `expiresAt <= now()`                             |
| 3          | `used`    | `useCount >= maxUses`                            |
| 4          | `active`  | Keine der obigen Bedingungen erfuellt            |

**Implementierung:** Status wird NICHT in DB gespeichert, sondern zur Laufzeit berechnet.

### AC3: Invite-Code widerrufen

**Given** ein Invite-Code mit Status `active` oder `expired`
**When** `DELETE /admin/invites/:id` aufgerufen wird
**Then**:
- Der Code wird als widerrufen markiert (`isRevoked = true`, `revokedAt = now()`)
- Der Status wechselt zu `revoked`
- Ein `InviteCodeRevokedEvent` wird emittiert (Outbox Pattern)
- Response: `200 OK` mit aktualisiertem Code

```json
{
  "data": {
    "id": "inv_abc123...",
    "code": "A1B2****",
    "status": "revoked",
    "revokedAt": "2026-01-07T14:30:00Z"
  }
}
```

### AC4: Widerruf-Idempotenz

**Given** ein Invite-Code mit Status `used` oder `revoked`
**When** `DELETE /admin/invites/:id` aufgerufen wird
**Then**:
- Operation ist erfolgreich (idempotent)
- Bei `used`: Status bleibt `used` (nicht `revoked`)
- Bei `revoked`: Keine Aenderung, Response wie AC3

### AC5: Filter und Sortierung

**Given** Query-Parameter an `GET /admin/invites`
**When** folgende Parameter uebergeben werden:

| Parameter   | Typ      | Beschreibung                          | Beispiel                |
|-------------|----------|---------------------------------------|-------------------------|
| `status`    | string   | Filter nach Status                    | `?status=active`        |
| `createdBy` | string   | Filter nach Ersteller-ID              | `?createdBy=usr_abc`    |
| `sort`      | string   | Sortierung (field:direction)          | `?sort=expiresAt:asc`   |
| `page`      | number   | Seitennummer (default: 1)             | `?page=2`               |
| `pageSize`  | number   | Elemente pro Seite (default: 20)      | `?pageSize=50`          |

**Then** werden Ergebnisse entsprechend gefiltert, sortiert und paginiert

**Erlaubte Sort-Felder:** `createdAt`, `expiresAt`, `useCount`
**Erlaubte Sort-Richtungen:** `asc`, `desc` (default: `desc`)

### AC6: Audit-Trail

**Given** ein Admin fuehrt eine Aktion aus
**When** die Operation erfolgreich ist
**Then** wird geloggt:

| Aktion  | Log-Message                                                    |
|---------|----------------------------------------------------------------|
| List    | `"Admin listed invite codes (count: X, filters: {...})"`       |
| Revoke  | `"Invite code revoked (id: inv_xxx, code: A1B2****, by: admin@example.de)"` |

### AC7: Fehlerbehandlung

| Fehler                    | HTTP | Error Code              | Message                           |
|---------------------------|------|-------------------------|-----------------------------------|
| Code nicht gefunden       | 404  | `INVITE_CODE_NOT_FOUND` | "Invite-Code nicht gefunden"      |
| Nicht authentifiziert     | 401  | `UNAUTHORIZED`          | "Authentifizierung erforderlich"  |
| Keine Admin-Rechte        | 403  | `FORBIDDEN`             | "Admin-Berechtigung erforderlich" |
| Ungueltiger Status-Filter | 400  | `INVALID_STATUS_FILTER` | "Ungueltiger Status: xyz"         |
| Ungueltiges Sort-Feld     | 400  | `INVALID_SORT_FIELD`    | "Ungueltiges Sortierfeld: xyz"    |

---

## Technical Notes

### Architektur-Uebersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Module Layer (REST)                               │
│  AdminInviteController                                                       │
│  ├─ GET  /admin/invites      → ListInvitesHandler (Query)                   │
│  └─ DELETE /admin/invites/:id → RevokeInviteHandler (Command)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Application Layer                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────┐    │
│  │ ListInvitesHandler      │    │ RevokeInviteHandler                  │    │
│  │ (QueryHandler)          │    │ (extends TransactionalCommandHandler)│    │
│  └─────────────────────────┘    └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Domain Layer                                      │
│  InviteCode Aggregate                                                        │
│  ├─ revoke(): Result<void>     // Setzt isRevoked=true, emits Event         │
│  └─ computeStatus(): InviteCodeStatus  // Berechnet Status                  │
│                                                                              │
│  InviteCodeRevokedEvent (Domain Event)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Infrastructure Layer                                 │
│  PrismaInviteCodeRepository                                                  │
│  ├─ findAll(filters, pagination): Promise<Result<PaginatedInviteCodes>>     │
│  ├─ findById(id): Promise<Result<InviteCode | null>>                        │
│  └─ save(inviteCode): Promise<Result<void>>                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bestehende Implementierung (aus Story 1.6)

Die folgenden Komponenten existieren bereits und werden erweitert:

| Komponente | Pfad | Erweiterung |
|------------|------|-------------|
| InviteCode Aggregate | `domain/aggregates/invite-code.aggregate.ts` | `computeStatus()` Methode hinzufuegen |
| IInviteCodeRepository | `domain/repositories/i-invite-code.repository.ts` | `findAll()` mit Pagination/Filter |
| PrismaInviteCodeRepository | `infrastructure/invite-code/repositories/` | `findAll()` implementieren |
| AdminInviteController | `modules/admin/controllers/admin-invite.controller.ts` | GET + DELETE Endpoints |

### Neue Komponenten

| Komponente | Pfad |
|------------|------|
| InviteCodeRevokedEvent | `domain/events/invite-code-revoked.event.ts` |
| ListInvitesQuery | `application/admin/queries/list-invites.query.ts` |
| ListInvitesHandler | `application/admin/queries/list-invites.handler.ts` |
| RevokeInviteCommand | `application/admin/commands/revoke-invite.command.ts` |
| RevokeInviteHandler | `application/admin/commands/revoke-invite.handler.ts` |
| InviteCodeListDto | `application/admin/dto/invite-code-list.dto.ts` |
| InviteCodeListItemDto | `application/admin/dto/invite-code-list-item.dto.ts` |
| RevokeInviteResponseDto | `application/admin/dto/revoke-invite-response.dto.ts` |
| InviteCodeStatus (Enum) | `domain/value-objects/invite-code-status.ts` |

---

## Implementation Tasks

### Task 1: Domain Layer - Status Value Object & Event

**Dateien:**
- `packages/backend/src/domain/value-objects/invite-code-status.ts` (NEU)
- `packages/backend/src/domain/events/invite-code-revoked.event.ts` (NEU)
- `packages/backend/src/domain/aggregates/invite-code.aggregate.ts` (ERWEITERN)

**1.1 InviteCodeStatus Enum:**
```typescript
export enum InviteCodeStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
```

**1.2 InviteCodeRevokedEvent:**
```typescript
export class InviteCodeRevokedEvent extends DomainEvent {
  constructor(
    public readonly inviteCodeId: string,
    public readonly codeMasked: string,
    public readonly revokedAt: Date,
    public readonly revokedById: string,
  ) {
    super();
  }
}
```

**1.3 InviteCode Aggregate erweitern:**
```typescript
// Neue Methode
public computeStatus(): InviteCodeStatus {
  if (this._isRevoked) return InviteCodeStatus.REVOKED;
  if (this._expiresAt <= new Date()) return InviteCodeStatus.EXPIRED;
  if (this._usedCount >= this._maxUses) return InviteCodeStatus.USED;
  return InviteCodeStatus.ACTIVE;
}

// revoke() Methode erweitern um Event-Emission
public revoke(revokedById: string): Result<void> {
  // Bereits revoked oder used? Idempotent behandeln
  if (this._isRevoked) {
    return Result.ok(); // Idempotent
  }

  // Used Codes werden NICHT revoked (bleiben 'used')
  if (this._usedCount >= this._maxUses) {
    return Result.ok(); // Idempotent, Status bleibt 'used'
  }

  this._isRevoked = true;
  this._revokedAt = new Date();

  this.addDomainEvent(new InviteCodeRevokedEvent(
    this._id.value,
    this._code.toMasked(),
    this._revokedAt,
    revokedById,
  ));

  return Result.ok();
}
```

**Akzeptanzkriterien fuer Task 1:**
- [ ] InviteCodeStatus Enum mit 4 Werten
- [ ] InviteCodeRevokedEvent mit allen Feldern
- [ ] computeStatus() berechnet Status korrekt nach Prioritaet
- [ ] revoke() ist idempotent und emittiert Event
- [ ] Unit Tests fuer Status-Berechnung (alle 4 Faelle)
- [ ] Unit Tests fuer revoke() (normal, already revoked, used)

---

### Task 2: Domain Layer - Repository Interface erweitern

**Datei:** `packages/backend/src/domain/repositories/i-invite-code.repository.ts`

**2.1 Neue Typen:**
```typescript
export interface InviteCodeFilters {
  status?: InviteCodeStatus;
  createdById?: string;
}

export interface InviteCodeSortOptions {
  field: 'createdAt' | 'expiresAt' | 'useCount';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**2.2 Repository Interface erweitern:**
```typescript
export interface IInviteCodeRepository {
  // Bestehend
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>>;
  findByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<Result<InviteCode | null>>;
  save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>>;

  // NEU
  findAll(
    filters?: InviteCodeFilters,
    sort?: InviteCodeSortOptions,
    pagination?: PaginationOptions,
    tx?: TransactionContext,
  ): Promise<Result<PaginatedResult<InviteCode>>>;
}
```

**Akzeptanzkriterien fuer Task 2:**
- [ ] Filter-Interface definiert
- [ ] Sort-Interface definiert (nur erlaubte Felder)
- [ ] Pagination-Interface definiert
- [ ] PaginatedResult generisch definiert
- [ ] findAll() in Interface hinzugefuegt

---

### Task 3: Infrastructure Layer - Repository Implementation

**Datei:** `packages/backend/src/infrastructure/invite-code/repositories/prisma-invite-code.repository.ts`

**3.1 findAll() implementieren:**
```typescript
async findAll(
  filters?: InviteCodeFilters,
  sort?: InviteCodeSortOptions,
  pagination?: PaginationOptions,
  tx?: TransactionContext,
): Promise<Result<PaginatedResult<InviteCode>>> {
  const client = tx ?? this.prisma;
  const page = pagination?.page ?? 1;
  const pageSize = Math.min(pagination?.pageSize ?? 20, 100); // Max 100
  const skip = (page - 1) * pageSize;

  // Where-Clause bauen
  const where: Prisma.InviteCodeWhereInput = {};

  if (filters?.createdById) {
    where.createdById = filters.createdById;
  }

  // Status-Filter erfordert Runtime-Berechnung (kein DB-Feld!)
  // Daher: Alle laden und im Memory filtern ODER View/Computed Column
  // Empfehlung: Fuer kleine Datenmenge (<1000) im Memory filtern

  // Sort
  const orderBy: Prisma.InviteCodeOrderByWithRelationInput = {};
  if (sort) {
    orderBy[sort.field] = sort.direction;
  } else {
    orderBy.createdAt = 'desc'; // Default
  }

  // Query
  const [records, total] = await Promise.all([
    client.inviteCode.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: { createdBy: { select: { id: true, email: true } } },
    }),
    client.inviteCode.count({ where }),
  ]);

  // Map to Domain + Filter by Status (if needed)
  let items = records.map(r => PrismaInviteCodeMapper.toAggregate(r));

  if (filters?.status) {
    items = items.filter(i => i.computeStatus() === filters.status);
    // ACHTUNG: Pagination stimmt nicht mehr exakt!
    // Fuer korrekte Pagination bei Status-Filter: Alle laden, filtern, dann paginieren
  }

  return Result.ok({
    items,
    total: filters?.status ? items.length : total,
    page,
    pageSize,
    totalPages: Math.ceil((filters?.status ? items.length : total) / pageSize),
  });
}
```

**Hinweis zur Status-Filterung:**
Da `status` ein computed field ist, gibt es zwei Strategien:
1. **Memory-Filter** (empfohlen fuer <1000 Eintraege): Alle laden, im Memory filtern
2. **DB-View/Generated Column** (fuer >1000 Eintraege): Prisma @map auf computed column

Fuer MVP: Memory-Filter mit Warnung bei >500 Eintraegen

**Akzeptanzkriterien fuer Task 3:**
- [ ] findAll() mit Pagination implementiert
- [ ] Filter nach createdById funktioniert
- [ ] Filter nach Status funktioniert (Memory-Filter)
- [ ] Sortierung nach createdAt, expiresAt, useCount
- [ ] Default: createdAt DESC, page=1, pageSize=20
- [ ] Max pageSize=100 enforced
- [ ] Integration Test mit Testdaten

---

### Task 4: Application Layer - Query Handler

**Dateien:**
- `packages/backend/src/application/admin/queries/list-invites.query.ts` (NEU)
- `packages/backend/src/application/admin/queries/list-invites.handler.ts` (NEU)
- `packages/backend/src/application/admin/dto/invite-code-list.dto.ts` (NEU)
- `packages/backend/src/application/admin/dto/invite-code-list-item.dto.ts` (NEU)

**4.1 ListInvitesQuery:**
```typescript
export class ListInvitesQuery {
  constructor(
    public readonly filters: {
      status?: InviteCodeStatus;
      createdById?: string;
    },
    public readonly sort: {
      field: 'createdAt' | 'expiresAt' | 'useCount';
      direction: 'asc' | 'desc';
    },
    public readonly pagination: {
      page: number;
      pageSize: number;
    },
    public readonly requestedById: string,
  ) {}

  static create(props: ListInvitesQueryProps): Result<ListInvitesQuery> {
    // Validierung: Sort-Feld erlaubt?
    const allowedSortFields = ['createdAt', 'expiresAt', 'useCount'];
    if (props.sort?.field && !allowedSortFields.includes(props.sort.field)) {
      return Result.fail(`Ungueltiges Sortierfeld: ${props.sort.field}`);
    }

    // Validierung: Status erlaubt?
    if (props.filters?.status && !Object.values(InviteCodeStatus).includes(props.filters.status)) {
      return Result.fail(`Ungueltiger Status: ${props.filters.status}`);
    }

    return Result.ok(new ListInvitesQuery(...));
  }
}
```

**4.2 ListInvitesHandler:**
```typescript
@Injectable()
export class ListInvitesHandler {
  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.INVITE_CODE)
    private readonly repository: IInviteCodeRepository,
    @Inject(DI_TOKENS.PORTS.LOGGER)
    private readonly logger: ILoggerPort,
  ) {}

  async execute(query: ListInvitesQuery): Promise<Result<InviteCodeListDto>> {
    const result = await this.repository.findAll(
      query.filters,
      query.sort,
      query.pagination,
    );

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const paginated = result.value;

    // Audit Log
    this.logger.log(
      `Admin listed invite codes (count: ${paginated.items.length}, filters: ${JSON.stringify(query.filters)})`,
      'ListInvitesHandler',
    );

    // Map to DTO
    const items = paginated.items.map(invite => ({
      id: invite.id.value,
      code: invite.code.toMasked(), // IMMER maskiert!
      expiresAt: invite.expiresAt.toISOString(),
      maxUses: invite.maxUses,
      useCount: invite.usedCount,
      status: invite.computeStatus(),
      label: invite.label,
      createdAt: invite.createdAt.toISOString(),
      createdBy: {
        id: invite.createdById,
        email: '...', // Aus Repository laden oder JOIN
      },
      revokedAt: invite.revokedAt?.toISOString() ?? null,
    }));

    return Result.ok({
      data: items,
      meta: {
        total: paginated.total,
        page: paginated.page,
        pageSize: paginated.pageSize,
        totalPages: paginated.totalPages,
      },
    });
  }
}
```

**4.3 DTOs:**
```typescript
// invite-code-list-item.dto.ts
export class InviteCodeListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Maskierter Code (z.B. A1B2****)' })
  code: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty()
  maxUses: number;

  @ApiProperty()
  useCount: number;

  @ApiProperty({ enum: InviteCodeStatus })
  status: InviteCodeStatus;

  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: () => InviteCodeCreatorDto })
  createdBy: InviteCodeCreatorDto;

  @ApiProperty({ required: false })
  revokedAt?: string;
}

// invite-code-list.dto.ts
export class InviteCodeListDto {
  @ApiProperty({ type: [InviteCodeListItemDto] })
  data: InviteCodeListItemDto[];

  @ApiProperty()
  meta: PaginationMetaDto;
}
```

**Akzeptanzkriterien fuer Task 4:**
- [ ] ListInvitesQuery mit Validierung
- [ ] ListInvitesHandler ruft Repository auf
- [ ] Code IMMER maskiert in Response
- [ ] Status als computed field in DTO
- [ ] Audit-Log bei erfolgreicher Abfrage
- [ ] DTOs mit OpenAPI-Decorators
- [ ] Unit Tests fuer Handler

---

### Task 5: Application Layer - Command Handler (Revoke)

**Dateien:**
- `packages/backend/src/application/admin/commands/revoke-invite.command.ts` (NEU)
- `packages/backend/src/application/admin/commands/revoke-invite.handler.ts` (NEU)
- `packages/backend/src/application/admin/dto/revoke-invite-response.dto.ts` (NEU)

**5.1 RevokeInviteCommand:**
```typescript
export class RevokeInviteCommand {
  constructor(
    public readonly inviteCodeId: string,
    public readonly revokedById: string,
  ) {}

  static create(props: { inviteCodeId: string; revokedById: string }): Result<RevokeInviteCommand> {
    if (!props.inviteCodeId) {
      return Result.fail('Invite-Code-ID erforderlich');
    }
    return Result.ok(new RevokeInviteCommand(props.inviteCodeId, props.revokedById));
  }
}
```

**5.2 RevokeInviteHandler:**
```typescript
@Injectable()
export class RevokeInviteHandler extends TransactionalCommandHandler<
  RevokeInviteCommand,
  RevokeInviteResponseDto
> {
  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.INVITE_CODE)
    private readonly repository: IInviteCodeRepository,
    @Inject(DI_TOKENS.PORTS.LOGGER)
    private readonly logger: ILoggerPort,
    prismaService: PrismaService,
    outboxRepository: IOutboxRepository,
  ) {
    super(prismaService, outboxRepository);
  }

  protected async executeInTransaction(
    command: RevokeInviteCommand,
    tx: TransactionContext,
  ): Promise<{ result: RevokeInviteResponseDto; events: DomainEvent[] }> {
    // 1. Invite-Code laden
    const inviteCodeId = InviteCodeId.create(command.inviteCodeId);
    if (inviteCodeId.isFailure) {
      throw new NotFoundException(InviteErrorCodes.CODE_NOT_FOUND);
    }

    const findResult = await this.repository.findById(inviteCodeId.value, tx);
    if (findResult.isFailure || !findResult.value) {
      throw new NotFoundException(InviteErrorCodes.CODE_NOT_FOUND);
    }

    const inviteCode = findResult.value;

    // 2. Revoke ausfuehren (idempotent)
    const revokeResult = inviteCode.revoke(command.revokedById);
    if (revokeResult.isFailure) {
      throw new BadRequestException(revokeResult.error);
    }

    // 3. Speichern
    await this.repository.save(inviteCode, tx);

    // 4. Audit Log
    this.logger.log(
      `Invite code revoked (id: ${inviteCode.id.value}, code: ${inviteCode.code.toMasked()}, by: ${command.revokedById})`,
      'RevokeInviteHandler',
    );

    // 5. Events sammeln
    const events = inviteCode.getDomainEvents();
    inviteCode.clearDomainEvents();

    return {
      result: {
        id: inviteCode.id.value,
        code: inviteCode.code.toMasked(),
        status: inviteCode.computeStatus(),
        revokedAt: inviteCode.revokedAt?.toISOString() ?? null,
      },
      events,
    };
  }
}
```

**5.3 RevokeInviteResponseDto:**
```typescript
export class RevokeInviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Maskierter Code' })
  code: string;

  @ApiProperty({ enum: InviteCodeStatus })
  status: InviteCodeStatus;

  @ApiProperty({ required: false })
  revokedAt?: string;
}
```

**Akzeptanzkriterien fuer Task 5:**
- [ ] RevokeInviteCommand mit Validierung
- [ ] RevokeInviteHandler extends TransactionalCommandHandler
- [ ] Idempotentes Verhalten (revoked bleibt revoked)
- [ ] Used Codes werden NICHT zu revoked
- [ ] 404 bei nicht gefundenem Code
- [ ] Domain Event wird emittiert
- [ ] Audit-Log bei Widerruf
- [ ] Unit Tests (normal, already revoked, used, not found)

---

### Task 6: Module Layer - Controller erweitern

**Datei:** `packages/backend/src/modules/admin/controllers/admin-invite.controller.ts`

**6.1 GET Endpoint:**
```typescript
@Get()
@HttpCode(HttpStatus.OK)
@UseGuards(AdminJwtAuthGuard)
@ApiOperation({ summary: 'Liste aller Invite-Codes abrufen' })
@ApiWrappedResponse(InviteCodeListItemDto, {
  isArray: true,
  description: 'Paginierte Liste der Invite-Codes'
})
@ApiQuery({ name: 'status', required: false, enum: InviteCodeStatus })
@ApiQuery({ name: 'createdBy', required: false, type: String })
@ApiQuery({ name: 'sort', required: false, type: String, example: 'expiresAt:asc' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'pageSize', required: false, type: Number })
async listInvites(
  @Query('status') status?: InviteCodeStatus,
  @Query('createdBy') createdById?: string,
  @Query('sort') sortParam?: string,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  @CurrentUser() user?: ValidatedUser,
): Promise<InviteCodeListDto> {
  // Sort parsen
  let sort: { field: string; direction: 'asc' | 'desc' } | undefined;
  if (sortParam) {
    const [field, direction] = sortParam.split(':');
    sort = { field, direction: (direction as 'asc' | 'desc') || 'desc' };
  }

  const queryResult = ListInvitesQuery.create({
    filters: { status, createdById },
    sort,
    pagination: { page, pageSize },
    requestedById: user.userId,
  });

  if (queryResult.isFailure) {
    throw new BadRequestException(queryResult.error);
  }

  const result = await this.listInvitesHandler.execute(queryResult.value);

  if (result.isFailure) {
    throw new InternalServerErrorException(result.error);
  }

  return result.value;
}
```

**6.2 DELETE Endpoint:**
```typescript
@Delete(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AdminJwtAuthGuard)
@ApiOperation({ summary: 'Invite-Code widerrufen' })
@ApiParam({ name: 'id', description: 'Invite-Code ID' })
@ApiWrappedResponse(RevokeInviteResponseDto, { description: 'Widerrufener Invite-Code' })
@ApiNotFoundResponse({ description: 'Invite-Code nicht gefunden' })
async revokeInvite(
  @Param('id') id: string,
  @CurrentUser() user: ValidatedUser,
): Promise<WrappedResponse<RevokeInviteResponseDto>> {
  const commandResult = RevokeInviteCommand.create({
    inviteCodeId: id,
    revokedById: user.userId,
  });

  if (commandResult.isFailure) {
    throw new BadRequestException(commandResult.error);
  }

  const result = await this.revokeInviteHandler.execute(commandResult.value);

  return { data: result };
}
```

**Akzeptanzkriterien fuer Task 6:**
- [ ] GET /admin/invites mit Query-Parametern
- [ ] DELETE /admin/invites/:id mit Path-Parameter
- [ ] OpenAPI-Decorators vollstaendig (@ApiQuery, @ApiParam, etc.)
- [ ] AdminJwtAuthGuard auf beiden Endpoints
- [ ] Error Handling mit korrekten HTTP-Codes
- [ ] Integration Tests (E2E)

---

### Task 7: Tests

**7.1 Unit Tests:**

| Test-Datei | Beschreibung |
|------------|--------------|
| `invite-code.aggregate.spec.ts` | computeStatus(), revoke() |
| `list-invites.handler.spec.ts` | Query Handler mit Mocks |
| `revoke-invite.handler.spec.ts` | Command Handler mit Mocks |

**7.2 Integration Tests:**

| Test-Datei | Beschreibung |
|------------|--------------|
| `prisma-invite-code.repository.integration.spec.ts` | findAll() mit DB |
| `admin-invite.controller.e2e.spec.ts` | GET + DELETE Endpoints |

**Test-Szenarien:**

**computeStatus() Tests:**
```typescript
describe('computeStatus', () => {
  it('should return REVOKED if isRevoked is true', () => {});
  it('should return EXPIRED if expiresAt is in the past', () => {});
  it('should return USED if useCount >= maxUses', () => {});
  it('should return ACTIVE if none of the above', () => {});
  it('should prioritize REVOKED over EXPIRED', () => {});
  it('should prioritize EXPIRED over USED', () => {});
});
```

**revoke() Tests:**
```typescript
describe('revoke', () => {
  it('should set isRevoked and revokedAt', () => {});
  it('should emit InviteCodeRevokedEvent', () => {});
  it('should be idempotent when already revoked', () => {});
  it('should NOT revoke used codes (status stays USED)', () => {});
});
```

**ListInvitesHandler Tests:**
```typescript
describe('ListInvitesHandler', () => {
  it('should return paginated list', () => {});
  it('should filter by status', () => {});
  it('should filter by createdById', () => {});
  it('should sort by createdAt desc by default', () => {});
  it('should mask all codes in response', () => {});
  it('should log audit trail', () => {});
});
```

**RevokeInviteHandler Tests:**
```typescript
describe('RevokeInviteHandler', () => {
  it('should revoke active invite code', () => {});
  it('should return 404 for non-existent code', () => {});
  it('should be idempotent for already revoked', () => {});
  it('should not change status of used codes', () => {});
  it('should emit domain event', () => {});
  it('should log audit trail', () => {});
});
```

**E2E Tests:**
```typescript
describe('AdminInviteController (e2e)', () => {
  describe('GET /admin/invites', () => {
    it('should return 401 without auth', () => {});
    it('should return 403 for non-admin', () => {});
    it('should return paginated list for admin', () => {});
    it('should filter by status', () => {});
    it('should return 400 for invalid status', () => {});
  });

  describe('DELETE /admin/invites/:id', () => {
    it('should return 401 without auth', () => {});
    it('should return 404 for non-existent id', () => {});
    it('should revoke and return 200', () => {});
    it('should be idempotent', () => {});
  });
});
```

**Akzeptanzkriterien fuer Task 7:**
- [ ] 100% Coverage fuer computeStatus()
- [ ] 100% Coverage fuer revoke()
- [ ] Unit Tests fuer beide Handler
- [ ] Integration Test fuer Repository
- [ ] E2E Tests fuer Controller
- [ ] Alle Tests gruen

---

## Dev Notes

### Offene Entscheidungen

1. **Status-Filter Performance:**
   - Aktuell: Memory-Filter nach DB-Query
   - Bei >500 Invite-Codes: Warning loggen
   - Alternative: Prisma computed field oder DB View

2. **createdBy in Response:**
   - Nur ID und Email zurueckgeben (Datenschutz)
   - Requires: JOIN in Repository oder separater Query

### Bekannte Einschraenkungen

- Pagination bei Status-Filter nicht 100% akkurat (Memory-Filter)
- Keine Batch-Revoke (einzeln pro Request)

---

## Definition of Done

- [ ] Alle Tasks implementiert
- [ ] Alle Unit Tests gruen
- [ ] Alle Integration Tests gruen
- [ ] Alle E2E Tests gruen
- [ ] Code Review bestanden
- [ ] API-Client generiert (`pnpm run generate-api`)
- [ ] Swagger-Dokumentation aktualisiert
- [ ] Keine Biome Lint-Fehler
- [ ] Architecture Check passed
- [ ] sprint-status.yaml aktualisiert auf `done`

---

## Referenzen

- Story 1.6: Invite-Code erstellen (Implementierungs-Pattern)
- Epic 1: Secure Server Foundation & Invite-System
- PRD: FR18, FR19, NFR-S8
- CLAUDE.md: AC7 (@ApiWrappedResponse)
