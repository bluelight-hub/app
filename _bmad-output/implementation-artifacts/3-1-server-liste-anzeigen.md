# Story 3.1: Server-Liste anzeigen

Status: done

## Story

Als **Nutzer mit mehreren konfigurierten Servern**,
möchte ich **eine übersichtliche Liste aller meiner gespeicherten Server einsehen können**,
damit **ich einen Überblick über meine verfügbaren Organisationen habe und bei Bedarf Server verwalten kann**.

## Acceptance Criteria

### AC1: Server-Liste in Einstellungen

**Given** der Nutzer hat mindestens einen Server konfiguriert
**When** der Nutzer die Server-Verwaltung in den Einstellungen öffnet
**Then** wird eine Liste aller konfigurierten Server angezeigt
**And** jeder Eintrag zeigt Server-Name, URL und Online-Status

### AC2: Sortierung nach Nutzung

**Given** die Server-Liste wird angezeigt
**When** der Nutzer die Liste betrachtet
**Then** sind die Server nach "Zuletzt verwendet" sortiert (neueste zuerst)
**And** der zuletzt verwendete Server ist visuell hervorgehoben

### AC3: Offline-Server-Anzeige

**Given** ein Server ist offline oder nicht erreichbar
**When** die Liste geladen wird
**Then** zeigt der Status-Indikator "Offline" (grauer Punkt) an
**And** der Server bleibt in der Liste auswählbar

### AC4: Online-Server-Anzeige

**Given** ein Server ist online und erreichbar
**When** die Liste geladen wird
**Then** zeigt der Status-Indikator "Online" (grüner Punkt) an

### AC5: Leere Server-Liste

**Given** die Server-Liste ist leer
**When** der Nutzer die Server-Verwaltung öffnet
**Then** wird ein Empty State mit Hinweis "Keine Server konfiguriert" angezeigt
**And** ein CTA-Button "Server hinzufügen" ist sichtbar

## Tasks / Subtasks

