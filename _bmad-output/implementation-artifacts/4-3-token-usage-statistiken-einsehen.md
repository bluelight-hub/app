# Story 4.3: Token-Usage-Statistiken einsehen

Status: done

## Story

Als **Server-Administrator**,
moechte ich **sehen koennen, wann ein Token zuletzt verwendet wurde**,
damit **ich inaktive Tokens identifizieren und nicht mehr genutzte Tokens bereinigen kann**.

## Acceptance Criteria

### AC1: Nie verwendeter Token

**Given** ein Token existiert und wurde noch nie verwendet
**When** ich die Token-Liste oder Token-Details ansehe
**Then** zeigt `lastUsedAt` den Wert "Nie verwendet" an

### AC2: Token-Nutzung tracken

**Given** ein Token wird fuer einen API-Request verwendet
**When** der `ServerAccessGuard` den Token validiert
**Then** wird `lastUsedAt` auf den aktuellen Zeitstempel aktualisiert
**And** diese Aktualisierung erfolgt asynchron (nicht blockierend fuer den Request)

### AC3: Token-Liste mit Usage-Info

**Given** ich bin im Admin-Panel und sehe die Token-Liste
**When** ich die Liste ansehe
**Then** sehe ich fuer jeden Token: Name, Prefix, Status, Erstellt am, Zuletzt verwendet am
**And** die Liste ist sortierbar nach "Zuletzt verwendet" (aelteste zuerst fuer Bereinigung)

### AC4: Inaktive Tokens filtern

**Given** ich moechte inaktive Tokens finden
**When** ich die Token-Liste nach "Zuletzt verwendet" sortiere (aufsteigend)
**Then** erscheinen Tokens, die laenger nicht verwendet wurden, oben
**And** ich kann optional nach "Nicht verwendet seit X Tagen" filtern

### AC5: Inaktivitaets-Warnung

**Given** ein Token wurde laenger als 90 Tage nicht verwendet
**When** ich die Token-Liste ansehe
**Then** wird dieser Token mit einem visuellen Hinweis markiert (z.B. oranges Badge "Inaktiv")
**And** ein Tooltip erklaert: "Dieser Token wurde seit ueber 90 Tagen nicht verwendet"

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: ServerAccessGuard mit asynchronem Usage-Tracking** (AC: 2) ✅
  - [x] 1.1: EventEmitter2 injizieren in ServerAccessGuard
  - [x] 1.2: Nach erfolgreicher Token-Validierung: `recordUsage()` Event emittieren (fire-and-forget)
  - [x] 1.3: Event Handler `ServerAccessTokenUsedEventHandler` erstellen
  - [x] 1.4: Handler aktualisiert `lastUsedAt` via Repository (async, non-blocking)
  - [x] 1.5: Rate-Limiting: Nur 1x pro Token pro 60s updaten (Debounce)
  - [x] 1.6: Unit Tests fuer Guard und Event Handler (17 Tests)

- [x] **Task 2: Prisma Migration fuer Performance-Index** (AC: 3, 4) ✅
  - [x] 2.1: Migration erstellt: `idx_server_access_token_last_used`
  - [x] 2.2: Migration ausgefuehrt: `20260112172123_add_last_used_at_index`

- [x] **Task 3: GetTokenListQuery erweitern** (AC: 3, 4) ✅
  - [x] 3.1: Query-Parameter `sortBy?: 'createdAt' | 'lastUsedAt' | 'name'`
  - [x] 3.2: Query-Parameter `sortOrder?: 'asc' | 'desc'` (default: desc)
  - [x] 3.3: Query-Parameter `inactiveDays?: number` (Filter implementiert)
  - [x] 3.4: Repository-Methode erweitert mit Sortierung und Filterung
  - [x] 3.5: Unit Tests fuer Sortierung und Filterung (55 Tests)

- [x] **Task 4: Controller-Endpoint erweitern** (AC: 3, 4) ✅
  - [x] 4.1: `GET /admin/tokens` Query-Parameter hinzugefuegt
  - [x] 4.2: Swagger-Dokumentation aktualisiert
  - [x] 4.3: API-Client generiert

### Frontend Tasks

- [x] **Task 5: lastUsedAt Formatierung** (AC: 1, 3) ✅
  - [x] 5.1: Helper-Funktion `formatLastUsed` erstellt
  - [x] 5.2: Wenn `null` → "Nie verwendet" anzeigen
  - [x] 5.3: Sonst relative Zeit mit date-fns (deutsche Locale)
  - [x] 5.4: Tooltip mit exaktem Datum/Uhrzeit

