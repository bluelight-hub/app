# State Management Integration

## TanStack Query (Server State)

**Purpose:** Cache and synchronize server data

**Key Features:**
- Automatic caching with configurable staleTime
- Background refetching
- Optimistic updates
- Query invalidation
- Infinite scrolling support

**Example:**
```typescript
// packages/frontend/src/hooks/queries/useEinsaetze.ts
export const useEinsaetze = () => {
  return useQuery({
    queryKey: ['einsaetze'],
    queryFn: () => api.einsaetze().findAll(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    refetchOnWindowFocus: true,
  });
};
```

## TanStack Store (Client State)

**Purpose:** Manage local UI state (non-server data)

**Example:**
```typescript
// packages/frontend/src/stores/einsatzStore.ts
import { Store } from '@tanstack/react-store';

export const einsatzStore = new Store({
  selectedEinsatzId: null as string | null,
  mapViewport: { lat: 51.1657, lng: 10.4515, zoom: 6 },
  filterStatus: 'ALLE' as EinsatzStatus | 'ALLE',
});

// Usage in component
export const EinsatzMap = () => {
  const viewport = einsatzStore.useStore((state) => state.mapViewport);
  const setViewport = (viewport) => einsatzStore.setState({ mapViewport: viewport });

  return <Map center={viewport} onViewportChange={setViewport} />;
};
```

## State Synchronization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Server State (TanStack Query)                               │
│  - Einsätze, ETB entries, Users, POIs                        │
│  - Cached with automatic invalidation                        │
│  - Source of truth: Backend database                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Invalidate on mutations
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Client State (TanStack Store)                               │
│  - Selected items, UI filters, map viewport                  │
│  - Form state (temporary, before submission)                 │
│  - Source of truth: Local component state                    │
└─────────────────────────────────────────────────────────────┘
```

**Best Practices:**
1. **Server state in TanStack Query:** Never duplicate server data in local state
2. **Client state in TanStack Store:** Only for UI-specific state (selections, filters)
3. **Form state in TanStack Form:** Use Zod schemas for validation
4. **Optimistic updates:** Update UI immediately, revert on error

---
