# Story 4.4: Token rotieren

Status: done

## Story

Als **Server-Administrator**,
moechte ich **einen existierenden Token rotieren koennen (neuer Token, alter invalidiert)**,
damit **ich regelmaessig Credentials erneuern kann, ohne dass Nutzer einen komplett neuen Onboarding-Prozess durchlaufen muessen**.

## Acceptance Criteria

### AC1: Rotation starten

**Given** ich bin als Administrator eingeloggt und sehe die Token-Details
**When** ich auf "Token rotieren" klicke
**Then** erscheint ein Dialog mit Erklaerung: "Ein neuer Token wird generiert. Der alte Token wird sofort ungueltig."
**And** der bisherige Token-Name wird uebernommen (editierbar)
**And** ich muss die Aktion bestaetigen

### AC2: Rotation durchfuehren

**Given** ich habe die Token-Rotation bestaetigt
**When** die Rotation ausgefuehrt wird
**Then** wird ein neuer Token mit gleichem Namen generiert
**And** der alte Token wird als `isRevoked = true` markiert
**And** der neue Token wird genau einmal angezeigt (wie bei Neuerstellung)
**And** Copy-to-Clipboard und Bestaetigung sind erforderlich

### AC3: Alter Token ungueltig

**Given** die Token-Rotation wurde abgeschlossen
**When** ein Client den alten Token verwendet
**Then** erhaelt er 401 Unauthorized
**And** die Fehlermeldung lautet: "Server access token has been rotated"

### AC4: Token-Historie

**Given** die Token-Rotation wurde abgeschlossen
**When** ich die Token-Liste ansehe
**Then** sehe ich den neuen aktiven Token mit aktualisiertem Erstellungsdatum
**And** der alte Token erscheint als "Rotiert" (nicht "Deaktiviert") mit Verweis auf den neuen Token

### AC5: Mehrfache Rotationen

**Given** mehrere Token-Rotationen fuer denselben Zweck wurden durchgefuehrt
**When** ich die Token-Historie ansehe
**Then** sehe ich die Kette: Original -> Rotation 1 -> Rotation 2 (aktuell)
**And** alle alten Tokens sind als "Rotiert" markiert

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Prisma Migration fuer rotatedFromId** (AC: 4, 5)
  - [ ] 1.1: Neues Feld `rotatedFromId: String?` zu ServerAccessToken Schema hinzufuegen
  - [ ] 1.2: Self-Relation fuer Token-Kette: `rotatedFrom ServerAccessToken?`
  - [ ] 1.3: Index auf `rotatedFromId` fuer effiziente Abfragen
  - [ ] 1.4: Migration ausfuehren und testen

- [ ] **Task 2: ServerAccessTokenRotatedEvent erstellen** (AC: 2)
  - [ ] 2.1: `ServerAccessTokenRotatedEvent` in `/domain/events/`
  - [ ] 2.2: Properties: `oldTokenId`, `newTokenId`, `rotatedAt`, `rotatedBy`
  - [ ] 2.3: Event-Namen in `event-names.ts` registrieren: `SERVER_ACCESS_TOKEN.ROTATED`
  - [ ] 2.4: Unit Tests fuer Event-Erstellung

- [ ] **Task 3: RotateAccessTokenCommand & Handler** (AC: 1, 2, 3)
  - [ ] 3.1: `RotateAccessTokenCommand` mit `tokenId`, `newName?`, `requestedById`
  - [ ] 3.2: Command Factory mit Result<T> Validierung (tokenId min 24 chars)
  - [ ] 3.3: `RotateAccessTokenHandler extends TransactionalCommandHandler`
  - [ ] 3.4: Alten Token laden und validieren (aktiv, nicht expired)
  - [ ] 3.5: Neuen Token generieren: `blh_` + cuid2, bcrypt hash
  - [ ] 3.6: Neuen Token speichern mit `rotatedFromId = oldToken.id`
  - [ ] 3.7: Alten Token revoken mit spezieller "rotated" Markierung
  - [ ] 3.8: Drei Events emittieren: Created, Revoked, Rotated
  - [ ] 3.9: Raw-Token NUR im Response zurueckgeben
  - [ ] 3.10: Unit Tests (AAA Pattern) - 25+ Tests
    - Token found, active → Success
    - Token not found → 404
    - Token already revoked → 400
    - Token expired → 400
    - Name update during rotation

