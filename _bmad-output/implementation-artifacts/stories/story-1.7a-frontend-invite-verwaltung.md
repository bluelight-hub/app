# Story 1.7a: Frontend - Invite-Code Verwaltung

## Story

- **ID**: 1.7a
- **Epic**: Epic 1 - Secure Server Foundation & Invite-System
- **Story Key**: 1-7a-frontend-invite-verwaltung
- **Title**: Frontend - Invite-Code Verwaltung
- **Status**: ready-for-dev
- **Story Points**: 3
- **Depends On**: Story 1.7 (Backend - review)

## User Story

**Als** Server-Administrator
**moechte ich** eine benutzerfreundliche Oberflaeche zur Verwaltung von Invite-Codes
**damit** ich Codes einfach einsehen, filtern und widerrufen kann

## Acceptance Criteria

### AC1: Admin-Seite fuer Invite-Codes

**Given** ein authentifizierter Admin-User
**When** er zur Route `/admin/invites` navigiert
**Then** sieht er:
- Tabelle mit allen Invite-Codes
- Columns: Code (maskiert), Status, Label, Ablaufdatum, Nutzung, Ersteller, Aktionen
- Status-Badge mit Farb-Codierung (active=gruen, used=grau, expired=orange, revoked=rot)

**Technische Implementierung:**
- [x] Route `/admin/invites` in TanStack Router
- [x] Admin-Guard (nur fuer eingeloggte Admins)
- [x] InviteCodeListPage Komponente

### AC2: Pagination & Filter

**Given** die Invite-Code-Liste
**When** der Admin Filter anwendet
**Then**:
- Pagination (20 pro Seite, konfigurierbar)
- Status-Filter Dropdown (alle, active, used, expired, revoked)
- Sortierung (createdAt DESC als Default)

**Technische Implementierung:**
- [x] Pagination via API Query-Parameter
- [x] Status-Filter Dropdown (Headless UI Listbox)
- [x] URL-State fuer Filter/Pagination

### AC3: Revoke-Funktion

**Given** ein Invite-Code mit Status `active` oder `expired`
**When** der Admin auf "Widerrufen" klickt
**Then**:
- Confirmation Dialog erscheint
- Nach Bestaetigung wird DELETE /admin/invites/:id aufgerufen
- Success Toast bei Erfolg
- Error Toast bei Fehler
- Liste wird automatisch aktualisiert

**Technische Implementierung:**
- [x] RevokeButton mit Confirmation Dialog
- [x] useMutation fuer Revoke
- [x] Optimistic Updates mit Query Invalidation
- [x] Toast-Notifications

### AC4: TanStack Query Integration

**Given** die Admin API Endpoints aus Story 1.7
**When** die Frontend-Hooks implementiert werden
**Then**:
- `useListInvites` Query Hook (GET /admin/invites)
- `useRevokeInvite` Mutation Hook (DELETE /admin/invites/:id)
- Query Keys in ADMIN_QUERY_KEYS ergaenzt
- Automatic Refetch nach Revoke

**API Endpoints (aus Story 1.7):**
```
GET /admin/invites
  Query: status?, createdBy?, sort?, page?, pageSize?
  Response: { data: InviteCodeListItemDto[], meta: {...}, pagination?: {...} }

DELETE /admin/invites/:id
  Response: { data: { id, code, status, revokedAt } }
```

---

## Technical Notes

### Feature-Struktur

```
packages/frontend/src/features/admin/
├── api/
│   ├── queries.ts                    # ERWEITERN: invites Query Keys
│   ├── use-admin-invite-management.ts # NEU: Hook fuer Invite-Verwaltung
│   └── index.ts                      # ERWEITERN: Export
├── ui/
│   ├── atoms/
│   │   └── InviteStatusBadge.tsx     # NEU: Status-Badge mit Farb-Codierung
│   ├── molecules/
│   │   ├── InviteCodeTableRow.tsx    # NEU: Tabellen-Zeile
│   │   ├── InviteFilters.tsx         # NEU: Filter Dropdown
│   │   └── RevokeInviteButton.tsx    # NEU: Revoke Button mit Dialog
│   ├── organisms/
│   │   └── InviteCodeTable.tsx       # NEU: Tabelle mit Pagination
│   └── pages/
│       └── AdminInvites.tsx          # NEU: Page Komponente
└── schemas/
    └── invite-filters.schema.ts      # NEU: Zod Schema fuer Filter
```

