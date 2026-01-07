# Story 1.6: Invite-Code erstellen

## Story

- **ID**: 1.6
- **Epic**: Epic 1 - Secure Server Foundation & Invite-System
- **Story Key**: 1-6-invite-code-erstellen
- **Title**: Invite-Code erstellen
- **Status**: review
- **Story Points**: 5
- **Depends On**: Story 1.1 (done), Story 1.3 (done)

## User Story

**Als** Server-Administrator
**moechte ich** Invite-Codes mit Ablaufdatum erstellen koennen
**damit** ich Einsatzkraeften einen sicheren Onboarding-Link bereitstellen kann

## Acceptance Criteria

### AC1: Prisma Model fuer InviteCode

**Given** das Backend-Projekt
**When** die Migration ausgefuehrt wird
**Then** existiert eine InviteCode-Tabelle mit den Feldern:
- `id` (cuid, Primary Key)
- `code` (String, unique, indexed) - 8 alphanumerische Zeichen
- `expiresAt` (DateTime)
- `maxUses` (Int, default: 1)
- `useCount` (Int, default: 0)
- `isRevoked` (Boolean, default: false)
- `revokedAt` (DateTime, optional)
- `label` (String, optional) - Optionale Beschreibung
- `createdAt` (DateTime, default: now())
- `createdById` (String, FK zu User)
**And** die ServerAccessToken-Tabelle wird um `inviteCodeId` (String, optional, unique, FK zu InviteCode) erweitert
**And** bidirektionale Relation existiert: InviteCode.redeemedToken <-> ServerAccessToken.createdByInvite

**Technische Implementierung:**
- [ ] Migration `add_invite_code_model` erstellen
- [ ] Index auf `code` und `expiresAt`
- [ ] ServerAccessToken.inviteCodeId Relation hinzufuegen

### AC2: InviteCode Domain Entity

**Given** die Domain-Schicht
**When** ein InviteCode erstellt wird
**Then** validiert die Entity:
- `expiresAt` muss in der Zukunft liegen (min. 1 Minute)
- `maxUses` muss >= 1 und <= 100 sein
- `code` wird automatisch generiert (8 alphanumerische Zeichen, uppercase)
- `label` optional, max 100 Zeichen
**And** emittiert `InviteCodeCreatedEvent`
**And** Result<T> Pattern fuer Validierungsfehler

**Technische Implementierung:**
- [ ] InviteCode Aggregate in `domain/aggregates/invite-code.aggregate.ts`
- [ ] InviteCodeId Value Object in `domain/value-objects/invite-code-id.ts`
- [ ] InviteCodeValue Value Object in `domain/value-objects/invite-code-value.ts`
- [ ] InviteCodeCreatedEvent in `domain/events/invite-code-created.event.ts`
- [ ] Validierung im Domain Layer (keine NestJS Decorators)

### AC3: CreateInviteHandler

**Given** ein Admin-User (Role: ADMIN oder SUPER_ADMIN)
**When** POST `/admin/invites` mit Body `{ expiresAt: "...", maxUses: 1, label?: "..." }` aufgerufen wird
**Then** wird ein InviteCode erstellt
**And** die Response enthaelt:

```json
{
  "data": {
    "id": "clxyz...",
    "code": "A1B2C3D4",
    "expiresAt": "2026-01-08T18:00:00Z",
    "maxUses": 1,
    "useCount": 0,
    "label": "Einsatzkraefte Team Nord",
    "createdAt": "2026-01-07T12:00:00Z",
    "deepLink": "bluelight://connect?url=https://api.example.de&invite=A1B2C3D4&expires=2026-01-08T18:00:00Z",
    "webLink": "https://app.example.de?server=https://api.example.de&invite=A1B2C3D4"
  }
}
```

**And** der Code wird als einmalig angezeigt (wie Token) - Security Hint in Response optional
**And** ein `InviteCodeCreatedEvent` wird in die Outbox geschrieben
**And** Audit-Log: `"Invite code created (code: A1B2****, by: admin@example.de, expires: 2026-01-08)"`