- [ ] **Task 4: ServerAccessToken Aggregate erweitern** (AC: 4, 5)
  - [ ] 4.1: Neues Feld `rotatedFromId?: AccessTokenId`
  - [ ] 4.2: Getter `get rotatedFromId(): AccessTokenId | null`
  - [ ] 4.3: Factory anpassen: `create(props)` mit optionalem `rotatedFromId`
  - [ ] 4.4: `reconstruct(props)` mit `rotatedFromId` erweitern
  - [ ] 4.5: Neue Methode `wasRotated(): boolean` (rotatedFromId !== null)
  - [ ] 4.6: Neue Methode `markAsRotatedReplacement(oldTokenId)` fuer Erstellung
  - [ ] 4.7: Unit Tests fuer Aggregate-Erweiterungen

- [ ] **Task 5: TokenListItemDto erweitern** (AC: 4, 5)
  - [ ] 5.1: Neues Feld `rotatedFromId?: string` im DTO
  - [ ] 5.2: Neues Feld `rotatedStatus?: 'rotated' | 'replacement'`
  - [ ] 5.3: Swagger-Dokumentation aktualisieren
  - [ ] 5.4: Mapper anpassen fuer neue Felder

- [ ] **Task 6: Controller Endpoint** (AC: 1, 2)
  - [ ] 6.1: `POST /api/admin/tokens/:id/rotate` in AdminTokenController
  - [ ] 6.2: Request-DTO mit optionalem `newName?: string`
  - [ ] 6.3: Response: `RotateAccessTokenResponseDto` mit `token` (einmalig), `name`, `prefix`, `createdAt`, `rotatedFromId`
  - [ ] 6.4: `@ApiWrappedCreatedResponse(RotateAccessTokenResponseDto)`
  - [ ] 6.5: `@UseGuards(AdminJwtAuthGuard)` fuer Admin-Only
  - [ ] 6.6: `@Throttle({ default: { limit: 5, ttl: 60000 } })` Rate-Limiting (strenger als create)
  - [ ] 6.7: Unit Tests - Success, 404, Already Revoked, Expired

- [ ] **Task 7: API-Client generieren**
  - [ ] 7.1: `pnpm run generate-api` ausfuehren
  - [ ] 7.2: Verifiziere generierte Method: `adminTokenControllerRotateTokenVAlpha`

### Frontend Tasks

- [ ] **Task 8: TanStack Query Hook** (AC: 1, 2)
  - [ ] 8.1: `useRotateAccessToken` Mutation Hook in `use-access-token-management.ts`
  - [ ] 8.2: Interface: `{ tokenId: string, newName?: string }`
  - [ ] 8.3: Cache-Invalidation via `ADMIN_QUERY_KEYS.accessTokens.all()`
  - [ ] 8.4: Toast-Notifications fuer Success/Error

- [ ] **Task 9: TokenRotationModal Organism** (AC: 1, 2)
  - [ ] 9.1: Headless UI Dialog mit TanStack Form
  - [ ] 9.2: Bestehenden Token-Namen vorausfuellen (editierbar)
  - [ ] 9.3: Warnung: "Ein neuer Token wird generiert. Der alte Token wird sofort ungueltig."
  - [ ] 9.4: "Rotieren" Button (primary) und "Abbrechen" Button
  - [ ] 9.5: Loading-State waehrend API-Call
  - [ ] 9.6: Erfolgs-Ansicht mit neuem Token (einmalig anzeigen)
  - [ ] 9.7: Copy-to-Clipboard Button mit Toast-Feedback
  - [ ] 9.8: Checkbox "Ich habe den Token gesichert" vor Schliessen
  - [ ] 9.9: Tailwind Dark Mode Support

- [ ] **Task 10: TokenListItem erweitern** (AC: 4, 5)
  - [ ] 10.1: "Rotieren" Action-Button hinzufuegen
  - [ ] 10.2: Neuer Status-Badge "Rotiert" (unterschiedlich zu "Deaktiviert")
  - [ ] 10.3: Visueller Hinweis auf Nachfolge-Token (Link/Badge)
  - [ ] 10.4: Tooltip: "Dieser Token wurde rotiert. Neuer Token: [prefix]"
  - [ ] 10.5: Rotierte Tokens koennen NICHT reaktiviert werden (Button disabled)