- [x] **Task 6: TokenListItem mit Usage-Info erweitern** (AC: 1, 3, 5) ✅
  - [x] 6.1: lastUsedAt Spalte in TokenListItem anzeigen
  - [x] 6.2: Formatierte Zeit mit Tooltip (exaktes Datum)
  - [x] 6.3: InactivityBadge Component fuer >90 Tage Inaktivitaet
  - [x] 6.4: Tailwind Styling: `bg-amber-100 text-amber-800` fuer Inaktivitaets-Badge

- [x] **Task 7: Sortier-Optionen in TokenList** (AC: 3, 4) ✅
  - [x] 7.1: Dropdown fuer Sortierung implementiert
  - [x] 7.2: Optionen: "Erstellt am", "Zuletzt verwendet", "Name"
  - [x] 7.3: Sortierrichtung Toggle (auf-/absteigend)
  - [x] 7.4: Client-side Sortierung implementiert

- [ ] **Task 8: Inaktivitaets-Filter (optional)** (AC: 4) - DEFERRED
  - Backend-API bereit, Frontend-UI kann spaeter hinzugefuegt werden

### Testing Tasks

- [x] **Task 9: E2E Spot-Check mit Chrome MCP** ✅
  - [x] 9.1: Token Liste zeigt "Nie verwendet" fuer unbenutzte Tokens
  - [x] 9.2: Usage-Tracking funktioniert ("vor 2 Tagen" bei Initial Setup Token)
  - [x] 9.3: Sortierung nach Erstelldatum (auf-/absteigend) verifiziert
  - [x] 9.4: Inaktivitaets-Badge bei unbenutzten Tokens angezeigt

## Dev Notes

### KRITISCH: Existierende Implementierung analysiert!

Das Backend hat **BEREITS** die Grundlagen:

```typescript
// packages/backend/src/domain/aggregates/server-access-token.aggregate.ts
public recordUsage(): void {
  const usedAt = new Date();
  this._lastUsedAt = usedAt;
  this.updateTimestamp();
  this.addDomainEvent(new ServerAccessTokenUsedEvent(this._id, usedAt));
}
```

**ABER:** Diese Methode wird aktuell **NICHT** im ServerAccessGuard aufgerufen!

Das Frontend zeigt `lastUsedAt` bereits im DTO an, aber:
- Keine Formatierung ("Nie verwendet" vs. relative Zeit)
- Keine Sortierung implementiert
- Kein Inaktivitaets-Badge

### Architektur-Pattern: Asynchrones Usage-Tracking

```
Request → ServerAccessGuard
              ↓ (Token valid)
           EventEmitter.emit('token.used', { tokenId })
              ↓ (async, non-blocking)
           Response ← Controller
              ↓ (parallel)
           ServerAccessTokenUsedEventHandler
              ↓
           Repository.updateLastUsed(tokenId)
```

**Wichtig:** Das Usage-Tracking darf den Request NICHT blockieren!

### Performance-Optimierung: Debounce

Um die Datenbank nicht bei jedem Request zu belasten:

```typescript
// Event Handler mit In-Memory Debounce
private lastUpdateMap = new Map<string, number>();
private DEBOUNCE_MS = 60_000; // 1 Minute

async handle(event: ServerAccessTokenUsedEvent) {
  const tokenId = event.tokenId.toString();
  const now = Date.now();
  const lastUpdate = this.lastUpdateMap.get(tokenId) ?? 0;

  if (now - lastUpdate < this.DEBOUNCE_MS) {
    return; // Skip update, already updated recently
  }

  this.lastUpdateMap.set(tokenId, now);
  await this.repository.updateLastUsed(event.tokenId, event.usedAt);
}
```

### Repository-Erweiterung

```typescript
// IServerAccessTokenRepository erweitern
updateLastUsed(tokenId: AccessTokenId, usedAt: Date, tx?: TransactionContext): Promise<Result<void>>;

// PrismaServerAccessTokenRepository
async updateLastUsed(tokenId: AccessTokenId, usedAt: Date, tx?: TransactionContext): Promise<Result<void>> {
  const client = tx ?? this.prisma;
  await client.serverAccessToken.update({
    where: { id: tokenId.toString() },
    data: { lastUsedAt: usedAt },
  });
  return Result.ok();
}
```

