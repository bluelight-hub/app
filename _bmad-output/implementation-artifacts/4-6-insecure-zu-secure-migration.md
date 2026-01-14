# Story 4.6: INSECURE zu SECURE Migration

Status: review

## Story

Als **Server-Administrator**,
moechte ich **meinen Server von INSECURE_MODE zu SECURE_MODE migrieren koennen**,
damit **ich einen Entwicklungsserver fuer den Produktivbetrieb absichern kann, ohne ihn neu aufsetzen zu muessen**.

## Acceptance Criteria

### AC1: INSECURE_MODE Hinweis
**Given** der Server laeuft im INSECURE_MODE (`INSECURE_MODE=true`)
**When** ich mich als Administrator einlogge und das Admin-Panel oeffne
**Then** sehe ich einen prominenten Hinweis: "Dieser Server laeuft im unsicheren Modus. Tokens sind nicht erforderlich."
**And** ein Button "Zu SECURE_MODE wechseln" ist verfuegbar

### AC2: Migration starten
**Given** ich klicke auf "Zu SECURE_MODE wechseln"
**When** der Migrations-Dialog erscheint
**Then** werde ich aufgefordert, einen initialen Access-Token zu erstellen
**And** eine Erklaerung wird angezeigt: "Nach der Migration benoetigen alle Clients einen gueltigen Token."
**And** ich muss einen Token-Namen eingeben

### AC3: Migration durchfuehren
**Given** ich habe den initialen Token erstellt und bestaetigt
**When** die Migration ausgefuehrt wird
**Then** wird `INSECURE_MODE` in der Server-Konfiguration auf `false` gesetzt
**And** der neue Token wird genau einmal angezeigt (mit Copy-Funktion)
**And** alle zukuenftigen Requests benoetigen einen gueltigen Token

### AC4: Nach Migration Token erforderlich
**Given** die Migration zu SECURE_MODE wurde abgeschlossen
**When** ein Client ohne Token oder mit ungueltigem Token einen Request macht
**Then** erhaelt er 401 Unauthorized
**And** die Fehlermeldung lautet: "Server access token required"

### AC5: INSECURE-Option verschwindet
**Given** die Migration wurde abgeschlossen
**When** ich das Admin-Panel oeffne
**Then** ist der "Zu SECURE_MODE wechseln"-Hinweis verschwunden
**And** die Token-Verwaltung ist vollstaendig verfuegbar

### AC6: Kein Rueckweg
**Given** der Server laeuft bereits im SECURE_MODE
**When** ich das Admin-Panel oeffne
**Then** gibt es keine Option, zu INSECURE_MODE zu wechseln (nur in eine Richtung)

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: ServerConfig Entity & Repository erstellen** (AC: 1, 3, 5)
  - [x] 1.1: Prisma-Migration fuer `ServerConfig` Model mit `insecureMode: Boolean`, `migratedAt: DateTime?`
  - [x] 1.2: `ServerConfigRepository` Interface in `/domain/repositories/i-server-config.repository.ts`
  - [x] 1.3: `PrismaServerConfigRepository` Implementation mit `getOrCreate()`, `update()` Methoden
  - [x] 1.4: DI-Token `DI_TOKENS.REPOSITORIES.SERVER_CONFIG` hinzufuegen
  - [x] 1.5: Unit Tests fuer Repository (15-20 Tests)

- [x] **Task 2: MigrateToSecureModeCommand & Handler** (AC: 2, 3)
  - [x] 2.1: `MigrateToSecureModeCommand` mit tokenName Validierung (3-50 Zeichen)
  - [x] 2.2: `MigrateToSecureModeRequestDto` mit class-validator Decorators
  - [x] 2.3: `MigrateToSecureModeResponseDto` mit token, tokenName, prefix, migratedAt
  - [x] 2.4: `MigrateToSecureModeHandler extends TransactionalCommandHandler`
    - Validierung: INSECURE_MODE muss true sein
    - Token generieren (blh_ + cuid2, bcrypt Hash)
    - ServerConfig.insecureMode = false setzen
    - ServerAccessToken erstellen (atomar in einer Transaktion)
  - [x] 2.5: Domain Event `ServerMigratedToSecureModeEvent` erstellen
  - [x] 2.6: Unit Tests (30-40 Tests, AAA Pattern mit Given-When-Then)