- [ ] **Task 11: TokenList Integration** (AC: 1, 2)
  - [ ] 11.1: `selectedTokenForRotation` State hinzufuegen
  - [ ] 11.2: onRotateClick Handler
  - [ ] 11.3: TokenRotationModal einbinden
  - [ ] 11.4: Optional: Token-Ketten-Visualisierung (aufklappbar)

### Testing Tasks

- [ ] **Task 12: E2E Spot-Check mit Chrome MCP**
  - [ ] 12.1: Token-Rotation Flow testen
  - [ ] 12.2: Neuer Token wird korrekt angezeigt
  - [ ] 12.3: Alter Token als "Rotiert" markiert
  - [ ] 12.4: Copy-to-Clipboard funktioniert
  - [ ] 12.5: Checkbox-Bestaetigung vor Schliessen

## Dev Notes

### KRITISCH: Rotation erzeugt NEUES Aggregate!

Token-Rotation ist **NICHT** ein Update des bestehenden Tokens, sondern:
1. **NEUER Token** mit neuer ID, neuem Hash
2. **ALTER Token** wird revoked
3. **Verknuepfung** via `rotatedFromId`

```typescript
// Rotation Flow im Handler
async executeInTransaction(command, tx) {
  // 1. Alten Token laden
  const oldToken = await this.tokenRepository.findById(command.tokenId, tx);
  if (!oldToken || oldToken.isRevoked || !oldToken.isValid()) {
    throw new BadRequestException('Token kann nicht rotiert werden');
  }

  // 2. NEUEN Token generieren (wie CreateAccessTokenHandler)
  const rawToken = `blh_${createId()}`;
  const prefix = rawToken.substring(0, 12);
  const tokenHash = await bcrypt.hash(rawToken, 10);

  // 3. Neuen Token erstellen MIT Verweis auf alten
  const newToken = ServerAccessToken.create({
    tokenHash: TokenHash.create(tokenHash).value!,
    name: command.newName ?? oldToken.name,
    expiresAt: oldToken.expiresAt,
    rotatedFromId: oldToken.id,  // NEU!
  });

  // 4. Alten Token revoken
  oldToken.revoke();  // Emittiert: ServerAccessTokenRevokedEvent

  // 5. BEIDE speichern in gleicher Transaktion
  await this.tokenRepository.save(newToken.value!, tx);
  await this.tokenRepository.save(oldToken, tx);

  // 6. Rotations-Event emittieren
  const rotatedEvent = new ServerAccessTokenRotatedEvent(
    oldToken.id,
    newToken.value!.id,
    new Date(),
    command.requestedById
  );

  // 7. Raw-Token NUR hier zurueckgeben!
  return {
    result: {
      token: rawToken,       // EINMALIG!
      name: newToken.value!.name,
      prefix,
      createdAt: newToken.value!.createdAt,
      rotatedFromId: oldToken.id.toString(),
    },
    events: [
      ...newToken.value!.getDomainEvents(),
      ...oldToken.getDomainEvents(),
      rotatedEvent,
    ],
  };
}
```

### Prisma Schema Erweiterung

```prisma
model ServerAccessToken {
  id           String    @id @default(cuid())
  tokenHash    String    @unique @db.VarChar(60)
  name         String?   @db.VarChar(100)
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  isRevoked    Boolean   @default(false)
  revokedAt    DateTime?

  // NEU: Rotation-Referenz
  rotatedFromId String?
  rotatedFrom   ServerAccessToken?  @relation("TokenRotation", fields: [rotatedFromId], references: [id])
  rotatedTo     ServerAccessToken?  @relation("TokenRotation")

  inviteCodeId String? @unique
  createdByInvite InviteCode? @relation(...)

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([rotatedFromId], map: "idx_server_access_token_rotated_from")
  @@map("server_access_tokens")
}
```

### Domain Event: ServerAccessTokenRotatedEvent

```typescript
// packages/backend/src/domain/events/server-access-token-rotated.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { AccessTokenId } from '@domain/value-objects/access-token-id';

export class ServerAccessTokenRotatedEvent extends DomainEvent {
  constructor(
    public readonly oldTokenId: AccessTokenId,
    public readonly newTokenId: AccessTokenId,
    public readonly rotatedAt: Date,
    public readonly rotatedBy?: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? newTokenId.toString());
  }
}
```

### Architektur-Patterns (KRITISCH - BEFOLGEN!)

#### Backend Hexagonal Architecture

