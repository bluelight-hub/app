# Frontend-Architektur

> **Package:** @bluelight-hub/frontend
> **Pfad:** `packages/frontend/`
> **Framework:** React 19 + Vite + Tauri 2

---

## 1. Technologie-Stack

### 1.1 Core

| Technologie | Version | Zweck |
|-------------|---------|-------|
| React | 19.1.0 | UI Library |
| Vite | 6.3.5 | Build Tool |
| Tauri | 2.5.1 | Desktop Framework |
| TypeScript | 5.8.3 | Type Safety |

### 1.2 TanStack Ecosystem

| Library | Zweck |
|---------|-------|
| @tanstack/react-router | File-based Routing |
| @tanstack/react-query | Server State Management |
| @tanstack/react-store | Client State Management |
| @tanstack/react-form | Form State + Validation |
| @tanstack/pacer | Debouncing/Throttling |

### 1.3 Styling

| Technologie | Verwendung |
|-------------|------------|
| Tailwind CSS 4.x | Utility-First CSS |
| Headless UI | Accessible UI Primitives |
| Heroicons | Icon Library |
| motion (Framer) | Animationen |

---

## 2. Projekt-Struktur

```
packages/frontend/src/
├── features/           # Feature-basierte Module
│   ├── einsatz/
│   ├── etb/
│   ├── kraefte/
│   ├── lagekarte/
│   ├── auth/
│   └── admin/
├── shared/             # Geteilte Komponenten
│   ├── ui/
│   ├── hooks/
│   ├── api/
│   └── lib/
├── routes/             # TanStack Router (file-based)
├── provider/           # App Providers
├── services/           # App Services
└── types/              # TypeScript Typen
```

---

## 3. Feature-Architektur

Jedes Feature ist ein selbständiges Modul:

```
features/einsatz/
├── api/                # TanStack Query Hooks
│   ├── queries.ts      # useEinsaetze, useEinsatzById
│   └── mutations.ts    # useCreateEinsatz
├── stores/             # TanStack Store
│   └── active-einsatz.store.ts
├── ui/                 # Atomic Design
│   ├── atoms/          # Basis-Komponenten
│   ├── molecules/      # Kombinierte Komponenten
│   ├── organisms/      # Komplexe Komponenten
│   └── pages/          # Route-Komponenten
├── constants/          # Feature-Konstanten
└── utils/              # Feature-Utilities
```

---

## 4. State Management

### 4.1 Server State (TanStack Query)

```typescript
// features/einsatz/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@bluelight-hub/shared/client';
import { QUERY_KEYS } from '@/queryKeys';

export const useEinsaetze = () => {
  return useQuery({
    queryKey: QUERY_KEYS.einsatz.list(),
    queryFn: () => api.einsatz.findAll(),
  });
};

export const useCreateEinsatz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEinsatzDto) => api.einsatz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.einsatz.all });
    },
  });
};
```

### 4.2 Query Keys Factory

```typescript
// queryKeys.ts
export const QUERY_KEYS = {
  einsatz: {
    all: ['einsatz'] as const,
    list: () => [...QUERY_KEYS.einsatz.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.einsatz.all, 'detail', id] as const,
  },
  etb: {
    byEinsatz: (einsatzId: string) => ['etb', 'einsatz', einsatzId] as const,
  },
  kraefte: {
    fahrzeuge: (einsatzId: string) => ['kraefte', 'fahrzeuge', einsatzId] as const,
    personen: (einsatzId: string) => ['kraefte', 'personen', einsatzId] as const,
  },
} as const;
```

### 4.3 Client State (TanStack Store)

```typescript
// features/einsatz/stores/active-einsatz.store.ts
import { Store } from '@tanstack/store';

interface ActiveEinsatzState {
  activeEinsatzId: string | null;
  viewMode: 'dashboard' | 'detail';
}

export const activeEinsatzStore = new Store<ActiveEinsatzState>({
  activeEinsatzId: null,
  viewMode: 'dashboard',
});

// Verwendung mit Hook
import { useStore } from '@tanstack/react-store';

const activeId = useStore(activeEinsatzStore, (s) => s.activeEinsatzId);
```

---

## 5. Platform Storage Abstraction (Port-Adapter Pattern)

### 5.1 Übersicht

