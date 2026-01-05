# Deep-Dive Dokumentation: Frontend

> **Generiert**: 2026-01-04
> **Scan-Level**: Exhaustive
> **Analysierte Dateien**: ~424 TypeScript/TSX-Dateien
> **Workflow**: document-project (deep-dive mode)

---

## 1. Projektübersicht

Das Frontend von BlueLight Hub ist eine **Desktop-Anwendung** basierend auf:

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **React** | 19.1.0 | UI-Framework |
| **Vite** | 6.3.5+ | Build-Tool & Dev-Server |
| **Tauri** | 2.5.1 | Desktop-Container (Rust-basiert) |
| **TypeScript** | 5.8.3 | Typisierung |
| **TanStack Router** | 1.120.13 | File-based Routing |
| **TanStack Query** | 5.81.0 | Server-State Management |
| **TanStack Store** | 0.7.0 | Client-State Management |
| **TanStack Form** | 1.x | Formulare mit Zod-Validierung |
| **Tailwind CSS** | 4.1.10 | Styling |
| **Headless UI** | 2.x | Accessible UI-Komponenten |

### Architektur-Pattern

- **Feature-based Modules**: Jedes Feature ist ein eigenständiges Modul
- **Atomic Design**: UI-Komponenten in atoms/molecules/organisms/templates
- **Generated API Client**: OpenAPI-generierter Client aus `@bluelight-hub/shared/client`
- **Cookie-based Auth**: HTTP-Only Cookies mit automatischem Token-Refresh

---

## 2. Verzeichnisstruktur

```
packages/frontend/src/
├── main.tsx                    # App Entry Point
├── routeTree.gen.ts            # Auto-generierte Route-Definitionen
├── queryKeys.ts                # @deprecated - Query Keys (siehe Features)
│
├── features/                   # Feature-Module
│   ├── auth/                   # Authentifizierung & User-Management
│   ├── einsatz/                # Einsatz-Verwaltung
│   ├── etb/                    # Einsatztagebuch
│   ├── lagekarte/              # Lagekarte (Map)
│   ├── kraefte/                # Kräfte-Dashboard
│   └── admin/                  # Admin-Bereich
│
├── routes/                     # TanStack Router (File-based)
│   ├── __root.tsx              # Root Layout & Provider
│   ├── index.tsx               # / → Redirect
│   ├── auth.tsx                # /auth
│   ├── admin-login.tsx         # /admin-login
│   ├── app.tsx                 # /app (AuthGuard)
│   ├── admin.tsx               # /admin (AdminGuard)
│   ├── app/                    # App-Routen (authentifiziert)
│   │   ├── einsaetze/
│   │   └── einsatz/$einsatzId/
│   └── admin/                  # Admin-Routen
│       ├── users.tsx
│       ├── stammdaten/
│       └── kraefte/
│
├── provider/                   # App-Provider
│   └── color-mode.provider.tsx # Theme-Provider (next-themes)
│
└── shared/                     # Shared Libraries
    ├── api/                    # API Client & Utilities
    │   ├── api.ts              # BackendApi Singleton
    │   ├── client.ts           # Client-Export
    │   ├── fetchWithRefresh.ts # Token-Refresh-Logic
    │   └── errors.ts           # Error-Utilities
    ├── hooks/                  # Shared Custom Hooks
    ├── lib/                    # Utilities & Helpers
    │   ├── errors/             # Error-Handler
    │   ├── storage/            # Offline-Storage
    │   ├── logger.ts           # Consola-Logger
    │   └── dateFormatter.ts    # NATO-Datumsformat
    └── ui/                     # Atomic Design Library
        ├── atoms/              # Basis-Komponenten
        ├── molecules/          # Kombinierte Komponenten
        ├── organisms/          # Komplexe Komponenten
        ├── templates/          # Page-Layouts
        └── headless/           # Headless UI Wrapper
```

---

## 3. Features

### 3.1 Auth Feature

**Zweck**: Authentifizierung, User-Management, Route-Protection

**Verzeichnis**: `features/auth/`

#### API-Layer
| Hook | Zweck |
|------|-------|
| `useCurrentUser()` | Aktueller User + Admin-Status |
| `useAdminAuth()` | Extended Admin-Check |
| `useUnifiedAuth()` | Login/Auto-Register |
| `useAdminLogin()` | Admin-Login mit Passwort |
| `useLogout()` | Logout (alle Sessions) |
| `useUsers()` | User-Liste |
| `useUserNames()` | User-ID → Name Mapping |