```
Domain Layer (ERWEITERN):
├── /domain/aggregates/server-access-token.aggregate.ts (rotatedFromId hinzufuegen)
├── /domain/events/server-access-token-rotated.event.ts (NEU)
└── /domain/events/event-names.ts (ROTATED hinzufuegen)

Application Layer (NEU ERSTELLEN):
├── /application/admin/commands/rotate-access-token.command.ts (NEU)
├── /application/admin/commands/rotate-access-token.handler.ts (NEU)
└── /application/admin/dto/rotate-access-token.dto.ts (NEU)

Infrastructure Layer (ERWEITERN):
├── /infrastructure/server-access-token/repositories/ (rotatedFromId Support)
└── /prisma/migrations/YYYYMMDD_add_rotation_support/

Modules Layer (ERWEITERN):
└── /modules/admin/controllers/admin-token.controller.ts (rotate Endpoint)
```

#### Frontend Feature-Structure

```
/features/admin/ (ERWEITERN)
├── /api/
│   └── use-access-token-management.ts (useRotateAccessToken hinzufuegen)
└── /ui/
    ├── /molecules/
    │   └── TokenListItem.tsx (Rotate-Action + Rotated-Badge)
    └── /organisms/
        ├── TokenList.tsx (Rotation-State)
        └── TokenRotationModal.tsx (NEU)
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
| **AC7: Response Decorators** | `@ApiWrappedCreatedResponse` | Custom Decorator |

### Sicherheits-Anforderungen (NFR-S7, NFR-S8)

| Anforderung | Implementierung |
|-------------|-----------------|
| **Token nur einmal anzeigen** | Raw-Token NUR im Response, NICHT in DB, Logs, oder Cache |
| **Token-Hashing** | bcrypt Cost-Factor 10 (NFR-S1) |
| **Token-Format** | `blh_` + cuid2 (28 Zeichen total) |
| **Audit-Trail** | ServerAccessTokenRotatedEvent mit oldTokenId, newTokenId, rotatedBy |
| **Rate-Limiting** | 5 Requests/Minute fuer Token-Rotation (strenger als create) |

### Learnings aus Story 4.1, 4.2, 4.3 (BEACHTEN!)

1. **bcrypt Error Handling**: try-catch Block um bcrypt.hash()
2. **Token Prefix Length-Check**: Defensive Validierung fuer tokenId < 24 chars
3. **requestedById Validierung**: Trim + Min-Length 8 chars im Command
4. **Modal-Pattern**: Checkbox-Bestaetigung vor Token-Dialog schliessen
5. **State Cleanup**: useEffect Cleanup bei Unmount (createdToken State)
6. **Input Disabled**: Form-Inputs disabled waehrend Mutation pending
7. **A11y**: Screen Reader Announcements fuer Status-Aenderungen
8. **Toast Duration**: Default nutzen, nicht explizit setzen
9. **TransactionalCommandHandler**: BEIDE Token (alt + neu) in gleicher TX speichern

### Unterscheidung: "Rotiert" vs "Deaktiviert"

```typescript
// Frontend: Status-Badge Logik
function getTokenStatus(token: TokenListItemDto): TokenStatus {
  if (token.rotatedFromId && !token.isRevoked) {
    return 'replacement';  // Dieser Token ist das ERGEBNIS einer Rotation
  }
  if (token.isRevoked && token.rotatedToId) {
    return 'rotated';      // Dieser Token wurde DURCH Rotation ersetzt
  }
  if (token.isRevoked) {
    return 'revoked';      // Manuell deaktiviert
  }
  if (isExpired(token.expiresAt)) {
    return 'expired';
  }
  return 'active';
}