- [x] **Task 3: GetSecurityStatusQuery implementieren** (AC: 1, 5, 6)
  - [x] 3.1: `GetSecurityStatusQuery` und `GetSecurityStatusHandler`
  - [x] 3.2: `SecurityStatusDto` mit insecureMode, setupComplete, activeTokenCount
  - [x] 3.3: `GET /admin/security/status` Endpoint
  - [x] 3.4: Unit Tests (15-20 Tests)

- [x] **Task 4: Controller Endpoint erstellen** (AC: 2, 3)
  - [x] 4.1: `AdminSecurityController` mit `POST /admin/security/migrate-to-secure`
  - [x] 4.2: `@ApiWrappedCreatedResponse(MigrateToSecureModeResponseDto)` Decorator
  - [x] 4.3: `@UseGuards(AdminJwtAuthGuard)` fuer Admin-Only
  - [x] 4.4: `@Throttle({ default: { limit: 5, ttl: 60000 } })` Rate-Limiting (5/min)
  - [x] 4.5: Error-Mapping: ALREADY_IN_SECURE_MODE -> 409 Conflict
  - [x] 4.6: Controller Unit Tests (25-30 Tests)

- [x] **Task 5: ServerAccessGuard erweitern** (AC: 4)
  - [x] 5.1: Guard priorisiert DB-Config (`ServerConfig.insecureMode`) ueber ENV-Variable
  - [x] 5.2: Falls DB-Eintrag existiert, ignoriere ENV-Variable
  - [x] 5.3: Fallback auf ENV wenn kein DB-Eintrag (Backward Compatibility)
  - [x] 5.4: Cache-Invalidation nach Migration
  - [x] 5.5: Unit Tests fuer Guard-Anpassung (10-15 Tests)

- [x] **Task 6: Health Endpoint erweitern** (AC: 1)
  - [x] 6.1: `BasicHealthDto.insecureMode` bereits vorhanden - pruefen dass DB-Status verwendet wird
  - [x] 6.2: Falls noetig: Health-Service auf DB-Config umstellen
  - [x] 6.3: Unit Tests (5-10 Tests)

- [x] **Task 7: API-Client generieren**
  - [x] 7.1: `pnpm run generate-api` ausfuehren
  - [x] 7.2: Generierte Types verifizieren (AdminApi mit migrateToSecure, getSecurityStatus)

### Frontend Tasks

- [x] **Task 8: TanStack Query Hooks erstellen** (AC: 1, 2, 3)
  - [x] 8.1: `useSecurityStatus` Query in `/features/admin/api/use-security.ts`
  - [x] 8.2: `useMigrateToSecureMode` Mutation in `/features/admin/api/use-security.ts`
  - [x] 8.3: Query Keys: `admin.security.status`, `admin.security.migrate`
  - [x] 8.4: Cache-Invalidation nach Migration (accessTokens.list invalidieren)

- [x] **Task 9: InsecureModeBanner Atom erstellen** (AC: 1)
  - [x] 9.1: Prominente Warnung mit Amber/Orange Farbe
  - [x] 9.2: Icon (ShieldExclamation oder Warning)
  - [x] 9.3: Text: "Dieser Server laeuft im unsicheren Modus. Tokens sind nicht erforderlich."
  - [x] 9.4: Button: "Zu SECURE_MODE wechseln"
  - [x] 9.5: Dark Mode Support
  - [x] 9.6: Responsive Design

- [x] **Task 10: MigrationModal Organism erstellen** (AC: 2, 3)
  - [x] 10.1: TanStack Form Integration mit Zod-Validator
  - [x] 10.2: Erklaerungstext: "Nach der Migration benoetigen alle Clients einen gueltigen Token."
  - [x] 10.3: Token-Name Input (3-50 Zeichen, Zod-Schema)
  - [x] 10.4: Submit-Button mit Loading-State
  - [x] 10.5: Nach Erfolg: Token-Anzeige (genau einmal, Copy-Button)
  - [x] 10.6: Warnung: "Dieser Token wird nur einmal angezeigt. Kopieren Sie ihn jetzt."
  - [x] 10.7: Checkbox: "Ich habe den Token gesichert"
  - [x] 10.8: Dialog erst schliessbar nach Checkbox-Bestaetigung
  - [x] 10.9: A11y: Screen Reader Announcement fuer Copy-Aktion

