# Admin Panel UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the admin panel UI/UX with persistent sidebar navigation, breadcrumbs, unified data tables, consistent loading/error patterns, and a KPI dashboard.

**Architecture:** Build 4 new shared components (Sidebar, DataTable, Breadcrumbs, EmptyState) that are reusable beyond admin. Integrate them into a refactored AdminLayout, then migrate all 8 admin tables and 14 pages to use the new patterns. Frontend-only changes — no backend modifications.

**Tech Stack:** React 19, TanStack Router, TanStack Table, Tailwind CSS, Headless UI, Phosphor Icons (react-icons/pi), Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-03-admin-panel-ux-redesign-design.md`

---

## Task 1: EmptyState Molecule

**Files:**
- Create: `packages/frontend/src/shared/ui/molecules/empty-state.molecule.tsx`
- Create: `packages/frontend/src/shared/ui/molecules/__tests__/empty-state.molecule.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// packages/frontend/src/shared/ui/molecules/__tests__/empty-state.molecule.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../empty-state.molecule';
import { PiUsers } from 'react-icons/pi';

describe('EmptyState', () => {
  it('rendert Titel und Beschreibung', () => {
    render(
      <EmptyState
        icon={PiUsers}
        title="Keine Benutzer"
        description="Es wurden noch keine Benutzer angelegt."
      />,
    );
    expect(screen.getByText('Keine Benutzer')).toBeInTheDocument();
    expect(screen.getByText('Es wurden noch keine Benutzer angelegt.')).toBeInTheDocument();
  });

  it('rendert Icon', () => {
    render(
      <EmptyState
        icon={PiUsers}
        title="Keine Benutzer"
        description="Beschreibung"
      />,
    );
    // Phosphor icons render as SVG
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('rendert CTA-Button und ruft onClick auf', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={PiUsers}
        title="Keine Benutzer"
        description="Beschreibung"
        action={{ label: 'Benutzer anlegen', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Benutzer anlegen' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('rendert sekundäre Aktion', async () => {
    const user = userEvent.setup();
    const handleSecondary = vi.fn();
    render(
      <EmptyState
        icon={PiUsers}
        title="Keine Benutzer"
        description="Beschreibung"
        secondaryAction={{ label: 'Einladung senden', onClick: handleSecondary }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Einladung senden' });
    await user.click(button);
    expect(handleSecondary).toHaveBeenCalledOnce();
  });

  it('rendert ohne Aktionen', () => {
    render(
      <EmptyState
        icon={PiUsers}
        title="Keine Benutzer"
        description="Beschreibung"
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/molecules/__tests__/empty-state.molecule.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement EmptyState component**

```tsx
// packages/frontend/src/shared/ui/molecules/empty-state.molecule.tsx
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center py-12">
      <Icon className="mb-4 h-12 w-12 text-text-muted" />
      <h3 className="mb-1 text-lg font-medium text-text-primary">{title}</h3>
      <p className="mb-6 max-w-sm text-center text-sm text-text-muted">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button intent="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button appearance="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/molecules/__tests__/empty-state.molecule.test.tsx --no-coverage`
Expected: 5 tests PASS

- [ ] **Step 5: Export from barrel**

Add export to `packages/frontend/src/shared/ui/molecules/index.ts`:
```ts
export { EmptyState } from './empty-state.molecule';
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/shared/ui/molecules/empty-state.molecule.tsx packages/frontend/src/shared/ui/molecules/__tests__/empty-state.molecule.test.tsx packages/frontend/src/shared/ui/molecules/index.ts
git commit -m "✨(frontend): EmptyState shared molecule (#596)"
```

---

## Task 2: Breadcrumbs Molecule

**Files:**
- Create: `packages/frontend/src/shared/ui/molecules/breadcrumbs.molecule.tsx`
- Create: `packages/frontend/src/shared/ui/molecules/__tests__/breadcrumbs.molecule.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// packages/frontend/src/shared/ui/molecules/__tests__/breadcrumbs.molecule.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '../breadcrumbs.molecule';
import { createRouter, createRootRoute, createRoute, RouterProvider, createMemoryHistory } from '@tanstack/react-router';

function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('Breadcrumbs', () => {
  it('rendert alle Items mit Separatoren', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Admin', to: '/admin' },
          { label: 'Kräfte', to: '/admin/kraefte' },
          { label: 'Qualifikationen' },
        ]}
      />,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Kräfte')).toBeInTheDocument();
    expect(screen.getByText('Qualifikationen')).toBeInTheDocument();
  });

  it('rendert letztes Item ohne Link', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Admin', to: '/admin' },
          { label: 'Qualifikationen' },
        ]}
      />,
    );
    // Letztes Item ist kein Link
    const lastItem = screen.getByText('Qualifikationen');
    expect(lastItem.tagName).not.toBe('A');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
  });

  it('rendert vorherige Items als Links', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Admin', to: '/admin' },
          { label: 'Qualifikationen' },
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: 'Admin' });
    expect(link).toBeInTheDocument();
  });

  it('rendert nav mit aria-label', () => {
    renderWithRouter(
      <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Test' }]} />,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/molecules/__tests__/breadcrumbs.molecule.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Breadcrumbs component**

```tsx
// packages/frontend/src/shared/ui/molecules/breadcrumbs.molecule.tsx
import { Link } from '@tanstack/react-router';
import { PiCaretRight } from 'react-icons/pi';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && <PiCaretRight className="h-3 w-3 flex-shrink-0" />}
              {isLast || !item.to ? (
                <span className="font-medium text-text-primary" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="transition-colors hover:text-text-primary"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/molecules/__tests__/breadcrumbs.molecule.test.tsx --no-coverage`
Expected: 4 tests PASS

- [ ] **Step 5: Export from barrel**

Add export to `packages/frontend/src/shared/ui/molecules/index.ts`:
```ts
export { Breadcrumbs } from './breadcrumbs.molecule';
export type { BreadcrumbItem } from './breadcrumbs.molecule';
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/shared/ui/molecules/breadcrumbs.molecule.tsx packages/frontend/src/shared/ui/molecules/__tests__/breadcrumbs.molecule.test.tsx packages/frontend/src/shared/ui/molecules/index.ts
git commit -m "✨(frontend): Breadcrumbs shared molecule (#596)"
```

---

## Task 3: Sidebar Organism

**Files:**
- Create: `packages/frontend/src/shared/ui/organisms/sidebar.organism.tsx`
- Create: `packages/frontend/src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// packages/frontend/src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../sidebar.organism';
import type { SidebarGroup } from '../sidebar.organism';
import { PiHouse, PiUsers, PiTruck } from 'react-icons/pi';
import { createRouter, createRootRoute, RouterProvider, createMemoryHistory } from '@tanstack/react-router';

const testItems: SidebarGroup[] = [
  {
    entries: [{ label: 'Dashboard', to: '/admin/dashboard', icon: PiHouse }],
  },
  {
    group: 'Stammdaten',
    entries: [
      { label: 'Personen', to: '/admin/stammdaten/personen', icon: PiUsers },
      { label: 'Fahrzeuge', to: '/admin/stammdaten/fahrzeuge', icon: PiTruck },
    ],
  },
];

function renderWithRouter(ui: React.ReactElement, initialEntry = '/admin/dashboard') {
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('Sidebar', () => {
  it('rendert alle Navigations-Items', () => {
    renderWithRouter(
      <Sidebar items={testItems} header={<div>Header</div>} />,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Personen')).toBeInTheDocument();
    expect(screen.getByText('Fahrzeuge')).toBeInTheDocument();
  });

  it('rendert Gruppenüberschriften', () => {
    renderWithRouter(
      <Sidebar items={testItems} header={<div>Header</div>} />,
    );
    expect(screen.getByText('Stammdaten')).toBeInTheDocument();
  });

  it('rendert Header', () => {
    renderWithRouter(
      <Sidebar items={testItems} header={<div>Admin Panel</div>} />,
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('rendert Footer', () => {
    renderWithRouter(
      <Sidebar items={testItems} header={<div>Header</div>} footer={<div>Footer Content</div>} />,
    );
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('rendert Items als Links', () => {
    renderWithRouter(
      <Sidebar items={testItems} header={<div>Header</div>} />,
    );
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Sidebar component**

```tsx
// packages/frontend/src/shared/ui/organisms/sidebar.organism.tsx
import type { ComponentType, ReactNode } from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { clsx } from 'clsx';

export interface SidebarItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

export interface SidebarGroup {
  group?: string;
  entries: SidebarItem[];
}

interface SidebarProps {
  items: SidebarGroup[];
  header: ReactNode;
  footer?: ReactNode;
  variant?: 'dark' | 'light';
}

export function Sidebar({ items, header, footer, variant = 'dark' }: SidebarProps) {
  const matchRoute = useMatchRoute();

  const isDark = variant === 'dark';

  return (
    <aside
      className={clsx(
        'flex h-full w-60 flex-col',
        isDark ? 'bg-surface-inverse text-text-inverse' : 'bg-surface-primary border-r border-border-primary',
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex-shrink-0 border-b px-4 py-4',
          isDark ? 'border-white/10' : 'border-border-primary',
        )}
      >
        {header}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.map((group, groupIndex) => (
          <div key={group.group ?? `group-${groupIndex}`} className={clsx(groupIndex > 0 && 'mt-6')}>
            {group.group && (
              <div
                className={clsx(
                  'mb-2 px-3 text-xs font-semibold uppercase tracking-wider',
                  isDark ? 'text-text-inverse/50' : 'text-text-muted',
                )}
              >
                {group.group}
              </div>
            )}
            <ul className="space-y-1">
              {group.entries.map((item) => {
                const isActive = !!matchRoute({ to: item.to, fuzzy: false });
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? isDark
                            ? 'bg-white/15 text-white'
                            : 'bg-action-primary/10 text-action-primary'
                          : isDark
                            ? 'text-text-inverse/70 hover:bg-white/10 hover:text-white'
                            : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div
          className={clsx(
            'flex-shrink-0 border-t px-4 py-3',
            isDark ? 'border-white/10' : 'border-border-primary',
          )}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx --no-coverage`
Expected: 5 tests PASS

- [ ] **Step 5: Add mobile drawer wrapper**

Create the responsive wrapper that shows the sidebar as a drawer on mobile. Add to the same file:

```tsx
// Append to packages/frontend/src/shared/ui/organisms/sidebar.organism.tsx
import { Dialog as HeadlessDialog, DialogBackdrop, DialogPanel } from '@headlessui/react';

interface SidebarDrawerProps extends SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ isOpen, onClose, ...sidebarProps }: SidebarDrawerProps) {
  return (
    <HeadlessDialog open={isOpen} onClose={onClose} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="relative flex w-full max-w-60 transform transition-transform duration-300 data-[closed]:-translate-x-full"
        >
          <Sidebar {...sidebarProps} />
        </DialogPanel>
      </div>
    </HeadlessDialog>
  );
}
```

- [ ] **Step 6: Add drawer test**

Append to the test file:

```tsx
import { SidebarDrawer } from '../sidebar.organism';

describe('SidebarDrawer', () => {
  it('rendert Sidebar-Inhalt wenn geöffnet', () => {
    renderWithRouter(
      <SidebarDrawer
        isOpen={true}
        onClose={vi.fn()}
        items={testItems}
        header={<div>Header</div>}
      />,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('rendert nichts wenn geschlossen', () => {
    renderWithRouter(
      <SidebarDrawer
        isOpen={false}
        onClose={vi.fn()}
        items={testItems}
        header={<div>Header</div>}
      />,
    );
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run all tests**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx --no-coverage`
Expected: 7 tests PASS

- [ ] **Step 8: Export from barrel**

Add to `packages/frontend/src/shared/ui/organisms/index.ts` (create if not existing):
```ts
export { Sidebar, SidebarDrawer } from './sidebar.organism';
export type { SidebarGroup, SidebarItem } from './sidebar.organism';
```

- [ ] **Step 9: Commit**

```bash
git add packages/frontend/src/shared/ui/organisms/sidebar.organism.tsx packages/frontend/src/shared/ui/organisms/__tests__/sidebar.organism.test.tsx packages/frontend/src/shared/ui/organisms/index.ts
git commit -m "✨(frontend): Sidebar shared organism with mobile drawer (#596)"
```

---

## Task 4: Admin Sidebar Config + AdminLayout Refactor

**Files:**
- Create: `packages/frontend/src/features/admin/lib/admin-sidebar-config.ts`
- Modify: `packages/frontend/src/shared/ui/templates/AdminLayout.tsx`

**Context:** The current AdminLayout has a header with back-button + title + close-button. We replace this with a sidebar (fixed on desktop, drawer on mobile) + breadcrumbs in the content area. The auth guard logic stays exactly the same.

- [ ] **Step 1: Create admin sidebar config**

```ts
// packages/frontend/src/features/admin/lib/admin-sidebar-config.ts
import type { SidebarGroup } from '@/shared/ui/organisms/sidebar.organism';
import {
  PiChartBar,
  PiCertificate,
  PiShieldCheck,
  PiTruck,
  PiCar,
  PiUsers,
  PiEnvelope,
  PiKey,
  PiGear,
  PiBell,
  PiListChecks,
  PiMegaphone,
  PiPlugs,
  PiArrowsLeftRight,
} from 'react-icons/pi';

export const adminSidebarItems: SidebarGroup[] = [
  {
    entries: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: PiChartBar },
    ],
  },
  {
    group: 'Kräfte',
    entries: [
      { label: 'Qualifikationen', to: '/admin/kraefte/qualifikationen', icon: PiCertificate },
      { label: 'Rollen', to: '/admin/kraefte/rollen-definitionen', icon: PiShieldCheck },
      { label: 'Fahrzeugtypen', to: '/admin/kraefte/fahrzeugtypen', icon: PiTruck },
    ],
  },
  {
    group: 'Stammdaten',
    entries: [
      { label: 'Fahrzeuge', to: '/admin/stammdaten/fahrzeuge', icon: PiCar },
      { label: 'Personen', to: '/admin/stammdaten/personen', icon: PiUsers },
    ],
  },
  {
    group: 'Benutzer & Zugang',
    entries: [
      { label: 'Benutzer', to: '/admin/users', icon: PiUsers },
      { label: 'Einladungen', to: '/admin/invites', icon: PiEnvelope },
      { label: 'API-Tokens', to: '/admin/tokens', icon: PiKey },
    ],
  },
  {
    group: 'Konfiguration',
    entries: [
      { label: 'Laufzeit-Konfiguration', to: '/admin/runtime-konfiguration', icon: PiGear },
      { label: 'Erinnerungen', to: '/admin/erinnerungen', icon: PiBell },
      { label: 'Führungsrhythmus', to: '/admin/fuehrungsrhythmus-templates', icon: PiListChecks },
      { label: 'Befehlsgeber-Vorschläge', to: '/admin/befehlsgeber-vorschlaege', icon: PiMegaphone },
    ],
  },
  {
    group: 'Integrationen',
    entries: [
      { label: 'Übersicht', to: '/admin/integrations/', icon: PiPlugs },
      { label: 'HiOrg', to: '/admin/integrations/hiorg', icon: PiArrowsLeftRight },
    ],
  },
];
```

- [ ] **Step 2: Refactor AdminLayout**

Replace the content of `packages/frontend/src/shared/ui/templates/AdminLayout.tsx`. Keep the auth guard logic identical, but replace the header+outlet structure with sidebar+breadcrumbs+outlet.

The key changes:
1. Import `Sidebar`, `SidebarDrawer` from shared organisms
2. Import `Breadcrumbs` from shared molecules
3. Import `adminSidebarItems` from admin config
4. Add mobile drawer state (`useState<boolean>`)
5. Replace header with sidebar layout
6. Add breadcrumb generation from `useRouterState().matches`
7. Add hamburger button for mobile

The auth guard section (checking `authStatus`, `adminSessionStatus`, redirects, setup page skip) must stay exactly as-is. Only the rendering output changes.

The sidebar header should show "Admin Panel" with a gear icon, and the footer should have the close/logout button that was previously in the header.

Breadcrumbs are generated from the route matches: each match that has `meta` with a `title` becomes a breadcrumb item. The first item is always "Admin" pointing to `/admin/dashboard`.

```tsx
// Key structural change in the render return:
// OLD:
//   <div>
//     <header>back-button | title | close-button</header>
//     <Outlet />
//   </div>
//
// NEW:
//   <div className="flex h-screen">
//     {/* Desktop sidebar */}
//     <div className="hidden lg:flex">
//       <Sidebar items={adminSidebarItems} header={...} footer={...} />
//     </div>
//     {/* Mobile drawer */}
//     <SidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} items={adminSidebarItems} header={...} footer={...} />
//     {/* Content */}
//     <div className="flex flex-1 flex-col overflow-auto">
//       <div className="flex items-center gap-3 border-b border-border-primary px-4 py-3 lg:hidden">
//         <button onClick={() => setSidebarOpen(true)}>☰</button>
//         <span>Admin Panel</span>
//       </div>
//       <main className="flex-1 overflow-auto">
//         <Container maxWidth="6xl" className="py-6">
//           <Breadcrumbs items={breadcrumbItems} />
//           <Outlet />
//         </Container>
//       </main>
//     </div>
//   </div>
```

- [ ] **Step 3: Verify manually**

Run: `pnpm --filter @bluelight-hub/frontend dev:vite`
Open: `http://localhost:3090/admin/dashboard`
Verify: Sidebar visible on desktop, breadcrumbs showing, all navigation links work.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/admin/lib/admin-sidebar-config.ts packages/frontend/src/shared/ui/templates/AdminLayout.tsx
git commit -m "✨(frontend): Admin sidebar navigation + breadcrumbs (#596)"
```

---

## Task 5: Route Meta Breadcrumb Labels

**Files:**
- Modify: All route files in `packages/frontend/src/routes/admin/`

**Context:** Each admin route needs a `title` in its meta for breadcrumbs. Some routes already have meta titles (erinnerungen, fuehrungsrhythmus-templates, stammdaten/personen, stammdaten/fahrzeuge). The rest need them added.

- [ ] **Step 1: Add meta titles to all routes missing them**

For each route file, add or update the `meta` property. Pattern:

```ts
// Example: packages/frontend/src/routes/admin/dashboard.tsx
export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
  meta: () => [{ title: 'Dashboard' }],
});
```

Complete list of meta titles to set:

| Route file | Title |
|---|---|
| `dashboard.tsx` | `Dashboard` |
| `users.tsx` | `Benutzerverwaltung` |
| `invites.tsx` | `Einladungen` |
| `tokens.tsx` | `API-Tokens` |
| `runtime-konfiguration.tsx` | `Laufzeit-Konfiguration` |
| `erinnerungen.tsx` | `Erinnerungs-Konfiguration` (already set) |
| `fuehrungsrhythmus-templates.tsx` | `Führungsrhythmus-Templates` (already set) |
| `befehlsgeber-vorschlaege.tsx` | `Befehlsgeber-Vorschläge` |
| `kraefte/qualifikationen.tsx` | `Qualifikationen` |
| `kraefte/rollen-definitionen.tsx` | `Rollen-Definitionen` |
| `kraefte/fahrzeugtypen.tsx` | `Fahrzeugtypen` |
| `stammdaten/personen.tsx` | `Stamm-Personen` (already set) |
| `stammdaten/fahrzeuge.tsx` | `Stamm-Fahrzeuge` (already set) |
| `integrations/index.tsx` | `Integrationsübersicht` |
| `integrations/hiorg.tsx` | `HiOrg-Integration` |

- [ ] **Step 2: Verify breadcrumbs work**

Run dev server and navigate to a nested route like `/admin/kraefte/qualifikationen`.
Expected breadcrumbs: `Admin > Qualifikationen`

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/routes/admin/
git commit -m "✨(frontend): Breadcrumb meta titles für alle Admin-Routen (#596)"
```

---

## Task 6: DataTable Organism

**Files:**
- Create: `packages/frontend/src/shared/ui/organisms/data-table.organism.tsx`
- Create: `packages/frontend/src/shared/ui/organisms/__tests__/data-table.organism.test.tsx`

**Context:** This wraps TanStack Table with search, pagination, bulk actions, loading/error/empty states. It uses the existing `Table.molecule` subcomponents internally and the new `EmptyState` molecule.

- [ ] **Step 1: Write the test**

```tsx
// packages/frontend/src/shared/ui/organisms/__tests__/data-table.organism.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '../data-table.organism';
import { createColumnHelper } from '@tanstack/react-table';
import { PiUsers, PiTrash } from 'react-icons/pi';

interface TestRow {
  id: string;
  name: string;
  role: string;
}

const columnHelper = createColumnHelper<TestRow>();
const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('role', { header: 'Rolle' }),
];

const testData: TestRow[] = [
  { id: '1', name: 'Alice', role: 'Admin' },
  { id: '2', name: 'Bob', role: 'User' },
  { id: '3', name: 'Charlie', role: 'User' },
];

describe('DataTable', () => {
  it('rendert Tabelle mit Daten', () => {
    render(<DataTable columns={columns} data={testData} getRowId={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('rendert Skeleton bei isLoading', () => {
    render(<DataTable columns={columns} data={[]} isLoading getRowId={(r) => r.id} />);
    // TableSkeleton rendert animate-pulse Elemente
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('rendert Error-Alert bei error', () => {
    const handleRetry = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[]}
        error={new Error('Verbindungsfehler')}
        onRetry={handleRetry}
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText(/Verbindungsfehler/)).toBeInTheDocument();
  });

  it('rendert EmptyState wenn keine Daten', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        emptyState={{
          icon: PiUsers,
          title: 'Keine Benutzer',
          description: 'Es gibt noch keine Benutzer.',
          action: { label: 'Anlegen', onClick: vi.fn() },
        }}
      />,
    );
    expect(screen.getByText('Keine Benutzer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeInTheDocument();
  });

  it('filtert Daten bei Suche', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={testData}
        getRowId={(r) => r.id}
        searchable={{ placeholder: 'Suchen...' }}
      />,
    );
    const searchInput = screen.getByPlaceholderText('Suchen...');
    await user.type(searchInput, 'Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('zeigt Pagination-Controls', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      role: 'User',
    }));
    render(
      <DataTable
        columns={columns}
        data={manyRows}
        getRowId={(r) => r.id}
        pagination={{ defaultPageSize: 10 }}
      />,
    );
    // Sollte nur 10 Zeilen anzeigen
    const rows = screen.getAllByRole('row');
    // 1 header row + 10 data rows = 11
    expect(rows.length).toBe(11);
    expect(screen.getByText(/Seite 1/)).toBeInTheDocument();
  });

  it('zeigt Bulk-Actions bei Selektion', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={testData}
        getRowId={(r) => r.id}
        bulkActions={[
          { label: 'Löschen', icon: PiTrash, onClick: handleDelete, variant: 'danger' },
        ]}
      />,
    );
    // Checkbox-Spalte sollte existieren
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Eine Zeile auswählen
    await user.click(checkboxes[1]); // Erste Datenzeile (Index 0 = Header-Checkbox)
    expect(screen.getByText(/1 ausgewählt/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/organisms/__tests__/data-table.organism.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement DataTable component**

```tsx
// packages/frontend/src/shared/ui/organisms/data-table.organism.tsx
import { type ComponentType, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { clsx } from 'clsx';

export interface BulkAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'warning' | 'danger';
}

interface EmptyStateConfig {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  getRowId: (row: TData) => string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  searchable?: { placeholder: string } | false;
  pagination?: { defaultPageSize?: number; pageSizeOptions?: number[] } | false;
  bulkActions?: BulkAction[];
  emptyState?: EmptyStateConfig;
  defaultSorting?: SortingState;
  toolbar?: React.ReactNode;
}

const BULK_VARIANT_STYLES: Record<string, string> = {
  default: 'primary',
  warning: 'warning',
  danger: 'danger',
};

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  isLoading,
  error,
  onRetry,
  searchable,
  pagination,
  bulkActions,
  emptyState,
  defaultSorting = [],
  toolbar,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Prepend checkbox column if bulk actions are configured
  const allColumns = useMemo(() => {
    if (!bulkActions?.length) return columns;

    const selectColumn: ColumnDef<TData, any> = {
      id: '_select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={(checked) => row.toggleSelected(checked)}
        />
      ),
      enableSorting: false,
    };

    return [selectColumn, ...columns];
  }, [columns, bulkActions]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: searchable ? getFilteredRowModel() : undefined,
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: pagination ? { pageSize: pagination.defaultPageSize ?? 10 } : undefined,
    },
  });

  const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
  const hasSelection = selectedIds.length > 0;

  // Error state
  if (error) {
    return (
      <Alert status="error" title="Fehler beim Laden" description={error.message}>
        {onRetry && (
          <Button intent="danger" appearance="outline" size="sm" onClick={onRetry} className="mt-3">
            Erneut versuchen
          </Button>
        )}
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div>
        {(searchable || toolbar) && (
          <div className="mb-4 flex items-center gap-3">
            {searchable && <div className="h-9 w-64 animate-pulse rounded-md bg-surface-raised" />}
            {toolbar && <div className="h-9 flex-1 animate-pulse rounded-md bg-surface-raised" />}
          </div>
        )}
        <Table.Root>
          <Table.Skeleton rows={5} columns={allColumns.length} />
        </Table.Root>
      </div>
    );
  }

  // Empty state
  if (data.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <div>
      {/* Toolbar: Search + Custom Filters + Bulk Actions */}
      {(searchable || toolbar || hasSelection) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder={searchable.placeholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 rounded-md border border-border-primary bg-surface-primary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
          )}
          {toolbar}
          {hasSelection && bulkActions && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-text-muted">{selectedIds.length} ausgewählt</span>
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  intent={(BULK_VARIANT_STYLES[action.variant ?? 'default'] ?? 'primary') as any}
                  appearance="outline"
                  onClick={() => action.onClick(selectedIds)}
                >
                  <action.icon className="mr-1.5 h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <Table.Root>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  sortable={header.column.getCanSort()}
                  sorted={header.column.getIsSorted()}
                  onClick={header.column.getToggleSortingHandler()}
                  className={clsx(header.column.id === '_select' && 'w-10')}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {/* Pagination */}
      {pagination && table.getPageCount() > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-text-muted">
            Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            {pagination.pageSizeOptions && (
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border border-border-primary bg-surface-primary px-2 text-sm"
              >
                {pagination.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} pro Seite
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              appearance="outline"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Zurück
            </Button>
            <Button
              size="sm"
              appearance="outline"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Weiter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/frontend && pnpx vitest run src/shared/ui/organisms/__tests__/data-table.organism.test.tsx --no-coverage`
Expected: 7 tests PASS

- [ ] **Step 5: Export from barrel**

Add to `packages/frontend/src/shared/ui/organisms/index.ts`:
```ts
export { DataTable } from './data-table.organism';
export type { BulkAction } from './data-table.organism';
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/shared/ui/organisms/data-table.organism.tsx packages/frontend/src/shared/ui/organisms/__tests__/data-table.organism.test.tsx packages/frontend/src/shared/ui/organisms/index.ts
git commit -m "✨(frontend): DataTable shared organism mit Suche, Pagination, Bulk-Actions (#596)"
```

---

## Task 7: Dashboard Redesign

**Files:**
- Create: `packages/frontend/src/features/admin/ui/molecules/StatCard.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminDashboard.tsx`

**Context:** Replace the NavCard-based dashboard with KPI stat cards, quick actions, and a status overview. The sidebar now handles navigation, so the dashboard becomes an information hub. The existing API hooks provide the data — we need to add query hooks for counts.

- [ ] **Step 1: Create StatCard molecule**

```tsx
// packages/frontend/src/features/admin/ui/molecules/StatCard.tsx
import type { ComponentType } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, icon: Icon, subtext }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-text-muted" />}
      </div>
      <div className="mt-1 text-2xl font-bold text-text-primary">{value}</div>
      {subtext && <div className="mt-0.5 text-xs text-text-muted">{subtext}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Refactor AdminDashboard**

Rewrite `packages/frontend/src/features/admin/ui/pages/AdminDashboard.tsx`:

1. Remove the `NavCard` component and all NavCard grid sections
2. Add KPI stat cards at the top using data from existing API hooks:
   - Fetch user count, person count, vehicle count, invite count using the existing management hooks
   - Display 4 StatCard components in a responsive grid (4 cols desktop, 2 cols tablet, 1 col mobile)
3. Add Quick Actions section:
   - Row of buttons: "+ Benutzer", "+ Einladung", "+ Fahrzeug", "+ Person"
   - Each opens the corresponding Create dialog (import the existing dialog components)
4. Add Status Overview section:
   - "Kräfte" card showing counts (Qualifikationen, Rollen, Fahrzeugtypen) — clickable to respective page
   - "Integrationen" card showing HiOrg connection status
5. Keep the existing logout button in the dashboard or move to sidebar footer

The page should handle loading states for each KPI individually (show skeleton for StatCard while loading).

- [ ] **Step 3: Verify manually**

Run dev server, open `/admin/dashboard`.
Expected: KPI cards showing counts, Quick Actions row, Status Overview cards. No more NavCard grid.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/admin/ui/molecules/StatCard.tsx packages/frontend/src/features/admin/ui/pages/AdminDashboard.tsx
git commit -m "✨(frontend): Admin Dashboard Redesign mit KPIs und Quick Actions (#596)"
```

---

## Task 8: Migrate UsersTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`

**Context:** The UsersTable currently manages its own TanStack Table instance, filtering, sorting, and loading state. We refactor it to use DataTable. The page-level filters (operative role dropdown, "nur ohne Stammperson" checkbox) move to the DataTable `toolbar` prop.

- [ ] **Step 1: Refactor UsersTable to use DataTable**

The UsersTable currently:
- Creates its own `useReactTable` instance
- Has `columnHelper` with 6 columns (username, role, operativeRole, stammperson, isLocked, actions)
- Has inline loading skeleton
- Has external filter props

After refactor:
- Export only the `columns` definition and a thin wrapper
- Move `useReactTable`, loading, filtering to DataTable
- Pass page-level filters as `toolbar` ReactNode

```tsx
// packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx
// Simplified: define columns + pass to DataTable
// Keep the column definitions (username, role, operativeRole, stammperson, isLocked, actions)
// Remove: useReactTable, sorting state, Table.Root/Header/Body rendering, loading skeleton
// The callbacks (onEdit, onDelete, onUnlock) are passed to DataTable via column cell renderers
```

- [ ] **Step 2: Update AdminUsers page**

Adjust `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`:
- Remove the full-page Spinner loading state — DataTable handles loading
- Remove inline error Alert — DataTable handles errors
- Pass `isLoading`, `error`, `onRetry` to UsersTable/DataTable
- The filter controls (operative role select + checkbox) become the `toolbar` prop
- Add `emptyState` config for users
- Add `searchable` for user search
- Add `bulkActions` if applicable (e.g. bulk delete)

- [ ] **Step 3: Verify**

Run dev server, navigate to `/admin/users`.
Expected: DataTable with search bar, existing filters in toolbar, sortable columns, loading skeleton, empty state if no users.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx
git commit -m "♻️(frontend): UsersTable auf DataTable migrieren (#596)"
```

---

## Task 9: Migrate InviteCodeTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/InviteCodeTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminInvites.tsx`

**Context:** InviteCodeTable currently has its own pagination (`onPageChange`, `currentPage`, `totalPages` props), loading skeleton, and empty state. Replace with DataTable which handles all of this internally via client-side pagination.

- [ ] **Step 1: Refactor InviteCodeTable**

1. Extract column definitions from the current inline rendering. The table currently renders rows via `InviteCodeTableRow` molecule — flatten this into TanStack Table column definitions.
2. Columns: Code (monospace), Status (badge via `InviteStatusBadge`), Label, Ablaufdatum, Nutzung, Ersteller, Aktionen
3. Remove: the skeleton loading, empty state, pagination footer — all handled by DataTable
4. Remove: `onPageChange`, `currentPage`, `totalPages` props — DataTable handles pagination internally

- [ ] **Step 2: Update AdminInvites page**

1. Remove page-level loading/error handling — pass to DataTable
2. Remove pagination state management (`currentPage`, etc.) — DataTable handles it
3. Add `searchable`, `pagination`, `emptyState` config
4. Add `bulkActions` for bulk revoke if appropriate
5. Pass existing `InviteFilters` as `toolbar`

- [ ] **Step 3: Verify**

Run dev server, navigate to `/admin/invites`.
Expected: DataTable with search, pagination, filters, proper empty state.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/InviteCodeTable.tsx packages/frontend/src/features/admin/ui/pages/AdminInvites.tsx
git commit -m "♻️(frontend): InviteCodeTable auf DataTable migrieren (#596)"
```

---

## Task 10: Migrate QualifikationenTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/QualifikationenTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminQualifikationen.tsx`

**Context:** QualifikationenTable has per-row mutation tracking (`updatingId`, `deactivatingId`). This stays as column-level rendering logic — DataTable doesn't need to know about it. The props pass through to cell renderers.

- [ ] **Step 1: Refactor QualifikationenTable**

1. Extract column definitions: abkuerzung, name, kategorie (badge), beschreibung, istAktiv (badge), actions
2. Keep `updatingId`/`deactivatingId` as props — use in the actions column cell renderer to show per-row loading
3. Remove: own loading skeleton, empty state, `useReactTable` instance, sorting state
4. Use DataTable with `searchable`, `emptyState`, `defaultSorting: [{ id: 'name', desc: false }]`

- [ ] **Step 2: Update AdminQualifikationen page**

1. Remove the custom loading skeleton layout (lines 114-146 in current file)
2. Remove the custom error card (lines 149-165)
3. Pass `isLoading`, `error`, `onRetry` through to DataTable
4. Add `emptyState` with `PiCertificate` icon
5. Add `searchable` for searching qualifications
6. Add `bulkActions` for bulk deactivate

- [ ] **Step 3: Verify**

Navigate to `/admin/kraefte/qualifikationen`.
Expected: DataTable with search, skeleton loading, empty state, per-row mutation states preserved.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/QualifikationenTable.tsx packages/frontend/src/features/admin/ui/pages/AdminQualifikationen.tsx
git commit -m "♻️(frontend): QualifikationenTable auf DataTable migrieren (#596)"
```

---

## Task 11: Migrate RollenDefinitionenTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/RollenDefinitionenTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminRollenDefinitionen.tsx`

**Context:** Similar pattern to QualifikationenTable. Has columns for name, beschreibung, istAktiv, actions. May have per-row mutation tracking.

- [ ] **Step 1: Refactor table**

1. Extract column definitions from existing rendering
2. Remove own loading/empty/table rendering
3. Wrap with DataTable, add `searchable`, `emptyState` with `PiShieldCheck` icon

- [ ] **Step 2: Update page**

1. Remove custom loading/error handling
2. Pass through to DataTable props
3. Add empty state config

- [ ] **Step 3: Verify and commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/RollenDefinitionenTable.tsx packages/frontend/src/features/admin/ui/pages/AdminRollenDefinitionen.tsx
git commit -m "♻️(frontend): RollenDefinitionenTable auf DataTable migrieren (#596)"
```

---

## Task 12: Migrate FahrzeugtypenTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/FahrzeugtypenTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminFahrzeugtypen.tsx`

- [ ] **Step 1: Refactor table**

1. Extract column definitions from existing rendering
2. Remove own loading/empty/table rendering
3. Wrap with DataTable, add `searchable`, `emptyState` with `PiTruck` icon

- [ ] **Step 2: Update page**

1. Remove custom loading/error handling
2. Pass through to DataTable props

- [ ] **Step 3: Verify and commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/FahrzeugtypenTable.tsx packages/frontend/src/features/admin/ui/pages/AdminFahrzeugtypen.tsx
git commit -m "♻️(frontend): FahrzeugtypenTable auf DataTable migrieren (#596)"
```

---

## Task 13: Migrate StammFahrzeugeTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/StammFahrzeugeTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminStammFahrzeuge.tsx`

- [ ] **Step 1: Refactor table**

1. Extract column definitions (Kennzeichen, Funkrufname, Typ, Status, Aktionen)
2. Remove own loading/empty/table rendering
3. Wrap with DataTable, add `searchable`, `pagination`, `emptyState` with `PiCar` icon
4. Add `bulkActions` for bulk archive

- [ ] **Step 2: Update page**

1. Remove custom loading/error handling
2. Pass through to DataTable props

- [ ] **Step 3: Verify and commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/StammFahrzeugeTable.tsx packages/frontend/src/features/admin/ui/pages/AdminStammFahrzeuge.tsx
git commit -m "♻️(frontend): StammFahrzeugeTable auf DataTable migrieren (#596)"
```

---

## Task 14: Migrate StammPersonenTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminStammPersonen.tsx`

- [ ] **Step 1: Refactor table**

1. Extract column definitions (Name, Vorname, Qualifikationen, Status, Aktionen)
2. Remove own loading/empty/table rendering
3. Wrap with DataTable, add `searchable`, `pagination`, `emptyState` with `PiUsers` icon
4. Add `bulkActions` for bulk archive

- [ ] **Step 2: Update page**

1. Remove custom loading/error handling
2. Pass through to DataTable props

- [ ] **Step 3: Verify and commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx packages/frontend/src/features/admin/ui/pages/AdminStammPersonen.tsx
git commit -m "♻️(frontend): StammPersonenTable auf DataTable migrieren (#596)"
```

---

## Task 15: Migrate BefehlsgeberVorschlaegeTable to DataTable

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/BefehlsgeberVorschlaegeTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminBefehlsgeberVorschlaege.tsx`

- [ ] **Step 1: Refactor table**

1. Extract column definitions
2. Remove own loading/empty/table rendering
3. Wrap with DataTable, add `searchable`, `emptyState` with `PiMegaphone` icon

- [ ] **Step 2: Update page**

1. Remove custom loading/error handling
2. Pass through to DataTable props

- [ ] **Step 3: Verify and commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/BefehlsgeberVorschlaegeTable.tsx packages/frontend/src/features/admin/ui/pages/AdminBefehlsgeberVorschlaege.tsx
git commit -m "♻️(frontend): BefehlsgeberVorschlaegeTable auf DataTable migrieren (#596)"
```

---

## Task 16: Consistency Pass — Non-Table Pages

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/pages/TokenManagementPage.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminIntegrationOverview.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminRuntimeConfig.tsx`

**Context:** These pages don't have tables but still need consistent loading/error patterns per the spec conventions.

- [ ] **Step 1: Audit each page for pattern violations**

Check each page for:
- Full-page `Spinner` → Replace with appropriate Skeleton layout
- Inconsistent error display → Use `Alert` with retry button for query errors
- Missing empty states → Add where applicable
- Toast usage → Ensure mutations use `toast.success()`/`toast.error()` consistently

- [ ] **Step 2: Fix TokenManagementPage**

The TokenList component likely has its own loading pattern. Ensure it follows:
- Loading: Skeleton cards/list items
- Error: Alert with retry
- Empty: EmptyState with "Noch keine API-Tokens erstellt" + CTA

- [ ] **Step 3: Fix Integration pages**

AdminIntegrationOverview has custom skeleton cards — these can stay (they're already Skeleton-based).
AdminHiOrgIntegration — ensure error/loading consistency.

- [ ] **Step 4: Fix AdminRuntimeConfig**

Ensure loading shows skeleton, errors show Alert.

- [ ] **Step 5: Remove any remaining full-page Spinner patterns**

Search all admin pages for `<Spinner` usage and replace with skeleton patterns:
```bash
cd packages/frontend && grep -r "Spinner" src/features/admin/ui/pages/ --include="*.tsx" -l
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/admin/ui/pages/ packages/frontend/src/features/admin/ui/organisms/
git commit -m "♻️(frontend): Einheitliche Loading/Error-Patterns in allen Admin-Seiten (#596)"
```

---

## Task 17: Cleanup and Final Verification

**Files:**
- Possibly modify: Various admin files for cleanup

- [ ] **Step 1: Remove unused NavCard component**

If the `NavCard` component in `AdminDashboard.tsx` is no longer used anywhere, remove it. Check if it's exported or used elsewhere:
```bash
cd packages/frontend && grep -r "NavCard" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Remove unused AdminDashboardLayout if superseded**

Check if `AdminDashboardLayout.tsx` is still used by any page after the refactor. If not, remove it.

- [ ] **Step 3: Run all frontend tests**

```bash
cd packages/frontend && pnpx vitest run --no-coverage
```

Fix any failures.

- [ ] **Step 4: Run linter**

```bash
pnpm lint
```

Fix any lint issues.

- [ ] **Step 5: Manual smoke test**

Navigate through all admin pages:
1. Dashboard — KPIs, Quick Actions, Status cards
2. Each sidebar link — verify navigation works
3. Breadcrumbs — correct on all pages
4. Tables — search, sort, paginate on each table
5. Mobile view — hamburger menu, drawer sidebar
6. Empty states — verify on at least one table (clear data or mock)
7. Error states — verify by temporarily breaking a request

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "🧹(frontend): Admin Panel UI/UX Redesign Cleanup (#596)"
```