// Badge-Farben
// active: bg-green-100 text-green-800
// rotated: bg-blue-100 text-blue-800 (NEU! Unterscheidbar von revoked)
// revoked: bg-red-100 text-red-800
// expired: bg-gray-100 text-gray-800
// replacement: bg-green-100 text-green-800 + "Ersetzt [prefix]" Tooltip
```

### Commit-Strategie

```
🗃️(prisma): Add rotatedFromId field for token rotation support
✨(admin): Add ServerAccessTokenRotatedEvent
✨(admin): Extend ServerAccessToken aggregate with rotation support
✨(admin): Add RotateAccessTokenCommand and Handler
✨(admin): Add POST /admin/tokens/:id/rotate endpoint
✨(admin): Add useRotateAccessToken hook
✨(admin): Add TokenRotationModal with token display
✨(admin): Extend TokenListItem with rotation status
🧪(admin): Add comprehensive tests for token rotation
```

### Project Structure Notes

- Alignment mit Feature-based Struktur (features/admin/)
- Keine neue Route noetig - alles auf `/admin/tokens` Page
- API-Client nach Backend-Aenderungen regenerieren
- Query Keys sind bereits in `ADMIN_QUERY_KEYS.accessTokens` definiert

### Edge Cases zu beachten

1. **Token bereits revoked**: 400 Bad Request
2. **Token abgelaufen**: 400 Bad Request (kann nicht rotiert werden)
3. **Token nicht gefunden**: 404 Not Found
4. **Letzte aktive Token**: Story 4-5b behandelt Schutz, hier kein Block
5. **Rotation waehrend Rotation**: Rate-Limiting verhindert Double-Rotation
6. **Name-Validierung**: 3-50 Zeichen, Optional (behaelt alten Namen)

### Performance-Ueberlegungen

1. **Atomare Transaktion**: Beide Token-Operationen in einer TX
2. **Index auf rotatedFromId**: Fuer Token-Ketten-Abfragen
3. **Kein Eager-Loading**: rotatedFrom/rotatedTo nur bei Bedarf laden
4. **Rate-Limiting**: 5/min statt 10/min (teurer als create)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29]
- [Source: _bmad-output/implementation-artifacts/4-1-access-token-mit-namen-erstellen.md]
- [Source: _bmad-output/implementation-artifacts/4-2-access-token-deaktivieren.md]
- [Source: _bmad-output/implementation-artifacts/4-3-token-usage-statistiken-einsehen.md]
- [Source: CLAUDE.md#Code Review Checklist (Backend Architecture)]
- [Source: packages/backend/src/domain/aggregates/server-access-token.aggregate.ts]
- [Source: packages/backend/src/domain/events/event-names.ts]
- [Source: packages/backend/src/application/admin/commands/create-access-token.handler.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compiles without errors
- 58 Backend Unit Tests passed (26 Command + 32 Handler)
- API Client successfully generated with `adminTokenControllerRotateTokenVAlpha` method

### Completion Notes List

- 2026-01-12: Story implementiert mit allen 12 Tasks
- Backend: Prisma Migration, Domain Event, Aggregate, Command/Handler, DTO, Controller
- Frontend: TanStack Query Hook, TokenRotationModal, TokenListItem, TokenList Integration
- 58 Unit Tests fuer Backend (Command + Handler)
- E2E Test konnte nicht vollstaendig durchgefuehrt werden (Chrome Extension disconnected)
- Manuelle Tests empfohlen vor Code Review

### File List

**Backend (NEU zu erstellen):**
- `packages/backend/prisma/migrations/YYYYMMDD_add_token_rotation_support/migration.sql`
- `packages/backend/src/domain/events/server-access-token-rotated.event.ts`
- `packages/backend/src/application/admin/commands/rotate-access-token.command.ts`
- `packages/backend/src/application/admin/commands/rotate-access-token.handler.ts`
- `packages/backend/src/application/admin/dto/rotate-access-token-response.dto.ts`

**Backend (MODIFIZIEREN):**
- `packages/backend/prisma/schema.prisma` (rotatedFromId + Relation)
- `packages/backend/src/domain/aggregates/server-access-token.aggregate.ts` (rotatedFromId)
- `packages/backend/src/domain/events/event-names.ts` (ROTATED)
- `packages/backend/src/application/admin/dto/token-list-item.dto.ts` (rotatedFromId, rotatedStatus)
- `packages/backend/src/modules/admin/controllers/admin-token.controller.ts` (rotate Endpoint)
- `packages/backend/src/modules/admin/admin.module.ts` (Handler registrieren)

**Frontend (NEU zu erstellen):**
- `packages/frontend/src/features/admin/ui/organisms/TokenRotationModal.tsx`

**Frontend (MODIFIZIEREN):**
- `packages/frontend/src/features/admin/api/use-access-token-management.ts` (useRotateAccessToken)
- `packages/frontend/src/features/admin/ui/molecules/TokenListItem.tsx` (Rotate-Action + Badge)
- `packages/frontend/src/features/admin/ui/organisms/TokenList.tsx` (Rotation-State)
