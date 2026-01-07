---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: complete
completedAt: '2026-01-06'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/project-documentation/00-index.md'
  - 'docs/project-documentation/01-projektueberblick.md'
  - 'docs/project-documentation/02-backend-architektur.md'
  - 'docs/project-documentation/03-frontend-architektur.md'
  - 'docs/project-documentation/04-api-referenz.md'
  - 'docs/project-documentation/05-entwicklungshandbuch.md'
workflowType: 'architecture'
project_name: 'bluelight-hub'
user_name: 'Rubeen'
date: '2026-01-06'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (40 FRs):**
Das Multi-Server-Feature umfasst Server-Konfiguration (FR1-FR8), Authentifizierung & Access Control (FR9-FR16), Invite-System & Onboarding (FR17-FR25), Admin-Verwaltung (FR26-FR31), Plattform-Integration (FR32-FR36), und Setup & Initialisierung (FR37-FR40).

Architektonisch bedeutend:
- **Client-seitige Server-Liste**: Keine Backend-Abhängigkeit für Server-Auswahl
- **Invite-Code-Exchange**: POST /auth/exchange-invite mit Rate-Limiting
- **Plattform-spezifisches Storage**: Tauri plugin-store vs. localStorage

**Non-Functional Requirements (25+ NFRs):**

| Kategorie | Key NFRs |
|-----------|----------|
| **Performance** | Token-Validierung <100ms, Server-Dropdown <50ms |
| **Security** | bcrypt cost ≥10, Rate-Limit 5/min/IP, Token-Prefix `blh_` |
| **Integration** | Deep Link Schema `bluelight://connect`, Tauri plugin-store v2.x |
| **Reliability** | Offline Server-Liste, Atomare Invite-Markierung |
| **Usability** | Server-Setup <2min, Server-Wechsel ≤3 Klicks |

**Scale & Complexity:**

- Primary domain: Full-Stack Desktop + Web + Mobile
- Complexity level: Medium-High
- Estimated new architectural components: 6-8 (Guards, Handlers, Repositories, Stores, Services)

### Technical Constraints & Dependencies

**Backend (NestJS 11):**
- Prisma 6.x für neue Modelle (ServerAccessToken, InviteCode)
- Neue Guards: ServerAccessGuard, SetupPendingGuard
- Erweiterung AuthController + neuer AdminInviteController
- bcrypt für Token-Hashing

**Frontend (React 19 + Tauri 2):**
- @tauri-apps/plugin-store für verschlüsseltes Storage
- @tauri-apps/plugin-deep-link für URL-Handling
- Neuer TanStack Store für Server-State
- Neue Feature-Struktur: `features/server/`

**Bestehende Patterns zu respektieren:**
- Hexagonal Architecture (Domain → Application → Infrastructure → Modules)
- Result<T> statt Exceptions
- TransactionalCommandHandler für atomare Events
- DI_TOKENS für Dependency Injection
- TanStack Query + generierter API-Client

### Cross-Cutting Concerns Identified

1. **Platform Abstraction Layer**
   - Storage-Adapter für Tauri vs. Browser
   - Deep-Link-Handling vs. URL-Parameter

2. **Extended Auth Pipeline**
   - Server-Access-Token Validation vor JWT
   - Setup-Pending-Mode Blocking
   - Rate-Limiting für Invite-Exchange

3. **Error Handling Strategy**
   - Invite-spezifische Fehler (expired, already-used, invalid)
   - Server-Connection-Fehler mit Retry-Logik
   - Browser Security Warning als Non-Blocking

4. **Security Measures**
   - Token-Hashing (bcrypt)
   - Invite-Code Einmaligkeit (atomare Markierung)
   - HTTPS-Enforcement (außer INSECURE_MODE)

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Desktop + Web Application (Brownfield Extension)

### Existing Technical Foundation

**This is a brownfield project.** The Multi-Server feature extends an established, production-ready codebase.

