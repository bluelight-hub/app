# Code Conventions

Best Practices und Patterns für die Entwicklung im Bluelight Hub Projekt.

---

## Platform Storage Adapter Pattern

### Übersicht

Bluelight Hub nutzt das **Port-Adapter Pattern** (Hexagonal Architecture) für plattformübergreifenden Storage (Desktop/Tauri + Web/Browser).

**Warum?**
- ✅ **Platform-Agnostisch:** Features kennen keine Platform-Details
- ✅ **Testbar:** Mock `IStoragePort` in Unit Tests
- ✅ **Erweiterbar:** Neue Platforms ohne Breaking Changes
- ✅ **Type Safe:** TypeScript Generics für Storage-Operationen

**Architektur-Entscheidung:** Siehe [ADR-010: Platform Storage Adapter Pattern](../project-documentation/ADR-010-platform-storage-adapter-pattern.md)

---

### Factory Singleton: `getStorageAdapter()`

**IMMER verwenden** für Storage-Zugriff:

```typescript
import { getStorageAdapter } from '@/shared/services/storage/storage-factory';

const storage = getStorageAdapter();
```

**Platform Detection:**
- Tauri Desktop → `TauriStorageAdapter` (tauri-plugin-store)
- Web Browser → `WebStorageAdapter` (localStorage)

**Singleton:**
- Platform Detection nur einmalig (Performance)
- Gleiche Instanz bei mehrfachen Aufrufen

---

### Feature Usage

#### TanStack Query Mutation

**Empfohlen** für UI-Features:

```typescript
// features/admin/api/mutations.ts
import { getStorageAdapter } from '@/shared/services/storage/storage-factory';
import { useMutation } from '@tanstack/react-query';

export const useSaveServerConfig = () => {
  const storage = getStorageAdapter();

  return useMutation({
    mutationFn: async (servers: ServerConfig[]) => {
      await storage.set('bluelight:servers', servers);
    },
  });
};

// Usage in Component
function ServerSetup() {
  const saveMutation = useSaveServerConfig();

  const handleSave = async (servers: ServerConfig[]) => {
    await saveMutation.mutateAsync(servers);
  };

  return <button onClick={() => handleSave(servers)}>Save</button>;
}
```

#### Direct Service Usage

**Für Services/Utilities:**

```typescript
// services/session-manager.service.ts
import { getStorageAdapter } from '@/shared/services/storage/storage-factory';

export class SessionManager {
  private storage = getStorageAdapter();

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    await this.storage.set('bluelight:user-prefs', prefs);
  }

  async loadUserPreferences(): Promise<UserPreferences | null> {
    return await this.storage.get<UserPreferences>('bluelight:user-prefs');
  }
}
```

---

### Storage Keys Convention

**IMMER** mit `bluelight:` Namespace prefixen:

```typescript
// constants/storage-keys.ts
export const STORAGE_KEYS = {
  SERVERS: 'bluelight:servers',
  ACTIVE_SERVER_ID: 'bluelight:active-server-id',
  USER_PREFS: 'bluelight:user-prefs',
  SESSION_TOKEN: 'bluelight:session-token',
} as const;
```

**Usage:**

```typescript
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { getStorageAdapter } from '@/shared/services/storage/storage-factory';

const storage = getStorageAdapter();
const servers = await storage.get<ServerConfig[]>(STORAGE_KEYS.SERVERS);
```

**Warum Namespace?**
- Verhindert Key-Kollisionen mit anderen Apps (localStorage)
- Einfaches Debugging (alle Keys filterable: `bluelight:*`)
- Migration-freundlich (alle Keys identifizierbar)

---

### Testing

#### Mock Storage in Unit Tests

**Pattern:**