Bluelight Hub läuft auf **zwei Platforms** (Desktop/Tauri + Web/Browser) und benötigt plattformübergreifenden Storage für Server-Konfigurationen, UI-Präferenzen und Session-Daten.

**Pattern:** Port-Adapter (Hexagonal Architecture) mit Factory Singleton

**Vorteile:**
- ✅ **Platform-Agnostisch:** Features kennen keine Platform-Details
- ✅ **Testbar:** Mock `IStoragePort` in Unit Tests
- ✅ **Erweiterbar:** Neue Platforms ohne Breaking Changes
- ✅ **Type Safe:** TypeScript Generics für Storage-Operationen

**Architektur-Entscheidung:** Siehe [ADR-010: Platform Storage Adapter Pattern](./ADR-010-platform-storage-adapter-pattern.md)

### 5.2 Komponenten

#### Port Interface (`IStoragePort`)

```typescript
// packages/frontend/src/shared/services/storage/IStoragePort.ts
export interface IStoragePort {
  /**
   * Retrieves a value from storage
   * @returns The stored value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in storage
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Removes a value from storage
   */
  remove(key: string): Promise<void>;

  /**
   * Clears all storage (use with caution!)
   */
  clear(): Promise<void>;
}
```

#### Adapters (Platform-Specific)

**Tauri Storage Adapter** (Desktop):

```typescript
// packages/frontend/src/shared/services/storage/adapters/TauriStorageAdapter.ts
import { invoke } from '@tauri-apps/api/core';
import type { IStoragePort } from '../IStoragePort';

export class TauriStorageAdapter implements IStoragePort {
  async get<T>(key: string): Promise<T | null> {
    const value = await invoke<string | null>('plugin:store|get', { key });
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await invoke('plugin:store|set', { key, value: JSON.stringify(value) });
  }

  async remove(key: string): Promise<void> {
    await invoke('plugin:store|delete', { key });
  }

  async clear(): Promise<void> {
    await invoke('plugin:store|clear');
  }
}
```

**Web Storage Adapter** (Browser):

```typescript
// packages/frontend/src/shared/services/storage/adapters/WebStorageAdapter.ts
import type { IStoragePort } from '../IStoragePort';

export class WebStorageAdapter implements IStoragePort {
  async get<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}
```

#### Factory Singleton

```typescript
// packages/frontend/src/shared/services/storage/storage-factory.ts
import type { IStoragePort } from './IStoragePort';
import { TauriStorageAdapter } from './adapters/TauriStorageAdapter';
import { WebStorageAdapter } from './adapters/WebStorageAdapter';

let storageInstance: IStoragePort | null = null;

/**
 * Platform Detection (Tauri-spezifisch)
 */
function isTauriEnvironment(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

/**
 * Factory Singleton: Erstellt Platform-spezifischen Storage Adapter
 * @returns IStoragePort-Implementierung basierend auf Runtime-Platform
 */
export function getStorageAdapter(): IStoragePort {
  if (storageInstance === null) {
    storageInstance = isTauriEnvironment()
      ? new TauriStorageAdapter()
      : new WebStorageAdapter();
  }

  return storageInstance;
}

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

### 5.3 Feature Usage

**TanStack Query Mutation:**

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
```

**Direct Usage (Service):**

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

### 5.4 Storage Keys Convention

**Namespace-Prefix:** Alle Keys mit `bluelight:` prefixen

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

const servers = await storage.get<ServerConfig[]>(STORAGE_KEYS.SERVERS);
```

### 5.5 Testing

**Mock Storage in Tests:**

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

### 5.6 Platform Differences

| Feature | Tauri (Desktop) | Web (Browser) |
|---------|-----------------|---------------|
| **Storage Backend** | `tauri-plugin-store` (File-based JSON) | `localStorage` (Browser API) |
| **Encryption** | Stronghold Plugin (geplant) | Web Crypto API (geplant) |
| **Persistenz** | Unbegrenzt (File System) | ~5-10 MB, evictable |
| **Performance** | ~5-20ms (Disk I/O) | <5ms (Memory) |
| **Offline** | ✅ Vollständig | ✅ Vollständig |
| **Cross-Origin** | N/A | Same-Origin Policy |

**Hinweis:** Verschlüsselung für Tokens/Secrets siehe [ADR-001: Platform Storage Strategy](./ADR-001-platform-storage-strategy.md)

---

## 6. Routing (TanStack Router)

### 6.1 File-based Routes

```
routes/
├── __root.tsx          # Root Layout
├── index.tsx           # Home Route (/)
├── app/
│   ├── index.tsx       # /app
│   ├── einsatz/
│   │   ├── index.tsx   # /app/einsatz
│   │   └── $id.tsx     # /app/einsatz/:id
│   └── etb/
│       └── $einsatzId.tsx
└── admin/
    ├── index.tsx
    └── users.tsx