| Layer | Technology | Version |
|-------|------------|---------|
| Backend Framework | NestJS | 11.0.11 |
| Backend Language | TypeScript | 5.8.3 |
| ORM | Prisma | 6.8.2 |
| Database | PostgreSQL | 17 |
| Frontend Framework | React | 19.1.0 |
| Build Tool | Vite | 6.3.5 |
| Desktop Framework | Tauri | 2.5.1 |
| Routing | TanStack Router | 1.120.13 |
| State Management | TanStack Query + Store | 5.81.0 |
| Forms | TanStack Form + Zod | 1.12.3 |
| Styling | Tailwind CSS + Headless UI | 4.1.10 |
| Testing | Jest (Backend), Vitest (Frontend) | 30.0.0-beta.3 / 3.2.3 |
| Linting | Biome | 1.9.4 |

### Architectural Patterns Already Established

- **Hexagonal Architecture**: Domain → Application → Infrastructure → Modules
- **CQRS**: Separate Command/Query Handlers
- **DDD**: Aggregates, Entities, Value Objects, Domain Events
- **Result<T> Pattern**: Error handling without exceptions
- **Outbox Pattern**: Reliable event publication
- **Feature-based Modules**: Frontend organization
- **Atomic Design**: UI component hierarchy

### New Dependencies for Multi-Server Feature

| Dependency | Purpose | Layer |
|------------|---------|-------|
| @tauri-apps/plugin-deep-link | Deep Link URL handling | Frontend (Tauri) |
| @tauri-apps/plugin-store | Encrypted credential storage | Frontend (Tauri) |
| bcrypt | Token hashing | Backend |
| @nestjs/throttler | Rate limiting for invite exchange | Backend |

### Integration Strategy

No new starter template needed. Feature implementation follows existing patterns:
- New Domain entities (ServerAccessToken, InviteCode)
- New Application handlers (ExchangeInviteHandler, CreateInviteHandler)
- New Infrastructure repositories and guards
- New Module controllers
- New Frontend feature (`features/server/`)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- D3: Guard-Reihenfolge (ServerAccessGuard → JwtAuthGuard)
- D4: Setup-Pending-Mode (Global Guard mit Whitelist)
- D6: Platform Storage Abstraction (Adapter Pattern)

**Important Decisions (Shape Architecture):**
- D1: Token-Hashing (bcrypt cost 10)
- D2: Token-Format (blh_ + cuid2)
- D5: Rate-Limiting (@nestjs/throttler)
- D7: Server-State (TanStack Store + Persistence Adapter)
- D8: Deep-Link Handling (Service + Event)

**Deferred Decisions (Post-MVP):**
- Token rotation strategy
- Invite code cleanup job (expired codes)
- Multi-device token sync

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Token Hashing** | bcrypt cost 10 | Balance zwischen Security (~100ms) und Performance. NFR-S1 compliant. |
| **Token Format** | `blh_` + cuid2 | URL-safe, konsistent mit bestehender Codebase (`@paralleldrive/cuid2` bereits installiert). 28 Zeichen total. |
| **ID Generation** | cuid2 (existing) | Alle neuen Entities (ServerAccessToken, InviteCode) nutzen `@default(cuid())` wie bestehende Models. |

**Token Generation Pattern:**
```typescript
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';

const generateAccessToken = (): string => `blh_${createId()}`;
const hashToken = (token: string): Promise<string> => bcrypt.hash(token, 10);
```

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Guard-Reihenfolge** | ServerAccessGuard → JwtAuthGuard | Server-Token ist "Türsteher" (Zugang zum Server), JWT ist "Ausweis" (User-Identität). Logische Reihenfolge. |
| **Setup-Pending-Mode** | Global Guard mit Whitelist | Konsistent mit bestehenden Guards. Whitelist: `/health`, `/admin/setup`, `/auth/exchange-invite`. |
| **Rate-Limiting** | @nestjs/throttler 6.x | Built-in NestJS Integration, einfache Konfiguration für 5 req/min/IP auf Exchange-Endpoint. |

**Guard Pipeline:**
```
Request → SetupPendingGuard → ServerAccessGuard → JwtAuthGuard → Controller
              ↓                    ↓                  ↓
         (Whitelist?)        (X-Server-Access-Token) (Authorization: Bearer)
```

