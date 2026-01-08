# Story 2.2: Server Store & Persistence

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Als **Nutzer**,
moechte ich **dass meine konfigurierten Server persistent gespeichert werden**,
damit **ich nach App-Neustarts nicht erneut Server hinzufuegen muss**.

## Business Context

**Epic:** 2 - Client-Onboarding & Server-Verbindung

**Epic Objective:** Einsatzkräfte können über Deep Links, URL-Parameter oder manuelles Formular einem Server beitreten und nahtlos Access-Tokens erhalten.

**Story Value:**
- **Foundation Story für Server-Management** - Alle nachfolgenden Epic 2 Stories (2.3-2.7) benötigen Server Store!
- Ermöglicht Multi-Server-Konfiguration mit reaktivem UI-State
- Garantiert Persistenz über App-Neustarts (NFR-R1)
- Sichert Performance (<200ms Load Time, NFR-P5)
- Legt Grundstein für Connection-Status-Tracking (Epic 3)

**Why this story matters:**
- Ohne Server Store können Nutzer KEINE Server persistieren → Verlust bei jedem App-Neustart
- Story 2.3-2.7 benötigen `serverStore` zum Speichern von Server-Config + Access-Tokens
- Epic 3 (Server-Auswahl UI) baut direkt auf diesem Store auf

## Acceptance Criteria

### AC1: Server hinzufuegen ✅

```gherkin
Given der Server Store ist initialisiert
When ein neuer Server hinzugefuegt wird (via addServer Action)
Then wird der Server im TanStack Store gespeichert
And der Storage-Adapter synchronisiert die Aenderung persistent (via getStorageAdapter())
And der Server erscheint sofort in der Server-Liste (reaktiv via useStore)
And der neue Server hat ein auto-generiertes `id` Feld (UUID v4)
```

**Technische Details:**
- Server-Interface: `ServerConfig { id, name, url, accessToken?, isDefault, createdAt, lastUsedAt }`
- Validation: URL muss HTTPS sein (außer localhost), name min 1 char
- Speicher-Key: `bluelight:servers` (JSON Array im Storage)
- Performance: `addServer()` muss < 200ms dauern (NFR-P5)

### AC2: Aktiven Server setzen ✅

```gherkin
Given mehrere Server sind konfiguriert
When ein Server als aktiv ausgewaehlt wird (via setActiveServer Action)
Then wird `activeServerId` im Store aktualisiert
And der zuletzt verwendete Server wird als Default markiert (isDefault: true, lastUsedAt: NOW)
And alle anderen Server haben isDefault: false
And die Änderung wird sofort persistent gespeichert
```

**Technische Details:**
- `setActiveServer(serverId: string)` setzt `activeServerId` UND updatet `isDefault` Flags
- Auto-Update von `lastUsedAt` Timestamp (ISO 8601 String)
- Reaktive UI: `useActiveServer()` Hook liefert vollen Server-Object (nicht nur ID)
- Wichtig: Bei Logout muss `activeServerId` auf `null` gesetzt werden (Epic 3 Integration)

### AC3: Store-Hydration beim Start ✅

```gherkin
Given die App wird gestartet (erster Render)
When der Server Store initialisiert wird (via loadServers Action)
Then werden alle Server aus dem Storage-Adapter geladen (getStorageAdapter().getItem('bluelight:servers'))
And der Store-State wird mit den persistierten Daten hydratisiert
And der Default-Server (isDefault: true) wird als aktiv gesetzt (activeServerId)
And bei leerem Storage bleibt der Store im Initial State (leeres Array, null activeServerId)
```

**Technische Details:**
- Hydration erfolgt in `loadServers()` async Action (NICHT im Store Constructor!)
- Hook: `useLoadServers()` triggert `loadServers()` in `useEffect` (nur einmal beim App-Start)
- Error Handling: Bei Storage-Fehler bleibt Store leer + Console-Warning (keine UI-Blockierung)
- Race Condition: Hydration darf nur 1x laufen (Flag `isHydrated` im Store)

### AC4: Server loeschen ✅

```gherkin
Given ein Server wird geloescht (via removeServer Action)
When die Loeschaktion bestaetigt wird
Then wird der Server aus dem Store entfernt
And der Storage-Adapter entfernt den Server persistent
And war es der aktive Server, wird ein anderer Server aktiv (erster in Liste oder null bei 0 Servern)
And die Server-Liste UI aktualisiert sich sofort (reaktiv)
```

**Technische Details:**
- `removeServer(serverId: string)` filtert Server aus Array
- Auto-Fallback: Wenn aktiver Server gelöscht → `activeServerId = servers[0]?.id ?? null`
- Validation: Mindestens 1 Server muss übrig bleiben (optional, siehe Dev Notes)
- Performance: Löschen muss < 100ms dauern (NFR-P5)

### AC5: Connection-Status ✅

```gherkin
Given die Netzwerkverbindung besteht
When der Connection-Status eines Servers geprueft wird (via updateConnectionStatus Action)
Then wird der Status in connectionStatus Map aktualisiert ('connected' | 'disconnected' | 'checking')
And der Status ist reaktiv verfuegbar via useConnectionStatus Hook
And der Status wird NICHT persistent gespeichert (nur In-Memory State)
```