### Query-Parameter fuer Sortierung

```typescript
// GetTokenListQuery erweitern
export interface GetTokenListQueryParams {
  page?: number;        // default: 1
  limit?: number;       // default: 20, max: 100
  sortBy?: 'createdAt' | 'lastUsedAt' | 'name';  // NEW
  sortOrder?: 'asc' | 'desc';                     // NEW, default: desc
  inactiveDays?: number;                          // NEW, Filter
}
```

### Frontend: Relative Zeit Formatierung

```typescript
// packages/frontend/src/features/admin/lib/format-last-used.ts
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatLastUsed(lastUsedAt: string | null): {
  text: string;
  tooltip: string;
  isInactive: boolean;
} {
  if (!lastUsedAt) {
    return {
      text: 'Nie verwendet',
      tooltip: 'Dieser Token wurde noch nie verwendet',
      isInactive: true
    };
  }

  const date = parseISO(lastUsedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  return {
    text: formatDistanceToNow(date, { addSuffix: true, locale: de }),
    tooltip: format(date, "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de }),
    isInactive: diffDays > 90
  };
}
```

### InactivityBadge Component

```typescript
// packages/frontend/src/features/admin/ui/atoms/InactivityBadge.tsx
interface InactivityBadgeProps {
  isInactive: boolean;
  tooltip?: string;
}

export function InactivityBadge({ isInactive, tooltip }: InactivityBadgeProps) {
  if (!isInactive) return null;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      title={tooltip ?? "Dieser Token wurde seit ueber 90 Tagen nicht verwendet"}
    >
      Inaktiv
    </span>
  );
}
```

### Prisma Migration

```sql
-- Migration: add_last_used_at_index
CREATE INDEX idx_server_access_token_last_used
ON server_access_tokens(last_used_at DESC NULLS LAST);
```

### Learnings aus Story 4.1 und 4.2 (BEACHTEN!)

1. **Error Handling**: Alle async Operationen mit try-catch
2. **Event Emitter**: `@nestjs/event-emitter` bereits im Projekt
3. **Pagination**: Existierende `PaginatedResponseDto` Pattern nutzen
4. **date-fns**: Bereits installiert fuer Datums-Formatierung
5. **Tailwind Badges**: `bg-amber-*` fuer Warnungen, konsistent mit Design System

### Code-Review Checklist (AC1-AC7 aus CLAUDE.md)

| Rule | Pattern | Validierung |
|------|---------|-------------|
| **AC1: DI Imports** | `import` (NICHT `import type`) fuer Injectable Classes | Pre-commit Hook |
| **AC2: DI Tokens** | `DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN` | Zentralisiert |
| **AC3: Framework-Agnostic** | Nur `@Injectable` in Application Layer | Keine NestJS-Decorators |
| **AC4: Result Pattern** | `Result<T>` statt Exceptions | Handler nutzt Result |
| **AC5: Outbox Integration** | Event Handler (nicht Outbox fuer Usage-Tracking) | Performance-kritisch |
| **AC6: Test Pattern** | AAA mit Given-When-Then | Kommentare |
| **AC7: Response Decorators** | `@ApiWrappedResponse(TokenListItemDto)` | Custom Decorator |

### Commit-Strategie

```
✨(admin): Add async usage tracking in ServerAccessGuard
🗃️(prisma): Add lastUsedAt index for token sorting performance
✨(admin): Extend GetTokenListQuery with sorting and filtering
✨(admin): Add lastUsedAt formatting and InactivityBadge component
✨(admin): Add sort controls to TokenList
🧪(admin): Add comprehensive tests for usage tracking
```

### Project Structure Notes

**Backend Erweiterungen:**
```
packages/backend/src/
├── infrastructure/
│   └── guards/
│       └── server-access.guard.ts (ERWEITERN: Event emit)
├── application/
│   └── admin/
│       ├── queries/
│       │   ├── get-token-list.query.ts (ERWEITERN: sortBy, sortOrder, inactiveDays)
│       │   └── get-token-list.handler.ts (ERWEITERN: Sortierung/Filter)
│       └── event-handlers/
│           └── server-access-token-used.handler.ts (NEU)
└── modules/
    └── admin/
        └── controllers/
            └── admin-token.controller.ts (ERWEITERN: Query-Parameter)
```

