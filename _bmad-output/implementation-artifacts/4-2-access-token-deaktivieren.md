# Story 4.2: Access-Token deaktivieren

Status: review

## Story

Als **Server-Administrator**,
moechte ich **einen existierenden Access-Token deaktivieren und bei Bedarf reaktivieren koennen**,
damit **kompromittierte oder nicht mehr benoetigte Tokens sofort ungueltig werden, ohne sie endgueltig zu loeschen**.

## Acceptance Criteria

### AC1: Deaktivierung mit Bestaetigung

**Given** ich bin als Administrator eingeloggt und sehe die Token-Liste
**When** ich auf "Deaktivieren" bei einem aktiven Token klicke
**Then** erscheint ein Bestaetigungsdialog mit: Token-Name, Warnung "Alle Geraete mit diesem Token verlieren sofort den Zugriff"
**And** ich muss die Aktion bestaetigen, bevor der Token deaktiviert wird

### AC2: Status-Anzeige in Token-Liste

**Given** ein Token wurde deaktiviert
**When** ich die Token-Liste betrachte
**Then** zeigt der Token-Status "deaktiviert" (rot) an
**And** das Deaktivierungs-Datum ist sichtbar
**And** der "Deaktivieren"-Button wird zu "Reaktivieren"

### AC3: Token-Reaktivierung

**Given** ein Token ist deaktiviert
**When** ich auf "Reaktivieren" klicke und bestatige
**Then** wird der Token wieder aktiv
**And** der Token ist wieder gueltig fuer API-Requests
**And** der Status wechselt zurueck zu "aktiv" (gruen)

### AC4: Sofortige Zugriffssperre

**Given** ein Token wurde gerade deaktiviert
**When** ein Client mit diesem Token einen API-Request macht
**Then** erhaelt der Client einen 401 Unauthorized Fehler
**And** die Fehlermeldung ist "Access token has been revoked"

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: RevokeAccessTokenCommand & Handler** (AC: 1, 4)
  - [x] 1.1: `RevokeAccessTokenCommand` in `/application/admin/commands/` mit tokenId und requestedById
  - [x] 1.2: Command Factory mit Result<T> Validierung (tokenId min 24 chars)
  - [x] 1.3: `RevokeAccessTokenHandler extends TransactionalCommandHandler`
  - [x] 1.4: Nutze existierende `token.revoke()` Domain-Methode
  - [x] 1.5: Domain Event `ServerAccessTokenRevokedEvent` wird automatisch emittiert
  - [x] 1.6: Unit Tests (Given-When-Then Pattern) - Token found, not found, already revoked

- [x] **Task 2: ReactivateAccessTokenCommand & Handler** (AC: 3)
  - [x] 2.1: `ReactivateAccessTokenCommand` in `/application/admin/commands/`
  - [x] 2.2: Command Factory mit Result<T> Validierung
  - [x] 2.3: `ReactivateAccessTokenHandler extends TransactionalCommandHandler`
  - [x] 2.4: Erweitere `ServerAccessToken` Aggregate um `reactivate()` Methode
  - [x] 2.5: Neues Domain Event `ServerAccessTokenReactivatedEvent`
  - [x] 2.6: Unit Tests - Token reactivated, not found, already active

- [x] **Task 3: Controller Endpoints** (AC: 1, 3, 4)
  - [x] 3.1: `POST /api/admin/tokens/:id/revoke` - Token deaktivieren
  - [x] 3.2: `POST /api/admin/tokens/:id/reactivate` - Token reaktivieren
  - [x] 3.3: `@ApiWrappedResponse(TokenListItemDto)` Decorator
  - [x] 3.4: `@UseGuards(AdminJwtAuthGuard)` fuer Admin-Only
  - [x] 3.5: `@Throttle({ default: { limit: 10, ttl: 60000 } })` Rate-Limiting
  - [x] 3.6: Unit Tests - Success, 404 Not Found, Already Revoked/Active