**Rate-Limit Config:**
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('exchange-invite')
async exchangeInvite(@Body() dto: ExchangeInviteDto) { ... }
```

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Invite Exchange** | POST /auth/exchange-invite | Konsistent mit Auth-Modul. Body: `{ inviteCode: string }`. Response: `{ accessToken: string, serverInfo: {...} }`. |
| **Error Responses** | Erweiterte Result<T> Errors | Neue Error-Typen: `INVITE_EXPIRED`, `INVITE_ALREADY_USED`, `INVITE_INVALID`, `SERVER_NOT_SETUP`. |
| **Header Convention** | X-Server-Access-Token | Custom Header für Server-Token. Nicht in Authorization (reserved für JWT). |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Platform Storage** | Adapter Pattern | `IServerStorageAdapter` Interface mit `TauriStorageAdapter` und `BrowserStorageAdapter`. Hexagonal-konsistent. |
| **Server-State** | TanStack Store + Persistence | Store ist Source-of-Truth, Adapter synct mit Storage. Reaktive Updates via `useStore()`. |
| **Deep-Link Handling** | Service + Event Pattern | `DeepLinkService` registriert Listener, emittiert Events. Entkoppelt von UI, testbar. |

**Storage Adapter Interface:**
```typescript
interface IServerStorageAdapter {
  getServers(): Promise<ServerConfig[]>;
  saveServer(server: ServerConfig): Promise<void>;
  deleteServer(id: string): Promise<void>;
  getActiveServerId(): Promise<string | null>;
  setActiveServerId(id: string): Promise<void>;
}
```

**Server Store Structure:**
```typescript
interface ServerState {
  servers: ServerConfig[];
  activeServerId: string | null;
  connectionStatus: Map<string, 'connected' | 'disconnected' | 'checking'>;
}
```

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **New Dependencies** | bcrypt, @nestjs/throttler, @tauri-apps/plugin-deep-link, @tauri-apps/plugin-store | Minimal neue Dependencies, alle production-ready. |
| **Tauri Config** | Deep-Link Schema `bluelight://` | Registrierung in `tauri.conf.json` für Desktop. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma Models (ServerAccessToken, InviteCode) + Migration
2. Domain Entities + Value Objects
3. Guards (SetupPendingGuard, ServerAccessGuard)
4. Application Handlers (ExchangeInviteHandler, CreateInviteHandler)
5. Controllers (AuthController extension, AdminInviteController)
6. Frontend Storage Adapters
7. Frontend Server Store + Feature
8. Deep-Link Integration

**Cross-Component Dependencies:**
- Guards depend on Repository (Token lookup)
- Frontend Store depends on Storage Adapter
- Deep-Link Service depends on Server Store
- Exchange Handler depends on Rate-Limiter

## Implementation Patterns & Consistency Rules

### Existing Patterns Reference

**All patterns from CLAUDE.md remain binding.** Key patterns:
- AC1: DI Import Check (`import` not `import type` for DI classes)
- AC2: DI Token Constants (`DI_TOKENS` symbols)
- AC3: Framework-Agnostizität (no NestJS decorators in Application layer except `@Injectable`)
- AC4: Result Pattern (`Result<T>` instead of exceptions)
- AC5: Outbox Integration (atomic event storage)
- AC6: Test Pattern (AAA with Given-When-Then)
- AC7: Controller Response Decorator (`@ApiWrappedResponse`)

### Naming Patterns (Multi-Server Feature)

**Domain Entities:**
| Entity | File | Class |
|--------|------|-------|
| ServerAccessToken | `server-access-token.entity.ts` | `ServerAccessToken` |
| InviteCode | `invite-code.entity.ts` | `InviteCode` |

**Value Objects:**
| VO | File | Class |
|----|------|-------|
| AccessTokenId | `access-token-id.vo.ts` | `AccessTokenId` |
| InviteCodeId | `invite-code-id.vo.ts` | `InviteCodeId` |
| TokenHash | `token-hash.vo.ts` | `TokenHash` |

**Handlers:**
| Handler | File |
|---------|------|
| ExchangeInviteHandler | `exchange-invite.handler.ts` |
| CreateInviteHandler | `create-invite.handler.ts` |
| RevokeTokenHandler | `revoke-token.handler.ts` |