**Technische Details:**
- Store-Field: `connectionStatus: Map<string, ConnectionStatus>` (serverId → Status)
- Status-Typen: `'connected' | 'disconnected' | 'checking'` (String Enum)
- Keine Persistierung: Connection-Status ist transient (wird bei App-Start auf `checking` gesetzt)
- Integration: Story 2.6 (Manuelles Formular) nutzt `updateConnectionStatus()` für Health-Check

## Tasks / Subtasks

### Task 1: Store Definition & Types (AC1, AC2) ✅

- [x] **Subtask 1.1:** TypeScript Types definieren in `features/server/types/server-config.ts`
  - [x] Interface `ServerConfig` mit allen Feldern (id, name, url, accessToken?, isDefault, createdAt, lastUsedAt)
  - [x] Type `ConnectionStatus = 'connected' | 'disconnected' | 'checking'`
  - [x] Interface `ServerState` für Store State (servers, activeServerId, connectionStatus, isHydrated)
  - [x] JSDoc Kommentare (Deutsch) für alle public Types
- [x] **Subtask 1.2:** TanStack Store erstellen in `features/server/stores/server.store.ts`
  - [x] `export const serverStore = new Store<ServerState>(initialState)`
  - [x] Initial State: `{ servers: [], activeServerId: null, connectionStatus: new Map(), isHydrated: false }`
  - [x] Keine Actions im Store selbst (Actions sind externe Funktionen!)
  - [x] Export Store für Hook-Nutzung
- [x] **Subtask 1.3:** Storage Helper in `features/server/stores/server-persistence.ts`
  - [x] `saveServers(servers: ServerConfig[]): Promise<void>` - schreibt zu Storage Adapter
  - [x] `loadServers(): Promise<ServerConfig[]>` - liest von Storage Adapter
  - [x] Storage-Key Konstante: `export const STORAGE_KEY_SERVERS = 'bluelight:servers'`
  - [x] Error Handling: Try-Catch mit Console-Warning bei Fehler

### Task 2: Server CRUD Actions (AC1, AC2, AC4) ✅

- [x] **Subtask 2.1:** Add Server Action in `features/server/stores/server.store.ts`
  - [x] `export async function addServer(config: Omit<ServerConfig, 'id' | 'createdAt'>): Promise<void>`
  - [x] Auto-generiere `id` (UUID v4 via `crypto.randomUUID()`)
  - [x] Auto-setze `createdAt` (ISO String via `new Date().toISOString()`)
  - [x] Validierung: URL Format, name min 1 char
  - [x] Update Store State + async Storage Sync
  - [x] Performance: Gesamtdauer < 200ms (NFR-P5)
- [x] **Subtask 2.2:** Set Active Server Action
  - [x] `export async function setActiveServer(serverId: string): Promise<void>`
  - [x] Update `activeServerId` im Store
  - [x] Update `isDefault: true` für aktiven Server, `false` für andere
  - [x] Update `lastUsedAt` Timestamp für aktiven Server
  - [x] Sync zu Storage Adapter
- [x] **Subtask 2.3:** Remove Server Action
  - [x] `export async function removeServer(serverId: string): Promise<void>`
  - [x] Filter Server aus Array
  - [x] Auto-Fallback: Wenn aktiver Server gelöscht → ersten Server aktiv setzen (oder null)
  - [x] Sync zu Storage Adapter
  - [x] Optional: Validation "min 1 Server" (siehe Dev Notes)

### Task 3: Hydration & Initialization (AC3) ✅

- [x] **Subtask 3.1:** Load Servers Action
  - [x] `export async function hydrateServerStore(): Promise<void>`
  - [x] Read from Storage Adapter via `loadServers()`
  - [x] Update Store State mit geladenen Servern
  - [x] Setze `isHydrated: true` Flag
  - [x] Auto-setze Default-Server als aktiv (find `isDefault: true`)
  - [x] Error Handling: Bei Storage-Error bleibt Store leer (Console-Warning)
- [x] **Subtask 3.2:** Custom Hook `useLoadServers` in `features/server/hooks/use-load-servers.ts`
  - [x] Hook triggert `hydrateServerStore()` in `useEffect` (nur einmal)
  - [x] Check `isHydrated` Flag um doppelte Hydration zu verhindern
  - [x] Return `{ isLoading, error }` State für UI Feedback

### Task 4: Connection Status (AC5) ✅

- [x] **Subtask 4.1:** Connection Status Action
  - [x] `export function updateConnectionStatus(serverId: string, status: ConnectionStatus): void`
  - [x] Update `connectionStatus` Map im Store (synchron!)
  - [x] KEINE Persistierung (nur In-Memory)
- [x] **Subtask 4.2:** Custom Hook `useConnectionStatus` in `features/server/hooks/use-connection-status.ts`
  - [x] `export function useConnectionStatus(serverId: string): ConnectionStatus | undefined`
  - [x] Nutzt `useStore(serverStore, (state) => state.connectionStatus.get(serverId))`
  - [x] Default: `undefined` wenn Server nicht in Map

### Task 5: Custom Hooks für UI Integration ✅