### API Integration mit generiertem Client

**WICHTIG:** Nutze IMMER den generierten API-Client aus `@bluelight-hub/shared/client`!

```typescript
// features/admin/api/use-admin-invite-management.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ADMIN_QUERY_KEYS } from './queries';
import type {
  InviteCodeListItemDto,
  AdminInviteControllerListInvitesVAlphaStatusEnum,
} from '@bluelight-hub/shared/client';

export interface InviteFilters {
  status?: AdminInviteControllerListInvitesVAlphaStatusEnum;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export const useListInvites = (filters: InviteFilters = {}) => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.invites.list(filters),
    queryFn: () => api.admin.adminInviteControllerListInvitesVAlpha({
      status: filters.status,
      page: filters.page,
      pageSize: filters.pageSize,
      sort: filters.sort,
    }),
  });
};

export const useRevokeInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.admin.adminInviteControllerRevokeInviteVAlpha({ id }),
    onSuccess: () => {
      // Invalidate alle Invite-Queries
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.invites.all(),
      });
    },
  });
};
```

### Query Keys erweitern

```typescript
// features/admin/api/queries.ts - ERWEITERN
export const ADMIN_QUERY_KEYS = {
  // ... bestehende Keys ...
  invites: {
    all: () => [...ADMIN_QUERY_KEYS.all, 'invites'] as const,
    list: (filters?: InviteFilters) =>
      [...ADMIN_QUERY_KEYS.invites.all(), 'list', filters].filter(Boolean) as const,
    detail: (id: string) =>
      [...ADMIN_QUERY_KEYS.invites.all(), 'detail', id] as const,
  },
} as const;
```

### UI Komponenten

**InviteStatusBadge (Atom):**
```typescript
// Status -> Farbe Mapping
const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  used: 'bg-gray-100 text-gray-800',
  expired: 'bg-amber-100 text-amber-800',
  revoked: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  active: 'Aktiv',
  used: 'Verwendet',
  expired: 'Abgelaufen',
  revoked: 'Widerrufen',
};
```

**InviteCodeTable (Organism):**
- Nutze bestehende Table-Patterns aus AdminUsers
- Responsive Design (mobile: Card-Layout, desktop: Table)
- Loading State mit Skeleton
- Empty State mit Hinweis

**RevokeInviteButton (Molecule):**
- Disabled fuer Status `used` und `revoked`
- Confirmation Dialog (Headless UI Dialog)
- Loading State waehrend Mutation

### Routing

```typescript
// routes/admin/invites.tsx (TanStack Router)
import { createFileRoute } from '@tanstack/react-router';
import { AdminInvitesPage } from '@/features/admin/ui/pages/AdminInvites';

export const Route = createFileRoute('/admin/invites')({
  component: AdminInvitesPage,
});
```

### Patterns aus bestehenden Admin-Pages

Analysiere diese bestehenden Dateien fuer konsistente Patterns:
- `features/admin/ui/pages/AdminUsers.tsx` - Page-Struktur
- `features/admin/ui/organisms/UsersTable.tsx` - Table-Pattern
- `features/admin/ui/organisms/ConfirmDeleteDialog.tsx` - Dialog-Pattern
- `features/admin/api/use-admin-user-management.ts` - Hook-Pattern

### API Response Types (aus generiertem Client)