- [x] **Task 11: Zod-Schema fuer Migration** (AC: 2)
  - [x] 11.1: `migrationSchema` in `/features/admin/schemas/migration.schema.ts`
  - [x] 11.2: tokenName: min 3, max 50 Zeichen, required
  - [x] 11.3: Deutsche Fehlermeldungen

- [x] **Task 12: Admin Dashboard Integration** (AC: 1, 5)
  - [x] 12.1: InsecureModeBanner im Admin Dashboard anzeigen wenn insecureMode=true
  - [x] 12.2: Banner ausblenden nach Migration (Query-Refresh)
  - [x] 12.3: Keine UI-Aenderung wenn bereits SECURE_MODE

### Testing Tasks

- [x] **Task 13: E2E Spot-Check mit Chrome MCP**
  - [x] 13.1: INSECURE_MODE Banner wird angezeigt (wenn ENV aktiv)
  - [x] 13.2: Migration-Modal oeffnet sich
  - [~] 13.3: Token wird nach Migration angezeigt (nicht getestet - wuerde Server-Zustand permanent aendern)
  - [~] 13.4: Banner verschwindet nach Migration (nicht getestet - wuerde Server-Zustand permanent aendern)

## Dev Notes

### Architektur-Patterns (KRITISCH - BEFOLGEN!)

#### Backend Hexagonal Architecture
```
Domain Layer:
├── /domain/repositories/i-server-config.repository.ts (NEU)
├── /domain/events/server-migrated-to-secure-mode.event.ts (NEU)
└── /domain/events/event-names.ts (ERWEITERN: SERVER_CONFIG.MIGRATED_TO_SECURE)

Application Layer:
├── /application/admin/commands/migrate-to-secure-mode.command.ts (NEU)
├── /application/admin/commands/migrate-to-secure-mode.handler.ts (NEU)
├── /application/admin/queries/get-security-status.query.ts (NEU)
├── /application/admin/queries/get-security-status.handler.ts (NEU)
├── /application/admin/dto/migrate-to-secure-mode.dto.ts (NEU)
└── /application/admin/dto/security-status.dto.ts (NEU)

Infrastructure Layer:
├── /infrastructure/server-config/repositories/prisma-server-config.repository.ts (NEU)
├── /infrastructure/guards/server-access.guard.ts (MODIFIZIEREN - DB-Check hinzufuegen)
└── /infrastructure/di-tokens.ts (ERWEITERN)

Modules Layer:
└── /modules/admin/controllers/admin-security.controller.ts (NEU)
```

#### Frontend Feature-Structure
```
/features/admin/
├── /api/
│   ├── queries.ts (ERWEITERN: security Keys)
│   └── use-security.ts (NEU: useSecurityStatus, useMigrateToSecureMode)
├── /schemas/
│   └── migration.schema.ts (NEU)
└── /ui/
    ├── /atoms/
    │   └── InsecureModeBanner.tsx (NEU)
    └── /organisms/
        └── MigrationModal.tsx (NEU)
```

### Prisma Schema Erweiterung