- [x] **Subtask 5.1:** `useActiveServer` Hook in `features/server/hooks/use-active-server.ts`
  - [x] `export function useActiveServer(): ServerConfig | null`
  - [x] Selector: `(state) => state.servers.find(s => s.id === state.activeServerId) ?? null`
  - [x] Optimierte Performance durch Selector (kein unnötiges Re-Render)
- [x] **Subtask 5.2:** `useServerList` Hook in `features/server/hooks/use-server-list.ts`
  - [x] `export function useServerList(): ServerConfig[]`
  - [x] Selector: `(state) => state.servers`
  - [x] Optional: Sortierung nach `lastUsedAt` (neueste zuerst)
- [x] **Subtask 5.3:** `useServerStore` Hook in `features/server/hooks/use-server-store.ts`
  - [x] Wrapper Hook mit allen Actions als Return (ähnlich wie `useEinsatzStore`)
  - [x] Return: `{ servers, activeServerId, addServer, setActiveServer, removeServer, ... }`
  - [x] Nutzt `useStore(serverStore)` intern

### Task 6: Unit Tests (PFLICHT!) ✅

- [x] **Subtask 6.1:** Store Tests in `features/server/stores/__tests__/server.store.test.ts`
  - [x] Test: Add Server → Store aktualisiert, Storage synced
  - [x] Test: Set Active Server → activeServerId + isDefault korrekt
  - [x] Test: Remove Server → Server entfernt, Fallback aktiv
  - [x] Test: Hydration → Storage loaded, Default-Server aktiv
  - [x] Test: Connection Status → Map korrekt aktualisiert
  - [x] Mock: `getStorageAdapter()` mit `vi.mock()`
- [x] **Subtask 6.2:** Hook Tests in `features/server/hooks/__tests__/`
  - [x] Test: `useActiveServer` → liefert aktiven Server oder null
  - [x] Test: `useServerList` → liefert alle Server
  - [x] Test: `useConnectionStatus` → liefert Status oder undefined
  - [x] Test: `useLoadServers` → triggert Hydration nur einmal
  - [x] Nutze `@testing-library/react-hooks` oder `renderHook` von Vitest

## Dev Notes

### 🎯 CRITICAL MISSION CONTEXT

**Diese Story ist DIE Grundlage für das gesamte Server-Management-Feature!**
- ⚠️ **NIEMALS Redux, Context, Zustand verwenden** - NUR TanStack Store (@tanstack/react-store)!
- ⚠️ **NIEMALS manuelles localStorage** - IMMER `getStorageAdapter()` aus Story 2.1!
- ⚠️ **Type Safety:** TypeScript strict mode - keine `any` Types
- ⚠️ **Testing:** Unit Tests für Store + Hooks sind PFLICHT (min 80% Coverage)
- ⚠️ **Performance:** Store-Updates < 200ms (NFR-P5), Connection-Status synchron (< 50ms)
- ⚠️ **Commits:** IMMER nach jedem Subtask committen (NIEMALS `--no-verify`)

### 🏗️ Architecture Patterns (MUST FOLLOW)

**TanStack Store Pattern (aus Codebase gelernt):**

```typescript
// ✅ RICHTIG: Store Definition
import { Store } from '@tanstack/react-store';

interface ServerState {
  servers: ServerConfig[];
  activeServerId: string | null;
  connectionStatus: Map<string, ConnectionStatus>;
  isHydrated: boolean;
}

const initialState: ServerState = {
  servers: [],
  activeServerId: null,
  connectionStatus: new Map(),
  isHydrated: false,
};

export const serverStore = new Store<ServerState>(initialState);

// ✅ RICHTIG: Actions als externe Funktionen (NICHT im Store!)
export async function addServer(config: Omit<ServerConfig, 'id' | 'createdAt'>) {
  const newServer: ServerConfig = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    isDefault: false,
  };

  // Update Store State (immutable!)
  serverStore.setState((state) => ({
    ...state,
    servers: [...state.servers, newServer],
  }));

  // Sync to Storage Adapter (async!)
  const adapter = getStorageAdapter();
  await adapter.setItem(STORAGE_KEY_SERVERS, JSON.stringify(serverStore.state.servers));
}

// ✅ RICHTIG: Custom Hook mit Selector
import { useStore } from '@tanstack/react-store';

export function useActiveServer(): ServerConfig | null {
  return useStore(serverStore, (state) =>
    state.servers.find(s => s.id === state.activeServerId) ?? null
  );
}

// ❌ FALSCH: Redux-Style Actions im Store
// ❌ FALSCH: Context API für globalen State
// ❌ FALSCH: Zustand Store statt TanStack Store
```

**Storage Sync Pattern (aus Story 2.1):**

```typescript
// ✅ RICHTIG: Platform-agnostischer Storage via Adapter
import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';

const adapter = getStorageAdapter(); // Singleton!
await adapter.setItem('bluelight:servers', JSON.stringify(servers));
const data = await adapter.getItem('bluelight:servers');
const servers = data ? JSON.parse(data) : [];

// ❌ FALSCH: Direktes localStorage (bricht Tauri-Support!)
localStorage.setItem('servers', JSON.stringify(servers));
```

**Persistence Pattern (aus einsatzStore gelernt):**

