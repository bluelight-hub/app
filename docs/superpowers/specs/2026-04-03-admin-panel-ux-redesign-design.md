# Admin Panel UI/UX Redesign — Design Spec

**Issue:** #596
**Datum:** 2026-04-03
**Scope:** Rein Frontend, kein Backend-Umbau

## Ziel

Das Admin Panel UI/UX grundlegend überarbeiten: persistente Navigation, konsistente Patterns, verbesserte Datenansichten und ein informatives Dashboard.

## Akzeptanzkriterien (aus Issue #596)

- [x] Persistente Seitennavigation (Sidebar) mit visueller Gruppierung der Admin-Bereiche
- [x] Breadcrumb-Navigation auf allen verschachtelten Seiten
- [x] Einheitliches Lade-Pattern (Skeleton vs. Spinner) über alle Admin-Seiten
- [x] Einheitliches Error-Handling-Pattern (Toast vs. Inline-Alert Konvention)
- [x] Such- und Filterfunktion für alle Tabellen mit >10 Einträgen
- [x] Empty States mit hilfreicher Beschreibung und CTA auf allen Listenseiten
- [x] Dashboard-Redesign mit thematischer Gruppierung und Quick-Actions
- [x] Responsive Verbesserungen (Desktop-optimiert, Tablet-funktional)

## Designentscheidungen

| Entscheidung | Gewählt | Alternativen verworfen |
|---|---|---|
| Navigation | Fixe Sidebar (240px) | Einklappbare Sidebar, Top Navigation |
| Sidebar-Architektur | Shared Component (`shared/ui/`) | Admin-only in `features/admin/` |
| Dashboard | KPI-Karten + Quick Actions + Statusübersicht | Nav-Karten ohne KPIs |
| Tabellen | DataTable-Wrapper mit Search + Filter + Pagination + Bulk Actions | Bestehende Tabellen erweitern |
| Responsive (Sidebar) | Drawer-Overlay auf `<lg` | Icon-only-Rail, Top-Bar |
| Loading-Pattern | Skeletons für Queries, Button-Loading für Mutations | Gemischte Spinner/Skeleton |
| Error-Pattern | Inline Alert für Queries, Toast für Mutations | Einheitlich Toast/Alert |
| Ansatz | Neue Shared Components + Extend Existing | Alles in Admin, Design-System-First |

## 1. Sidebar-Komponente

**Datei:** `shared/ui/organisms/sidebar.organism.tsx`

### API

```tsx
type SidebarItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
};

type SidebarGroup = {
  group?: string; // undefined = keine Gruppenüberschrift
  entries: SidebarItem[];
};

type SidebarProps = {
  items: SidebarGroup[];
  header: ReactNode;
  footer?: ReactNode;
  variant?: 'dark' | 'light'; // default: 'dark'
};
```

### Verhalten

- **Desktop (`>=lg`):** Fix sichtbar, 240px breit, scrollbar bei vielen Items
- **Tablet/Mobile (`<lg`):** Drawer-Overlay via Hamburger-Button im Header, Backdrop zum Schließen
- **Active State:** Highlight des aktuellen Items via TanStack Router `useMatchRoute()`
- **Gruppen:** Uppercase-Label als Separator, immer offen (kein Accordion)
- **Styling:** Dark-Sidebar als Default (`variant="dark"`), Light-Variante für späteren App-Einsatz

### Wiederverwendbarkeit

Die Komponente ist generisch und enthält keinen Admin-spezifischen Code. Die Admin-Navigation wird als Konfiguration in `features/admin/` definiert und an die Sidebar übergeben. Gleiche Komponente kann später die App-Navigation (`WorkspaceShell` / `ModuleRail`) ablösen.

### Admin-Sidebar-Gruppierung

| Gruppe | Items |
|--------|-------|
| *(kein Label)* | Dashboard |
| **Kräfte** | Qualifikationen, Rollen, Fahrzeugtypen |
| **Stammdaten** | Fahrzeuge, Personen |
| **Benutzer & Zugang** | Benutzer, Einladungen, API-Tokens |
| **Konfiguration** | Laufzeit-Konfiguration, Erinnerungen, Führungsrhythmus-Templates, Befehlsgeber-Vorschläge |
| **Integrationen** | Übersicht, HiOrg |

## 2. Breadcrumbs-Komponente

**Datei:** `shared/ui/molecules/breadcrumbs.molecule.tsx`

### API

```tsx
type BreadcrumbItem = {
  label: string;
  to?: string; // letztes Item ohne Link
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};
```