#### Guards
| Guard | Zweck |
|-------|-------|
| `AuthGuard` | Schützt authentifizierte Routen |
| `AdminGuard` | Schützt Admin-Routen (Role-Check) |
| `AppGuard` | Globaler App-Wrapper |

#### State (TanStack Store)
```typescript
authStore = {
  lastKnownAuthStatus: 'authenticated' | 'unauthenticated' | 'checking',
  showReauthModal: boolean,
  redirectAfterLogin: string | undefined,
}
```

---

### 3.2 Einsatz Feature

**Zweck**: Einsatz-Verwaltung, Fahrzeuge, Personen, FMS-Status

**Verzeichnis**: `features/einsatz/`

#### API-Layer
| Hook | Zweck |
|------|-------|
| `useEinsaetzeQuery(filters)` | Paginierte Liste |
| `useEinsaetzeInfiniteQuery(filters)` | Infinite Scroll |
| `useEinsatzDetail(id)` | Einsatz + ETB + Lagekarte |
| `useCreateEinsatz()` | Neuer Einsatz |
| `useUpdateEinsatz()` | Einsatz aktualisieren |
| `useArchiveEinsatz()` | Archivieren |
| `useEinsatzFahrzeuge(id)` | Zugewiesene Fahrzeuge |
| `useEinsatzPersonen(id)` | Zugewiesene Personen |
| `useRegistrierePersonViaQr(id)` | QR-Code Registration |

#### State (TanStack Store)
```typescript
// EinsatzUIStore - Filter & Sortierung
einsatzUIStore = {
  selectedEinsatzId: string | null,
  filters: { status?, search?, page, limit },
  sorting: { orderBy?, orderDirection? },
  viewMode: 'list' | 'grid' | 'infinite',
}

// ActiveEinsatzStore - Persistiert in localStorage
activeEinsatzStore = {
  activeEinsatz: EinsatzResponseDto | null,
  isLoadingActiveEinsatz: boolean,
}
```

#### Utilities
- **DRK QR-Parser**: Parst CSV- und URL-Format für Personen-Registration
- **FMS-Status Constants**: Status 0-9 mit Labels und Farben

---

### 3.3 ETB Feature (Einsatztagebuch)

**Zweck**: Operatives Protokoll mit Kategorien, Textbausteinen, Versionierung

**Verzeichnis**: `features/etb/`

#### API-Layer
| Hook | Zweck |
|------|-------|
| `useEtb({ einsatzId })` | ETB laden (CQRS) |
| `useEtbHistory({ etbId })` | Versionshistorie |
| `useTextbausteine()` | Text-Templates |
| `useCreateEtbEntry()` | Eintrag erstellen |
| `useUpdateEtbEntry()` | Eintrag aktualisieren |
| `useDeleteEtbEntry()` | Soft-Delete |
| `useLockEtb()` | ETB sperren (Admin) |

#### Kategorien
```typescript
type EtbKategorie =
  | 'ALARMIERUNG'    // 🚨
  | 'ANKUNFT'        // 🚐
  | 'BEFEHL'         // 📢
  | 'ERKUNDUNG'      // 🔍
  | 'LAGE'           // 📍
  | 'MASSNAHME'      // ⚡
  | 'PERSONAL'       // 👥
  | 'FAHRZEUG'       // 🚒
  | 'MATERIAL'       // 📦
  | 'KOMMUNIKATION'  // 📡
  | 'WETTER'         // 🌦️
  | 'DOKUMENTATION'  // 📄
  | 'SONSTIGES'      // 📝
  | 'SYSTEM'         // ⚙️
```

---

### 3.4 Lagekarte Feature

**Zweck**: Interaktive Karte mit Zeichenwerkzeugen, POIs, Offline-Support

**Verzeichnis**: `features/lagekarte/`

#### Kernkomponenten
| Komponente | Zweck |
|------------|-------|
| `LagekarteView` | Haupt-Map-Komponente |
| `DrawingLayer` | Leaflet.PM Integration |
| `ClusteredPoiLayer` | POI-Clustering |
| `FahrzeugPoiLayer` | Fahrzeug-Positionen |
| `OfflineTileLayer` | Offline-Kacheln |