**Technische Implementierung:**
- [ ] CreateInviteCommand in `application/admin/commands/create-invite.command.ts`
- [ ] CreateInviteHandler (extends TransactionalCommandHandler) in `application/admin/commands/create-invite.handler.ts`
- [ ] CreateInviteDto in `application/admin/dto/create-invite.dto.ts`
- [ ] CreateInviteResponseDto in `application/admin/dto/create-invite-response.dto.ts`
- [ ] ConfigService fuer BASE_URL und FRONTEND_URL

### AC4: Validierung und Fehlerbehandlung

**Given** ein Admin-User erstellt einen Invite-Code
**When** die Validierung fehlschlaegt
**Then** werden passende Fehler zurueckgegeben:

| Fehler | HTTP Status | Error Code |
|--------|-------------|------------|
| expiresAt in der Vergangenheit | 400 | INVITE_EXPIRY_PAST |
| maxUses < 1 oder > 100 | 400 | INVITE_MAX_USES_INVALID |
| Nicht authentifiziert | 401 | UNAUTHORIZED |
| Nicht Admin | 403 | FORBIDDEN |
| Rate-Limit ueberschritten | 429 | RATE_LIMIT_EXCEEDED |

**Technische Implementierung:**
- [ ] InviteErrorCode Enum in `application/admin/errors/invite-error.codes.ts`
- [ ] Validation im CreateInviteCommand (domain-level)
- [ ] DTO Validation mit class-validator (transport-level)

### AC5: Rate-Limiting

**Given** ein Admin-User
**When** mehr als 10 Invite-Codes pro Minute erstellt werden
**Then** wird 429 Too Many Requests zurueckgegeben
**And** die Response enthaelt `Retry-After` Header

**Technische Implementierung:**
- [ ] @Throttle({ default: { limit: 10, ttl: 60000 } }) auf Endpoint
- [ ] Nutzt existierende ADMIN_MUTATION_RATE_LIMIT oder Custom

## Technical Implementation Context

### Architecture Layer: Full Stack (Backend)

Diese Story betrifft alle Backend-Layer:
- **Domain**: InviteCode Aggregate, Events, Value Objects
- **Application**: CreateInviteHandler, DTOs, Command
- **Infrastructure**: Repository, Migration, DI-Tokens
- **Modules**: AdminInviteController Endpoint

### Hexagonal Architecture Layer Mapping

```
modules/admin/controllers/
  └── admin-invite.controller.ts     ← REST Controller (NestJS)

application/admin/
  ├── commands/
  │   ├── create-invite.command.ts
  │   └── create-invite.handler.ts   ← TransactionalCommandHandler
  └── dto/
      ├── create-invite.dto.ts       ← Request DTO
      └── create-invite-response.dto.ts ← Response DTO

domain/
  ├── aggregates/
  │   └── invite-code.aggregate.ts   ← AggregateRoot
  ├── value-objects/
  │   ├── invite-code-id.ts
  │   └── invite-code-value.ts
  ├── events/
  │   └── invite-code-created.event.ts
  └── repositories/
      └── i-invite-code.repository.ts ← Interface

infrastructure/
  ├── invite-code/
  │   ├── repositories/
  │   │   └── prisma-invite-code.repository.ts
  │   ├── mappers/
  │   │   └── prisma-invite-code.mapper.ts
  │   └── invite-code-infrastructure.module.ts
  └── di-tokens.ts                   ← DI_TOKENS.REPOSITORIES.INVITE_CODE
```

### InviteCode Aggregate Pattern

