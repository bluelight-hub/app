# Einsatz Feature Migration - TanStack Native Architecture

## Übersicht

Die bisherige monolithische `useEinsaetze.ts` (608 Zeilen) wurde in eine saubere, modulare Feature-Struktur migriert:

```
src/features/einsatz/
├── api/                              # Query & Mutation Layer
│   ├── queries.ts                    # Query Keys Factory + Retry Logic
│   ├── use-einsaetze-query.ts        # Paginated List Query
│   ├── use-einsaetze-infinite-query.ts # Infinite Scroll Query
│   ├── use-einsatz-detail.ts         # Single Detail Query
│   ├── use-active-einsaetze-with-counts.ts # Dashboard Query
│   ├── use-create-einsatz.ts         # Create Mutation
│   ├── use-update-einsatz.ts         # Update Mutation
│   ├── use-archive-einsatz.ts        # Archive Mutation
│   └── index.ts                      # Public API Exports
├── stores/
│   └── einsatz-ui.store.ts          # UI State (TanStack Store)
└── index.ts                          # Feature Public API
```

## Migration Guide

### 1. Imports aktualisieren

#### Vorher (alte Hooks):

```typescript
import { useEinsaetze, useEinsatz, useActiveEinsaetzeWithCounts } from '@/hooks/useEinsaetze';
import { QUERY_KEYS } from '@/queryKeys';
```

#### Nachher (neues Feature):

```typescript
// Alles aus einem Feature-Import
import {
  // Queries
  useEinsaetzeQuery,
  useEinsaetzeInfiniteQuery,
  useEinsatzDetail,
  useActiveEinsaetzeWithCounts,
  // Mutations
  useCreateEinsatz,
  useUpdateEinsatz,
  useArchiveEinsatz,
  // Query Keys
  EINSATZ_QUERY_KEYS,
  // Store
  einsatzUIStore,
  setStatusFilter,
  setSearchFilter,
} from '@/features/einsatz';
```

### 2. Hook-Nutzung anpassen

#### A) Paginated List Query

**Vorher:**

```typescript
const { einsaetze, total, isLoading, createEinsatz, updateEinsatz } = useEinsaetze({
  status: 'AKTIV',
  page: 1,
  limit: 20,
});
```

**Nachher:**

```typescript
// 1. Query für Daten
const { data, isLoading } = useEinsaetzeQuery({
  status: 'AKTIV',
  page: 1,
  limit: 20,
});

const einsaetze = data?.data || [];
const total = data?.pagination?.total || 0;

// 2. Mutations separat
const createEinsatz = useCreateEinsatz({ status: 'AKTIV' });
const updateEinsatz = useUpdateEinsatz();
```

#### B) Infinite Scroll Query

**Vorher:**

```typescript
const {
  einsaetze,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useEinsaetze({
  infinite: true,
  status: 'AKTIV',
  limit: 20,
});
```

**Nachher:**

```typescript
const {
  data,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useEinsaetzeInfiniteQuery({
  status: 'AKTIV',
  limit: 20,
});

// Flatten all pages
const einsaetze = data?.pages.flatMap(page => page.data || []) || [];
```

#### C) Single Detail Query

**Vorher:**

```typescript
const { einsatz, completeness, isLoading, updateEinsatz } = useEinsatz(id);
```

**Nachher:**

```typescript
// 1. Detail Query
const { einsatz, completeness, isLoading } = useEinsatzDetail(id);

// 2. Update Mutation separat
const updateEinsatz = useUpdateEinsatz();

// Usage
updateEinsatz.mutate({
  id,
  data: { alarmstichwort: 'Brand' },
});
```

#### D) Dashboard Query mit Counts

**Vorher:**

```typescript
const { data: einsaetze, isLoading } = useActiveEinsaetzeWithCounts();
```

**Nachher:**

```typescript
// Unverändert - Hook bleibt gleich!
const { data: einsaetze, isLoading } = useActiveEinsaetzeWithCounts();
```

### 3. Mutation-Nutzung

#### Create Einsatz

```typescript
const createEinsatz = useCreateEinsatz({ status: 'AKTIV' }); // Optional: Filter für Cache-Update

const handleCreate = (data: CreateEinsatzDto) => {
  createEinsatz.mutate(data, {
    onSuccess: (createdEinsatz) => {
      router.push(`/einsatz/${createdEinsatz.id}`);
    },
  });
};
```

#### Update Einsatz

```typescript
const updateEinsatz = useUpdateEinsatz();

const handleUpdate = (id: string, data: UpdateEinsatzDto) => {
  updateEinsatz.mutate({ id, data });
};
```

#### Archive Einsatz

```typescript
const archiveEinsatz = useArchiveEinsatz({ status: 'AKTIV' }); // Optional: Filter

const handleArchive = (id: string) => {
  if (confirm('Einsatz wirklich archivieren?')) {
    archiveEinsatz.mutate({ id });
  }
};
```

### 4. UI State Management

Die alte `useEinsaetze.ts` hatte keine zentrale UI-State-Verwaltung. Der neue Store ermöglicht:

```typescript
import { useStore } from '@tanstack/react-store';
import {
  einsatzUIStore,
  setStatusFilter,
  setSearchFilter,
  setPage,
  getEinsatzQueryFilters,
} from '@/features/einsatz';

// In Component
function EinsatzList() {
  // Subscribe to store
  const viewMode = useStore(einsatzUIStore, (state) => state.viewMode);
  const filters = useStore(einsatzUIStore, (state) => state.filters);

  // Use filters in query
  const queryFilters = getEinsatzQueryFilters();
  const { data } = useEinsaetzeQuery(queryFilters);

  // Update filters
  const handleStatusChange = (status) => {
    setStatusFilter(status); // Auto-resets page to 1
  };

  const handleSearch = (search) => {
    setSearchFilter(search); // Auto-resets page to 1
  };

  const handlePageChange = (page) => {
    setPage(page);
  };

  // ...
}
```

