# Einsatz Feature

TanStack-native Feature für Einsatz-Verwaltung mit strikter Separation of Concerns.

## Architektur

```
einsatz/
├── api/                    # Query & Mutation Layer
│   ├── queries.ts          # Query Keys Factory + Utilities
│   ├── use-*-query.ts      # Query Hooks (GET)
│   └── use-*-mutation.ts   # Mutation Hooks (POST/PUT/DELETE)
├── stores/                 # UI State Layer
│   └── einsatz-ui.store.ts # TanStack Store für UI-State
└── index.ts                # Public API
```

## Installation

```typescript
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
  setPage,
  getEinsatzQueryFilters,
} from '@/features/einsatz';
```

## Quick Start

### 1. Paginated List

```typescript
function EinsatzList() {
  // UI State
  const filters = getEinsatzQueryFilters();

  // Query
  const { data, isLoading } = useEinsaetzeQuery(filters);
  const einsaetze = data?.data || [];

  // Mutations
  const createEinsatz = useCreateEinsatz(filters);

  return (
    <div>
      <button onClick={() => createEinsatz.mutate({ ... })}>
        Erstellen
      </button>
      {einsaetze.map(e => <EinsatzCard key={e.id} einsatz={e} />)}
    </div>
  );
}
```

### 2. Infinite Scroll

```typescript
function EinsatzInfiniteList() {
  const { data, fetchNextPage, hasNextPage } = useEinsaetzeInfiniteQuery({
    status: 'AKTIV',
    limit: 20,
  });

  const einsaetze = data?.pages.flatMap(page => page.data || []) || [];

  return (
    <InfiniteScroll onLoadMore={fetchNextPage} hasMore={hasNextPage}>
      {einsaetze.map(e => <EinsatzCard key={e.id} einsatz={e} />)}
    </InfiniteScroll>
  );
}
```

### 3. Detail View

```typescript
function EinsatzDetail({ id }: { id: string }) {
  const { einsatz, completeness, isLoading } = useEinsatzDetail(id);
  const updateEinsatz = useUpdateEinsatz();

  if (isLoading) return <Spinner />;
  if (!einsatz) return <NotFound />;

  return (
    <div>
      <h1>{einsatz.name}</h1>
      <CompletenessBadge value={completeness} />
      <button onClick={() => updateEinsatz.mutate({ id, data: { ... } })}>
        Aktualisieren
      </button>
    </div>
  );
}
```

### 4. Dashboard mit Counts

```typescript
function EinsatzDashboard() {
  const { data: einsaetze, isLoading } = useActiveEinsaetzeWithCounts();

  return (
    <DashboardGrid>
      {einsaetze?.map(e => (
        <EinsatzCard
          key={e.id}
          einsatz={e}
          etbCount={e.etbEintraegeCount}
          poiCount={e.poisCount}
        />
      ))}
    </DashboardGrid>
  );
}
```

## API Reference

### Queries

#### `useEinsaetzeQuery(filters?)`

Lädt paginierte Einsatz-Liste.

**Parameters:**
- `filters?: EinsatzQueryFilters`
  - `status?: 'ANGELEGT' | 'AKTIV' | 'ARCHIVIERT'`
  - `search?: string`
  - `page?: number`
  - `limit?: number`
  - `orderBy?: 'createdAt' | 'updatedAt' | ...`
  - `orderDirection?: 'asc' | 'desc'`

**Returns:**
```typescript
{
  data?: {
    data: EinsatzResponseDto[];
    pagination: { page, limit, total };
  };
  isLoading: boolean;
  error?: ResponseError;
  refetch: () => void;
}
```

#### `useEinsaetzeInfiniteQuery(filters?)`

Lädt Einsätze für Infinite Scrolling.

**Parameters:** Wie `useEinsaetzeQuery`, ohne `page`

**Returns:**
```typescript
{
  data?: {
    pages: Array<{ data, pagination }>;
  };
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}
```

#### `useEinsatzDetail(id)`

Lädt einzelnen Einsatz mit Store-Integration.