- [x] **Task 4: API-Client generieren**
  - [x] 4.1: `pnpm run generate-api` ausfuehren
  - [x] 4.2: Verifiziere generierte Methods: `adminTokenControllerRevokeTokenVAlpha`, `adminTokenControllerReactivateTokenVAlpha`

### Frontend Tasks

- [x] **Task 5: TanStack Query Hooks** (AC: 1, 3)
  - [x] 5.1: `useRevokeAccessToken` Mutation Hook
  - [x] 5.2: `useReactivateAccessToken` Mutation Hook
  - [x] 5.3: Cache-Invalidation via `ADMIN_QUERY_KEYS.accessTokens.all()`
  - [x] 5.4: Toast-Notifications fuer Success/Error

- [x] **Task 6: TokenRevokeConfirmDialog Organism** (AC: 1)
  - [x] 6.1: Headless UI Dialog mit Warnung
  - [x] 6.2: Token-Name prominent anzeigen
  - [x] 6.3: Warnung: "Alle Geraete mit diesem Token verlieren sofort den Zugriff"
  - [x] 6.4: "Deaktivieren" Button (rot) und "Abbrechen" Button
  - [x] 6.5: Loading-State waehrend API-Call
  - [x] 6.6: Tailwind Dark Mode Support

- [x] **Task 7: TokenListItem erweitern** (AC: 2)
  - [x] 7.1: Action-Dropdown oder Button fuer "Deaktivieren"/"Reaktivieren"
  - [x] 7.2: Deaktivierungs-Datum anzeigen (wenn `revokedAt` vorhanden)
  - [x] 7.3: Button-Text wechselt basierend auf Status
  - [x] 7.4: Disabled-State waehrend Loading

- [x] **Task 8: TokenList Integration** (AC: 1, 2, 3)
  - [x] 8.1: Dialog-State Management in TokenList
  - [x] 8.2: `selectedTokenForRevoke` State
  - [x] 8.3: onRevokeClick und onReactivateClick Handlers
  - [x] 8.4: Optimistic UI Updates (optional)

### Testing Tasks

- [x] **Task 9: E2E Spot-Check mit Chrome MCP**
  - [x] 9.1: Token deaktivieren Flow testen
  - [x] 9.2: Status-Anzeige verifizieren
  - [x] 9.3: Reaktivieren Flow testen
  - [ ] 9.4: API-Request mit deaktiviertem Token testen (401) - Manual test required

## Dev Notes

### KRITISCH: Bestehende Implementierung nutzen!

Das `ServerAccessToken` Aggregate hat **bereits** die `revoke()` Methode implementiert:

```typescript
// /domain/aggregates/server-access-token.aggregate.ts (Zeile 303-318)
public revoke(): Result<void> {
  // Idempotent: Bereits widerrufen → No-Op
  if (this._isRevoked) {
    return Result.ok<void>(undefined);
  }

  const revokedAt = new Date();
  this._isRevoked = true;
  this._revokedAt = revokedAt;
  this.updateTimestamp();

  // Emit Domain Event
  this.addDomainEvent(new ServerAccessTokenRevokedEvent(this._id, revokedAt));
  return Result.ok<void>(undefined);
}
```

**NICHT neu implementieren!** Nur Handler + Controller + Frontend-Integration noetig.

### Architektur-Patterns (KRITISCH - BEFOLGEN!)

#### Backend Hexagonal Architecture

```
Domain Layer (BEREITS VORHANDEN):
├── /domain/aggregates/server-access-token.aggregate.ts (revoke() existiert!)
├── /domain/events/server-access-token-revoked.event.ts (existiert!)
└── /domain/repositories/i-server-access-token.repository.ts (save() vorhanden)

Application Layer (NEU ERSTELLEN):
├── /application/admin/commands/revoke-access-token.command.ts (NEU)
├── /application/admin/commands/revoke-access-token.handler.ts (NEU)
├── /application/admin/commands/reactivate-access-token.command.ts (NEU)
└── /application/admin/commands/reactivate-access-token.handler.ts (NEU)

Infrastructure Layer (BEREITS VORHANDEN):
└── /infrastructure/server-access-token/repositories/ (save() supportet isRevoked)

Modules Layer (ERWEITERN):
└── /modules/admin/controllers/admin-token.controller.ts (2 neue Endpoints)
```