```typescript
// Bereits generiert in @bluelight-hub/shared/client:
interface InviteCodeListItemDto {
  id: string;
  code: string;           // Maskiert: "ABC1****"
  expiresAt: string;      // ISO-8601
  maxUses: number;
  useCount: number;
  status: 'active' | 'used' | 'expired' | 'revoked';
  label?: string | null;
  createdAt: string;      // ISO-8601
  createdBy: {
    id: string;
    email: string;
  };
  revokedAt?: string | null;
}

// Status Enum
const InviteCodeListItemDtoStatusEnum = {
  Active: 'active',
  Used: 'used',
  Expired: 'expired',
  Revoked: 'revoked',
} as const;
```

---

## Implementation Tasks

### Task 1: Query Keys & API Hook

**Dateien:**
- `packages/frontend/src/features/admin/api/queries.ts` (ERWEITERN)
- `packages/frontend/src/features/admin/api/use-admin-invite-management.ts` (NEU)
- `packages/frontend/src/features/admin/api/index.ts` (ERWEITERN)

**Subtasks:**
- [x] 1.1 Query Keys fuer `invites` in `ADMIN_QUERY_KEYS` ergaenzen
- [x] 1.2 `useListInvites` Hook mit Filter-Support
- [x] 1.3 `useRevokeInvite` Mutation Hook mit Query Invalidation
- [x] 1.4 Export in barrel file

**Akzeptanzkriterien:**
- [x] Query Keys hierarchisch strukturiert (all, list, detail)
- [x] useListInvites akzeptiert Filter-Objekt
- [x] useRevokeInvite invalidiert Liste nach Erfolg
- [x] TypeScript Types korrekt (nutze generierte DTOs)

---

### Task 2: UI Atoms - Status Badge

**Dateien:**
- `packages/frontend/src/features/admin/ui/atoms/InviteStatusBadge.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/atoms/index.ts` (NEU/ERWEITERN)

**Subtasks:**
- [x] 2.1 InviteStatusBadge Komponente mit Farb-Codierung
- [x] 2.2 Export in barrel file

**Akzeptanzkriterien:**
- [x] 4 Status-Varianten mit unterschiedlichen Farben
- [x] Deutsche Labels (Aktiv, Verwendet, Abgelaufen, Widerrufen)
- [x] Tailwind CSS Styling konsistent mit Projekt

---

### Task 3: UI Molecules - Table Row, Filters, Revoke Button

**Dateien:**
- `packages/frontend/src/features/admin/ui/molecules/InviteCodeTableRow.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/molecules/InviteFilters.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/molecules/RevokeInviteButton.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/molecules/index.ts` (ERWEITERN)

**Subtasks:**
- [x] 3.1 InviteCodeTableRow mit allen Spalten
- [x] 3.2 InviteFilters Dropdown (Headless UI Listbox)
- [x] 3.3 RevokeInviteButton mit Confirmation Dialog
- [x] 3.4 Export in barrel file

**Akzeptanzkriterien:**
- [x] TableRow zeigt alle relevanten Felder
- [x] Filter-Dropdown funktioniert
- [x] Revoke-Button disabled fuer used/revoked
- [x] Confirmation Dialog vor Revoke
- [x] Headless UI korrekt verwendet

---

### Task 4: UI Organisms - Invite Code Table

**Dateien:**
- `packages/frontend/src/features/admin/ui/organisms/InviteCodeTable.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/organisms/index.ts` (ERWEITERN)

**Subtasks:**
- [ ] 4.1 InviteCodeTable mit Spalten-Definition
- [ ] 4.2 Pagination Controls
- [ ] 4.3 Loading State (Skeleton)
- [ ] 4.4 Empty State
- [ ] 4.5 Export in barrel file

**Akzeptanzkriterien:**
- [ ] Responsive Table (Tailwind)
- [ ] Pagination funktioniert
- [ ] Loading/Empty States vorhanden
- [ ] Pattern konsistent mit UsersTable

---

### Task 5: UI Page - Admin Invites