**Guards:**
| Guard | File |
|-------|------|
| ServerAccessGuard | `server-access.guard.ts` |
| SetupPendingGuard | `setup-pending.guard.ts` |

### API Response Patterns (Multi-Server Feature)

**Invite Exchange Response:**
```typescript
// POST /auth/exchange-invite
interface ExchangeInviteResponseDto {
  accessToken: string;      // blh_xxx (shown only once!)
  serverInfo: {
    name: string;
    version: string;
    baseUrl: string;
  };
}
```

**Invite-Specific Error Codes:**
```typescript
enum InviteErrorCode {
  INVITE_INVALID = 'INVITE_INVALID',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_ALREADY_USED = 'INVITE_ALREADY_USED',
  INVITE_RATE_LIMITED = 'INVITE_RATE_LIMITED',
  SERVER_NOT_SETUP = 'SERVER_NOT_SETUP',
}
```

**Error Response Format:**
```typescript
{
  statusCode: 400,
  message: "Invite code has already been used",
  error: "Bad Request",
  code: "INVITE_ALREADY_USED"  // Specific error code
}
```

### Frontend Patterns (Multi-Server Feature)

**Feature Structure:**
```
features/server/
├── api/
│   ├── queries.ts          # useServerHealth, useServerInfo
│   └── mutations.ts        # useExchangeInvite
├── adapters/
│   ├── i-server-storage.adapter.ts
│   ├── tauri-storage.adapter.ts
│   └── browser-storage.adapter.ts
├── stores/
│   └── server.store.ts
├── services/
│   └── deep-link.service.ts
├── hooks/
│   └── use-active-server.ts
├── schemas/
│   └── server-config.schema.ts
└── ui/
    ├── atoms/
    │   └── ServerStatusBadge.tsx
    ├── molecules/
    │   ├── ServerListItem.tsx
    │   └── InviteLinkDisplay.tsx
    ├── organisms/
    │   ├── ServerSelector.tsx
    │   └── InviteCreator.tsx
    └── pages/
        └── ServerSettingsPage.tsx
```

**Adapter Pattern:**
```typescript
// Interface: i-<name>.adapter.ts
interface IServerStorageAdapter {
  getServers(): Promise<ServerConfig[]>;
  saveServer(server: ServerConfig): Promise<void>;
  deleteServer(id: string): Promise<void>;
  getActiveServerId(): Promise<string | null>;
  setActiveServerId(id: string): Promise<void>;
}

// Implementation: <platform>-<name>.adapter.ts
class TauriStorageAdapter implements IServerStorageAdapter { ... }
class BrowserStorageAdapter implements IServerStorageAdapter { ... }
```

**Store Pattern:**
```typescript
// File: server.store.ts
export const serverStore = new Store<ServerState>({
  servers: [],
  activeServerId: null,
  connectionStatus: new Map(),
});

// Usage: useStore(serverStore, selector)
const servers = useStore(serverStore, (s) => s.servers);
```

### Event Naming Patterns (Multi-Server Feature)

**Domain Events:**
| Event | Class |
|-------|-------|
| Token created | `ServerAccessTokenCreatedEvent` |
| Token revoked | `ServerAccessTokenRevokedEvent` |
| Invite created | `InviteCodeCreatedEvent` |
| Invite redeemed | `InviteCodeRedeemedEvent` |

**Event Payload Pattern:**
```typescript
class InviteCodeRedeemedEvent extends DomainEvent {
  constructor(
    public readonly inviteCodeId: string,
    public readonly accessTokenId: string,
    public readonly redeemedAt: Date,
    public readonly clientIp: string,
  ) {
    super();
  }
}
```

### Guard Implementation Patterns

**Guard with DI Token:**
```typescript
@Injectable()
export class ServerAccessGuard implements CanActivate {
  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN)
    private readonly tokenRepo: IServerAccessTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-server-access-token'];

    if (!token) {
      throw new UnauthorizedException('Server access token required');
    }

    const isValid = await this.tokenRepo.validateToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid server access token');
    }

    return true;
  }
}
```