```prisma
model ServerConfig {
  id           String    @id @default("singleton")
  insecureMode Boolean   @default(true)
  migratedAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**Migration-Command:**
```bash
pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_server_config
```

### Code-Review Checklist (AC1-AC7 aus CLAUDE.md)

| Rule | Pattern | Validierung |
|------|---------|-------------|
| **AC1: DI Imports** | `import` (NICHT `import type`) fuer Injectable Classes | Pre-commit Hook |
| **AC2: DI Tokens** | `DI_TOKENS.REPOSITORIES.SERVER_CONFIG` | Zentralisiert |
| **AC3: Framework-Agnostic** | Nur `@Injectable` in Application Layer | Keine NestJS-Decorators |
| **AC4: Result Pattern** | `Result<T>` statt Exceptions | Never throw expected errors |
| **AC5: Outbox Integration** | `TransactionalCommandHandler` Base Class | Events atomar |
| **AC6: Test Pattern** | AAA mit Given-When-Then | Kommentare |
| **AC7: Response Decorators** | `@ApiWrappedCreatedResponse` | Custom Decorator |

### Sicherheits-Anforderungen

| Anforderung | Implementierung |
|-------------|-----------------|
| **Irreversible Migration** | Kein API-Endpoint fuer Rueckweg, nur ENV-Reset moeglich |
| **Token nur einmal anzeigen** | Raw-Token NUR im Response, NICHT in DB |
| **Token-Hashing** | bcrypt Cost-Factor 10 (NFR-S1) |
| **Audit-Trail** | ServerMigratedToSecureModeEvent in Outbox (NFR-S8) |
| **Rate-Limiting** | 5 Requests/Minute fuer Migration |
| **Atomare Transaktion** | Token-Erstellung + Config-Update in einer TX |

### Bestehende Implementierung (WIEDERVERWENDEN!)

**ServerAccessGuard (bereits vorhanden):**
```typescript
// /infrastructure/guards/server-access.guard.ts
// Aktuelle Logik:
// 1. Check @SkipServerAccess decorator
// 2. Check INSECURE_MODE ENV === 'true' -> bypass
// 3. Validate X-Server-Access-Token header

// NEU zu implementieren:
// 1. Check @SkipServerAccess decorator
// 2. Check ServerConfig.insecureMode aus DB (Prio 1)
// 3. Fallback: Check INSECURE_MODE ENV (Prio 2)
// 4. Validate X-Server-Access-Token header
```

**CreateAccessTokenHandler Pattern (Story 4.1):**
```typescript
// Wiederverwendbares Pattern fuer Token-Generierung:
const rawToken = `blh_${createId()}`;
const prefix = rawToken.substring(0, 12);
const tokenHash = await bcrypt.hash(rawToken, 10);

const token = ServerAccessToken.create({
  tokenHash: TokenHash.create(tokenHash).value!,
  name: command.tokenName,
});
```

### Error Codes

```typescript
export const SECURITY_ERROR_CODES = {
  ALREADY_IN_SECURE_MODE: 'ALREADY_IN_SECURE_MODE',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  TOKEN_GENERATION_FAILED: 'TOKEN_GENERATION_FAILED',
  INVALID_TOKEN_NAME: 'INVALID_TOKEN_NAME',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
} as const;
```

### Guard Prioritaet nach Migration

```
Request Flow nach Migration:
1. ThrottlerGuard (Rate Limiting)
2. SetupPendingGuard (Setup-Check)
3. ServerAccessGuard:
   a. Check @SkipServerAccess -> Skip wenn gesetzt
   b. Query ServerConfig.insecureMode aus DB
   c. Falls DB-Eintrag && insecureMode=false -> Token erforderlich
   d. Falls kein DB-Eintrag -> Fallback auf ENV
   e. Validate X-Server-Access-Token Header
4. JwtAuthGuard (Admin-Endpoints)
```

### Whitelisted Endpoints (Token NICHT erforderlich)

Diese Endpoints sind IMMER ohne Token erreichbar:
- `GET /health` - Health Check
- `GET /health/liveness` - Kubernetes Probe
- `GET /health/readiness` - Kubernetes Probe
- `POST /admin/setup` - Initial Setup
- `POST /auth/exchange-invite` - Invite-Code Exchange
- `GET /api-json` - Swagger Spec

### Learnings aus vorherigen Stories (Epic 4)

1. **Token-Pattern (4.1):** `blh_` Prefix + cuid2, bcrypt Hash, Prefix fuer Display
2. **Modal-Pattern (4.1):** Token nur einmal anzeigen, Checkbox vor Schliessen
3. **Response-Pattern (4.4):** `@ApiWrappedCreatedResponse` fuer 201 Responses
4. **Test-Volumen:** 30-40 Tests pro Handler, 25-30 Tests pro Controller
5. **A11y:** Screen Reader Announcements fuer wichtige Aktionen

### Commit-Strategie

```
✨(admin): Add ServerConfig entity and Prisma migration
✨(admin): Add MigrateToSecureModeCommand and Handler
✨(admin): Add GetSecurityStatusQuery and Handler
✨(admin): Add POST /admin/security/migrate-to-secure endpoint
♻️(guard): Update ServerAccessGuard to use DB config
✨(admin): Add InsecureModeBanner and MigrationModal components
🧪(admin): Add comprehensive tests for security migration
```

### Beispiel-Implementierungen (Referenz)

**MigrateToSecureModeHandler:**
```typescript
@Injectable()
export class MigrateToSecureModeHandler extends TransactionalCommandHandler<
  MigrateToSecureModeCommand,
  MigrateToSecureModeResponseDto