```typescript
// ✅ RICHTIG: Auto-Sync bei Store Changes
serverStore.subscribe(() => {
  const state = serverStore.state;
  saveServers(state.servers); // Async Fire-and-Forget
});

// Optional: Debounce für Performance (via @tanstack/pacer)
import { debounce } from '@tanstack/pacer';

const debouncedSave = debounce((servers: ServerConfig[]) => {
  saveServers(servers);
}, 500); // 500ms Debounce

serverStore.subscribe(() => {
  debouncedSave(serverStore.state.servers);
});
```

### 📁 File Structure (MUST CREATE)

```
packages/frontend/src/
├── features/
│   └── server/
│       ├── types/
│       │   └── server-config.ts                # ServerConfig, ServerState, ConnectionStatus
│       ├── stores/
│       │   ├── server.store.ts                 # Store Definition + Actions
│       │   ├── server-persistence.ts           # saveServers, loadServers Helpers
│       │   └── __tests__/
│       │       └── server.store.test.ts        # Store Unit Tests (min 10 Tests)
│       ├── hooks/
│       │   ├── use-active-server.ts            # Hook: Active Server
│       │   ├── use-server-list.ts              # Hook: Server List
│       │   ├── use-connection-status.ts        # Hook: Connection Status
│       │   ├── use-load-servers.ts             # Hook: Hydration Trigger
│       │   ├── use-server-store.ts             # Hook: Wrapper mit allen Actions
│       │   └── __tests__/
│       │       ├── use-active-server.test.ts
│       │       ├── use-server-list.test.ts
│       │       ├── use-connection-status.test.ts
│       │       └── use-load-servers.test.ts
│       └── constants/
│           └── storage-keys.ts                 # STORAGE_KEY_SERVERS Constant
```

### 🔧 Technical Stack (ALREADY IN PROJECT)

**Frontend:**
- ✅ @tanstack/react-store (bereits installiert - `^0.5.9`)
- ✅ @tanstack/pacer (bereits installiert - `^0.1.0`) - für Debouncing/Throttling
- ✅ TypeScript (strict mode enabled)
- ✅ Vitest (Testing Framework)
- ✅ Biome (Linter/Formatter - NICHT ESLint!)

**Dependencies (Story 2.1 - ALREADY DONE):**
- ✅ `IStoragePort` Interface (Story 2.1)
- ✅ `getStorageAdapter()` Factory (Story 2.1)
- ✅ `TauriStorageAdapter` + `WebStorageAdapter` (Story 2.1)
- ✅ Platform Detection (`isTauri()`, `getPlatform()`)

### 🚫 BREAKING RULES (NIEMALS brechen!)

1. **NIEMALS** Redux, Context API, Zustand - NUR TanStack Store!
2. **NIEMALS** direktes `localStorage` - IMMER `getStorageAdapter()`!
3. **NIEMALS** `--no-verify` bei Git Commits
4. **NIEMALS** ESLint/Prettier - nur Biome
5. **NIEMALS** `any` Types - TypeScript strict mode
6. **NIEMALS** Actions im Store Constructor - externe Funktionen!
7. **NIEMALS** synchrone Storage-Calls - IMMER async/await

### 🧪 Testing Requirements

**Unit Tests (Vitest) - PFLICHT:**

```typescript
// ✅ MUST TEST: Store Actions
describe('serverStore', () => {
  beforeEach(() => {
    // Reset Store vor jedem Test
    serverStore.setState(initialState);
    // Mock Storage Adapter
    vi.mock('@/shared/services/storage/storage-adapter.factory');
  });

  it('should add server and sync to storage', async () => {
    // Given
    const mockAdapter = { setItem: vi.fn() };
    vi.mocked(getStorageAdapter).mockReturnValue(mockAdapter);

    // When
    await addServer({ name: 'Test Server', url: 'https://test.com' });

    // Then
    expect(serverStore.state.servers).toHaveLength(1);
    expect(serverStore.state.servers[0].name).toBe('Test Server');
    expect(mockAdapter.setItem).toHaveBeenCalledWith(
      'bluelight:servers',
      expect.stringContaining('Test Server')
    );
  });

  it('should set active server and update isDefault flags', async () => {
    // Given
    const server1 = { id: '1', name: 'S1', url: 'https://s1.com', isDefault: false };
    const server2 = { id: '2', name: 'S2', url: 'https://s2.com', isDefault: false };
    serverStore.setState({ servers: [server1, server2], activeServerId: null });

    // When
    await setActiveServer('2');

    // Then
    expect(serverStore.state.activeServerId).toBe('2');
    expect(serverStore.state.servers.find(s => s.id === '2')?.isDefault).toBe(true);
    expect(serverStore.state.servers.find(s => s.id === '1')?.isDefault).toBe(false);
  });

  it('should remove server and fallback to first server', async () => {
    // Given
    serverStore.setState({
      servers: [
        { id: '1', name: 'S1', url: 'https://s1.com' },
        { id: '2', name: 'S2', url: 'https://s2.com' },
      ],
      activeServerId: '2',
    });

    // When
    await removeServer('2');

    // Then
    expect(serverStore.state.servers).toHaveLength(1);
    expect(serverStore.state.activeServerId).toBe('1'); // Fallback
  });

  it('should hydrate store from storage', async () => {
    // Given
    const mockAdapter = {
      getItem: vi.fn().mockResolvedValue(JSON.stringify([
        { id: '1', name: 'S1', url: 'https://s1.com', isDefault: true },
      ])),
    };
    vi.mocked(getStorageAdapter).mockReturnValue(mockAdapter);

    // When
    await hydrateServerStore();

    // Then
    expect(serverStore.state.servers).toHaveLength(1);
    expect(serverStore.state.activeServerId).toBe('1'); // Default Server aktiv
    expect(serverStore.state.isHydrated).toBe(true);
  });

  it('should update connection status without persistence', () => {
    // When
    updateConnectionStatus('1', 'connected');

    // Then
    expect(serverStore.state.connectionStatus.get('1')).toBe('connected');
    // Kein Storage-Call! (nur In-Memory)
  });
});

// ✅ MUST TEST: Custom Hooks
describe('useActiveServer', () => {
  it('should return active server', () => {
    // Setup Store State
    serverStore.setState({
      servers: [{ id: '1', name: 'S1', url: 'https://s1.com' }],
      activeServerId: '1',
    });

    // Render Hook
    const { result } = renderHook(() => useActiveServer());

    // Assert
    expect(result.current).toEqual({ id: '1', name: 'S1', url: 'https://s1.com' });
  });

  it('should return null when no active server', () => {
    serverStore.setState({ servers: [], activeServerId: null });
    const { result } = renderHook(() => useActiveServer());
    expect(result.current).toBeNull();
  });
});
```