## Vorteile der neuen Struktur

### 1. Separation of Concerns

- **Query Logic** (api/) - Nur Daten laden
- **Mutation Logic** (api/) - Nur Daten ändern
- **UI State** (stores/) - Nur UI-Zustand

### 2. Tree Shaking

- Komponenten importieren nur benötigte Hooks
- Kleinere Bundle-Größe

### 3. Testbarkeit

- Jeder Hook ist isoliert testbar
- Queries und Mutations getrennt mockbar

### 4. Wartbarkeit

- Einzelne Dateien < 200 Zeilen
- Klare Verantwortlichkeiten
- Einfache Navigation

### 5. Wiederverwendbarkeit

- Query Keys Factory (`EINSATZ_QUERY_KEYS`)
- Retry Logic (`calculateRetryDelay`)
- UI State Actions (`setStatusFilter`, etc.)

## Breaking Changes

### 1. Hook-Namen geändert

| Alt | Neu |
|-----|-----|
| `useEinsaetze({ infinite: false })` | `useEinsaetzeQuery()` |
| `useEinsaetze({ infinite: true })` | `useEinsaetzeInfiniteQuery()` |
| `useEinsatz(id)` | `useEinsatzDetail(id)` |

### 2. Return-Struktur geändert

**Vorher (alles in einem Objekt):**

```typescript
const { einsaetze, createEinsatz, updateEinsatz } = useEinsaetze();
```

**Nachher (Query + Mutations getrennt):**

```typescript
const { data } = useEinsaetzeQuery();
const createEinsatz = useCreateEinsatz();
const updateEinsatz = useUpdateEinsatz();
```

### 3. Mutation-Signatur geändert

**Vorher:**

```typescript
createEinsatz.mutate(data);
updateEinsatz.mutate({ id, data });
```

**Nachher (unverändert für Update, vereinfacht für Create):**

```typescript
createEinsatz.mutate(data); // Gleich
updateEinsatz.mutate({ id, data }); // Gleich
```

## Nächste Schritte

1. **Komponenten migrieren** - Schritt für Schritt alte Hooks durch neue ersetzen
2. **Tests aktualisieren** - Mock-Struktur an neue Hooks anpassen
3. **Alte Hooks entfernen** - Nach vollständiger Migration `src/hooks/useEinsaetze.ts` löschen
4. **Query Keys migrieren** - `EINSATZ_QUERY_KEYS` aus `queryKeys.ts` entfernen

## Beispiel: Vollständige Komponenten-Migration

**Vorher:**

```typescript
// src/components/pages/EinsatzListPage.tsx
import { useEinsaetze } from '@/hooks/useEinsaetze';

function EinsatzListPage() {
  const { einsaetze, total, isLoading, createEinsatz, updateEinsatz } = useEinsaetze({
    status: 'AKTIV',
    page: 1,
    limit: 20,
  });

  return (
    <div>
      {isLoading ? <Spinner /> : <List items={einsaetze} total={total} />}
    </div>
  );
}
```

**Nachher:**

```typescript
// src/components/pages/EinsatzListPage.tsx
import { useStore } from '@tanstack/react-store';
import {
  useEinsaetzeQuery,
  useCreateEinsatz,
  useUpdateEinsatz,
  einsatzUIStore,
  getEinsatzQueryFilters,
  setPage,
} from '@/features/einsatz';

function EinsatzListPage() {
  // UI State aus Store
  const filters = getEinsatzQueryFilters();

  // Query
  const { data, isLoading } = useEinsaetzeQuery(filters);
  const einsaetze = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Mutations
  const createEinsatz = useCreateEinsatz(filters);
  const updateEinsatz = useUpdateEinsatz();

  // Handlers
  const handlePageChange = (page: number) => setPage(page);

  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : (
        <List
          items={einsaetze}
          total={total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

## Cheatsheet

### Queries

```typescript
// Paginated List
useEinsaetzeQuery({ status, search, page, limit, orderBy, orderDirection })

// Infinite Scroll
useEinsaetzeInfiniteQuery({ status, search, limit, orderBy, orderDirection })

// Single Detail
useEinsatzDetail(id)

// Dashboard with Counts
useActiveEinsaetzeWithCounts()
```

### Mutations

```typescript
// Create
const create = useCreateEinsatz(filters?);
create.mutate(data);

// Update
const update = useUpdateEinsatz();
update.mutate({ id, data });

// Archive
const archive = useArchiveEinsatz(filters?);
archive.mutate({ id });
```

### Store Actions

```typescript
setSelectedEinsatzId(id)
setStatusFilter(status)
setSearchFilter(search)
setPage(page)
setLimit(limit)
setSorting(orderBy, orderDirection)
setViewMode('list' | 'grid' | 'infinite')
resetFilters()
resetEinsatzUIStore()
getEinsatzQueryFilters() // Returns combined filters + sorting
```

### Query Keys

```typescript
EINSATZ_QUERY_KEYS.all // ['einsatz']
EINSATZ_QUERY_KEYS.list({ status: 'AKTIV' }) // ['einsatz', 'list', { status: 'AKTIV' }]
EINSATZ_QUERY_KEYS.infinite({ status: 'AKTIV' }) // ['einsatz', 'infinite', { status: 'AKTIV' }]
EINSATZ_QUERY_KEYS.detail(id) // ['einsatz', 'detail', id]
EINSATZ_QUERY_KEYS.activeWithCounts() // ['einsatz', 'activeWithCounts']
```
