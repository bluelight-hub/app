# Feature Architecture Migration Guide

Dieser Guide beschreibt die schrittweise Migration von Legacy-Hooks zur TanStack-Native Feature Architecture.

## Überblick

### Alte Struktur (Legacy)

```
packages/frontend/src/
├── hooks/                # Monolithische Hooks
│   ├── useAuth.ts       # Auth + Admin + Users
│   ├── useAdminAuth.ts  # Admin-Check
│   ├── useUsers.ts      # User Management
│   ├── useEinsatz.ts    # Einsatz CRUD
│   └── useETB.ts        # ETB Operations
├── components/          # UI Components
└── utils/               # Shared Utils
```

### Neue Struktur (Feature Modules)

```
packages/frontend/src/
├── features/            # Feature-based Architecture
│   ├── auth/           # Auth & User Management
│   │   ├── api/        # TanStack Query Hooks
│   │   ├── stores/     # TanStack Store
│   │   └── guards/     # Route Protection
│   ├── einsatz/        # Einsatz Feature
│   ├── etb/            # ETB Feature
│   └── lagekarte/      # Lagekarte Feature
├── shared/              # Shared Code
│   ├── hooks/          # Generic Hooks (nicht feature-spezifisch)
│   ├── ui/             # Shared UI Components
│   └── utils/          # Shared Utils
└── routes/              # TanStack Router
```

## Migration Status

### ✅ Auth Feature (ABGESCHLOSSEN)

**Migrierte Hooks:**

- `useAuth()` → `useCurrentUser()`, `useUnifiedAuth()`, `useLogout()`
- `useAdminAuth()` → `useAdminAuth()` (neue API)
- `useUsers()` → `useUsers()`, `useUser()`, `useUserNames()`

**Neue Features:**

- `useAdminLogin()` - Separate Admin-Login Mutation
- `useAdminLogout()` - Separate Admin-Logout Mutation
- `useAdminSetup()` - Admin Setup Mutation
- `AuthGuard` - Route Protection Component
- `AdminGuard` - Admin Route Protection Component
- `authStore` - TanStack Store für UI-State

**Files:**

- ✅ `/features/auth/api/use-current-user.ts`
- ✅ `/features/auth/api/use-login.ts`
- ✅ `/features/auth/api/use-logout.ts`
- ✅ `/features/auth/api/use-admin-setup.ts`
- ✅ `/features/auth/api/use-users.ts`
- ✅ `/features/auth/stores/auth.store.ts`
- ✅ `/features/auth/guards/auth-guard.tsx`

### 🚧 Einsatz Feature (IN PROGRESS)

**Migrierte Hooks:**

- Basic structure vorhanden
- Migration von `useEinsatz()` geplant

### 🚧 ETB Feature (IN PROGRESS)

**Migrierte Hooks:**

- Basic structure vorhanden
- Migration von `useETB()` geplant

### 🚧 Lagekarte Feature (GEPLANT)

**Zu migrieren:**

- `useLagekarte()`
- `usePOIs()`

## Migrations-Workflow

### 1. Feature Analysieren

Bestehendes Feature analysieren:

```bash
# Hooks finden
find packages/frontend/src/hooks -name "use*.ts"

# Dependencies prüfen
grep -r "import.*useAuth" packages/frontend/src/
```

### 2. Feature-Struktur erstellen

```bash
mkdir -p packages/frontend/src/features/{feature-name}/{api,stores,guards}
```

### 3. API Hooks migrieren

**Vorher:**

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const query = useQuery({ ... });
  const mutation = useMutation({ ... });
  return { user: query.data, login: mutation.mutate };
};
```

**Nachher:**

```typescript
// features/auth/api/use-current-user.ts
export const useCurrentUser = () => {
  return useQuery({
    queryKey: AUTH_KEYS.auth.queries.authCheck,
    queryFn: () => api.auth().authControllerCheckAuth(),
  });
};

// features/auth/api/use-login.ts
export const useUnifiedAuth = () => {
  return useMutation({
    mutationFn: (dto) => api.auth().authControllerUnifiedAuth({ dto }),
    onSuccess: () => queryClient.invalidateQueries({ ... }),
  });
};
```

**Regeln:**

- Ein Hook pro Funktion (nicht alles in einem Hook!)
- Query Keys aus `queries.ts` importieren
- `onSuccess` für Query Invalidation
- Deutsche JSDoc-Kommentare

### 4. Store erstellen (wenn nötig)

```typescript
// features/auth/stores/auth.store.ts
import { Store } from '@tanstack/react-store';

interface AuthStoreState {
  // UI-State, NICHT Server-State!
}