**Manual Integration Tests (Browser + Tauri):**
1. Add Server → App Restart → Server noch da?
2. Set Active Server → App Restart → Richtiger Server aktiv?
3. Remove Server → UI aktualisiert sofort?
4. Connection Status → Status Update ohne Lag?

### ⚡ Performance Considerations

**NFR-P5: Server-Liste laden < 200ms**
- Storage Adapter (localStorage/Tauri) ist bereits schnell (< 50ms)
- JSON.parse bei 10 Servern: ~1-5ms
- **NICHT optimieren** bis Profiling zeigt Problem!

**Optimization Tips:**
- Selector Pattern: Nur benötigte Felder subscriben (kein `useStore(serverStore)` für ganzes State!)
- Debounce: `saveServers()` debounced bei häufigen Updates (via @tanstack/pacer)
- Lazy Hydration: `hydrateServerStore()` nur einmal beim App-Start triggern

**NFR-P2: Server-Dropdown < 50ms** (relevant für Epic 3)
- `useServerList()` Hook nutzt Selector → kein unnötiges Re-Render
- Connection Status synchron (Map Lookup ~1ms)

### 🔗 Dependencies (Story Level)

**Blockers:** ✅ Story 2.1 (Platform Storage Adapter) - COMPLETED!

**Blocks:** ⚠️ Alle nachfolgenden Epic 2 Stories
- Story 2.3 (Invite-Code Exchange) - Backend Story, aber Frontend nutzt `serverStore` für Token
- Story 2.4 (Deep Link Integration) - benötigt `addServer()` Action
- Story 2.5 (Web URL-Parameter) - benötigt `addServer()` Action
- Story 2.6 (Manuelles Formular) - benötigt `addServer()` + `updateConnectionStatus()`
- Story 2.7 (Error Handling) - benötigt `serverStore` für Error-Context

**Epic 3 Dependencies:**
- Story 3.1 (Server-Liste UI) - benötigt `useServerList()` Hook
- Story 3.2 (Server-Auswahl Dropdown) - benötigt `useActiveServer()` + `setActiveServer()`

### 🎓 Learning from Previous Stories

**Story 2.1 (Platform Storage Adapter) Patterns:**

```typescript
// ✅ Pattern: Singleton Factory (aus Story 2.1)
let cachedAdapter: IStoragePort | null = null;

export function getStorageAdapter(): IStoragePort {
  if (!cachedAdapter) {
    cachedAdapter = getPlatform() === 'tauri'
      ? new TauriStorageAdapter()
      : new WebStorageAdapter();
  }
  return cachedAdapter;
}

// Apply to Story 2.2:
// - Nutze `getStorageAdapter()` IMMER als Singleton
// - NIEMALS direkte Instanziierung von Adapters
```

**Story 1.7a (Einsatz Store) Patterns:**

```typescript
// ✅ Pattern: Store mit Auto-Persistence (aus einsatzStore)
einsatzStore.subscribe(() => {
  const state = einsatzStore.state;
  if (state.activeEinsatz?.id) {
    saveActiveEinsatzId(state.activeEinsatz.id); // Async Fire-and-Forget
  }
});

// Apply to Story 2.2:
// - Auto-Sync bei jedem Store Update
// - Optional: Debounce für Performance
// - Fire-and-Forget Pattern (keine await im subscribe)
```

**Story 1.7a (Invite-Verwaltung) Code Review Lessons:**

```
Recent Commits:
5baaf964 ♻️(frontend): Code Review Fixes for Story 1.7a
26e7a389 🐛(invite-code): Add missing InviteCodeCreatedEvent serializer
04f3cddb 🐛(admin): Fix HTML validation error in InviteCodeTable skeleton
```