```typescript
import { AggregateRoot } from '../common/aggregate-root';
import { Result } from '../common/result';
import { InviteCodeId } from '../value-objects/invite-code-id';
import { InviteCodeValue } from '../value-objects/invite-code-value';
import { InviteCodeCreatedEvent } from '../events/invite-code-created.event';

interface InviteCodeProps {
  code: InviteCodeValue;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
  label?: string;
  isRevoked: boolean;
  revokedAt?: Date;
  createdById: string;
  createdAt: Date;
}

/**
 * Invite-Code Aggregate fuer sicheres Onboarding von Clients.
 *
 * Codes sind einmalig verwendbar und haben ein Ablaufdatum.
 * Nach Einloesung wird ein ServerAccessToken erstellt.
 */
export class InviteCode extends AggregateRoot<InviteCodeId, InviteCodeProps> {
  private constructor(id: InviteCodeId, props: InviteCodeProps) {
    super(id, props);
  }

  public static create(props: {
    expiresAt: Date;
    maxUses?: number;
    label?: string;
    createdById: string;
  }): Result<InviteCode> {
    // Validierung
    const now = new Date();
    if (props.expiresAt <= now) {
      return Result.fail('INVITE_EXPIRY_PAST');
    }

    const maxUses = props.maxUses ?? 1;
    if (maxUses < 1 || maxUses > 100) {
      return Result.fail('INVITE_MAX_USES_INVALID');
    }

    if (props.label && props.label.length > 100) {
      return Result.fail('INVITE_LABEL_TOO_LONG');
    }

    // Code generieren
    const codeResult = InviteCodeValue.generate();
    if (codeResult.isFailure) {
      return Result.fail(codeResult.error);
    }

    const id = InviteCodeId.create();
    const invite = new InviteCode(id, {
      code: codeResult.value!,
      expiresAt: props.expiresAt,
      maxUses,
      useCount: 0,
      label: props.label,
      isRevoked: false,
      createdById: props.createdById,
      createdAt: now,
    });

    // Domain Event
    invite.addDomainEvent(
      new InviteCodeCreatedEvent(
        id.value,
        codeResult.value!.value,
        props.expiresAt,
        maxUses,
        props.createdById,
      )
    );

    return Result.ok(invite);
  }

  // ... Getter und weitere Methoden
}
```

### InviteCodeValue Value Object

```typescript
import { Result } from '../common/result';

/**
 * Value Object fuer den 8-stelligen alphanumerischen Invite-Code.
 *
 * Format: 8 Zeichen, uppercase alphanumerisch (A-Z, 0-9)
 * Beispiel: "A1B2C3D4"
 */
export class InviteCodeValue {
  private static readonly CODE_LENGTH = 8;
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  private constructor(public readonly value: string) {}

  public static generate(): Result<InviteCodeValue> {
    const code = Array.from(
      { length: InviteCodeValue.CODE_LENGTH },
      () => InviteCodeValue.ALPHABET[
        Math.floor(Math.random() * InviteCodeValue.ALPHABET.length)
      ]
    ).join('');

    return Result.ok(new InviteCodeValue(code));
  }

  public static fromString(code: string): Result<InviteCodeValue> {
    if (!code || code.length !== InviteCodeValue.CODE_LENGTH) {
      return Result.fail('INVITE_CODE_INVALID_LENGTH');
    }

    const normalized = code.toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      return Result.fail('INVITE_CODE_INVALID_FORMAT');
    }

    return Result.ok(new InviteCodeValue(normalized));
  }

  public equals(other: InviteCodeValue): boolean {
    return this.value === other.value;
  }

  /** Maskierte Version fuer Logs (zeigt nur erste 4 Zeichen) */
  public toMasked(): string {
    return `${this.value.substring(0, 4)}****`;
  }
}
```

### CreateInviteHandler Pattern