### Verhalten

- Separator: Chevron-Right Icon
- Letztes Item ist plain text, vorherige Items sind klickbare Links
- Platzierung: Oberhalb des Seitentitels im Content-Bereich
- Responsive: Bei langen Pfaden werden mittlere Items auf Mobile zu `...` collapsed
- Automatische Generierung aus Route-Meta — jede Admin-Route definiert ein `breadcrumb`-Label in ihrer Meta-Daten

### Integration

Das `AdminLayout` liest die Route-Hierarchie aus und baut die Breadcrumbs automatisch auf. Kein manuelles Setzen pro Seite nötig.

## 3. DataTable-Komponente

**Datei:** `shared/ui/organisms/data-table.organism.tsx`

### API

```tsx
type BulkAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'warning' | 'danger';
};

type EmptyStateConfig = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  searchable?: { placeholder: string } | false;
  pagination?: { defaultPageSize?: number; pageSizeOptions?: number[] } | false;
  bulkActions?: BulkAction[];
  emptyState?: EmptyStateConfig;
};
```

### Aufbau

Von oben nach unten:
1. **Suchleiste** — Text-Input, filtert client-side über alle sichtbaren Spalten via TanStack Table `getFilteredRowModel()`
2. **Bulk-Action-Leiste** — Erscheint wenn `selectedRows.length > 0`: "3 ausgewählt — [Deaktivieren] [Löschen]"
3. **Tabelle** — Bestehende `Table.molecule` Bestandteile (TableRoot, TableHeader, TableBody, etc.)
4. **Pagination** — Previous/Next + Seiteninfo + Page-Size-Selector (10/25/50)

### Zustände

| Zustand | Rendering |
|---------|-----------|
| `isLoading=true` | `Table.Skeleton` (Pulse-Platzhalter) |
| `error` vorhanden | `Alert` mit Retry-Button |
| `data.length === 0` | `EmptyState`-Komponente |
| Normal | Tabelle mit Daten |

### Bulk-Aktionen

- Checkbox-Spalte wird automatisch eingefügt wenn `bulkActions` übergeben wird
- Header-Checkbox für "Alle auf aktueller Seite auswählen / abwählen"
- Aktionsleiste über der Tabelle zeigt Anzahl selektierter Items + Action-Buttons

### Migration bestehender Tabellen

Die 8 bestehenden Admin-Tabellen (UsersTable, InviteCodeTable, QualifikationenTable, RollenDefinitionenTable, FahrzeugtypenTable, StammFahrzeugeTable, StammPersonenTable, BefehlsgeberVorschlaegeTable) werden refactored: Sie definieren nur noch `columns` + Page-spezifische Filter und übergeben alles an `DataTable`. Eigene Loading/Error/Empty-Logik entfällt.

## 4. EmptyState-Komponente

**Datei:** `shared/ui/molecules/empty-state.molecule.tsx`

### API

```tsx
type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};
```

### Styling

- Zentriert, `min-height` für Sichtbarkeit
- Icon: 48px, muted Farbe (`text-muted`)
- Titel: `font-medium`
- Beschreibung: `text-muted`, kleiner
- CTA: Primary-Button
- Optional: Sekundärer Text-Button

Ersetzt die aktuellen inline dashed-border Empty States.

## 5. Dashboard-Redesign

**Datei:** `features/admin/ui/pages/AdminDashboard.tsx` (Refactor)

### Aufbau

1. **KPI-Karten** — Reihe mit 4 `StatCard`-Molekülen:
   - Benutzer (Anzahl, optional Subtext falls API Aktivitätsdaten liefert)
   - Personen (Anzahl)
   - Fahrzeuge (Anzahl)
   - Offene Einladungen (Anzahl + Anzahl ausstehender)
   - Daten aus bestehenden API-Hooks — Subtexte nur anzeigen wenn Daten verfügbar

2. **Quick Actions** — Button-Reihe:
   - "+ Benutzer anlegen", "+ Einladung erstellen", "+ Fahrzeug anlegen", "+ Person anlegen"
   - Jeder Button öffnet den jeweiligen Create-Dialog direkt

3. **Statusübersicht** — 2-spaltige Cards:
   - **Kräfte:** "8 Qualifikationen · 5 Rollen · 4 Fahrzeugtypen" — klickbar zur jeweiligen Seite
   - **Integrationen:** Status-Anzeige ("● HiOrg verbunden" / "○ Nicht konfiguriert")