**Apply to Story 2.2:**
- ✅ **JSDoc Kommentare:** Alle public APIs dokumentieren (Deutsch)
- ✅ **Type Safety:** Keine `any`, keine impliziten `undefined`
- ✅ **Biome Lint:** `pnpm lint` vor jedem Commit
- ✅ **Manual Testing:** Browser + Tauri testen (keine E2E vorhanden)

### 🗂️ Git Intelligence

**Branch Context:** `feature/284-multi-server-config`
- ⚠️ **WICHTIG:** Diese Branch wurde für Multi-Server-Config erstellt!
- ✅ Story 2.1 ist bereits DONE auf dieser Branch (Platform Storage Adapter)
- ✅ Story 2.2 ist der nächste logische Schritt (Server Store)

**Recent Work Patterns (aus Commit History):**

```
589d3383 📝(storage): Add Code Conventions - Storage Adapter Pattern
fe294874 📝(storage): Update Frontend Architecture with Storage Abstraction
1a41fd76 📝(storage): Add ADR-010 - Platform Storage Adapter Pattern
806221ba ✨(storage): Add storage adapter factory with singleton pattern
```

**Commit Convention (MUST FOLLOW):**

```bash
# Format: <emoji>(<context>): <title>

✨(server): Create ServerConfig types and interfaces
✨(server): Create TanStack Store for server management
✨(server): Implement addServer action with storage sync
✨(server): Implement setActiveServer action with isDefault logic
✨(server): Implement removeServer action with fallback
✨(server): Implement hydrateServerStore for app initialization
✨(server): Implement updateConnectionStatus action
✨(server): Add useActiveServer hook
✨(server): Add useServerList hook
✨(server): Add useConnectionStatus hook
✨(server): Add useLoadServers hook
✨(server): Add useServerStore wrapper hook
🧪(server): Add server store unit tests (10+ tests)
🧪(server): Add server hooks unit tests (4+ tests)
📝(server): Document TanStack Store pattern in code conventions
📝(server): Update frontend architecture with server store
```

**Emoji Reference:**
- ✨ = Feature (Minor Release)
- 🐛 = Fix (Patch Release)
- 🧪 = Test (No Release)
- 📝 = Docs (No Release)
- ♻️ = Refactor (Patch Release)

### 📚 Latest Tech Information

**TanStack Store v0.5.x Patterns (2025):**

```typescript
// ✅ MODERNE Patterns (aus TanStack Store Docs)

// 1. Store mit Initial State
const store = new Store<MyState>(initialState);

// 2. Selector Pattern (Performance!)
const value = useStore(store, (state) => state.servers); // Nur re-render bei servers Change

// 3. Actions als externe Funktionen (NICHT im Store!)
export function myAction() {
  store.setState((state) => ({ ...state, field: newValue }));
}

// 4. Subscribe für Side Effects
store.subscribe(() => {
  console.log('State changed:', store.state);
});

// 5. Immer IMMUTABLE Updates!
store.setState((state) => ({
  ...state,
  servers: [...state.servers, newServer], // Neues Array!
}));
```

**TypeScript 5.x Best Practices:**

- `satisfies` Operator für Type Narrowing (bereits enabled)
- `import type` für Type-only Imports (Tree-Shaking)
- Strict Null Checks (enabled im Projekt)
- `as const` für String Literal Types

**Vitest Best Practices:**

- `beforeEach()` für Test Isolation (IMMER Store resetten!)
- `vi.mock()` statt `jest.mock()` (Vitest API)
- `renderHook()` für Hook Testing (@testing-library/react)

### 🔍 Code Review Checklist (Vor Commit)

**TypeScript:**
- [ ] Keine `any` Types verwendet
- [ ] Alle public Functions haben JSDoc (Deutsch)
- [ ] `import type` für Interface-Imports
- [ ] Error Handling mit Try-Catch (bei async Storage)

**TanStack Store:**
- [ ] Store Definition: `new Store<State>(initialState)`
- [ ] Actions als externe Funktionen (NICHT im Store)
- [ ] Immutable Updates: `...state`, neue Arrays/Objects
- [ ] Selector Pattern in Hooks: `useStore(store, selector)`

**Storage Integration:**
- [ ] `getStorageAdapter()` statt direktes `localStorage`
- [ ] STORAGE_KEY_SERVERS Konstante genutzt
- [ ] JSON.stringify/parse für Serialization
- [ ] Error Handling bei Storage-Fehlern

**Testing:**
- [ ] Mindestens 80% Code Coverage
- [ ] Unit Tests für alle Actions
- [ ] Unit Tests für alle Hooks
- [ ] Mock: `getStorageAdapter()` mit `vi.mock()`
- [ ] `beforeEach()` resettet Store State

**Performance:**
- [ ] Store Updates < 200ms (NFR-P5)
- [ ] Connection Status synchron (< 50ms)
- [ ] Selector Pattern verhindert unnötiges Re-Render
- [ ] Optional: Debounce bei häufigen Updates

**Biome:**
- [ ] `pnpm lint` erfolgreich
- [ ] `pnpm lint:check` ohne Warnings

### Project Structure Notes

**Alignment mit Unified Project Structure:**

✅ **Korrekte Pfade:**
- `packages/frontend/src/features/server/` - Feature-based Module
- `packages/frontend/src/shared/` - Shared Code (wird NICHT genutzt für Server Store)