**Whitelist Decorator:**
```typescript
// Custom decorator for skipping guards
export const SkipServerAccess = () => SetMetadata('skipServerAccess', true);
export const SkipSetupCheck = () => SetMetadata('skipSetupCheck', true);

// Usage on endpoints
@SkipServerAccess()
@SkipSetupCheck()
@Get('health')
health() { ... }
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow existing CLAUDE.md patterns (AC1-AC7)
2. Use DI_TOKENS for new repository injections
3. Use Result<T> for domain/application errors
4. Use @ApiWrappedResponse for controller responses
5. Place new entities in domain/, handlers in application/
6. Follow feature-based structure in frontend

**Pattern Verification:**
- Biome lint catches naming violations
- Architecture check (`pnpm check:arch`) catches layer violations
- PR review checklist includes pattern compliance

## Project Structure & Boundaries

### New Backend Structure (Multi-Server Feature)

```
packages/backend/src/
├── domain/
│   ├── entities/
│   │   ├── server-access-token.entity.ts      # NEW: Token Entity
│   │   └── invite-code.entity.ts              # NEW: Invite Entity
│   ├── value-objects/
│   │   ├── access-token-id.vo.ts              # NEW
│   │   ├── invite-code-id.vo.ts               # NEW
│   │   └── token-hash.vo.ts                   # NEW
│   ├── events/
│   │   ├── server-access-token.events.ts      # NEW: Token Created/Revoked
│   │   └── invite-code.events.ts              # NEW: Invite Created/Redeemed
│   └── repositories/
│       ├── i-server-access-token.repository.ts  # NEW: Interface
│       └── i-invite-code.repository.ts          # NEW: Interface
│
├── application/
│   └── auth/                                  # EXTENDED (exists)
│       ├── commands/
│       │   ├── exchange-invite.handler.ts     # NEW
│       │   └── revoke-token.handler.ts        # NEW
│       └── dto/
│           ├── exchange-invite.dto.ts         # NEW
│           └── exchange-invite-response.dto.ts # NEW
│   └── admin/
│       └── commands/
│           ├── create-invite.handler.ts       # NEW
│           ├── list-tokens.handler.ts         # NEW
│           └── complete-setup.handler.ts      # NEW
│
├── infrastructure/
│   ├── repositories/
│   │   ├── prisma-server-access-token.repository.ts  # NEW
│   │   └── prisma-invite-code.repository.ts          # NEW
│   ├── guards/
│   │   ├── server-access.guard.ts             # NEW
│   │   └── setup-pending.guard.ts             # NEW
│   ├── decorators/
│   │   ├── skip-server-access.decorator.ts    # NEW
│   │   └── skip-setup-check.decorator.ts      # NEW
│   └── di-tokens.ts                           # EXTENDED: New tokens
│
└── modules/
    ├── auth/
    │   └── controllers/
    │       └── auth.controller.ts             # EXTENDED: exchange-invite endpoint
    └── admin/
        └── controllers/
            └── admin-invite.controller.ts     # NEW: Invite Management
```

### New Frontend Structure (Multi-Server Feature)

```
packages/frontend/src/
├── features/
│   └── server/                                # NEW: Complete feature
│       ├── api/
│       │   ├── queries.ts                     # useServerHealth, useServerInfo
│       │   └── mutations.ts                   # useExchangeInvite, useAddServer
│       ├── adapters/
│       │   ├── i-server-storage.adapter.ts    # Interface
│       │   ├── tauri-storage.adapter.ts       # Tauri Implementation
│       │   └── browser-storage.adapter.ts     # Browser Implementation
│       ├── stores/
│       │   └── server.store.ts                # TanStack Store
│       ├── services/
│       │   ├── deep-link.service.ts           # Deep Link Handler
│       │   └── server-connection.service.ts   # Health Check Service
│       ├── hooks/
│       │   ├── use-active-server.ts
│       │   ├── use-server-list.ts
│       │   └── use-platform-storage.ts
│       ├── schemas/
│       │   ├── server-config.schema.ts        # Zod Schema
│       │   └── invite-code.schema.ts
│       └── ui/
│           ├── atoms/
│           │   ├── ServerStatusBadge.tsx
│           │   └── CopyTokenButton.tsx
│           ├── molecules/
│           │   ├── ServerListItem.tsx
│           │   ├── InviteLinkDisplay.tsx
│           │   └── AddServerForm.tsx
│           ├── organisms/
│           │   ├── ServerSelector.tsx
│           │   ├── ServerSettingsPanel.tsx
│           │   └── InviteCreator.tsx
│           └── pages/
│               └── ServerSettingsPage.tsx
│
├── shared/
│   └── lib/
│       └── platform.ts                        # NEW: isTauri(), getPlatform()
│
└── routes/
    └── app/
        └── settings/
            └── servers.tsx                    # NEW: Route for Server Settings