```typescript
@Injectable()
export class CreateInviteHandler extends TransactionalCommandHandler<
  CreateInviteCommand,
  CreateInviteResponseDto
> {
  constructor(
    prisma: PrismaService,
    outboxRepository: IOutboxRepository,
    @Inject(DI_TOKENS.REPOSITORIES.INVITE_CODE)
    private readonly inviteRepo: IInviteCodeRepository,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateInviteCommand,
    tx: TransactionContext
  ): Promise<{ result: CreateInviteResponseDto; events: DomainEvent[] }> {
    // 1. InviteCode Aggregate erstellen
    const inviteResult = InviteCode.create({
      expiresAt: command.expiresAt,
      maxUses: command.maxUses,
      label: command.label,
      createdById: command.createdById,
    });

    if (inviteResult.isFailure) {
      throw new InviteValidationException(inviteResult.error);
    }

    const invite = inviteResult.value!;

    // 2. Speichern
    await this.inviteRepo.save(invite, tx);

    // 3. Links generieren
    const baseUrl = this.configService.get<string>('BASE_URL');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const code = invite.code.value;
    const expiresIso = invite.expiresAt.toISOString();

    const deepLink = `bluelight://connect?url=${encodeURIComponent(baseUrl!)}&invite=${code}&expires=${encodeURIComponent(expiresIso)}`;
    const webLink = `${frontendUrl}?server=${encodeURIComponent(baseUrl!)}&invite=${code}`;

    // 4. Audit-Log
    const maskedCode = invite.code.toMasked();
    this.logger.log(
      `Invite code created (code: ${maskedCode}, by: ${command.createdById}, expires: ${invite.expiresAt.toISOString().split('T')[0]})`
    );

    // 5. Events sammeln
    const events = invite.getDomainEvents();
    invite.clearDomainEvents();

    return {
      result: {
        id: invite.id.value,
        code,
        expiresAt: expiresIso,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        label: invite.label,
        createdAt: invite.createdAt.toISOString(),
        deepLink,
        webLink,
      },
      events,
    };
  }
}
```

### Controller Pattern

```typescript
@Controller('admin/invites')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminInviteController {
  constructor(private readonly createHandler: CreateInviteHandler) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create new invite code' })
  @ApiWrappedCreatedResponse(CreateInviteResponseDto, {
    description: 'Invite code created successfully'
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async createInvite(
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: UserPayload
  ): Promise<WrappedResponse<CreateInviteResponseDto>> {
    const command = CreateInviteCommand.create({
      ...dto,
      createdById: user.id,
    });

    if (command.isFailure) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: command.error,
      });
    }

    const result = await this.createHandler.execute(command.value!);

    if (result.isFailure) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
        code: result.error,
      });
    }

    return { data: result.value };
  }
}
```

### Request/Response DTOs

```typescript
// create-invite.dto.ts
export class CreateInviteDto {
  @ApiProperty({
    description: 'Ablaufdatum des Invite-Codes',
    example: '2026-01-08T18:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Ablaufdatum ist erforderlich' })
  expiresAt: string;