- [x] **Task 1: ServerStatusDot Atom erstellen** (AC: 3, 4)
  - [x] 1.1 Erstelle `features/server/ui/atoms/ServerStatusDot.tsx`
  - [x] 1.2 Implementiere Props: `status: 'online' | 'offline' | 'checking'`
  - [x] 1.3 Implementiere Farben: online=grün (#10b981), offline=grau (#9ca3af), checking=gelb mit Pulse
  - [x] 1.4 Füge ARIA-Label für Accessibility hinzu (`aria-label="Server online/offline"`)
  - [x] 1.5 Schreibe Unit-Tests (5-8 Tests) → 14 Tests implementiert

- [x] **Task 2: ServerListItem Molecule erstellen** (AC: 1, 2, 3, 4)
  - [x] 2.1 Erstelle `features/server/ui/molecules/ServerListItem.tsx`
  - [x] 2.2 Implementiere Props: `server: ServerConfig`, `isActive: boolean`, `status: ConnectionStatus`
  - [x] 2.3 Layout: Flex mit ServerStatusDot | Name+URL | LastUsed Badge | Actions
  - [x] 2.4 Responsive: Stack auf Mobile, Row auf Desktop (`flex flex-col sm:flex-row`)
  - [x] 2.5 Hover-State: `hover:bg-gray-50 dark:hover:bg-gray-700/50`
  - [x] 2.6 Integriere "Zuletzt verwendet" Badge für isActive Server
  - [x] 2.7 Schreibe Unit-Tests (10-15 Tests) → 34 Tests implementiert

- [x] **Task 3: useServerListWithHealth Hook erstellen** (AC: 3, 4)
  - [x] 3.1 Erstelle `features/server/hooks/use-server-list-health.ts` (oder erweitere bestehenden) → bereits vorhanden
  - [x] 3.2 Kombiniere `useServerList()` mit `connectionStatus` aus Store → bereits implementiert
  - [x] 3.3 Implementiere Background Health Check für alle Server (non-blocking) → bereits implementiert
  - [x] 3.4 Nutze `staleTime` für Health-Queries (30s Cache) → nutzt useEffect statt Query
  - [x] 3.5 Schreibe Unit-Tests (8-10 Tests) → 12 Tests implementiert

- [x] **Task 4: ServerListEmptyState Molecule erstellen** (AC: 5)
  - [x] 4.1 Erstelle `features/server/ui/molecules/ServerListEmptyState.tsx`
  - [x] 4.2 Zeige Illustration/Icon + "Keine Server konfiguriert" Text
  - [x] 4.3 Implementiere CTA-Button "Server hinzufügen" mit Navigation
  - [x] 4.4 Nutze existierende Button Atom mit variant="primary"
  - [x] 4.5 Schreibe Unit-Tests (3-5 Tests) → 11 Tests implementiert

- [x] **Task 5: ServerList Organism erstellen** (AC: 1, 2, 5)
  - [x] 5.1 Erstelle `features/server/ui/organisms/ServerList.tsx`
  - [x] 5.2 Nutze `useServerList()` für sortierte Server (nach lastUsedAt DESC)
  - [x] 5.3 Map über Server mit `ServerListItem`
  - [x] 5.4 Zeige `ServerListEmptyState` wenn `servers.length === 0`
  - [x] 5.5 Implementiere Loading-State während Hydration
  - [x] 5.6 Schreibe Unit-Tests (10-12 Tests) → 25 Tests implementiert

- [x] **Task 6: Server-Verwaltung Route/Page erstellen** (AC: 1)
  - [x] 6.1 Erstelle Route für Server-Verwaltung (z.B. `/settings/servers`) → `/server/manage`
  - [x] 6.2 Erstelle `features/server/ui/pages/ServerManagementPage.tsx`
  - [x] 6.3 Integriere `ServerList` Organism in Page
  - [x] 6.4 Füge Page Title "Server verwalten" hinzu
  - [x] 6.5 Nutze existierendes Layout-Template
  - [x] 6.6 Schreibe Integration-Tests (5-7 Tests) → 10 Tests implementiert

- [x] **Task 7: Navigation zu Server-Verwaltung hinzufügen** (AC: 1)
  - [x] 7.1 Füge Link zur Server-Verwaltung im Settings-Menü hinzu → "Server verwalten" Button in ServerSelector
  - [x] 7.2 Alternativ: Gear-Icon im ServerSelector für direkten Zugang → PiGear Icon implementiert
  - [x] 7.3 Teste Navigation Flow → Navigiert zu /server/manage

## Dev Notes

### Architektur-Patterns (MUST FOLLOW)

**Bestehende Server Store Struktur (aus Codebase-Analyse):**
```typescript
// ✅ RICHTIG: Nutze bestehende Store-Hooks
import { useServerList } from '@/features/server/hooks/use-server-list';
import { useConnectionStatus } from '@/features/server/hooks/use-connection-status';
import { useActiveServer } from '@/features/server/hooks/use-active-server';

// Server Store Location: features/server/stores/server.store.ts
interface ServerState {
  servers: ServerConfig[];
  activeServerId: string | null;
  connectionStatus: Map<string, ConnectionStatus>;
  isHydrated: boolean;
}

// ConnectionStatus Type
type ConnectionStatus = 'connected' | 'disconnected' | 'checking';
```

**Atomic Design Pattern (aus Projekt-Konvention):**
```
Atoms      → ServerStatusDot (einfacher Status-Indikator)
Molecules  → ServerListItem, ServerListEmptyState (kombinierte Elemente)
Organisms  → ServerList (komplette Liste mit Logic)
Pages      → ServerManagementPage (Route-Komponente)
```

**Responsive Pattern (aus bestehenden Komponenten):**
```typescript
// ✅ RICHTIG: Mobile-first mit sm: Breakpoint
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
  {/* Content */}
</div>

// Touch-Target Minimum 44x44px
<button className="px-3 py-3 min-h-[44px] min-w-[44px]">
```

### Bestehende Komponenten (WIEDERVERWENDEN)

**Badge Atom existiert:** `shared/ui/atoms/badge.atom.tsx`
```typescript
// Nutzen für "Zuletzt verwendet" Badge
import { Badge } from '@/shared/ui/atoms/badge.atom';

<Badge variant="success" size="sm">Zuletzt verwendet</Badge>
```

**ServerSelector existiert:** `features/server/ui/molecules/ServerSelector.tsx`
- Hat bereits Status-Color-Mapping (line 50-60)
- Zeigt Server-Actions-Menü (Bearbeiten, Löschen)
- **NICHT duplizieren** - Referenz für Pattern

**useServerList Hook existiert:** `features/server/hooks/use-server-list.ts`
```typescript
// Bereits sortiert nach lastUsedAt
const servers = useServerList(); // Returns ServerConfig[] sorted by lastUsedAt DESC
```

**useConnectionStatus Hook existiert:** `features/server/hooks/use-connection-status.ts`
```typescript
// O(1) Lookup aus connectionStatus Map
const status = useConnectionStatus(serverId); // Returns ConnectionStatus
```

**Alert Atom existiert:** `shared/ui/atoms/alert.atom.tsx`
- Nutzen für Empty State falls passend

### Color Tokens (aus UX Design)

```typescript
// Status-Indikator Farben (Tailwind)
const STATUS_COLORS = {
  online: 'bg-green-500',     // #10b981
  offline: 'bg-gray-400',     // #9ca3af
  checking: 'bg-yellow-500 animate-pulse', // #eab308 mit Animation
} as const;

// Hover States
const HOVER_CLASSES = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
```

### Learnings aus Epic 2 (WICHTIG)

**Story 2.7 Learnings:**
1. **Test-First:** ~15-25 Tests pro Komponente erwartet
2. **Error-Handling:** Immer deutsche Fehlermeldungen (NFR-U3)
3. **Platform Detection:** `isTauri()` für plattformspezifisches Verhalten
4. **Toast Pattern:** `sonner` Library für nicht-blockierende Feedback
5. **Form Pattern:** TanStack Form + Zod für Validierung

**Story 2.6 Learnings (ServerSetupForm):**
1. **Health Check:** Background Check mit AbortController + 5s Timeout
2. **Debouncing:** 300ms für Auto-Fill/Validation
3. **Loading States:** Spinner während async Operationen

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-P5 | Server-Liste laden < 200ms | TanStack Store (bereits im Memory), kein async Load |
| NFR-U2 | Server-Wechsel max 3 Klicks | Settings → Server-Verwaltung → Klick auf Server |
| NFR-U3 | Deutsche UI-Texte | Alle Labels und Messages in Deutsch |
| NFR-R1 | Offline Server-Liste verfügbar | Daten aus lokalem Store (keine API-Dependency) |

### Project Structure Notes

**Files to Create:**
```
packages/frontend/src/features/server/
├── ui/
│   ├── atoms/
│   │   └── ServerStatusDot.tsx          # NEU
│   ├── molecules/
│   │   ├── ServerListItem.tsx           # NEU
│   │   └── ServerListEmptyState.tsx     # NEU
│   ├── organisms/
│   │   └── ServerList.tsx               # NEU
│   └── pages/
│       └── ServerManagementPage.tsx     # NEU
└── hooks/
    └── use-server-list-health.ts        # NEU (oder erweitern)
```

**Files to Modify:**
```
packages/frontend/src/
├── routes/                              # Neue Route für Server-Verwaltung
└── features/server/ui/molecules/
    └── ServerSelector.tsx               # Optional: Link zu Verwaltung hinzufügen
```

### Test Patterns

```typescript
// Unit Test Pattern (aus Story 2.7)
describe('ServerStatusDot', () => {
  it('should render green dot for online status', () => {
    render(<ServerStatusDot status="online" />);
    expect(screen.getByRole('status')).toHaveClass('bg-green-500');
  });

  it('should have accessible label', () => {
    render(<ServerStatusDot status="offline" />);
    expect(screen.getByLabelText(/offline/i)).toBeInTheDocument();
  });
});

// Integration Test Pattern
describe('ServerList', () => {
  it('should render empty state when no servers', () => {
    // Mock empty store
    render(<ServerList />);
    expect(screen.getByText('Keine Server konfiguriert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /server hinzufügen/i })).toBeInTheDocument();
  });

  it('should sort servers by lastUsedAt descending', () => {
    // Mock store with multiple servers
    const servers = [
      { id: '1', lastUsedAt: '2026-01-01' },
      { id: '2', lastUsedAt: '2026-01-10' }, // Most recent
    ];
    render(<ServerList />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Server 2'); // Most recent first
  });
});
```

### Git Commit Flow

**Empfohlene Commit-Reihenfolge:**
1. `✨(server): Add ServerStatusDot atom component`
2. `✨(server): Add ServerListItem molecule component`
3. `✨(server): Add ServerListEmptyState molecule`
4. `✨(server): Add ServerList organism with health status`
5. `✨(server): Add server management page and route`
6. `🧪(server): Add comprehensive tests for server list components`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: packages/frontend/src/features/server/stores/server.store.ts]
- [Source: packages/frontend/src/features/server/hooks/use-server-list.ts]
- [Source: packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx]
- [Source: CLAUDE.md#Frontend-Patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Keine kritischen Fehler während der Implementierung

### Completion Notes List

1. **Task 1 (ServerStatusDot):** Atom mit 14 Tests. Unterstützt beide Terminologien (online/offline und connected/disconnected).
2. **Task 2 (ServerListItem):** Molecule mit 34 Tests. Responsive Layout, Badge, Actions.
3. **Task 3 (useServerListHealth):** Hook existierte bereits, 12 neue Tests hinzugefügt.
4. **Task 4 (ServerListEmptyState):** Molecule mit 11 Tests. CTA-Button für Server hinzufügen.
5. **Task 5 (ServerList):** Organism mit 25 Tests. Kombiniert alle Komponenten.
6. **Task 6 (ServerManagementPage):** Page mit 10 Tests. Route: `/server/manage`.
7. **Task 7 (Navigation):** "Server verwalten" Button im ServerSelector hinzugefügt.

**Gesamt: 106 neue Tests für Story 3.1**

### Code Review Fixes (2026-01-11)

**Reviewer:** Claude Opus 4.5 (Adversarial Review)

**7 Issues gefunden, 7 behoben:**

1. ✅ **[CRITICAL] Layout-Template:** ServerManagementPage nutzt jetzt AuthLayout statt dupliziertem Layout
2. ✅ **[CRITICAL] Memory Leak:** Redundanten `removeEventListener()` entfernt, `{ once: true }` reicht aus
3. ✅ **[MEDIUM] Race Condition:** Zusätzliche Abort-Checks vor jedem `updateConnectionStatus` Call
4. ✅ **[MEDIUM] Background Interval:** Periodische Health-Checks alle 30 Sekunden implementiert
5. ✅ **[MEDIUM] AC2 Test:** Sortierungs-Test für "Zuletzt verwendet" hinzugefügt
6. ✅ **[LOW] Ref Forwarding Tests:** 2 neue Tests für ServerStatusDot Ref-Forwarding
7. ✅ **[LOW] Biome-Ignore Kommentar:** Präzisere ARIA 1.2 Spec Referenz

**Nicht gefixt (bewusst):** Console.log in TODO-Platzhaltern (Story 3.3/3.4 relevant)

### File List

**Neue Dateien:**
- `packages/frontend/src/features/server/ui/atoms/ServerStatusDot.tsx`
- `packages/frontend/src/features/server/ui/atoms/__tests__/ServerStatusDot.test.tsx`
- `packages/frontend/src/features/server/ui/atoms/index.ts`
- `packages/frontend/src/features/server/ui/molecules/ServerListItem.tsx`
- `packages/frontend/src/features/server/ui/molecules/__tests__/ServerListItem.test.tsx`
- `packages/frontend/src/features/server/ui/molecules/ServerListEmptyState.tsx`
- `packages/frontend/src/features/server/ui/molecules/__tests__/ServerListEmptyState.test.tsx`
- `packages/frontend/src/features/server/ui/organisms/ServerList.tsx`
- `packages/frontend/src/features/server/ui/organisms/__tests__/ServerList.test.tsx`
- `packages/frontend/src/features/server/ui/organisms/index.ts`
- `packages/frontend/src/features/server/hooks/__tests__/use-server-list-health.test.ts`
- `packages/frontend/src/features/server/ui/pages/ServerManagementPage.tsx`
- `packages/frontend/src/features/server/ui/pages/__tests__/ServerManagementPage.test.tsx`
- `packages/frontend/src/routes/server/manage.tsx`

**Geänderte Dateien:**
- `packages/frontend/src/features/server/ui/molecules/index.ts` (Exports hinzugefügt)
- `packages/frontend/src/features/server/ui/pages/index.ts` (Export hinzugefügt)
- `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx` (onManageServers Prop + Button)
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` (handleManageServers Callback)
- `packages/frontend/src/routeTree.gen.ts` (Auto-generiert)