#### State (TanStack Store)
```typescript
lagekarteStore = {
  shapes: GeoJSON.FeatureCollection,
  selectedShapeIds: Set<string>,
  highlightedShapeIds: Set<string>,
  activeDrawingTool: DrawingTool | null,
  isPmInitialized: boolean,
  toolbarVisible: boolean,
  contextMenu: { isOpen, position, shapeId } | null,
  layers: Map<string, L.Layer>,        // Leaflet Refs
  originalStyles: Map<string, Style>,  // Style Backup
}
```

#### Hooks
| Hook | Zweck |
|------|-------|
| `useLagekarteState()` | State-Selektoren (read-only) |
| `useShapeActions()` | Shape CRUD |
| `useDrawingTools()` | Leaflet.PM Steuerung |
| `useLagekarteAutoSave()` | Debounced Auto-Save (2s) |
| `usePoiForm()` | POI-Formular mit Geocoding |

#### Shape-Typen
```typescript
type ShapeType =
  | 'GEFAHRENBEREICH'  // Rot
  | 'SPERRBEREICH'     // Orange
  | 'RETTUNGSWEG'      // Grün
  | 'ABSPERRUNG'       // Gelb
  | 'SONSTIGES'        // Blau
```

---

### 3.5 Kräfte Feature

**Zweck**: Echtzeit-Dashboard für taktische Stärke, Fahrzeuge, Rollen

**Verzeichnis**: `features/kraefte/`