### Neue Subkomponenten

- `StatCard.molecule.tsx` in `features/admin/ui/molecules/` — Props: `label`, `value`, `subtext?`, `icon?`
- Quick Actions und Statusübersicht direkt in der Dashboard-Page

### Entfällt

Die bisherigen `NavCard`-Karten als Navigations-Hub entfallen — die Sidebar übernimmt die Navigation.

## 6. AdminLayout Refactor

**Datei:** `shared/ui/templates/AdminLayout.tsx` (Refactor)

### Neues Layout

```
┌──────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────┐ │
│ │          │ │ [☰] Breadcrumbs             │ │
│ │ Sidebar  │ │ Seitentitel    [+ Erstellen]│ │
│ │ (fixed)  │ │                             │ │
│ │          │ │ <Outlet />                  │ │
│ │          │ │                             │ │
│ └──────────┘ └─────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- Sidebar links (240px fix), Content rechts mit Breadcrumbs + Outlet
- Mobile: Hamburger-Button `[☰]` oben links öffnet Sidebar als Drawer
- Breadcrumbs automatisch aus Route-Hierarchie
- Alter Zurück-Button entfällt — Breadcrumbs und Sidebar übernehmen Navigation
- Close-Button (X) für Tauri bleibt im Sidebar-Header oder Content-Header

## 7. Konsistenz-Konventionen

Verbindlich für alle Admin-Seiten nach dem Redesign:

| Situation | Pattern |
|-----------|---------|
| Seite lädt initial (Query pending) | Skeleton via DataTable `isLoading` Prop |
| Mutation läuft (Create/Update/Delete) | Button `loading` State |
| Mutation erfolgreich | `toast.success('...')` via Sonner |
| Mutation fehlgeschlagen | `toast.error('...')` via Sonner |
| Query fehlgeschlagen | Inline `Alert` mit Retry-Button |
| Auth-Fehler | Redirect zu `/admin-login` (bleibt) |
| Leere Liste | `EmptyState`-Komponente mit CTA |

## 8. Responsive Verhalten

| Breakpoint | Sidebar | Content |
|-----------|---------|---------|
| `>=lg` (1024px) | Fix sichtbar, 240px | `margin-left: 240px` |
| `<lg` | Versteckt, Drawer via Hamburger | Volle Breite |

- Tabellen: Horizontaler Scroll auf kleinen Screens (bestehend)
- KPI-Karten: 4-spaltig → 2-spaltig auf Tablet → 1-spaltig auf Mobile
- Quick Actions: Wrap auf kleinere Screens

## Abgrenzung

- **Kein Backend-Umbau:** Bestehende API-Endpunkte bleiben unverändert
- **Kein Dialog-Refactor:** Die 32+ Dialoge behalten ihr per-component State-Management
- **Keine neuen Features:** Rein UI/UX-Überarbeitung bestehender Funktionalität
- **Keine Rechteänderung:** Admin-Rollen (SUPER_ADMIN, ADMIN, SUPPORT) bleiben
- **Pagination nur Client-side:** Kein Backend-Paging

## Betroffene Dateien

### Neue Dateien
- `shared/ui/organisms/sidebar.organism.tsx`
- `shared/ui/organisms/data-table.organism.tsx`
- `shared/ui/molecules/breadcrumbs.molecule.tsx`
- `shared/ui/molecules/empty-state.molecule.tsx`
- `features/admin/ui/molecules/StatCard.tsx`
- `features/admin/lib/admin-sidebar-config.ts` (Sidebar-Items-Definition)

### Refactored Dateien
- `shared/ui/templates/AdminLayout.tsx` — Sidebar + Breadcrumbs integrieren
- `features/admin/ui/pages/AdminDashboard.tsx` — KPIs + Quick Actions statt Nav-Karten
- `features/admin/ui/organisms/UsersTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/InviteCodeTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/QualifikationenTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/RollenDefinitionenTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/FahrzeugtypenTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/StammFahrzeugeTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/StammPersonenTable.tsx` → DataTable nutzen
- `features/admin/ui/organisms/BefehlsgeberVorschlaegeTable.tsx` → DataTable nutzen
- Alle 14 Admin-Pages — Loading/Error-Pattern vereinheitlichen
- Route-Definitionen in `routes/admin/` — Breadcrumb-Meta hinzufügen

### Unverändert
- Alle 32+ Dialog-Komponenten
- Alle API-Hooks
- Backend
- `shared/client/` (generierter API-Client)