#### Frontend Feature-Structure

```
/features/admin/ (ERWEITERN)
├── /api/
│   └── use-access-token-management.ts (2 neue Hooks hinzufuegen)
└── /ui/
    ├── /molecules/
    │   └── TokenListItem.tsx (Actions hinzufuegen)
    └── /organisms/
        ├── TokenList.tsx (Dialog-State hinzufuegen)
        └── TokenRevokeConfirmDialog.tsx (NEU)
```

### Code-Review Checklist (AC1-AC7 aus CLAUDE.md)

| Rule | Pattern | Validierung |
|------|---------|-------------|
| **AC1: DI Imports** | `import` (NICHT `import type`) fuer Injectable Classes | Pre-commit Hook |
| **AC2: DI Tokens** | `DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN` | Zentralisiert |
| **AC3: Framework-Agnostic** | Nur `@Injectable` in Application Layer | Keine NestJS-Decorators |
| **AC4: Result Pattern** | `Result<T>` statt Exceptions | Handler nutzt Result |
| **AC5: Outbox Integration** | `TransactionalCommandHandler` Base Class | Events atomar |
| **AC6: Test Pattern** | AAA mit Given-When-Then | Kommentare |
| **AC7: Response Decorators** | `@ApiWrappedResponse(TokenListItemDto)` | Custom Decorator |

### Domain-Erweiterung: reactivate() Methode

**NEU zu implementieren** im `ServerAccessToken` Aggregate:

```typescript
// /domain/aggregates/server-access-token.aggregate.ts
public reactivate(): Result<void> {
  // Idempotent: Bereits aktiv → No-Op
  if (!this._isRevoked) {
    return Result.ok<void>(undefined);
  }

  this._isRevoked = false;
  this._revokedAt = null;
  this.updateTimestamp();

  // Emit Domain Event
  this.addDomainEvent(new ServerAccessTokenReactivatedEvent(this._id, new Date()));
  return Result.ok<void>(undefined);
}
```

**NEU: Domain Event**
```typescript
// /domain/events/server-access-token-reactivated.event.ts
export class ServerAccessTokenReactivatedEvent extends DomainEvent {
  constructor(
    public readonly tokenId: AccessTokenId,
    public readonly reactivatedAt: Date,
    aggregateId?: string,
  ) {
    super(aggregateId ?? tokenId.toString());
  }
}
```

### Handler-Pattern (von Story 4.1)

```typescript
// packages/backend/src/application/admin/commands/revoke-access-token.handler.ts
@Injectable()
export class RevokeAccessTokenHandler extends TransactionalCommandHandler<
  RevokeAccessTokenCommand,
  TokenListItemDto
> {
  constructor(
    @Inject(DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN)
    private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(DI_TOKENS.PORTS.LOGGER) private readonly logger: ILoggerPort,
    transactionManager: ITransactionManager,
    outboxRepository: IOutboxRepository,
  ) {
    super(transactionManager, outboxRepository);
  }

  protected async executeInTransaction(
    command: RevokeAccessTokenCommand,
    tx: TransactionContext
  ): Promise<{ result: TokenListItemDto; events: DomainEvent[] }> {
    // 1. Token laden
    const tokenId = AccessTokenId.create(command.tokenId);
    if (tokenId.isFailure) {
      throw new TokenNotFoundException(command.tokenId);
    }

    const token = await this.tokenRepository.findById(tokenId.value!, tx);
    if (!token) {
      throw new TokenNotFoundException(command.tokenId);
    }

    // 2. Domain-Methode aufrufen
    const revokeResult = token.revoke();
    if (revokeResult.isFailure) {
      throw new Error(revokeResult.error!);
    }

    // 3. Speichern
    await this.tokenRepository.save(token, tx);

    // 4. Audit-Log
    this.logger.log(`Token revoked: ${token.tokenPrefix} by ${command.requestedById}`);

    // 5. Response + Events
    const events = token.getDomainEvents();
    token.clearDomainEvents();

    return {
      result: TokenListItemDtoMapper.toDto(token),
      events,
    };
  }
}
```