#### API-Layer
| Hook | Zweck |
|------|-------|
| `useTaktischeStaerke(id)` | Stärke (F/U/M//G) |
| `useEinsatzFahrzeuge(id)` | Fahrzeug-Liste |
| `useRollenBesetzungen(id)` | Rollen-Zuweisungen |
| `useBesetzeRolle(id)` | Person → Rolle zuweisen |
| `useFreigebeRolle(id)` | Rolle freigeben |

#### Dashboard-Modi
```typescript
type DashboardMode = 'standard' | 'fullscreen' | 'compact'
```

- **Standard**: 2-Spalten-Grid
- **Fullscreen**: Für Beamer/Projektion (30s Auto-Refresh)
- **Compact**: Mobile/Tablet

---

### 3.6 Admin Feature

**Zweck**: Stammdaten-Verwaltung, User-Management, Integrationen

**Verzeichnis**: `features/admin/`

#### Management-Hooks
| Hook | Zweck |
|------|-------|
| `useAdminUserManagement()` | User CRUD |
| `useAdminQualifikationenManagement()` | Qualifikationen |
| `useAdminRollenDefinitionenManagement()` | Rollen-Definitionen |
| `useAdminStammFahrzeugeManagement()` | Fahrzeug-Stammdaten |
| `useAdminStammPersonenManagement()` | Personal-Stammdaten |
| `useAdminHiOrgIntegration()` | HiOrg-Integration |

#### Admin-Seiten
- `/admin/users` - User-Verwaltung
- `/admin/stammdaten/fahrzeuge` - Fahrzeug-Stammdaten
- `/admin/stammdaten/personen` - Personal-Stammdaten
- `/admin/kraefte/qualifikationen` - Qualifikationen
- `/admin/kraefte/rollen-definitionen` - Rollen
- `/admin/integrations/hiorg` - HiOrg-Anbindung

---

## 4. Shared UI Library (Atomic Design)

### 4.1 Atoms

| Komponente | Zweck | Varianten |
|------------|-------|-----------|
| `Button` | Interaktiver Button | 5 Intents × 5 Appearances |
| `Input` | Text-Eingabe | default/error, sm/md/lg |
| `Textarea` | Mehrzeilige Eingabe | default/error |
| `Select` | Dropdown | Native mit Custom-Styling |
| `Checkbox` | Boolean Toggle | Headless UI |
| `Switch` | Toggle Switch | Animiert |
| `Badge` | Status-Label | 5 Variants + Dot |
| `Card` | Container | 5 Padding-Stufen |
| `Alert` | Hinweis-Box | info/warning/error/success |
| `Spinner` | Lade-Indikator | wave/dots/ring/pulse |
| `ProgressBar` | Fortschrittsbalken | Animiert |
| `Heading` | Überschrift | h1-h6, xs-3xl |
| `Text` | Textblock | 5 Farben, 5 Größen |

### 4.2 Molecules

| Komponente | Zweck |
|------------|-------|
| `Dialog` | Modal mit Sub-Components (Confirm, Alert, SlideIn) |
| `FormFieldWrapper` | TanStack Form Integration |
| `SearchInput` | Debounced Suche |
| `PasswordInput` | Passwort mit Toggle |
| `PasswordStrengthIndicator` | zxcvbn-basiert |
| `Tabs` | Tab-Navigation |
| `Table` | Semantische Tabelle |
| `ColorPicker` | Farb-Auswahl |
| `RangeSlider` | Schieberegler |
| `AuthCard` | Auth-Seiten Card |

### 4.3 Organisms

| Komponente | Zweck |
|------------|-------|
| `CommandPalette` | Globale Suche (Cmd+K) |
| `ErrorBoundary` | Fehler-Abfang |
| Dashboard-Components | FilterPanel, StatusCard, etc. |

### 4.4 Templates

| Template | Zweck |
|----------|-------|
| `AuthLayout` | Auth-Seiten (zeitbasierter Hintergrund) |
| `AdminLayout` | Admin-Bereich |
| `SingleEinsatzLayout` | Einsatz-Detail-Ansicht |

---

## 5. Routing

### File-Based Routing (TanStack Router)

Routen werden aus der Dateistruktur in `src/routes/` generiert.

```typescript
// Beispiel: app/einsaetze/index.tsx
export const Route = createFileRoute('/app/einsaetze/')({
  component: lazy(() =>
    import('@/features/einsatz/ui/pages/index.page.tsx')
      .then((module) => ({ default: module.IndexPage }))
  ),
});
```

### Route-Hierarchie

```
/                           → Redirect zu /app/einsaetze
├── /auth                   → LoginWindow
├── /admin-login            → Admin-Login
├── /admin                  → AdminGuard
│   ├── /dashboard
│   ├── /users
│   ├── /setup
│   ├── /stammdaten/fahrzeuge
│   ├── /stammdaten/personen
│   ├── /kraefte/qualifikationen
│   ├── /kraefte/rollen-definitionen
│   └── /integrations/hiorg
└── /app                    → AppGuard
    ├── /einsaetze          → Einsatz-Liste
    └── /einsatz/$einsatzId
        ├── /übersicht
        ├── /patienten
        ├── /kräfte
        ├── /kommunikation
        ├── /führung
        ├── /logistik
        ├── /sicherheit
        ├── /betreuung
        └── /drohne
```

---

## 6. API Client

### BackendApi Singleton

```typescript
// Verwendung
import { api } from '@/shared/api/client';

const { data } = await api.einsatz().einsatzCqrsControllerFindAllVAlpha();
```

### Token-Refresh

Bei 401-Response wird automatisch:
1. Access-Token via Refresh-Endpoint erneuert
2. Original-Request wiederholt
3. Bei Fehler: Redirect zu /auth

### Error-Handling

```typescript
// Global Error Handler (in __root.tsx)
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => handleQueryError(error, { queryKey: query.queryKey }),
  }),
});
```

Fehler-Kategorien:
- `auth`: 401 → Redirect
- `not_found`: 404 → Kein Toast (erwartet)
- `validation`: 400/422 → Warning-Toast
- `server`: 5xx → Error-Toast mit Retry

---

## 7. State Management

### Server-State (TanStack Query)

```typescript
// Query mit automatischem Caching
const { data, isLoading } = useEinsaetzeQuery({ status: 'AKTIV' });

// Mutation mit Cache-Invalidierung
const createMutation = useCreateEinsatz();
await createMutation.mutateAsync({ alarmstichwort: 'Brand' });
```

### Client-State (TanStack Store)

```typescript
// Store Definition
const einsatzUIStore = createStore<EinsatzUIState>({
  selectedEinsatzId: null,
  viewMode: 'list',
});

// Usage
const viewMode = useStore(einsatzUIStore, (s) => s.viewMode);
```

### Query Keys Pattern

Jedes Feature definiert eigene Query Keys:

```typescript
// features/einsatz/api/queries.ts
export const EINSATZ_QUERY_KEYS = {
  all: ['einsatz'],
  lists: () => ['einsatz', 'list'],
  list: (filters) => ['einsatz', 'list', filters],
  detail: (id) => ['einsatz', 'detail', id],
  fahrzeuge: (id) => ['einsatz', 'detail', id, 'fahrzeuge'],
};
```

---

## 8. Abhängigkeiten

### Core Dependencies

| Package | Version | Zweck |
|---------|---------|-------|
| `react` | 19.1.0 | UI Framework |
| `@tanstack/react-router` | 1.120.13 | Routing |
| `@tanstack/react-query` | 5.81.0 | Server State |
| `@tanstack/react-store` | 0.7.0 | Client State |
| `@tanstack/react-form` | 1.x | Forms |
| `@tanstack/react-table` | 8.x | Tables |
| `@tanstack/react-virtual` | 3.x | Virtualisierung |
| `@tanstack/pacer` | 0.x | Debounce/Throttle |
| `tailwindcss` | 4.1.10 | Styling |
| `@headlessui/react` | 2.x | UI Components |
| `zod` | 3.x | Validation |

### Map Dependencies

| Package | Zweck |
|---------|-------|
| `leaflet` | Karten-Library |
| `leaflet-pm` | Drawing Tools |
| `react-leaflet` | React Bindings |
| `react-leaflet-markercluster` | POI Clustering |

### Desktop (Tauri)

| Package | Zweck |
|---------|-------|
| `@tauri-apps/api` | Tauri JS API |
| `@tauri-apps/plugin-*` | Native Plugins |

---

## 9. Entwicklungs-Workflows

### Development

```bash
# Full Stack (Backend + Tauri)
pnpm -r dev

# Nur Frontend (Vite Dev Server)
pnpm --filter @bluelight-hub/frontend dev:vite

# API Client generieren (nach Backend-Änderungen)
pnpm run generate-api
```

### Testing

```bash
# Unit Tests
pnpm --filter @bluelight-hub/frontend test

# E2E Tests (Playwright)
pnpm --filter @bluelight-hub/frontend test:e2e
```

### Building

```bash
# Desktop Build
pnpm --filter @bluelight-hub/frontend build

# Type-Check
pnpm --filter @bluelight-hub/frontend exec tsc --noEmit
```

---

## 10. Best Practices

### API Integration

```typescript
// ✅ RICHTIG: Generated API Client + TanStack Query
const useEinsaetze = () => {
  return useQuery({
    queryKey: EINSATZ_QUERY_KEYS.list(),
    queryFn: () => api.einsatz().findAll(),
  });
};

// ❌ FALSCH: Manueller Fetch
const fetchEinsaetze = async () => {
  return await fetch('/api/einsatz');
};
```

### Forms

```typescript
// ✅ RICHTIG: @tanstack/react-form + Zod
const form = useForm({
  defaultValues: { name: '' },
  validators: {
    onChange: z.object({ name: z.string().min(3) }),
  },
});

// ❌ FALSCH: Uncontrolled HTML Forms
<form onSubmit={handleSubmit}>...</form>
```

### Styling

```typescript
// ✅ RICHTIG: Tailwind CSS + cn() Helper
<div className={cn(
  "flex items-center gap-4",
  isActive && "bg-blue-100"
)}>

// ❌ FALSCH: CSS-in-JS oder andere Frameworks
<div style={{ display: 'flex' }}>
```

---

## Anhang: Query Keys Referenz

### Auth
- `AUTH_KEYS.auth.queries.authCheck`
- `AUTH_KEYS.auth.queries.adminStatus`
- `AUTH_KEYS.users.all`
- `AUTH_KEYS.users.byId(id)`

### Einsatz
- `EINSATZ_QUERY_KEYS.lists()`
- `EINSATZ_QUERY_KEYS.list(filters)`
- `EINSATZ_QUERY_KEYS.detail(id)`
- `EINSATZ_QUERY_KEYS.fahrzeuge(id)`
- `EINSATZ_QUERY_KEYS.personen(id)`

### ETB
- `ETB_QUERY_KEYS.byEinsatz(id)`
- `ETB_QUERY_KEYS.history(etbId)`
- `ETB_QUERY_KEYS.textbausteine()`

### Lagekarte
- `LAGEKARTE_QUERY_KEYS.byEinsatz(id)`
- `LAGEKARTE_QUERY_KEYS.pois(lagekarteId)`

### Kräfte
- `KRAEFTE_QUERY_KEYS.staerke(id)`
- `KRAEFTE_QUERY_KEYS.fahrzeuge(id)`
- `KRAEFTE_QUERY_KEYS.rollen(id)`

### Admin
- `ADMIN_QUERY_KEYS.users`
- `ADMIN_QUERY_KEYS.kraefte.qualifikationen.list()`
- `ADMIN_QUERY_KEYS.stammdaten.fahrzeuge.list()`
- `ADMIN_QUERY_KEYS.stammdaten.personen.list()`