```

### New Prisma Models

```prisma
model ServerAccessToken {
  id           String    @id @default(cuid())
  tokenHash    String    @unique          // bcrypt hash of blh_xxx
  name         String?                    // Optional display name
  lastUsedAt   DateTime?
  expiresAt    DateTime?                  // Optional expiration
  isRevoked    Boolean   @default(false)
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  // Relations
  createdByInvite   InviteCode? @relation(fields: [inviteCodeId], references: [id])
  inviteCodeId      String?     @unique

  @@index([tokenHash])
  @@index([isRevoked])
}

model InviteCode {
  id           String    @id @default(cuid())
  code         String    @unique          // 8-char code
  expiresAt    DateTime
  maxUses      Int       @default(1)
  useCount     Int       @default(0)
  createdAt    DateTime  @default(now())

  // Relations
  createdBy    User      @relation(fields: [createdById], references: [id])
  createdById  String
  redeemedToken ServerAccessToken?

  @@index([code])
  @@index([expiresAt])
}
```

### Requirements to Structure Mapping

| PRD Requirement | Backend Location | Frontend Location |
|-----------------|------------------|-------------------|
| **FR1-FR8** (Server Config) | - | `features/server/stores/`, `features/server/adapters/` |
| **FR9-FR12** (Access Token) | `domain/entities/server-access-token.entity.ts`, `infrastructure/guards/server-access.guard.ts` | `features/server/api/mutations.ts` |
| **FR13-FR16** (Token Validation) | `infrastructure/repositories/prisma-server-access-token.repository.ts` | - |
| **FR17-FR21** (Invite Code) | `domain/entities/invite-code.entity.ts`, `application/auth/commands/exchange-invite.handler.ts` | `features/server/ui/organisms/InviteCreator.tsx` |
| **FR22-FR25** (Onboarding) | `modules/auth/controllers/auth.controller.ts` | `features/server/services/deep-link.service.ts` |
| **FR26-FR31** (Admin) | `modules/admin/controllers/admin-invite.controller.ts` | Admin Feature (exists) |
| **FR32-FR36** (Platform) | - | `features/server/adapters/`, `shared/lib/platform.ts` |
| **FR37-FR40** (Setup) | `infrastructure/guards/setup-pending.guard.ts`, `application/admin/commands/complete-setup.handler.ts` | - |

### Integration Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Tauri/Browser)                    │
├─────────────────────────────────────────────────────────────────┤
│  ServerStore ←→ StorageAdapter (Tauri/Browser)                  │
│       ↓                                                          │
│  DeepLinkService → ServerStore.addServer()                      │
│       ↓                                                          │
│  API Client (generated) ──────────────────────────────────────┐ │
└───────────────────────────────────────────────────────────────│─┘
                                                                 │
                           X-Server-Access-Token Header          │
                                                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                          │
├─────────────────────────────────────────────────────────────────┤
│  Request                                                         │
│    ↓                                                             │
│  SetupPendingGuard (Whitelist: /health, /admin/setup, /auth/*)  │
│    ↓                                                             │
│  ServerAccessGuard (Whitelist: /health, /auth/exchange-invite)  │
│    ↓                                                             │
│  JwtAuthGuard (existing)                                        │
│    ↓                                                             │
│  Controller → Handler → Repository → Prisma                    │
└─────────────────────────────────────────────────────────────────┘
```

### DI Token Extensions