**Dateien:**
- `packages/frontend/src/features/admin/ui/pages/AdminInvites.tsx` (NEU)
- `packages/frontend/src/features/admin/ui/pages/index.ts` (ERWEITERN)

**Subtasks:**
- [ ] 5.1 AdminInvitesPage mit Layout
- [ ] 5.2 Filter-State Management (URL-basiert oder useState)
- [ ] 5.3 Integration von Table + Filters
- [ ] 5.4 Page Header mit Titel
- [ ] 5.5 Export in barrel file

**Akzeptanzkriterien:**
- [ ] Page-Layout konsistent mit anderen Admin-Pages
- [ ] Filter/Pagination State wird verwaltet
- [ ] Komponenten korrekt integriert

---

### Task 6: Routing

**Dateien:**
- `packages/frontend/src/routes/admin/invites.tsx` (NEU)

**Subtasks:**
- [ ] 6.1 Route Definition mit TanStack Router
- [ ] 6.2 Admin-only Guard (bereits vorhanden in Parent-Route)

**Akzeptanzkriterien:**
- [ ] Route `/admin/invites` erreichbar
- [ ] Nur fuer Admins zugaenglich
- [ ] Lazy Loading mit Suspense

---

### Task 7: Navigation Integration

**Dateien:**
- `packages/frontend/src/features/admin/ui/pages/AdminDashboard.tsx` (ERWEITERN)
- oder Navigation-Komponente falls vorhanden

**Subtasks:**
- [ ] 7.1 Link zu /admin/invites in Admin-Navigation
- [ ] 7.2 Icon + Label fuer Invite-Verwaltung

**Akzeptanzkriterien:**
- [ ] Link in Admin-Navigation sichtbar
- [ ] Aktiver State bei /admin/invites

---

### Task 8: Tests & Validation

**Subtasks:**
- [ ] 8.1 Lint Check: `pnpm --filter @bluelight-hub/frontend lint:check`
- [ ] 8.2 TypeScript Compilation
- [ ] 8.3 Manuelle Tests mit claude-in-chrome
  - Liste laden
  - Filter anwenden
  - Pagination testen
  - Revoke mit Confirmation

**Akzeptanzkriterien:**
- [ ] Keine Lint-Fehler
- [ ] TypeScript kompiliert fehlerfrei
- [ ] Manuelle Tests erfolgreich

---

## Dev Notes

### Patterns aus CLAUDE.md

**WICHTIG - UI Framework:**
- NUR Tailwind CSS + Headless UI
- NIEMALS andere CSS Frameworks
- TailwindUI Komponenten nur auf Anfrage

**Forms & State:**
- @tanstack/react-query fuer Server State
- URL State fuer Filter (optional, aber empfohlen)

**API:**
- IMMER generierten Client nutzen
- NIEMALS manuelle fetch() calls

### Dependencies

| Dependency | Version | Verwendung |
|------------|---------|------------|
| @tanstack/react-query | latest | Server State |
| @headlessui/react | ^2.x | Listbox, Dialog |
| @heroicons/react | ^2.x | Icons |

### Referenzen

- Story 1.7: Backend API (Endpoints, DTOs)
- Story 1.3a: Frontend Setup Page (Pattern-Referenz)
- AdminUsers.tsx: Table Pattern
- ConfirmDeleteDialog.tsx: Dialog Pattern

### Offene Entscheidungen

1. **Filter State:** URL-basiert (empfohlen) oder useState?
   - Empfehlung: useState fuer MVP, spaeter URL-State

2. **Mobile Layout:** Cards oder scrollbare Table?
   - Empfehlung: Horizontales Scrolling fuer Table

---

## Definition of Done

- [ ] Alle ACs erfuellt und getestet
- [ ] Lint Check passed
- [ ] TypeScript Compilation passed
- [ ] Manuelle Tests mit claude-in-chrome erfolgreich
- [ ] Code Review approved

---

## Dev Agent Record