> {
  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.SERVER_CONFIG)
    private readonly configRepo: IServerConfigRepository,
    @Inject(DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN)
    private readonly tokenRepo: IServerAccessTokenRepository,
    private readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  protected async executeInTransaction(
    command: MigrateToSecureModeCommand,
    tx: TransactionContext
  ): Promise<{ result: MigrateToSecureModeResponseDto; events: DomainEvent[] }> {
    // 1. Config pruefen
    const config = await this.configRepo.getOrCreate(tx);
    if (!config.insecureMode) {
      return Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE);
    }

    // 2. Token generieren (Pattern aus Story 4.1)
    const rawToken = `blh_${createId()}`;
    const prefix = rawToken.substring(0, 12);
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // 3. Token erstellen
    const tokenResult = ServerAccessToken.create({
      tokenHash: TokenHash.create(tokenHash).value!,
      name: command.tokenName,
    });
    if (tokenResult.isFailure) {
      return Result.fail(SECURITY_ERROR_CODES.TOKEN_GENERATION_FAILED);
    }

    // 4. Speichern (atomar)
    await this.tokenRepo.save(tokenResult.value!, tx);

    // 5. Config aktualisieren
    await this.configRepo.update({ insecureMode: false, migratedAt: new Date() }, tx);

    // 6. Events sammeln
    const events: DomainEvent[] = [
      ...tokenResult.value!.getDomainEvents(),
      new ServerMigratedToSecureModeEvent(new Date()),
    ];

    return {
      result: {
        token: rawToken,
        tokenName: command.tokenName,
        prefix,
        migratedAt: new Date().toISOString(),
      },
      events,
    };
  }
}
```

**Controller-Pattern:**
```typescript
@Controller('admin/security')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminSecurityController {
  @Get('status')
  @ApiWrappedResponse(SecurityStatusDto)
  async getStatus(): Promise<SecurityStatusDto> {
    return this.queryHandler.execute(new GetSecurityStatusQuery());
  }

  @Post('migrate-to-secure')
  @HttpCode(HttpStatus.CREATED)
  @ApiWrappedCreatedResponse(MigrateToSecureModeResponseDto)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async migrateToSecure(
    @Body() dto: MigrateToSecureModeRequestDto
  ): Promise<MigrateToSecureModeResponseDto> {
    const result = await this.handler.execute(
      MigrateToSecureModeCommand.create(dto).value!
    );
    if (result.isFailure) {
      if (result.error === SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE) {
        throw new ConflictException('Server ist bereits im SECURE_MODE');
      }
      throw new BadRequestException(result.error);
    }
    return result.value!;
  }
}
```

**Frontend MigrationModal (Auszug):**
```typescript
const MigrationModal: FC<Props> = ({ isOpen, onClose }) => {
  const [showToken, setShowToken] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const migrateMutation = useMigrateToSecureMode();

  const form = useForm({
    defaultValues: { tokenName: '' },
    validatorAdapter: zodValidator(),
    validators: { onChange: migrationSchema },
    onSubmit: async ({ value }) => {
      const result = await migrateMutation.mutateAsync({ tokenName: value.tokenName });
      setCreatedToken(result.data.token);
      setShowToken(true);
    },
  });

  // ... Token-Anzeige nach Erfolg (wie in Story 4.1)
};
```

### Project Structure Notes

- Neues `ServerConfig` Model in Prisma Schema
- Guard-Logik erweitern ohne Breaking Changes (Backward Compatible)
- Cache-Strategie: Config-Status nur bei Request pruefen (kein Caching fuer Security)
- Migration ist serverseitig irreversibel (nur ENV-Reset moeglich)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6]
- [Source: CLAUDE.md#Code Review Checklist (Backend Architecture)]
- [Source: _bmad-output/implementation-artifacts/4-1-access-token-mit-namen-erstellen.md#Dev Notes]
- [Source: packages/backend/src/infrastructure/guards/server-access.guard.ts]
- [Source: packages/backend/src/infrastructure/config/bootstrap-validation.ts]
- [Source: packages/backend/src/infrastructure/health/health.controller.ts]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend Unit Tests: 5250 Tests passing (15 skipped)
- E2E Spot-Check: Chrome MCP Validierung erfolgreich

### Completion Notes List

**2026-01-13 - Story Completion Review:**

1. **Backend Tasks 1-6:** Alle bereits implementiert vor Session-Start
   - ServerConfig Entity & Repository vorhanden
   - MigrateToSecureModeCommand & Handler mit Tests
   - GetSecurityStatusQuery mit Tests
   - AdminSecurityController mit Swagger Decorators
   - ServerAccessGuard mit DB-Config Prioritaet
   - Health Endpoint nutzt DB-Config

2. **Task 7:** API-Client bereits generiert (AdminApi.migrateToSecure, getSecurityStatus)

3. **Frontend Tasks 8-12:** Alle bereits implementiert
   - `use-security-management.ts` mit useSecurityStatus, useMigrateToSecureMode
   - InsecureModeBanner.tsx mit Amber Styling und A11y
   - MigrationModal.tsx mit TanStack Form, Zod, Copy-Button, Checkbox
   - TokenManagementPage.tsx Integration

4. **Task 13 E2E Spot-Check:**
   - ✅ 13.1: InsecureModeBanner wird korrekt angezeigt
   - ✅ 13.2: MigrationModal oeffnet mit Warnung und Form
   - ⏭️ 13.3-13.4: Nicht getestet (wuerde Server-Zustand permanent aendern)

**Status: READY FOR CODE REVIEW**

### File List

**Backend (zu erstellen/modifizieren):**
- `packages/backend/prisma/migrations/XXXXXXXX_add_server_config/migration.sql` (NEU)
- `packages/backend/prisma/schema.prisma` (MODIFIZIEREN - ServerConfig Model)
- `packages/backend/src/domain/repositories/i-server-config.repository.ts` (NEU)
- `packages/backend/src/domain/events/server-migrated-to-secure-mode.event.ts` (NEU)
- `packages/backend/src/domain/events/event-names.ts` (MODIFIZIEREN)
- `packages/backend/src/application/admin/commands/migrate-to-secure-mode.command.ts` (NEU)
- `packages/backend/src/application/admin/commands/migrate-to-secure-mode.handler.ts` (NEU)
- `packages/backend/src/application/admin/queries/get-security-status.query.ts` (NEU)
- `packages/backend/src/application/admin/queries/get-security-status.handler.ts` (NEU)
- `packages/backend/src/application/admin/dto/migrate-to-secure-mode.dto.ts` (NEU)
- `packages/backend/src/application/admin/dto/security-status.dto.ts` (NEU)
- `packages/backend/src/application/admin/errors/security-error.codes.ts` (NEU)
- `packages/backend/src/infrastructure/server-config/repositories/prisma-server-config.repository.ts` (NEU)
- `packages/backend/src/infrastructure/guards/server-access.guard.ts` (MODIFIZIEREN)
- `packages/backend/src/infrastructure/di-tokens.ts` (MODIFIZIEREN)
- `packages/backend/src/modules/admin/controllers/admin-security.controller.ts` (NEU)
- `packages/backend/src/modules/admin/admin.module.ts` (MODIFIZIEREN)

**Frontend (zu erstellen):**
- `packages/frontend/src/features/admin/api/use-security.ts` (NEU)
- `packages/frontend/src/features/admin/schemas/migration.schema.ts` (NEU)
- `packages/frontend/src/features/admin/ui/atoms/InsecureModeBanner.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/organisms/MigrationModal.tsx` (NEU)
- `packages/frontend/src/features/admin/api/queries.ts` (MODIFIZIEREN - security Keys)
