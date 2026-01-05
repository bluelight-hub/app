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

## 5. Routing (TanStack Router)

### 5.1 File-based Routes

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

### 5.2 Route Definition

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

## 6. Forms (TanStack Form + Zod)

### 6.1 Form Setup

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

### 6.2 Zod Schema

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

## 7. API Integration

### 7.1 Generierter API Client

```typescript
// Importiert von @bluelight-hub/shared/client
import { api } from '@bluelight-hub/shared/client';

// Typsichere API-Aufrufe
const einsaetze = await api.einsatz.findAll();
const einsatz = await api.einsatz.findById({ id: 'abc123' });
```

### 7.2 Workflow

1. Backend: Endpoint mit NestJS + Swagger erstellen
2. `pnpm run generate-api` ausführen
3. Frontend: Generierten Client mit TanStack Query verwenden

---

## 8. Atomic Design

### 8.1 Hierarchie

| Level | Beschreibung | Beispiele |
|-------|--------------|-----------|
| **Atoms** | Basis-Elemente | Button, Input, Badge |
| **Molecules** | Kombinationen | FormField, Card, Alert |
| **Organisms** | Komplexe Sections | EinsatzForm, DataTable |
| **Templates** | Page Layouts | DashboardLayout |
| **Pages** | Route-Komponenten | EinsatzDetailPage |

### 8.2 Komponenten-Struktur

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

## 9. Tauri Integration

### 9.1 Native Features

| Plugin | Zweck |
|--------|-------|
| `tauri-plugin-os` | OS-Erkennung |
| `tauri-plugin-shell` | Shell-Befehle |
| `tauri-plugin-updater` | Auto-Updates |
| `tauri-plugin-deep-link` | URL-Handling |
| `tauri-plugin-dialog` | Native Dialoge |
| `tauri-plugin-clipboard-manager` | Zwischenablage |

### 9.2 Tauri API Nutzung

```typescript
import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

// Rust-Funktion aufrufen
const result = await invoke('my_rust_function', { arg: 'value' });

// OS-Info abrufen
const currentPlatform = await platform(); // 'macos' | 'windows' | 'linux'
```

---

## 10. Testing

### 10.1 Vitest Setup

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

### 10.2 Component Testing

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

## 11. Wichtige Regeln

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