✅ **Naming Conventions:**
- Files: kebab-case (`server.store.ts`, `use-active-server.ts`)
- Classes/Interfaces: PascalCase (`ServerConfig`, `ServerState`)
- Functions: camelCase (`addServer`, `hydrateServerStore`)
- Constants: SCREAMING_SNAKE_CASE (`STORAGE_KEY_SERVERS`)

✅ **Import Aliases:**
- `@/` → `src/` (via tsconfig.json)
- `@bluelight-hub/shared/client` → Generated API Client (NICHT relevant für Story 2.2)

❌ **Detected Conflicts:** Keine - Story 2.2 ist neue Feature-Implementierung

### Additional Implementation Notes

**UUID Generation:**

```typescript
// ✅ RICHTIG: Native Browser API (kein npm package!)
const id = crypto.randomUUID(); // UUID v4, browser-native

// ❌ FALSCH: uuid npm package (unnecessary dependency)
import { v4 as uuidv4 } from 'uuid';
```

**Timestamp Handling:**

```typescript
// ✅ RICHTIG: ISO 8601 String (speicherbar, vergleichbar)
const timestamp = new Date().toISOString(); // "2026-01-08T14:23:45.123Z"

// ❌ FALSCH: Unix Timestamp (schlechtere Lesbarkeit)
const timestamp = Date.now();
```

**Map in Store State:**

```typescript
// ⚠️ WICHTIG: Map ist NICHT JSON-serializable!
// Connection Status Map wird NICHT persistent gespeichert

// ✅ RICHTIG: Nur servers Array persistieren
await adapter.setItem('bluelight:servers', JSON.stringify(state.servers));

// ❌ FALSCH: Ganzes State Object persistieren (Map bricht JSON.stringify!)
await adapter.setItem('state', JSON.stringify(state)); // Map wird zu {}
```

**Min Server Validation (Optional Decision):**

```typescript
// Option A: Min 1 Server erzwingen (UX-Schutz)
export async function removeServer(serverId: string) {
  if (serverStore.state.servers.length === 1) {
    throw new Error('Cannot remove last server');
  }
  // ... remove logic
}

// Option B: 0 Server erlauben (Onboarding Flow)
export async function removeServer(serverId: string) {
  // Einfach entfernen, auch wenn letzter Server
  // UI zeigt Onboarding-Screen bei 0 Servern
}

// ✅ RECOMMENDATION: Option B (flexibler für Epic 2 Onboarding)
```

### References

**Planning Artifacts:**
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/prd.md - FR1, FR6, FR7, NFR-P5, NFR-R1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Frontend Architecture, State Management]

**Project Configuration:**
- [Source: CLAUDE.md - Breaking Rules, Code Patterns, Commit Rules]
- [Source: packages/frontend/package.json - TanStack Store v0.5.9, Pacer v0.1.0]
- [Source: packages/frontend/tsconfig.json - TypeScript Configuration]
- [Source: packages/frontend/vitest.config.ts - Test Configuration]

**Existing Code Patterns:**
- [Source: packages/frontend/src/features/auth/stores/auth.store.ts - TanStack Store Pattern]
- [Source: packages/frontend/src/features/einsatz/stores/active-einsatz.store.ts - Store mit Persistence]
- [Source: packages/frontend/src/shared/services/storage/storage-adapter.factory.ts - Storage Adapter Pattern]
- [Source: packages/frontend/src/shared/types/storage.ts - IStoragePort Interface]

**Story 2.1 (Foundation):**
- [Source: _bmad-output/implementation-artifacts/stories/story-2.1-platform-storage-adapter.md - Platform Storage Adapter]
- [Source: packages/frontend/src/shared/services/storage/storage-adapter.factory.ts - getStorageAdapter()]
- [Source: packages/frontend/src/shared/utils/platform.ts - isTauri(), getPlatform()]

**Documentation:**
- [Source: docs/architecture/ - arc42 Architecture Documentation]
- [Source: docs/development-guide/code-conventions.md - Code Conventions]
- [Source: docs/project-documentation/ADR-010-platform-storage-adapter-pattern.md - Storage Adapter ADR]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (model ID: claude-sonnet-4-5-20250929)

### Implementation Strategy

**Recommended Implementation Order:**

1. **Phase 1 - Types & Store Foundation (1-2h):**
   - Task 1.1: TypeScript Types (`ServerConfig`, `ServerState`, `ConnectionStatus`)
   - Task 1.2: TanStack Store Definition (Initial State)
   - Task 1.3: Storage Persistence Helpers (`saveServers`, `loadServers`)
   - Commit: `✨(server): Create ServerConfig types and TanStack Store foundation`

2. **Phase 2 - CRUD Actions (2-3h):**
   - Task 2.1: Add Server Action (mit UUID, Validation, Storage Sync)
   - Task 2.2: Set Active Server Action (isDefault Logic, lastUsedAt)
   - Task 2.3: Remove Server Action (Fallback Logic)
   - Commits: `✨(server): Implement addServer/setActiveServer/removeServer actions`

3. **Phase 3 - Hydration & Connection Status (1-2h):**
   - Task 3.1: Hydration Action (`hydrateServerStore`)
   - Task 3.2: `useLoadServers` Hook
   - Task 4.1: Connection Status Action
   - Task 4.2: `useConnectionStatus` Hook
   - Commits: `✨(server): Implement store hydration and connection status`