  @ApiProperty({
    description: 'Maximale Anzahl Einloesungen',
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;

  @ApiProperty({
    description: 'Optionale Beschreibung/Label',
    example: 'Einsatzkraefte Team Nord',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

// create-invite-response.dto.ts
export class CreateInviteResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'A1B2C3D4' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '2026-01-08T18:00:00Z' })
  @IsString()
  @IsNotEmpty()
  expiresAt: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  maxUses: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  useCount: number;

  @ApiProperty({ example: 'Einsatzkraefte Team Nord', nullable: true })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @ApiProperty({ example: 'bluelight://connect?url=...' })
  @IsString()
  @IsNotEmpty()
  deepLink: string;

  @ApiProperty({ example: 'https://app.example.de?server=...' })
  @IsString()
  @IsNotEmpty()
  webLink: string;
}
```

### Repository Interface

```typescript
// i-invite-code.repository.ts
export interface IInviteCodeRepository {
  save(invite: InviteCode, tx?: TransactionContext): Promise<void>;
  findById(id: InviteCodeId, tx?: TransactionContext): Promise<InviteCode | null>;
  findByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<InviteCode | null>;
}
```

### DI Token Erweiterung

```typescript
// di-tokens.ts
export const DI_TOKENS = {
  REPOSITORIES: {
    // ... existing
    SERVER_ACCESS_TOKEN: Symbol('IServerAccessTokenRepository'),
    INVITE_CODE: Symbol('IInviteCodeRepository'), // NEU
  },
  // ...
} as const;
```

### Prisma Schema Erweiterung

```prisma
// NEU: InviteCode Model
model InviteCode {
  id          String    @id @default(cuid())
  code        String    @unique @db.VarChar(8)
  expiresAt   DateTime
  maxUses     Int       @default(1)
  useCount    Int       @default(0)
  isRevoked   Boolean   @default(false)
  revokedAt   DateTime?
  label       String?   @db.VarChar(100)
  createdAt   DateTime  @default(now())
  createdById String    @db.VarChar(100)

  // Relations
  createdBy     User              @relation(fields: [createdById], references: [id], onDelete: Restrict)
  redeemedToken ServerAccessToken?

  // Indexes
  @@index([code], map: "idx_invite_code")
  @@index([expiresAt], map: "idx_invite_expires")
  @@index([createdById], map: "idx_invite_created_by")
  @@map("invite_codes")
}

// MODIFY: ServerAccessToken - Relation hinzufuegen
model ServerAccessToken {
  // ... existing fields ...

  // NEU: Relation zu InviteCode
  inviteCodeId     String?    @unique
  createdByInvite  InviteCode? @relation(fields: [inviteCodeId], references: [id])
}
```

## Tasks / Subtasks

### Task 1: Prisma Migration

- [ ] 1.1 InviteCode Model in `schema.prisma` hinzufuegen
- [ ] 1.2 ServerAccessToken.inviteCodeId Relation hinzufuegen
- [ ] 1.3 Migration generieren: `pnpm --filter @bluelight-hub/backend exec prisma migrate dev --name add_invite_code`
- [ ] 1.4 User Model: InviteCode Relation hinzufuegen

### Task 2: Domain Layer

- [ ] 2.1 InviteCodeId Value Object erstellen (`domain/value-objects/invite-code-id.ts`)
- [ ] 2.2 InviteCodeValue Value Object erstellen (`domain/value-objects/invite-code-value.ts`)
- [ ] 2.3 InviteCode Aggregate erstellen (`domain/aggregates/invite-code.aggregate.ts`)
- [ ] 2.4 InviteCodeCreatedEvent erstellen (`domain/events/invite-code-created.event.ts`)
- [ ] 2.5 EVENT_NAMES erweitern (`domain/events/event-names.ts`)
- [ ] 2.6 IInviteCodeRepository Interface erstellen (`domain/repositories/i-invite-code.repository.ts`)

### Task 3: Infrastructure Layer

- [ ] 3.1 PrismaInviteCodeMapper erstellen (`infrastructure/invite-code/mappers/`)
- [ ] 3.2 PrismaInviteCodeRepository erstellen (`infrastructure/invite-code/repositories/`)
- [ ] 3.3 InviteCodeInfrastructureModule erstellen
- [ ] 3.4 DI_TOKENS.REPOSITORIES.INVITE_CODE hinzufuegen
- [ ] 3.5 Export in `infrastructure/index.ts`

### Task 4: Application Layer

- [ ] 4.1 CreateInviteCommand erstellen (`application/admin/commands/create-invite.command.ts`)
- [ ] 4.2 CreateInviteHandler erstellen (`application/admin/commands/create-invite.handler.ts`)
- [ ] 4.3 CreateInviteDto erstellen (`application/admin/dto/create-invite.dto.ts`)
- [ ] 4.4 CreateInviteResponseDto erstellen (`application/admin/dto/create-invite-response.dto.ts`)
- [ ] 4.5 InviteErrorCodes erstellen (`application/admin/errors/invite-error.codes.ts`)
- [ ] 4.6 JSDoc Dokumentation (deutsch)

### Task 5: Module Layer

- [ ] 5.1 AdminInviteController erstellen (`modules/admin/controllers/admin-invite.controller.ts`)
- [ ] 5.2 AdminModule erweitern (Import InviteCodeInfrastructureModule)
- [ ] 5.3 AdminModule: Handler + Controller registrieren
- [ ] 5.4 Swagger Decorators (@ApiTags, @ApiOperation, @ApiWrappedCreatedResponse)

### Task 6: Environment Config

- [ ] 6.1 BASE_URL in `.env.example` dokumentieren (falls nicht vorhanden)
- [ ] 6.2 FRONTEND_URL in `.env.example` dokumentieren (falls nicht vorhanden)
- [ ] 6.3 ConfigService Zugriff in Handler implementieren

### Task 7: Unit Tests

- [ ] 7.1 InviteCodeValue.spec.ts (generate, fromString, equals, toMasked)
- [ ] 7.2 InviteCode.aggregate.spec.ts (create, validation, events)
- [ ] 7.3 CreateInviteCommand.spec.ts (validation)
- [ ] 7.4 CreateInviteHandler.spec.ts
  - Erfolgreicher Create
  - Validation Fehler (expiresAt, maxUses)
  - Link-Generierung korrekt
  - Domain Event emittiert
  - Audit-Log geschrieben (ohne vollen Code)
- [ ] 7.5 AdminInviteController.spec.ts
  - POST /admin/invites erfolgreich
  - Validation Fehler → 400
  - Nicht authentifiziert → 401
  - Rate-Limit → 429

### Task 8: Validierung

- [ ] 8.1 Lint Check: `pnpm --filter @bluelight-hub/backend lint:check`
- [ ] 8.2 TypeScript Compilation Check: `pnpm --filter @bluelight-hub/backend exec tsc --noEmit`
- [ ] 8.3 Architecture Check: `pnpm --filter @bluelight-hub/backend check:arch`
- [ ] 8.4 Alle Tests bestehen

## Dev Notes

### Code Review Checklist (CLAUDE.md)

- [ ] AC1: DI Import Check (import, NICHT import type fuer Injectable Classes)
- [ ] AC2: DI Token Constants (DI_TOKENS.REPOSITORIES.INVITE_CODE)
- [ ] AC3: Framework-Agnostizitaet (Domain Layer ohne NestJS Decorators)
- [ ] AC4: Result Pattern (Result<T> statt Exceptions im Domain Layer)
- [ ] AC5: Outbox Integration (TransactionalCommandHandler, atomare Events)
- [ ] AC6: Test Pattern (AAA mit Given-When-Then)
- [ ] AC7: Controller Response Decorator (@ApiWrappedCreatedResponse)

### Existierende Patterns nutzen

**Aus Story 1.1 (ServerAccessToken):**
- AggregateRoot Pattern
- EntityId Value Object Pattern
- Domain Event Pattern

**Aus Story 1.3 (Admin-Setup):**
- TransactionalCommandHandler Pattern
- AdminModule Registration
- Response DTO mit class-validator

### Security Considerations

- Invite-Code nur 4 Zeichen in Logs maskieren
- Code ist 8 Zeichen (36^8 = ~2.8 Billionen Kombinationen)
- Rate-Limiting: 10 Creates/Minute pro Admin
- Codes sind zeitlich limitiert (expiresAt)
- Nach Exchange: Code "verbraucht" (Story 1.7+)

### Link-Generierung Konfiguration

```typescript
// .env
BASE_URL=https://api.bluelight-hub.de
FRONTEND_URL=https://app.bluelight-hub.de

// Deep Link Format
bluelight://connect?url={BASE_URL}&invite={CODE}&expires={EXPIRES_ISO}

// Web Link Format
{FRONTEND_URL}?server={BASE_URL}&invite={CODE}
```

### NFR Compliance

| NFR | Anforderung | Implementierung |
|-----|-------------|-----------------|
| **NFR-S3** | Rate-Limit 5/min/IP | @Throttle (10/min fuer Admin Mutation) |
| **NFR-S5** | Invite-Code Entropie >= 128 Bit | 8 alphanumerische Zeichen (36^8 > 2^41) |
| **NFR-S8** | Audit-Trail | Logger mit maskiertem Code |

### Dependencies

| Abhaengigkeit | Story | Status |
|---------------|-------|--------|
| ServerAccessToken Entity | 1.1 | done |
| ServerAccessGuard | 1.1a | done |
| Admin-Setup Handler Pattern | 1.3 | done |
| AdminModule | 1.3 | done |
| AdminJwtAuthGuard | 1.3 | done |

### Folgestories

- **Story 1.7**: Invite-Code verwalten (Liste, Widerruf)
- **Story 2.x**: Exchange-Invite (Code → ServerAccessToken)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invite-System]
- [Source: CLAUDE.md#Code Review Checklist]
- [Source: stories/story-1.1-server-access-token-entity-repository.md]
- [Source: stories/story-1.3-admin-setup-mit-token-erstellung.md]

---

## Definition of Done

- [ ] AC1-AC5 implementiert und getestet
- [ ] Prisma Migration erfolgreich
- [ ] Unit Tests geschrieben und bestanden
- [ ] Lint Check passed (keine neuen Fehler)
- [ ] TypeScript Compilation passed
- [ ] Architecture Check passed (keine zirkulaeren Abhaengigkeiten)
- [ ] Code Review approved
- [ ] JSDoc fuer Handler und Controller (deutsch)
- [ ] OpenAPI Dokumentation vollstaendig

---

## Dev Agent Record

### Agent Model Used

(Wird bei Implementierung ausgefuellt)

### Implementation Notes

(Wird bei Implementierung ausgefuellt)

### File List

| File | Action | Description |
|------|--------|-------------|
| `packages/backend/prisma/schema.prisma` | MODIFY | InviteCode Model, ServerAccessToken.inviteCodeId |
| `packages/backend/src/domain/value-objects/invite-code-id.ts` | CREATE | ID Value Object |
| `packages/backend/src/domain/value-objects/invite-code-value.ts` | CREATE | Code Value Object (8 chars) |
| `packages/backend/src/domain/aggregates/invite-code.aggregate.ts` | CREATE | InviteCode Aggregate |
| `packages/backend/src/domain/events/invite-code-created.event.ts` | CREATE | Domain Event |
| `packages/backend/src/domain/events/event-names.ts` | MODIFY | INVITE_CODE_CREATED hinzufuegen |
| `packages/backend/src/domain/repositories/i-invite-code.repository.ts` | CREATE | Repository Interface |
| `packages/backend/src/infrastructure/invite-code/mappers/prisma-invite-code.mapper.ts` | CREATE | Prisma ↔ Domain Mapper |
| `packages/backend/src/infrastructure/invite-code/repositories/prisma-invite-code.repository.ts` | CREATE | Repository Implementation |
| `packages/backend/src/infrastructure/invite-code/invite-code-infrastructure.module.ts` | CREATE | NestJS Module |
| `packages/backend/src/infrastructure/di-tokens.ts` | MODIFY | INVITE_CODE Token |
| `packages/backend/src/application/admin/commands/create-invite.command.ts` | CREATE | Command Object |
| `packages/backend/src/application/admin/commands/create-invite.handler.ts` | CREATE | Handler |
| `packages/backend/src/application/admin/dto/create-invite.dto.ts` | CREATE | Request DTO |
| `packages/backend/src/application/admin/dto/create-invite-response.dto.ts` | CREATE | Response DTO |
| `packages/backend/src/modules/admin/controllers/admin-invite.controller.ts` | CREATE | REST Controller |
| `packages/backend/src/modules/admin/admin.module.ts` | MODIFY | Imports + Providers |

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-07 | SM (Bob) | Story erstellt mit 4 parallelen Subagent-Analysen (YOLO-Modus) |