**Frontend Erweiterungen:**
```
packages/frontend/src/
└── features/
    └── admin/
        ├── lib/
        │   └── format-last-used.ts (NEU)
        ├── api/
        │   └── use-access-token-management.ts (ERWEITERN: Sort-Params)
        └── ui/
            ├── atoms/
            │   └── InactivityBadge.tsx (NEU)
            ├── molecules/
            │   └── TokenListItem.tsx (ERWEITERN: lastUsedAt + Badge)
            └── organisms/
                └── TokenList.tsx (ERWEITERN: Sort-Controls)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28]
- [Source: _bmad-output/implementation-artifacts/4-1-access-token-mit-namen-erstellen.md]
- [Source: _bmad-output/implementation-artifacts/4-2-access-token-deaktivieren.md]
- [Source: CLAUDE.md#Code Review Checklist (Backend Architecture)]
- [Source: packages/backend/src/domain/aggregates/server-access-token.aggregate.ts:recordUsage()]
- [Source: packages/backend/src/domain/events/server-access-token-used.event.ts]
- [Source: packages/backend/src/infrastructure/guards/server-access.guard.ts]
- [Source: packages/backend/src/application/admin/queries/get-token-list.handler.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- 2026-01-12: Story implementiert mit allen Tasks
- 2026-01-12: Code Review durchgefuehrt (Adversarial Review mit Subagents)
- 2026-01-12: 16 Issues gefunden, alle HIGH/MEDIUM Issues gefixt

### Code Review Fixes (2026-01-12)

**Backend Fixes:**
1. ✅ EventEmitter Integration in ServerAccessGuard hinzugefuegt (server-access.guard.ts)
2. ✅ Pagination Metadata in Controller Response korrigiert (admin-token.controller.ts)
3. ✅ Controller Tests an neue Signatur angepasst (admin-token.controller.spec.ts)
4. ⏭️ Race Condition: FALSE POSITIVE - Code war bereits korrekt
5. ⏭️ Dead Code: FALSE POSITIVE - undefined Check ist notwendig

**Frontend Fixes:**
1. ✅ Accessibility: aria-label zu lastUsedAt Tooltip hinzugefuegt (TokenListItem.tsx)
2. ✅ Accessibility: role="status" und aria-label zu InactivityBadge (InactivityBadge.tsx)
3. ✅ Query Key Cache: Sort-Parameter aus Query Key entfernt (queries.ts, use-access-token-management.ts)
4. ✅ Code Duplication: formatDate() nutzt jetzt date-fns (TokenListItem.tsx)

**Test Fixes:**
1. ⏭️ Jest Type Imports: FALSE POSITIVE - IDE-Problem, Tests laufen korrekt

**Verifizierung:**
- 159/159 Story-spezifische Tests PASSED
- DI Import Pattern Check: PASSED (892 Dateien)
- Biome Lint: PASSED

### File List

**Backend (NEU zu erstellen):**
- `packages/backend/src/application/admin/event-handlers/server-access-token-used.handler.ts`
- `packages/backend/prisma/migrations/YYYYMMDD_add_last_used_at_index/migration.sql`

**Backend (MODIFIZIEREN):**
- `packages/backend/src/infrastructure/guards/server-access.guard.ts` (Event emit)
- `packages/backend/src/application/admin/queries/get-token-list.query.ts` (Sort-Params)
- `packages/backend/src/application/admin/queries/get-token-list.handler.ts` (Sortierung)
- `packages/backend/src/domain/repositories/i-server-access-token.repository.ts` (updateLastUsed)
- `packages/backend/src/infrastructure/server-access-token/repositories/prisma-server-access-token.repository.ts` (updateLastUsed)
- `packages/backend/src/modules/admin/controllers/admin-token.controller.ts` (Query-Params)
- `packages/backend/src/modules/admin/admin.module.ts` (Event Handler registrieren)

**Frontend (NEU zu erstellen):**
- `packages/frontend/src/features/admin/lib/format-last-used.ts`
- `packages/frontend/src/features/admin/ui/atoms/InactivityBadge.tsx`

**Frontend (MODIFIZIEREN):**
- `packages/frontend/src/features/admin/api/use-access-token-management.ts` (Sort-Params)
- `packages/frontend/src/features/admin/ui/molecules/TokenListItem.tsx` (lastUsedAt + Badge)
- `packages/frontend/src/features/admin/ui/organisms/TokenList.tsx` (Sort-Controls)