### Controller-Pattern (AC7)

```typescript
// /modules/admin/controllers/admin-token.controller.ts (ERWEITERN)
@Post(':id/revoke')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Access-Token widerrufen' })
@ApiWrappedResponse(TokenListItemDto)
@Throttle({ default: { limit: 10, ttl: 60000 } })
async revokeToken(
  @Param('id') id: string,
  @CurrentUser() user: ValidatedUser,
): Promise<TokenListItemDto> {
  const commandResult = RevokeAccessTokenCommand.create({
    tokenId: id,
    requestedById: user.userId,
  });

  if (commandResult.isFailure) {
    throw new BadRequestException(commandResult.error);
  }

  const result = await this.revokeHandler.execute(commandResult.value!);
  if (result.isFailure) {
    throw new BadRequestException(result.error);
  }

  return result.value!;
}

@Post(':id/reactivate')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Access-Token reaktivieren' })
@ApiWrappedResponse(TokenListItemDto)
@Throttle({ default: { limit: 10, ttl: 60000 } })
async reactivateToken(
  @Param('id') id: string,
  @CurrentUser() user: ValidatedUser,
): Promise<TokenListItemDto> {
  // Analog zu revokeToken
}
```

### Frontend Hook-Pattern

```typescript
// packages/frontend/src/features/admin/api/use-access-token-management.ts (ERWEITERN)
export const useRevokeAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<WrappedResponse<TokenListItemDto>, ResponseError, string>({
    mutationFn: async (tokenId: string) => {
      return await api.admin().adminTokenControllerRevokeTokenVAlpha({
        id: tokenId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
      toast.success('Access-Token wurde deaktiviert');
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
};

export const useReactivateAccessToken = () => {
  const queryClient = useQueryClient();

  return useMutation<WrappedResponse<TokenListItemDto>, ResponseError, string>({
    mutationFn: async (tokenId: string) => {
      return await api.admin().adminTokenControllerReactivateTokenVAlpha({
        id: tokenId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.accessTokens.all(),
      });
      toast.success('Access-Token wurde reaktiviert');
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
};
```

### Frontend Dialog-Pattern (von Epic 3)

```typescript
// TokenRevokeConfirmDialog.tsx
interface TokenRevokeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokenName: string;
  tokenId: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TokenRevokeConfirmDialog({
  isOpen,
  onClose,
  tokenName,
  tokenId,
  onConfirm,
  isLoading,
}: TokenRevokeConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogPanel className="...">
        <DialogTitle>Token deaktivieren</DialogTitle>

        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sind Sie sicher, dass Sie den Token <strong>"{tokenName}"</strong> deaktivieren moechten?
          </p>

          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Alle Geraete mit diesem Token verlieren sofort den Zugriff.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deaktiviere...' : 'Deaktivieren'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
```

### Learnings aus Story 4.1 (BEACHTEN!)

1. **Error Handling**: bcrypt-Fehler mit try-catch abfangen
2. **Token Prefix Length-Check**: Defensive Validierung fuer tokenId
3. **requestedById Validierung**: Trim + Min-Length 8 chars im Command
4. **Test Coverage**: 25+ Tests pro Handler (Success, NotFound, AlreadyRevoked)
5. **A11y**: Screen Reader Announcements fuer Status-Aenderungen
6. **Toast Duration**: Default nutzen, nicht explizit setzen

### Commit-Strategie