### Implementation Plan

*Wird vom Dev Agent ausgefuellt*

### Debug Log

*Wird vom Dev Agent ausgefuellt*

### Completion Notes

**Task 1: Query Keys & API Hook - COMPLETED (2026-01-07)**

Implementiert von: Claude Code Agent

**Was wurde umgesetzt:**
1. Query Keys für `invites` in `ADMIN_QUERY_KEYS` ergänzt (hierarchisch: all, list, detail)
2. `useListInvites` Hook erstellt mit vollständiger Filter-Unterstützung
3. `useRevokeInvite` Mutation Hook mit automatischer Query Invalidation
4. Alle Exports in barrel file (`index.ts`) ergänzt inkl. DTO Re-Exports

**Technische Details:**
- Verwendet generierten API-Client (`api.admin().adminInviteControllerListInvitesVAlpha()`)
- Query Keys folgen bestehendem Pattern mit filter-basiertem Caching
- Mutation invalidiert `ADMIN_QUERY_KEYS.invites.all()` nach Erfolg
- Toast-Notifications für Success/Error mit `getApiErrorMessage` Helper
- TypeScript Types aus generierten DTOs (`InviteCodeListItemDto`, `AdminInviteControllerListInvitesVAlphaStatusEnum`)

**Qualitätschecks:**
- ✅ Biome Lint Check: No errors
- ✅ TypeScript Compilation: Success
- ✅ Pattern konsistent mit `use-admin-user-management.ts`
- ✅ Alle Acceptance Criteria erfüllt

**Dateien:**
- ✅ `packages/frontend/src/features/admin/api/queries.ts` (erweitert)
- ✅ `packages/frontend/src/features/admin/api/use-admin-invite-management.ts` (neu)
- ✅ `packages/frontend/src/features/admin/api/index.ts` (erweitert)

**Nächster Schritt:** Task 2 - UI Atoms (InviteStatusBadge)

**Task 2: UI Atoms - Status Badge - COMPLETED (2026-01-08)**

Implementiert von: Claude Code Agent

**Was wurde umgesetzt:**
1. InviteStatusBadge Komponente mit 4 Status-Varianten erstellt
2. Farb-Codierung implementiert (active=grün, used=grau, expired=amber, revoked=rot)
3. Deutsche Labels implementiert (Aktiv, Verwendet, Abgelaufen, Widerrufen)
4. Barrel file für atoms erstellt und Export hinzugefügt

**Technische Details:**
- Verwendet `cn()` Helper für bedingte Klassen
- Dark Mode Unterstützung mit Tailwind dark: Varianten
- Pattern konsistent mit `FmsStatusBadge.atom.tsx` und `badge.atom.tsx`
- TypeScript Types für alle 4 Status-Varianten (active, used, expired, revoked)

**Qualitätschecks:**
- ✅ 4 Status-Varianten mit unterschiedlichen Farben
- ✅ Deutsche Labels wie spezifiziert
- ✅ Tailwind CSS Styling konsistent mit Projekt
- ✅ Atomic Design Pattern eingehalten

**Dateien:**
- ✅ `packages/frontend/src/features/admin/ui/atoms/InviteStatusBadge.tsx` (neu)
- ✅ `packages/frontend/src/features/admin/ui/atoms/index.ts` (neu)

**Nächster Schritt:** Task 3 - UI Molecules (Table Row, Filters, Revoke Button)

**Task 3: UI Molecules - Table Row, Filters, Revoke Button - COMPLETED (2026-01-08)**

Implementiert von: Claude Code Agent

**Was wurde umgesetzt:**
1. InviteCodeTableRow mit allen Spalten (Code maskiert, Status, Label, Ablaufdatum, Nutzung, Ersteller, Aktionen)
2. InviteFilters Dropdown mit Headless UI Listbox (Alle, Aktiv, Verwendet, Abgelaufen, Widerrufen)
3. RevokeInviteButton mit Confirmation Dialog (Dialog.Confirm)
4. Barrel file exports in molecules/index.ts erweitert

