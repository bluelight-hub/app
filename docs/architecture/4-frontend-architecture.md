# 4. Frontend Architecture

## Component Architecture (Atomic Design)

**135+ Komponenten** in 5 hierarchischen Ebenen:

```
src/components/
├── atoms/ (24)           # Basis UI-Elemente
│   ├── button.atom.tsx
│   ├── input.atom.tsx
│   ├── badge.atom.tsx
│   ├── container.atom.tsx
│   └── ...
├── molecules/ (46)       # Kombinierte Komponenten
│   ├── shared/ (14)     # Wiederverwendbar
│   │   ├── password-input.molecule.tsx
│   │   ├── tabs.molecule.tsx
│   │   └── ...
│   ├── einsatz/ (13)    # Feature-spezifisch
│   ├── etb/ (8)
│   ├── lagekarte/ (4)
│   └── ...
├── organisms/ (52)       # Komplexe Module
│   ├── etb/ (17)        # ETB-Komponenten
│   ├── lagekarte/ (16)  # Karten-Komponenten
│   ├── einsatz/ (5)     # Einsatz-Komponenten
│   ├── admin/ (4)       # Admin-Panel
│   ├── command-palette/ (6)
│   ├── dashboard/ (2)
│   └── auth/ (2)
├── templates/ (4)        # Seiten-Layouts
│   ├── admin-layout.template.tsx
│   ├── auth-layout.template.tsx
│   ├── einsatz-layout.template.tsx
│   └── dashboard-layout.template.tsx
└── pages/ (6)            # Route-Komponenten
    ├── index.page.tsx
    ├── login.page.tsx
    ├── einsatz.page.tsx
    ├── etb.page.tsx
    ├── lagekarte.page.tsx
    └── admin.page.tsx
```

## Feature Breakdown

| Feature | Components | Complexity | Status |
|---------|-----------|-----------|--------|
| **ETB** | 25 (8 Molecules + 17 Organisms) | ★★★★★ Very High | ✅ Fully implemented |
| **Lagekarte** | 20 (4 Molecules + 16 Organisms) | ★★★★★ Very High | ✅ Fully implemented |
| **Einsatz** | 18 (13 Molecules + 5 Organisms) | ★★★★☆ High | ✅ Fully implemented |
| **Shared** | 14 (Molecules) | ★★★☆☆ Medium | ✅ Fully implemented |
| **Admin** | 5 (1 Molecule + 4 Organisms) | ★★★☆☆ Medium | ✅ Fully implemented |
| **Command Palette** | 6 (Organisms) | ★★★☆☆ Medium | ✅ Fully implemented |
| **Dashboard** | 4 (2 Molecules + 2 Organisms) | ★★☆☆☆ Low | ✅ Fully implemented |
| **Auth** | 3 (1 Molecule + 2 Organisms) | ★★☆☆☆ Low | ✅ Fully implemented |
| **Forms** | 3 (Molecules) | ★★★☆☆ Medium | ✅ Fully implemented |

## State Management

**Hybrid Approach** (NOT pure Redux/Zustand):

### 1. Server State (PRIMARY) - TanStack Query

**Purpose:** Data fetching, caching, synchronization

**Pattern:**
```typescript
// Query Keys (Hierarchical)
const QUERY_KEYS = {
  einsaetze: ['einsaetze'],
  einsatz: (id: string) => ['einsaetze', id],
  etb: {
    all: ['etb'],
    byId: (id: string) => ['etb', id],
    entries: (etbId: string) => ['etb', etbId, 'entries']
  }
};

// Usage
const useEinsaetze = () => {
  return useQuery({
    queryKey: QUERY_KEYS.einsaetze,
    queryFn: () => api.einsatz().getEinsaetze(),
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 10 * 60 * 1000    // 10min
  });
};
```

**Features:**
- Automatic background refetch
- Optimistic updates (ADR-020)
- Automatic retry on failure
- Cache invalidation
- Request deduplication
- Pagination support

### 2. UI State - TanStack Store

**Purpose:** Global UI state (NOT server state)

**Implementation:**
```typescript
// Only ONE store: EinsatzStore
export const einsatzStore = new Store<EinsatzStoreState>({
  selectedEinsatzId: null,
  filterOptions: {},
  sortOrder: 'desc'
});
```