```
✨(admin): Add RevokeAccessTokenCommand and Handler
✨(admin): Add ReactivateAccessTokenCommand and Handler with Domain extension
✨(admin): Add POST /admin/tokens/:id/revoke and /reactivate endpoints
✨(admin): Add useRevokeAccessToken and useReactivateAccessToken hooks
✨(admin): Add TokenRevokeConfirmDialog component
✨(admin): Extend TokenListItem with revoke/reactivate actions
🧪(admin): Add comprehensive tests for token revocation
```

### Project Structure Notes

- Alignment mit Feature-based Struktur (features/admin/)
- Keine neue Route noetig - alles auf `/admin/tokens` Page
- API-Client nach Backend-Aenderungen regenerieren
- Query Keys sind bereits in `ADMIN_QUERY_KEYS.accessTokens` definiert

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/implementation-artifacts/4-1-access-token-mit-namen-erstellen.md]
- [Source: CLAUDE.md#Code Review Checklist (Backend Architecture)]
- [Source: packages/backend/src/domain/aggregates/server-access-token.aggregate.ts:303-318]
- [Source: packages/backend/src/domain/events/server-access-token-revoked.event.ts]
- [Source: packages/backend/src/modules/admin/controllers/admin-token.controller.ts]
- [Source: packages/frontend/src/features/admin/api/use-access-token-management.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend build successful after adding `revokedAt` to TokenListItemDto
- API-Client regenerated with new endpoints
- Frontend build successful
- 26 new tests for revoke/reactivate commands and handlers

### Completion Notes List

1. **Backend Implementation Complete**
   - RevokeAccessTokenCommand + Handler mit TransactionalCommandHandler
   - ReactivateAccessTokenCommand + Handler mit TransactionalCommandHandler
   - `reactivate()` Methode zum ServerAccessToken Aggregate hinzugefuegt
   - ServerAccessTokenReactivatedEvent erstellt
   - Controller Endpoints POST /:id/revoke und POST /:id/reactivate
   - `revokedAt` Feld zum TokenListItemDto hinzugefuegt
   - 26 Unit Tests (Given-When-Then Pattern)

2. **Frontend Implementation Complete**
   - useRevokeAccessToken und useReactivateAccessToken Hooks
   - TokenRevokeConfirmDialog mit Headless UI + Tailwind CSS
   - TokenListItem erweitert mit Revoke/Reactivate Actions
   - TokenList Integration mit Dialog-State Management
   - ApiErrorContext erweitert

3. **API-Client regeneriert**
   - adminTokenControllerRevokeTokenVAlpha
   - adminTokenControllerReactivateTokenVAlpha
   - TokenListItemDto mit revokedAt Feld

4. **Pending Manual Test**
   - AC4: API-Request mit deaktiviertem Token (401) - requires Admin login

### File List

**Backend (NEU zu erstellen):**
- `packages/backend/src/application/admin/commands/revoke-access-token.command.ts`
- `packages/backend/src/application/admin/commands/revoke-access-token.handler.ts`
- `packages/backend/src/application/admin/commands/reactivate-access-token.command.ts`
- `packages/backend/src/application/admin/commands/reactivate-access-token.handler.ts`
- `packages/backend/src/domain/events/server-access-token-reactivated.event.ts`

**Backend (MODIFIZIEREN):**
- `packages/backend/src/domain/aggregates/server-access-token.aggregate.ts` (reactivate() hinzufuegen)
- `packages/backend/src/modules/admin/controllers/admin-token.controller.ts` (2 Endpoints)
- `packages/backend/src/modules/admin/admin.module.ts` (Handler registrieren)

**Frontend (NEU zu erstellen):**
- `packages/frontend/src/features/admin/ui/organisms/TokenRevokeConfirmDialog.tsx`

**Frontend (MODIFIZIEREN):**
- `packages/frontend/src/features/admin/api/use-access-token-management.ts` (2 Hooks)
- `packages/frontend/src/features/admin/ui/molecules/TokenListItem.tsx` (Actions)
- `packages/frontend/src/features/admin/ui/organisms/TokenList.tsx` (Dialog-State)