```

### 6.2 Route Definition

```typescript
// routes/app/einsatz/$id.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$id')({
  component: EinsatzDetailPage,
  loader: ({ params }) => loadEinsatzData(params.id),
  pendingComponent: LoadingSpinner,
  errorComponent: ErrorBoundary,
});
```

---

## 7. Forms (TanStack Form + Zod)

### 7.1 Form Setup

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { createEinsatzSchema } from '../schemas/einsatz.schema';

export const EinsatzForm = () => {
  const form = useForm({
    defaultValues: { nummer: '', stichwort: '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createEinsatzSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="nummer">
        {(field) => (
          <Input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <Button type="submit">Erstellen</Button>
    </form>
  );
};
```

### 7.2 Zod Schema

```typescript
// schemas/einsatz.schema.ts
import { z } from 'zod';

export const createEinsatzSchema = z.object({
  nummer: z.string().min(1, 'Nummer erforderlich'),
  stichwort: z.string().min(1, 'Stichwort erforderlich'),
  adresse: z.object({
    strasse: z.string().optional(),
    ort: z.string().optional(),
  }).optional(),
});
```

---

## 8. API Integration

### 8.1 Generierter API Client

```typescript
// Importiert von @bluelight-hub/shared/client
import { api } from '@bluelight-hub/shared/client';

// Typsichere API-Aufrufe
const einsaetze = await api.einsatz.findAll();
const einsatz = await api.einsatz.findById({ id: 'abc123' });
```

### 8.2 Workflow

1. Backend: Endpoint mit NestJS + Swagger erstellen
2. `pnpm run generate-api` ausführen
3. Frontend: Generierten Client mit TanStack Query verwenden

---

## 9. Atomic Design

### 9.1 Hierarchie

| Level | Beschreibung | Beispiele |
|-------|--------------|-----------|
| **Atoms** | Basis-Elemente | Button, Input, Badge |
| **Molecules** | Kombinationen | FormField, Card, Alert |
| **Organisms** | Komplexe Sections | EinsatzForm, DataTable |
| **Templates** | Page Layouts | DashboardLayout |
| **Pages** | Route-Komponenten | EinsatzDetailPage |

### 9.2 Komponenten-Struktur

```typescript
// shared/ui/atoms/Button.tsx
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const Button = ({ className, variant, size, ...props }) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
);
```

---

## 10. Tauri Integration

### 10.1 Native Features

| Plugin | Zweck |
|--------|-------|
| `tauri-plugin-os` | OS-Erkennung |
| `tauri-plugin-shell` | Shell-Befehle |
| `tauri-plugin-updater` | Auto-Updates |
| `tauri-plugin-deep-link` | URL-Handling |
| `tauri-plugin-dialog` | Native Dialoge |
| `tauri-plugin-clipboard-manager` | Zwischenablage |

### 10.2 Tauri API Nutzung

```typescript
import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

// Rust-Funktion aufrufen
const result = await invoke('my_rust_function', { arg: 'value' });

// OS-Info abrufen
const currentPlatform = await platform(); // 'macos' | 'windows' | 'linux'
```

---

## 11. Testing

### 11.1 Vitest Setup

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
    },
  },
});
```

### 11.2 Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

test('should render einsatz list', async () => {
  renderWithProviders(<EinsatzList />);
  expect(await screen.findByText('Einsätze')).toBeInTheDocument();
});
```

---

## 12. Wichtige Regeln

### NIEMALS:
- Andere CSS Frameworks (nur Tailwind!)
- Redux oder andere State Libraries
- Manuelle API Helper (nur generierter Client!)
- HTML Forms (nur TanStack Form!)

### IMMER:
- TanStack Ecosystem für State/Forms/Routing
- Tailwind CSS + Headless UI für Styling
- Generierter API Client aus `@bluelight-hub/shared`
- Feature-basierte Modul-Struktur

---

*Dokumentation generiert durch BMad Document-Project Workflow v1.2.0*