**Usage Pattern:**
```typescript
const useEinsatzStore = () => {
  const selectedId = einsatzStore.useSelector(
    (state) => state.selectedEinsatzId
  );

  const setSelectedId = (id: string) => {
    einsatzStore.setState((state) => ({
      ...state,
      selectedEinsatzId: id
    }));
  };

  return { selectedId, setSelectedId };
};
```

**Scope:**
- ✅ UI-only state (filters, selections, modals)
- ❌ NO server data (use TanStack Query)
- ❌ NO form state (use TanStack Form)

### 3. Form State - TanStack Form + Zod

**Purpose:** Type-safe forms with validation

**Pattern:**
```typescript
const form = useForm({
  defaultValues: {
    username: '',
    password: ''
  },
  validators: {
    onChange: loginSchema
  },
  onSubmit: async ({ value }) => {
    await api.auth().unified(value);
  }
});
```

**Features:**
- Zod schema validation
- Field-level validation
- Submit handling
- Error messages
- Touched/dirty tracking

### 4. Context - React Context

**Purpose:** App-wide settings

**Contexts:**
- `ColorModeContext` - Dark/Light mode
- `ConfirmDialogContext` - Global confirmation dialogs

## Routing (TanStack Router)

**File-based routing with type-safety:**

```
src/routes/
├── __root.tsx            # Root layout
├── index.tsx             # / (Dashboard)
├── login.tsx             # /login
├── einsaetze/
│   ├── index.tsx         # /einsaetze
│   └── $id.tsx           # /einsaetze/:id
├── etb/
│   ├── index.tsx         # /etb
│   └── $id.tsx           # /etb/:id
├── lagekarte/
│   └── $id.tsx           # /lagekarte/:id
└── admin/
    └── users.tsx         # /admin/users
```

**Features:**
- Type-safe navigation
- Auto-generated route tree
- Nested layouts
- Route guards (auth check)
- Suspense boundaries
- Code-splitting per route

## API Integration

### Generated OpenAPI Client

**Workflow:**
1. Backend: NestJS controllers with `@ApiOperation()`, `@ApiResponse()` decorators
2. Generate: `pnpm run generate-api` (in root)
3. Output: `packages/shared/client/apis/` (auto-generated TypeScript)
4. Frontend: Import and wrap in TanStack Query hooks

**Example:**
```typescript
// Generated client (DO NOT EDIT)
export class EinsatzApi {
  async getEinsaetze(): Promise<Einsatz[]> {
    return this.request('/api/alpha/einsaetze');
  }
}

// Frontend wrapper
export const useEinsaetze = () => {
  return useQuery({
    queryKey: QUERY_KEYS.einsaetze,
    queryFn: () => api.einsatz().getEinsaetze()
  });
};
```

### BackendApi Singleton

**Pattern:**
```typescript
// Singleton wrapper with error handling
export const api = {
  auth: () => new AuthApi(httpClient),
  einsatz: () => new EinsatzApi(httpClient),
  etb: () => new EtbApi(httpClient),
  lagekarte: () => new LagekarteApi(httpClient),
  users: () => new UsersApi(httpClient)
};
```

**Features:**
- Automatic token refresh on 401
- Cookie-based auth (no manual headers)
- Error handling with toast notifications
- Request/response interceptors

## Design System

### Tailwind CSS Configuration

**Theme:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
        danger: {...}
      }
    }
  }
};
```

**Usage:**
```tsx
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">
  Click me
</button>
```

### Headless UI Components

**Accessible primitives:**
- `Dialog` - Modals
- `Menu` - Dropdowns
- `Listbox` - Custom selects
- `Disclosure` - Accordions
- `Tab` - Tabs
- `Transition` - Animations

**Pattern:**
```tsx
import { Dialog } from '@headlessui/react';

<Dialog open={isOpen} onClose={close}>
  <Dialog.Panel className="...">
    <Dialog.Title>Title</Dialog.Title>
    {/* Content */}
  </Dialog.Panel>
</Dialog>
```

### Icon System

**Phosphor Icons via react-icons:**
```tsx
import { PiUser, PiMapPin } from 'react-icons/pi';

<PiUser className="w-5 h-5" />
```

---