**Parameters:**
- `id: string | null` - Einsatz-ID (null = disabled)

**Returns:**
```typescript
{
  einsatz?: EinsatzResponseDto;
  completeness?: number;
  isLoading: boolean;
  error?: ResponseError;
  refetch: () => void;
}
```

#### `useActiveEinsaetzeWithCounts()`

Lädt aktive Einsätze mit ETB/POI-Counts (optimiert für Dashboard).

**Returns:**
```typescript
{
  data?: EinsatzListItemDto[]; // mit etbEintraegeCount, poisCount
  isLoading: boolean;
  error?: ResponseError;
}
```

### Mutations

#### `useCreateEinsatz(filters?)`

Erstellt neuen Einsatz mit Optimistic Updates.

**Parameters:**
- `filters?: EinsatzQueryFilters` - Für Cache-Updates

**Returns:**
```typescript
{
  mutate: (data: CreateEinsatzDto) => void;
  mutateAsync: (data: CreateEinsatzDto) => Promise<EinsatzResponseDto>;
  isLoading: boolean;
  error?: ResponseError;
}
```

#### `useUpdateEinsatz()`

Aktualisiert bestehenden Einsatz.

**Returns:**
```typescript
{
  mutate: ({ id, data }: { id: string; data: UpdateEinsatzDto }) => void;
  mutateAsync: ({ id, data }) => Promise<EinsatzResponseDto>;
  isLoading: boolean;
  error?: ResponseError;
}
```

#### `useArchiveEinsatz(filters?)`

Archiviert Einsatz (setzt Status auf ARCHIVIERT).

**Parameters:**
- `filters?: EinsatzQueryFilters` - Für Cache-Updates

**Returns:**
```typescript
{
  mutate: ({ id }: { id: string }) => void;
  mutateAsync: ({ id }) => Promise<EinsatzResponseDto>;
  isLoading: boolean;
  error?: ResponseError;
}
```

### Store

#### `einsatzUIStore`

TanStack Store für UI-State.

**State:**
```typescript
{
  selectedEinsatzId: string | null;
  filters: {
    status?: 'ANGELEGT' | 'AKTIV' | 'ARCHIVIERT';
    search?: string;
    page: number;
    limit: number;
  };
  sorting: {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  };
  viewMode: 'list' | 'grid' | 'infinite';
}
```

**Usage:**
```typescript
import { useStore } from '@tanstack/react-store';
import { einsatzUIStore } from '@/features/einsatz';

function Component() {
  const viewMode = useStore(einsatzUIStore, state => state.viewMode);
  const filters = useStore(einsatzUIStore, state => state.filters);
  // ...
}
```

#### Store Actions

```typescript
setSelectedEinsatzId(id: string | null)
setStatusFilter(status?: 'ANGELEGT' | 'AKTIV' | 'ARCHIVIERT')
setSearchFilter(search?: string)
setPage(page: number)
setLimit(limit: number)
setSorting(orderBy?, orderDirection?)
setViewMode('list' | 'grid' | 'infinite')
resetFilters()
resetEinsatzUIStore()
getEinsatzQueryFilters() // Returns combined filters + sorting
```

### Query Keys

```typescript
EINSATZ_QUERY_KEYS = {
  all: ['einsatz'],
  list: (filters?) => ['einsatz', 'list', filters],
  infinite: (filters?) => ['einsatz', 'infinite', filters],
  detail: (id) => ['einsatz', 'detail', id],
  activeWithCounts: () => ['einsatz', 'activeWithCounts'],
  // ... weitere
}
```

## Best Practices

### 1. Filter aus Store nutzen

```typescript
function EinsatzList() {
  // ✅ RICHTIG: Filter aus Store
  const queryFilters = getEinsatzQueryFilters();
  const { data } = useEinsaetzeQuery(queryFilters);

  // ❌ FALSCH: Hardcoded Filter
  const { data } = useEinsaetzeQuery({ status: 'AKTIV' });
}
```

### 2. Mutations mit Callbacks