```typescript
// __tests__/my-feature.test.ts
import { vi } from 'vitest';
import type { IStoragePort } from '@/shared/services/storage/IStoragePort';

const mockStorage: IStoragePort = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
};

vi.mock('@/shared/services/storage/storage-factory', () => ({
  getStorageAdapter: () => mockStorage,
}));

test('should save server config', async () => {
  mockStorage.set = vi.fn().mockResolvedValue(undefined);

  await saveServerConfig({ url: 'https://api.example.com' });

  expect(mockStorage.set).toHaveBeenCalledWith(
    'bluelight:servers',
    expect.any(Array)
  );
});
```

#### Integration Tests (Adapter)

**Testen mit echtem localStorage/Tauri Store:**

```typescript
// __tests__/storage-integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getStorageAdapter, resetStorageAdapter } from '@/shared/services/storage/storage-factory';

describe('Storage Integration', () => {
  let storage: IStoragePort;

  beforeEach(() => {
    localStorage.clear(); // Browser-Test
    resetStorageAdapter(); // ONLY FOR TESTING
    storage = getStorageAdapter();
  });

  it('should persist server config', async () => {
    const servers = [{ id: '1', url: 'https://api.example.com' }];

    await storage.set('bluelight:servers', servers);
    const retrieved = await storage.get<ServerConfig[]>('bluelight:servers');

    expect(retrieved).toEqual(servers);
  });
});
```

**⚠️ WICHTIG:** `resetStorageAdapter()` ist **ONLY FOR TESTING**!

```typescript
/**
 * ONLY FOR TESTING: Reset Singleton
 * ⚠️ NEVER use in production code!
 */
export function resetStorageAdapter(): void {
  if (import.meta.env.MODE !== 'test') {
    throw new Error('resetStorageAdapter() is only allowed in test mode');
  }
  storageInstance = null;
}
```

---

### Tauri Command Registration

**WICHTIG:** Tauri Store Plugin benötigt Command Registration in `src-tauri/main.rs`:

```rust
// src-tauri/src/main.rs
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Store Plugin registrieren
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Capabilities:** `src-tauri/capabilities/default.json`

```json
{
  "identifier": "default",
  "description": "Default capabilities",
  "permissions": [
    "store:default",
    "store:allow-get",
    "store:allow-set",
    "store:allow-has",
    "store:allow-delete",
    "store:allow-clear",
    "store:allow-keys"
  ]
}
```

**Weiterführende Dokumentation:** Siehe [tauri-plugins.md](./tauri-plugins.md#store-plugin-v241)

---

### Platform Differences

| Feature | Tauri (Desktop) | Web (Browser) |
|---------|-----------------|---------------|
| **Storage Backend** | `tauri-plugin-store` (File-based JSON) | `localStorage` (Browser API) |
| **Encryption** | Stronghold Plugin (geplant) | Web Crypto API (geplant) |
| **Persistenz** | Unbegrenzt (File System) | ~5-10 MB, evictable |
| **Performance** | ~5-20ms (Disk I/O) | <5ms (Memory) |
| **Offline** | ✅ Vollständig | ✅ Vollständig |
| **Cross-Origin** | N/A | Same-Origin Policy |

**Hinweis:** Verschlüsselung für Tokens/Secrets siehe [ADR-001: Platform Storage Strategy](../project-documentation/ADR-001-platform-storage-strategy.md)

---

### Best Practices

#### ✅ DO

```typescript
// ✅ Factory Singleton verwenden
const storage = getStorageAdapter();

// ✅ Namespaced Storage Keys
const STORAGE_KEYS = {
  SERVERS: 'bluelight:servers',
} as const;

// ✅ Type-Safe Generics
const servers = await storage.get<ServerConfig[]>(STORAGE_KEYS.SERVERS);

// ✅ Mock in Tests
vi.mock('@/shared/services/storage/storage-factory', () => ({
  getStorageAdapter: () => mockStorage,
}));
```

#### ❌ DON'T

```typescript
// ❌ NIEMALS direktes localStorage in Features
localStorage.setItem('servers', JSON.stringify(servers));

// ❌ NIEMALS direktes Tauri Store in Features
import { Store } from '@tauri-apps/plugin-store';
const store = new Store('app.json');