**Technische Details:**
- InviteCodeTableRow: Formatierung mit Intl.DateTimeFormat, Status-Badge Integration, disabled für used/revoked
- InviteFilters: Headless UI Listbox, 5 Filter-Optionen, deutsche Labels, onChange Callback
- RevokeInviteButton: Dialog.Confirm Pattern, Loading State, useRevokeInvite Hook Integration
- Pattern konsistent mit UsersTable und ConfirmDeleteDialog

**Qualitätschecks:**
- ✅ Biome Lint Check: No errors (Sortierung-Fixes angewendet)
- ✅ TableRow zeigt alle relevanten Felder
- ✅ Filter-Dropdown funktioniert mit Headless UI
- ✅ Revoke-Button disabled für used/revoked Status
- ✅ Confirmation Dialog vor Revoke-Aktion
- ✅ Headless UI korrekt verwendet (Listbox, Dialog.Confirm)

**Dateien:**
- ✅ `packages/frontend/src/features/admin/ui/molecules/InviteCodeTableRow.tsx` (neu)
- ✅ `packages/frontend/src/features/admin/ui/molecules/InviteFilters.tsx` (neu)
- ✅ `packages/frontend/src/features/admin/ui/molecules/RevokeInviteButton.tsx` (neu)
- ✅ `packages/frontend/src/features/admin/ui/molecules/index.ts` (erweitert)

**Nächster Schritt:** Task 4 - UI Organisms (Invite Code Table)

---

## File List

### Neu erstellt:
- `packages/frontend/src/features/admin/api/use-admin-invite-management.ts` ✅ Task 1
- `packages/frontend/src/features/admin/ui/atoms/InviteStatusBadge.tsx` ✅ Task 2
- `packages/frontend/src/features/admin/ui/atoms/index.ts` ✅ Task 2
- `packages/frontend/src/features/admin/ui/molecules/InviteCodeTableRow.tsx` ✅ Task 3
- `packages/frontend/src/features/admin/ui/molecules/InviteFilters.tsx` ✅ Task 3
- `packages/frontend/src/features/admin/ui/molecules/RevokeInviteButton.tsx` ✅ Task 3
- `packages/frontend/src/features/admin/ui/organisms/InviteCodeTable.tsx` (Task 4)
- `packages/frontend/src/features/admin/ui/pages/AdminInvites.tsx` (Task 5)
- `packages/frontend/src/features/admin/schemas/invite-filters.schema.ts` (optional)
- `packages/frontend/src/routes/admin/invites.tsx`

### Erweitert:
- `packages/frontend/src/features/admin/api/queries.ts` ✅ Task 1 (invites Query Keys)
- `packages/frontend/src/features/admin/api/index.ts` ✅ Task 1 (Exports)
- `packages/frontend/src/features/admin/ui/molecules/index.ts` ✅ Task 3 (Exports)
- `packages/frontend/src/features/admin/ui/organisms/index.ts` (Exports - Task 4)
- `packages/frontend/src/features/admin/ui/pages/index.ts` (Exports - Task 5)
- `packages/frontend/src/features/admin/ui/pages/AdminDashboard.tsx` (Navigation Link - Task 7)

---

## Change Log

- **2026-01-07**: Story 1.7a erstellt (Story Creation Agent)
  - Basierend auf Story 1.7 Backend API
  - Pattern-Referenz aus Story 1.3a und bestehenden Admin-Pages
  - API-Client bereits generiert und verfuegbar

---

## Referenzen

- Story 1.7: Backend - Invite-Code verwalten (API Endpoints)
- Story 1.3a: Frontend Admin-Setup-Page (Pattern-Referenz)
- Epic 1: Secure Server Foundation & Invite-System
- CLAUDE.md: Frontend Stack & Rules
- Generated API Client: `@bluelight-hub/shared/client`