```typescript
const createEinsatz = useCreateEinsatz();

const handleCreate = (data: CreateEinsatzDto) => {
  createEinsatz.mutate(data, {
    onSuccess: (createdEinsatz) => {
      router.push(`/einsatz/${createdEinsatz.id}`);
    },
    onError: (error) => {
      console.error('Create failed:', error);
    },
  });
};
```

### 3. Optimistic Updates nutzen

Alle Mutations haben bereits Optimistic Updates implementiert:

```typescript
const updateEinsatz = useUpdateEinsatz();

// UI wird sofort aktualisiert, noch bevor Server antwortet
updateEinsatz.mutate({ id, data: { alarmstichwort: 'Brand' } });
```

### 4. Query Invalidierung

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { EINSATZ_QUERY_KEYS } from '@/features/einsatz';

const queryClient = useQueryClient();

// Invalidiere alle Einsatz-Queries
await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.all });

// Invalidiere nur Listen-Queries
await queryClient.invalidateQueries({ queryKey: EINSATZ_QUERY_KEYS.lists() });

// Invalidiere spezifische Liste
await queryClient.invalidateQueries({
  queryKey: EINSATZ_QUERY_KEYS.list({ status: 'AKTIV' })
});
```

## Testing

### Mocking Queries

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEinsaetzeQuery } from '@/features/einsatz';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

test('loads einsaetze', async () => {
  const { result } = renderHook(() => useEinsaetzeQuery(), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.data?.data).toHaveLength(5);
});
```

### Mocking Mutations

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCreateEinsatz } from '@/features/einsatz';

test('creates einsatz', async () => {
  const { result } = renderHook(() => useCreateEinsatz(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({
      nummer: 'E-2025-001',
      alarmstichwort: 'Brand',
    });
  });

  expect(result.current.data).toMatchObject({
    nummer: 'E-2025-001',
    alarmstichwort: 'Brand',
  });
});
```

## Migration

Siehe [MIGRATION.md](./MIGRATION.md) für detaillierte Migration von `useEinsaetze.ts`.

## Performance

### Query Optimierung

- **staleTime: 30s** - Daten bleiben 30 Sekunden "frisch"
- **retry: 3** - Max. 3 Retry-Versuche bei Fehlern
- **Exponential Backoff** - Intelligente Retry-Verzögerung

### Cache Management

- **Hierarchische Query Keys** - Granulare Invalidierung
- **Optimistic Updates** - Sofortiges UI-Feedback
- **Automatic Garbage Collection** - Ungenutzte Queries werden entfernt

## Troubleshooting

### Query lädt nicht

```typescript
// 1. Check Query Key
const { data } = useEinsaetzeQuery({ status: 'AKTIV' });
console.log(EINSATZ_QUERY_KEYS.list({ status: 'AKTIV' }));

// 2. Check Network Tab
// Sollte GET /api/einsatz?status=AKTIV aufrufen

// 3. Check Query Client DevTools
// TanStack Query DevTools in App einbinden
```

### Mutation funktioniert nicht

```typescript
const createEinsatz = useCreateEinsatz();

// 1. Check Mutation State
console.log({
  isLoading: createEinsatz.isLoading,
  error: createEinsatz.error,
  data: createEinsatz.data,
});

// 2. Check onError Callback
createEinsatz.mutate(data, {
  onError: (error) => console.error('Mutation failed:', error),
});
```

### Store-Updates triggern keine Re-Renders

```typescript
// ✅ RICHTIG: useStore Hook
import { useStore } from '@tanstack/react-store';
const filters = useStore(einsatzUIStore, state => state.filters);

// ❌ FALSCH: Direkt auf state zugreifen
const filters = einsatzUIStore.state.filters; // Re-rendert nicht!
```

## Related

- [ETB Feature](../etb/README.md)
- [Lagekarte Feature](../lagekarte/README.md)
- [TanStack Query Docs](https://tanstack.com/query)
- [TanStack Store Docs](https://tanstack.com/store)