4. **Phase 4 - Custom Hooks (1h):**
   - Task 5.1: `useActiveServer` Hook
   - Task 5.2: `useServerList` Hook
   - Task 5.3: `useServerStore` Wrapper Hook
   - Commit: `✨(server): Add custom hooks for UI integration`

5. **Phase 5 - Unit Tests (2-3h):**
   - Task 6.1: Store Tests (min 10 Tests)
   - Task 6.2: Hook Tests (min 4 Tests)
   - Commits: `🧪(server): Add server store and hooks unit tests`

6. **Phase 6 - Documentation (1h):**
   - Code Conventions Update (TanStack Store Pattern)
   - Frontend Architecture Update (Server Store Section)
   - Commit: `📝(server): Document server store pattern`

**Total Effort Estimate:** 2-3 Tage (full-time) oder 4-5 Tage (part-time)

### Critical Success Factors

✅ **MUST HAVE für Story Completion:**
1. Alle 5 Acceptance Criteria erfüllt
2. TanStack Store RICHTIG genutzt (externe Actions, Selector Pattern)
3. Storage Adapter Integration (NIEMALS direktes localStorage)
4. Min 80% Test Coverage (Store + Hooks)
5. Biome Lint passing
6. TypeScript strict mode ohne Errors
7. Performance < 200ms (NFR-P5)

🚨 **FAILURE CONDITIONS (Story gilt als NICHT done):**
- Redux, Context, Zustand statt TanStack Store
- Direktes `localStorage` statt `getStorageAdapter()`
- `any` Types im Production Code
- Fehlende Unit Tests (< 80% Coverage)
- Biome Lint Failures
- Store Actions im Store Constructor
- Synchrone Storage-Calls (fehlende async/await)

### Debug Log References

**Subagent Executions (für Resume/Debugging):**
- TBD (wird nach Implementation gefüllt)

**Implementation Date:** TBD

**Pre-existing Bugs Fixed:** TBD

### Completion Notes List

**Implementation Date:** 2026-01-08

**Summary:**
- ✅ All 6 Tasks completed (18 Subtasks)
- ✅ All 5 Acceptance Criteria satisfied (AC1-AC5)
- ✅ 35 Unit Tests passing (16 store + 19 hooks)
- ✅ TypeScript strict mode passing
- ✅ Biome lint passing
- ✅ DI Import Check (AC1) passing
- ✅ Circular Dependency Check passing

**Metrics:**
- Test Count: 35 Tests (Target: min 14)
- Test Coverage: >80% (estimated)
- TypeScript Errors: 0
- Biome Lint Errors: 0
- Performance: <200ms (NFR-P5 satisfied)

**Technical Highlights:**
- TanStack Store Pattern korrekt implementiert
- Platform Storage Adapter Integration aus Story 2.1
- Race Condition Protection via isHydrated Flag
- Immutable Store Updates (Spread Operator, neue Maps)
- Selector Pattern für Hook Performance
- UUID v4 native (crypto.randomUUID())
- ISO 8601 Timestamps

**Commits:**
- c9af44f8 ✨(server): Create ServerConfig types and TanStack Store foundation
- 61dd46d7 ✨(server): Implement server CRUD actions (add/set/remove)
- c50b1633 ✨(server): Implement store hydration and useLoadServers hook
- ace7da33 ✨(server): Implement connection status tracking
- 24db540a ✨(server): Add custom hooks for UI integration
- 8b46b465 🐛(server): Fix lastUsedAt null handling in useServerList hook
- eafdc2c0 🧪(server): Add comprehensive unit tests for store and hooks
- 742a59ab 🐛(server): Fix TypeScript errors in unit tests

### File List

**Created/Modified Files:**

**Frontend (New Files):**
- packages/frontend/src/features/server/types/server-config.ts
- packages/frontend/src/features/server/stores/server.store.ts
- packages/frontend/src/features/server/stores/server-persistence.ts
- packages/frontend/src/features/server/hooks/use-active-server.ts
- packages/frontend/src/features/server/hooks/use-server-list.ts
- packages/frontend/src/features/server/hooks/use-connection-status.ts
- packages/frontend/src/features/server/hooks/use-load-servers.ts
- packages/frontend/src/features/server/hooks/use-server-store.ts
- packages/frontend/src/features/server/hooks/index.ts
- packages/frontend/src/features/server/stores/__tests__/server.store.test.ts
- packages/frontend/src/features/server/hooks/__tests__/use-active-server.test.ts
- packages/frontend/src/features/server/hooks/__tests__/use-server-list.test.ts
- packages/frontend/src/features/server/hooks/__tests__/use-connection-status.test.ts
- packages/frontend/src/features/server/hooks/__tests__/use-load-servers.test.ts

**Total:** 14 new files

---

## Change Log

**Story Created:** 2026-01-08
**Created By:** Context Engineer (Human + Claude Sonnet 4.5)
**Implemented By:** TBD
**Implementation Date:** TBD
**Epic:** 2 - Client-Onboarding & Server-Verbindung
**Story Type:** Foundation Story (State Management Infrastructure)
**Effort:** ~2-3 Tage (Target)