```typescript
// infrastructure/di-tokens.ts - EXTENDED
export const DI_TOKENS = {
  REPOSITORIES: {
    // ... existing
    SERVER_ACCESS_TOKEN: Symbol('IServerAccessTokenRepository'),
    INVITE_CODE: Symbol('IInviteCodeRepository'),
  },
  SERVICES: {
    // ... existing
    TOKEN_HASH: Symbol('ITokenHashService'),
  },
} as const;
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts. NestJS 11 + Prisma 6 + bcrypt + @nestjs/throttler are fully compatible. Frontend stack (React 19 + TanStack + Tauri 2) integrates seamlessly with new plugins.

**Pattern Consistency:**
Implementation patterns support all architectural decisions. Hexagonal Architecture + CQRS + DDD patterns apply consistently to new Multi-Server components. Naming conventions follow existing CLAUDE.md standards.

**Structure Alignment:**
Project structure supports all decisions. New files integrate into existing layer hierarchy (Domain → Application → Infrastructure → Modules). Feature-based frontend organization accommodates new `features/server/` module.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
| FR Group | Coverage | Architecture Element |
|----------|----------|---------------------|
| FR1-FR8 (Server Config) | 100% | ServerStore + StorageAdapters |
| FR9-FR16 (Access Token) | 100% | ServerAccessToken Entity + Guards |
| FR17-FR25 (Invite & Onboarding) | 100% | InviteCode + ExchangeHandler + DeepLinkService |
| FR26-FR31 (Admin) | 100% | AdminInviteController |
| FR32-FR40 (Platform & Setup) | 100% | StorageAdapters + SetupPendingGuard |

**Non-Functional Requirements Coverage:**
| NFR | Requirement | Solution |
|-----|-------------|----------|
| NFR-P1 | Token validation <100ms | Index on tokenHash |
| NFR-S1 | bcrypt cost ≥10 | bcrypt cost 10 |
| NFR-S3 | Rate-limit 5/min/IP | @nestjs/throttler |
| NFR-R3 | Atomic invite marking | Prisma transaction |
| NFR-I1 | Deep-link schema | @tauri-apps/plugin-deep-link |

### Implementation Readiness Validation ✅

**Decision Completeness:**
All 8 critical decisions (D1-D8) documented with rationale, versions, and code examples.

**Structure Completeness:**
40+ new files defined with concrete paths. All integration points mapped. Component boundaries clearly established.

**Pattern Completeness:**
All potential conflict points addressed. Naming conventions comprehensive. Communication patterns fully specified. Guard implementation patterns documented.

### Gap Analysis Results

**Critical Gaps:** None identified

**Deferred (Post-MVP):**
- Token rotation strategy (tokens have optional expiresAt)
- Invite code cleanup job (expired codes don't block)
- Multi-device token sync (each device has own token)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (Brownfield)
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (D1-D8)
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Brownfield integration leverages existing patterns (AC1-AC7)
- Clear separation of concerns (Hexagonal Architecture)
- Platform abstraction enables Desktop + Web + Mobile
- Security-first design (bcrypt, rate-limiting, atomic operations)

**Areas for Future Enhancement:**
- Token usage analytics for admin dashboard
- Automatic server reconnection logic
- Token rotation for long-running deployments

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. Reference existing CLAUDE.md patterns (AC1-AC7)
5. Refer to this document for all architectural questions

**Implementation Sequence:**
1. Prisma Models (ServerAccessToken, InviteCode) + Migration
2. Domain Entities + Value Objects
3. Guards (SetupPendingGuard, ServerAccessGuard)
4. Application Handlers (ExchangeInviteHandler, CreateInviteHandler)
5. Controllers (AuthController extension, AdminInviteController)
6. Frontend Storage Adapters
7. Frontend Server Store + Feature
8. Deep-Link Integration

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-06
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- 8 architectural decisions made (D1-D8)
- 6 implementation pattern categories defined
- 40+ new architectural components specified
- 40 functional requirements fully supported

**AI Agent Implementation Guide**
- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale.

**Consistency Guarantee**
Implementation patterns ensure multiple AI agents produce compatible, consistent code.

**Complete Coverage**
All 40 FRs and NFRs architecturally supported with clear mapping.

**Solid Foundation**
Brownfield integration leverages existing patterns (AC1-AC7) while adding Multi-Server support.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