// ❌ NIEMALS Platform Detection in Feature Code
if (isTauri()) {
  // Tauri logic
} else {
  // Browser logic
}

// ❌ NIEMALS resetStorageAdapter() in Production Code
if (import.meta.env.PROD) {
  resetStorageAdapter(); // THROWS ERROR!
}
```

---

### Migration von Legacy Code

**Vorher (Legacy):**

```typescript
// ❌ OLD: Direktes localStorage
localStorage.setItem('servers', JSON.stringify(servers));
const servers = JSON.parse(localStorage.getItem('servers') || '[]');

// ❌ OLD: Platform-spezifischer Code
if (window.__TAURI_INTERNALS__) {
  const store = new Store('app.json');
  await store.set('servers', servers);
} else {
  localStorage.setItem('servers', JSON.stringify(servers));
}
```

**Nachher (Port-Adapter Pattern):**

```typescript
// ✅ NEW: Platform-agnostisch
import { getStorageAdapter } from '@/shared/services/storage/storage-factory';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const storage = getStorageAdapter();

// Save
await storage.set(STORAGE_KEYS.SERVERS, servers);

// Load
const servers = await storage.get<ServerConfig[]>(STORAGE_KEYS.SERVERS) ?? [];
```

**Migration-Schritte:**

1. Import `getStorageAdapter` statt direktem `localStorage`/`Store`
2. Ersetze `localStorage.setItem` → `storage.set`
3. Ersetze `localStorage.getItem` → `storage.get`
4. Ersetze `JSON.parse/stringify` → automatisch durch Adapter
5. Nutze `STORAGE_KEYS` Constants statt String-Literals
6. Teste mit Mock Storage

---

### Common Pitfalls

#### ❌ Pitfall 1: Synchrones API erwarten

```typescript
// ❌ FALSCH: localStorage ist synchron, IStoragePort ist async
const servers = storage.get('bluelight:servers'); // COMPILE ERROR

// ✅ RICHTIG: Immer await
const servers = await storage.get('bluelight:servers');
```

#### ❌ Pitfall 2: Manuelle JSON.parse/stringify

```typescript
// ❌ FALSCH: Adapter macht das bereits
await storage.set('key', JSON.stringify(data)); // Doppelt stringified!
const data = JSON.parse(await storage.get('key')); // Doppelt geparsed!

// ✅ RICHTIG: Adapter übernimmt Serialization
await storage.set('key', data);
const data = await storage.get<MyType>('key');
```

#### ❌ Pitfall 3: Platform Detection in Feature Code

```typescript
// ❌ FALSCH: Features sollen Platform-agnostisch sein
if (window.__TAURI_INTERNALS__) {
  const tauriStorage = new TauriStorageAdapter();
  await tauriStorage.set('key', value);
} else {
  localStorage.setItem('key', JSON.stringify(value));
}

// ✅ RICHTIG: Factory übernimmt Platform Detection
const storage = getStorageAdapter();
await storage.set('key', value);
```

---

### Related Documentation

- **ADR:** [ADR-010: Platform Storage Adapter Pattern](../project-documentation/ADR-010-platform-storage-adapter-pattern.md)
- **Frontend Architecture:** [Platform Storage Abstraction](../project-documentation/03-frontend-architektur.md#5-platform-storage-abstraction-port-adapter-pattern)
- **Tauri Plugins:** [Store Plugin v2.4.1](./tauri-plugins.md#store-plugin-v241)
- **Strategy Decision:** [ADR-001: Platform Storage Strategy](../project-documentation/ADR-001-platform-storage-strategy.md)

---

## Weitere Conventions

*(Platzhalter für zukünftige Conventions)*

- Forms Pattern (TanStack Form + Zod)
- API Integration Pattern (Generated Client + TanStack Query)
- State Management Pattern (TanStack Store + Query)
- Component Architecture (Atomic Design)

---

*Dokumentation erstellt für Story 2.1 - Multi-Server Configuration*