export const authStore = new Store<AuthStoreState>(initialState);
```

**Wann Store verwenden?**

- UI-State (z.B. Modal-Status, Sidebar-State)
- Client-Only State (z.B. Theme, Preferences)
- Temp State für Multi-Step Forms

**Wann NICHT Store verwenden?**

- Server-State → TanStack Query verwenden
- Token-Storage → HTTP-Only Cookies verwenden

### 5. Guards erstellen (optional)

Für Route Protection:

```typescript
// features/auth/guards/auth-guard.tsx
export const AuthGuard = ({ children }) => {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/auth" />;

  return <>{children}</>;
};
```

### 6. Feature exportieren

```typescript
// features/auth/index.ts
export * from './api';
export * from './stores/auth.store';
export * from './guards/auth-guard';
```

### 7. Komponenten aktualisieren

**Schrittweise Migration** (Backward Compatibility):

```typescript
// Phase 1: Legacy Hook bleibt
import { useAuth } from '@/hooks/useAuth'; // OLD

// Phase 2: Parallel Import (beide funktionieren)
import { useAuth } from '@/hooks/useAuth'; // OLD
import { useCurrentUser } from '@/features/auth'; // NEW

// Phase 3: Nur neuer Import
import { useCurrentUser } from '@/features/auth'; // NEW
```

### 8. Legacy Hooks deprecaten

Wenn alle Komponenten migriert sind:

```typescript
// hooks/useAuth.ts
/**
 * @deprecated Use @/features/auth instead
 *
 * Migration:
 * - useAuth().user → useCurrentUser().user
 * - useAuth().login → useUnifiedAuth()
 * - useAuth().logout → useLogout()
 */
export const useAuth = () => {
  // ... existing code
};
```

### 9. Tests schreiben

```typescript
// features/auth/api/use-current-user.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from './use-current-user';

describe('useCurrentUser', () => {
  it('should fetch current user', async () => {
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
    });
  });
});
```

## Best Practices

### Query Keys

**Zentralisiert in `queries.ts`:**

```typescript
export const AUTH_KEYS = {
  auth: {
    queryKey: ['auth'] as const,
    queries: {
      authCheck: ['auth', 'check'] as const,
      adminStatus: ['auth', 'admin', 'status'] as const,
    },
  },
} as const;
```

### Error Handling

Nutze globalen Error Handler:

```typescript
// utils/error-handler.ts (bereits vorhanden)
export async function handleQueryError(error: unknown) {
  // Global error handling mit Toast-Notifications
}
```

### Loading States

**IMMER prüfen:**

```typescript
const { data, isLoading, error } = useCurrentUser();

if (isLoading) return <Spinner />;
if (error) return <ErrorState error={error} />;
if (!data) return null;

return <UserProfile user={data} />;
```

### Type Safety

**Vollständige TypeScript-Typen:**

```typescript
import type { UserDto } from '@bluelight-hub/shared/client';

export const useCurrentUser = (): {
  user: UserDto | undefined;
  isLoading: boolean;
  error: Error | null;
} => {
  // ...
};
```

### Mutation Callbacks

**onSuccess für Invalidation:**

```typescript
const { mutate: updateUser } = useMutation({
  mutationFn: (dto) => api.users().update(dto),
  onSuccess: async () => {
    // Invalidate affected queries
    await queryClient.invalidateQueries({
      queryKey: AUTH_KEYS.users.all,
    });
  },
});
```

## Checklist für Feature-Migration

- [ ] Feature-Ordner erstellt (`features/{name}/`)
- [ ] `api/` mit Query Hooks erstellt
- [ ] `queries.ts` mit Query Keys erstellt
- [ ] `stores/` erstellt (wenn nötig)
- [ ] `guards/` erstellt (wenn nötig)
- [ ] `index.ts` mit Exports erstellt
- [ ] README.md mit Doku erstellt
- [ ] Komponenten migriert
- [ ] Legacy Hooks deprecaten (mit @deprecated)
- [ ] Tests geschrieben
- [ ] Commit mit `✨(feature):` erstellt

## Hilfreiche Commands

```bash
# Alle Verwendungen eines Legacy Hooks finden
grep -r "useAuth" packages/frontend/src/

# Feature-Template erstellen
mkdir -p packages/frontend/src/features/{name}/{api,stores,guards}

# Biome Lint für Feature
pnpm biome check --write packages/frontend/src/features/{name}/

# Tests ausführen
pnpm --filter @bluelight-hub/frontend test features/{name}
```

## Fragen?

Bei Unklarheiten zur Migration:

1. Schaue ins `/features/auth/` (vollständiges Beispiel)
2. Lies `/features/auth/README.md` (API-Dokumentation)
3. Prüfe `/features/einsatz/` oder `/features/etb/` (andere Beispiele)
