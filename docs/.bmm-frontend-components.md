# Frontend Component Inventory - Bluelight Hub

**Generated:** 2025-01-11
**Total Components:** 135+
**Architecture:** Atomic Design (Atoms → Molecules → Organisms → Templates → Pages)
**Design System:** Tailwind CSS + Headless UI + React Icons (Phosphor)

---

## Executive Summary

Die Bluelight-Hub Frontend-Architektur folgt strikt der **Atomic Design Methodik** mit 5 hierarchischen Ebenen. Die Komponenten sind feature-basiert organisiert, nutzen konsequent Tailwind CSS für Styling und Headless UI für accessible Primitives.

### Component Distribution

| Level | Count | Purpose | Reusability |
|-------|-------|---------|-------------|
| **Atoms** | 24 | Basis UI-Elemente (Button, Input, Badge, etc.) | ★★★★★ High |
| **Molecules** | 46 | Komponierte Elemente (Feature-spezifisch & Shared) | ★★★★☆ Medium-High |
| **Organisms** | 52 | Komplexe Module (Feature-complete sections) | ★★☆☆☆ Low-Medium |
| **Templates** | 4 | Page Layouts (Admin, Auth, Einsatz) | ★★★☆☆ Medium |
| **Pages** | 6 | Full Page Components (Route-gebunden) | ★☆☆☆☆ Very Low |
| **UI Layer** | 3 | Framework Wrappers (Headless UI) | ★★★★☆ Medium-High |

### Feature Breakdown (Molecules + Organisms)

| Feature | Molecules | Organisms | Total | Complexity |
|---------|-----------|-----------|-------|-----------|
| **ETB** (Einsatztagebuch) | 8 | 17 | **25** | ★★★★★ |
| **Lagekarte** (Map) | 4 | 16 | **20** | ★★★★★ |
| **Einsatz** (Mission) | 13 | 5 | **18** | ★★★★☆ |
| **Shared** (Reusable) | 14 | 0 | **14** | ★★★☆☆ |
| **Admin** | 1 | 4 | **5** | ★★★☆☆ |
| **Command Palette** | 0 | 6 | **6** | ★★★☆☆ |
| **Dashboard** | 2 | 2 | **4** | ★★☆☆☆ |
| **Auth** | 1 | 2 | **3** | ★★☆☆☆ |
| **Form** (Generic) | 3 | 0 | **3** | ★★★☆☆ |

---

## Design System Foundation

### Technologies
- **CSS Framework:** Tailwind CSS (Utility-First)
- **Accessibility:** Headless UI (@headlessui/react)
- **Icons:** React Icons (Phosphor Icons - `react-icons/pi`)
- **Date Picker:** React DatePicker
- **State Management:** @tanstack/react-store
- **Forms:** @tanstack/react-form + Zod
- **Routing:** @tanstack/react-router
- **Timing:** @tanstack/pacer (Debouncing/Throttling)

### Design Principles
1. **Dark Mode First:** Alle Komponenten unterstützen Light/Dark Mode
2. **Accessibility:** ARIA-Attribute, Keyboard Navigation, Focus Management
3. **Responsive:** Mobile-first mit Breakpoints (sm, md, lg, xl)
4. **Consistent Spacing:** Tailwind Spacing Scale (p-4, gap-3, etc.)
5. **Color Semantic:** Intent-based Colors (primary, danger, warning, success, info)
6. **Type Safety:** TypeScript Interfaces für alle Props

---

## Atoms (24 Components)

### Button Components (5)

#### Button (`button.atom.tsx`)
**Kernkomponente** für alle Interaktionen mit 30+ Varianten.

**Props:**
- `intent`: `'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info'`
- `appearance`: `'filled' | 'outline' | 'ghost' | 'minimal' | 'heavy'`
- `size`: `'sm' | 'md' | 'lg' | 'icon'`
- `fullWidth`: boolean
- `loading`: boolean (zeigt Spinner)
- `kbd`: string (Keyboard Shortcut Display, z.B. "cmd+K")
- `animate`: boolean (Hover-Animationen)

**Features:** Headless UI Integration, Loading States, Keyboard Shortcuts, Dark Mode, 6 Intent × 5 Appearance = 30 Kombinationen

#### IconButton (`icon-button.atom.tsx`)
Button optimiert für Icons, Wrapper um Button mit quadratischem Padding.

#### CloseButton (`close-button.atom.tsx`)
Spezialisiert für Close/Cancel-Aktionen, konsistente X-Icon-Darstellung.

#### CommandTrigger (`command-trigger.atom.tsx`)
Command Palette Trigger mit Search-Icon und "cmd+K" Shortcut Display.

#### ConfirmationPrompt (`confirmation-prompt.atom.tsx`)
Inline Bestätigungs-Prompt mit gelber Warning-Box für destructive Actions.

---

### Form Components (7)

#### Input (`input.atom.tsx`)
Text-Eingabe mit Varianten (default/error), Icon-Support (links/rechts), Focus States.

#### Select (`select.atom.tsx`)
Dropdown mit Custom Caret-Icon, Options-Array, Placeholder Support.

#### Textarea (`textarea.atom.tsx`)
Mehrzeilige Eingabe mit Min-Height pro Size, Resize disabled.

#### Label (`label.atom.tsx`)
Form-Label mit Required-Indikator (roter Stern).

#### FormField (`form-field.atom.tsx`)
Wrapper für Label + Input + Helper/Error Text, vereinfacht Form-Layouts.

#### DateInput (`date-input.atom.tsx`)
**Advanced:** React DatePicker mit NATO DateTime Format, Time Selection, Week Numbers, Locale DE.

#### PoiTypeButton (`poi-type-button.atom.tsx`)
**Domain-Specific:** Button für POI-Type-Auswahl mit Icon, Label, Active State (Blue Glow), Compact Mode.

---

### Display Components (9)

#### Badge (`badge.atom.tsx`)
Status-Labels mit 5 Varianten (default/success/error/warning/info), Optional animierter Dot (Ping-Effekt).

#### Alert (`alert.atom.tsx`)
Benachrichtigungen mit 4 Status-Types, Standard-Icons, Flexibler Content (title/description/children).

#### Spinner (`spinner.atom.tsx`)
**4 Animationsstile:** Wave (10 Elemente), Dots (3 pulsierende Punkte), Ring (rotierend), Pulse (pulsierend).
**Sub-Component:** `InlineSpinner` - optimiert für Inline-Verwendung, erbt currentColor.

#### LoadingState (`LoadingState.tsx`)
Fullscreen oder Container Loading mit Spinner und Message.

#### ErrorState (`ErrorState.tsx`)
Fehleranzeige mit Icon, Title, Description, Back-Link (Router-integriert).

#### Heading (`heading.atom.tsx`)
7 Größen (xs-3xl), 6 Semantic HTML Tags (h1-h6), Dark Mode.

#### Text (`text.atom.tsx`)
5 Größen × 5 Farben = 25 Kombinationen, Semantic HTML (p/span/div).

#### Image (`image.atom.tsx`)
Vordefinierte Größen (xs-xl/auto), Rounded, Shadow, Object-fit contain.

#### ProgressBar (`progress-bar.atom.tsx`)
Fortschrittsbalken mit 5 Varianten, Animation (Headless UI Transition), Percentage Display, Label Support.

---

### Layout Components (2)

#### Card (`card.atom.tsx`)
Container mit Border, Shadow, 5 Padding-Varianten (none-xl), Responsive.

#### Container (`container.atom.tsx`)
Layout-Wrapper mit 11 Max-Width-Optionen (sm-7xl/full), Responsive Padding (px-4, sm:px-6, lg:px-8).

---

### Utility Components (1)

#### ColorModeIcon (`color-mode-icon.atom.tsx`)
**2 Varianten:**
- `ColorModeIcon`: Zeigt gewählten Mode (Sun/Moon/Desktop)
- `ResolvedColorModeIcon`: Zeigt tatsächlichen Mode (nur Sun/Moon)

Hook-basiert (`useColorMode`), automatische Icon-Auswahl.

---

## Molecules (46 Components)

Molecules kombinieren Atoms zu wiederverwendbaren Komponenten. Sie sind entweder **Feature-spezifisch** (einsatz, etb, lagekarte) oder **Shared** (übergreifend nutzbar).

### Shared Molecules (14)

#### Dialog (`dialog.molecule.tsx`)
**Komplexeste Molecule** mit 4 Varianten:

1. **Base Dialog:** Modal mit Size-Optionen (sm-full), Custom Close Behavior, Headless UI Transitions
2. **Dialog.Confirm:** Bestätigungsdialog mit Icon, Variant (danger/warning/info), Optional Checkbox-Confirmation, Enter-Key Support
3. **Dialog.Alert:** Benachrichtigungsdialog (success/error/warning/info) mit Colored Background
4. **Dialog.SlideIn:** Slide-In-Panel von links/rechts, Backdrop, Close Button

**Sub-Components:** `Dialog.Title`, `Dialog.Body`, `Dialog.Footer`, `Dialog.CloseButton`

**Features:** Headless UI, Keyboard Support, Loading States, Accessibility (Focus Management)

#### Tabs (`tabs.molecule.tsx`)
Headless UI TabGroup mit Items-Array (label + content), Dark Mode, Selected State Styling.

#### Table (`table.molecule.tsx`)
**Namespace-Export** mit 7 Sub-Components:
- `Table.Root`, `Table.Header`, `Table.Body`, `Table.Row`, `Table.Head`, `Table.Cell`, `Table.Caption`
- **Bonus:** `Table.Skeleton` - Loading State mit konfigurierbaren Rows/Columns

**Features:** Sortable Headers, Hover States, Dark Mode, Responsive Overflow

#### SearchInput (`search-input.molecule.tsx`)
Input mit eingebautem Debouncing (@tanstack/pacer), Search Icon, Clear Button.
**Callbacks:** `onChange` (sofort) + `onDebouncedChange` (verzögert für API).

#### ColorModeButton (`color-mode-button.molecule.tsx`)
Button mit ColorModeIcon, togglet Color Mode.

#### ColorModeMenu (`color-mode-menu.molecule.tsx`)
Headless UI Menu mit 3 Optionen (Light/Dark/System), Icons, Checkmark für aktiven Mode.

#### PasswordInput (`password-input.molecule.tsx`)
Input mit Toggle-Button für Sichtbarkeit (Eye-Icon), Optional Strength Indicator Integration.

#### PasswordStrengthIndicator (`password-strength-indicator.molecule.tsx`)
Passwort-Stärke-Anzeige mit ProgressBar, Farbcodierung (red-yellow-green), Kriterien-Liste.
**Lazy Variant:** `password-strength-indicator.lazy.tsx` für Code-Splitting.

#### PoiTypeDropdown (`poi-type-dropdown.molecule.tsx`)
Headless UI Menu für POI-Type-Auswahl, nutzt PoiTypeButton, Searchable, Icons, Active State.

#### LogoWithIndicator (`logo-with-indicator.molecule.tsx`)
Logo mit Optional Badge/Dot für Status-Anzeige (z.B. Offline).

#### Timeline (`timeline.molecule.tsx`)
Vertikale Timeline mit Items, Icons, Timestamps, Connected Lines.

#### AuthCard (`auth-card.molecule.tsx`)
Card-Wrapper für Auth-Flows (Login/Setup) mit Logo, Heading, Description.

#### AuthFooter (`auth-footer.molecule.tsx`)
Footer mit Links (Impressum, Datenschutz, etc.).

---

### Feature-Specific Molecules (32)

#### Einsatz (13)
- **EinsatzHeader:** Header mit Titel, Status Badge, Actions
- **EinsatzInfoCard:** Card mit Einsatz-Informationen (Adresse, Zeit, etc.)
- **EinsatzListItem:** List Item für Einsatz-Übersicht, Clickable
- **EinsatzStatsCard:** Statistik-Karte (Anzahl, Dauer, etc.)
- **EinsatzResourceWidget:** Widget für Ressourcen-Anzeige (Fahrzeuge, Personal)
- **EinsatzTimelineWidget:** Timeline-Widget für Einsatz-Events
- **ModuleButton:** Button für Modul-Auswahl (ETB, Lagekarte, etc.)
- **ModuleOverviewCard:** Card mit Modul-Overview
- **PlaceholderModule:** Platzhalter für nicht implementierte Module
- **ArchivedBanner:** Banner für archivierte Einsätze
- **EinsatzStatusBadge:** Badge für Einsatz-Status (aktiv/archiviert)
- **EinsatzCompletenessBar:** ProgressBar für Vollständigkeit
- **EinsatzIncompleteAlert:** Alert für unvollständige Daten

#### ETB (8)
- **EtbSearchBar:** SearchInput für Einträge
- **EtbFilterControls:** Filter-Controls (Kategorie, Datum, etc.)
- **EtbResultsCount:** Anzeige der Ergebnisanzahl
- **EtbFormActions:** Action-Buttons für Formulare (Save/Cancel)
- **EtbTableHeader:** Table Header mit Sortierung
- **EtbTableBody:** Table Body mit Entries
- **EtbEmptyState:** Empty State für keine Einträge
- **EtbTextbausteinPreview:** Preview für Textbausteine

#### Lagekarte (4)
- **LayerToggle:** Toggle für Map-Layer (Online/Offline)
- **OfflineIndicator:** Indikator für Offline-Status
- **SelectedShapeToolbar:** Toolbar für ausgewählte Shapes (Edit/Delete)
- **ShapeContextMenu:** Context Menu für Shapes

#### Dashboard (2)
- **StatusCard:** Dashboard-Card mit Statistik
- **MobileStatusBar:** Status-Bar für Mobile

#### Admin (1)
- **UserFormFields:** Form-Fields für User-Management

#### Auth (1)
- **AuthLoading:** Loading State für Auth-Flows

#### Form (3)
- **ColorPicker:** Color Picker mit Preset-Farben
- **RangeSlider:** Slider für Range-Selection
- **FormFieldWrapper:** Generic Wrapper für Form-Fields

---

## Organisms (52 Components)

Organisms sind komplexe, feature-complete Komponenten mit Business Logic.

### Command Palette (6)
- **CommandPalette:** Hauptkomponente, Headless UI Combobox, Keyboard Navigation
- **CommandPaletteErrorBoundary:** Error Handling
- **CommandBreadcrumb:** Breadcrumb für Navigation-Kontext
- **CommandFooter:** Footer mit Keyboard Hints
- **CommandItem:** Item mit Icon, Label, Keyboard Shortcut
- **SubCommandItem:** Nested Command Item

### Admin (4)
- **UsersTable:** Table mit User-Liste, Actions (Edit/Delete)
- **CreateUserDialog:** Dialog für User-Erstellung mit Form
- **EditUserDialog:** Dialog für User-Bearbeitung
- **ConfirmDeleteDialog:** Confirmation für User-Löschung

### Auth (2)
- **LoginWindow:** Login-Formular mit Validation
- **UnifiedAuthForm:** Unified Form für Login/Signup

### Dashboard (2)
- **FilterPanel:** Filter-Panel mit Controls
- **MobileFilterDialog:** Dialog-Variante für Mobile

### Einsatz (5)
- **EinsatzDashboard:** Haupt-Dashboard mit Overview
- **SingleEinsatzDashboard:** Dashboard für einzelnen Einsatz
- **EinsatzDetailView:** Detail-Ansicht mit allen Informationen
- **EinsatzCreateForm:** Form für Einsatz-Erstellung
- **ArchiveConfirmationModal:** Modal für Archivierung

### ETB (17)
**Höchste Komplexität** - Vollständiges CRUD + History + Versioning

- **EtbEntryList:** Hauptliste mit Einträgen, Filtering, Sorting
- **EtbEntryForm:** Form für Entry-Erstellung/Bearbeitung
- **EditEtbEntryModal:** Modal für Inline-Edit
- **EtbFullscreenView:** Vollbild-Ansicht für Timeline
- **EtbKategorieSelect:** Dropdown für Kategorie-Auswahl
- **EtbTextInput:** Custom Text-Input mit Textbausteine-Support
- **EtbTextbausteinSelect:** Dropdown für Textbausteine
- **EtbEntryDetails:** Detail-Ansicht für Entry
- **EtbHistoryCard:** Card mit History-Informationen
- **EtbHistoryModal:** Modal mit vollständiger History
- **EtbKategorieBadge:** Badge für Kategorie
- **EtbVersionBadge:** Badge für Version
- **EtbTableRowEditable:** Editable Table Row
- **EtbTextCell:** Custom Cell mit Text + Textbausteine
- **ScreenshotLightbox:** Lightbox für Screenshots
- **EtbActionsCell:** Actions-Cell mit Edit/Delete/History
- **useEtbColumns (Hook):** Custom Hook für Table Columns

### Lagekarte (16)
**Zweithöchste Komplexität** - Leaflet Map + Geoman + POI + Drawing

- **LagekarteView:** Haupt-Map-Component mit Leaflet
- **PropertyPanel:** Panel für Shape-Properties
- **PropertyPanelContent:** Content für Property-Bearbeitung
- **FullscreenCloseButton:** Close-Button für Fullscreen
- **MapToolbarToggle:** Toggle für Toolbar-Sichtbarkeit
- **PoiPlacementControl:** Control für POI-Platzierung
- **DrawingToolbar:** Toolbar für Drawing-Tools (Geoman)
- **LagekarteToolbar:** Haupt-Toolbar mit Actions
- **PoiToolbar:** Toolbar für POI-Management
- **ClusteredPoiLayer:** Layer für POI-Clustering
- **DrawingLayer:** Layer für Zeichnungen (Leaflet + Geoman)
- **OfflineTileLayer:** Layer für Offline-Tiles
- **PoiLayer:** Layer für POI-Marker
- **OfflineRegionModal:** Modal für Offline-Region-Download
- **PoiPlacementModal:** Modal für POI-Platzierung mit Form
- **ShapeLabelModal:** Modal für Shape-Label-Bearbeitung

---

## Templates (4)

Templates definieren Page-Layouts mit Slots für Content.

### AdminLayout (`AdminLayout.tsx`)
Layout für Admin-Bereich: Sidebar mit Navigation, Header mit User-Menu, Main-Content-Area.

### AdminDashboardLayout (`AdminDashboardLayout.tsx`)
Spezialisiertes Layout für Admin-Dashboard mit Statistik-Grid.

### AuthLayout (`AuthLayout.tsx`)
Zentriertes Layout für Auth-Flows (Login/Setup) mit AuthCard.

### SingleEinsatzLayout (`SingleEinsatzLayout.tsx`)
Layout für einzelnen Einsatz mit Tabs (Overview, ETB, Lagekarte).

---

## Pages (6)

Pages sind vollständige Route-Components.

### Admin Pages (4)
- **AdminLogin (`admin/auth/AdminLogin.tsx`):** Login für Admin-Bereich
- **AdminSetup (`admin/auth/AdminSetup.tsx`):** Initial Setup für Admin
- **AdminDashboard (`admin/dashboard/page.tsx`):** Admin-Dashboard
- **AdminUsers (`admin/settings/AdminUsers.tsx`):** User-Management

### App Pages (1)
- **EtbPage (`app/einsatz/EtbPage.tsx`):** ETB-Hauptseite

### Index (1)
- **IndexPage (`index.page.tsx`):** Landing Page / Redirect

---

## UI Layer (3)

Framework Wrappers für Headless UI und Theme Management.

### ColorMode (`color-mode.tsx`)
Provider und Hook für Color Mode Management (light/dark/system), Persisted in LocalStorage.

### Combobox (`combobox.tsx`)
Wrapper um Headless UI Combobox mit Custom Styling.

### Provider (`provider.tsx`)
Root Provider mit ColorModeProvider, TanStack Router, TanStack Query.

---

## Component Patterns & Best Practices

### TypeScript Interfaces
Alle Komponenten haben explizite Props-Interfaces mit JSDoc-Dokumentation.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info';
  appearance?: 'filled' | 'outline' | 'ghost' | 'minimal' | 'heavy';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  kbd?: string;
  animate?: boolean;
  children: React.ReactNode;
}
```

### Tailwind CSS Patterns
- **cn() Utility:** Alle Komponenten nutzen `cn()` für Class Merging (clsx + tailwind-merge)
- **Dark Mode:** `dark:` Prefix für alle Dark Mode Styles
- **Responsive:** Mobile-First mit Breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Intent-Based:** Semantic Colors statt hardcoded Colors

### Component Composition
- **Compound Components:** Dialog, Table nutzen Compound Component Pattern
- **Render Props:** Headless UI Components (Tab, Menu, etc.)
- **Slots:** Templates definieren Slots für Content-Injection

### State Management
- **Local State:** useState/useReducer für Component-Internal State
- **Global State:** @tanstack/react-store für übergreifenden State
- **Server State:** @tanstack/react-query für API-Daten

### Forms
- **TanStack Form:** Alle Forms nutzen @tanstack/react-form
- **Validation:** Zod Schemas für Type-Safe Validation
- **Error Handling:** Einheitliche Error-Anzeige mit FormField-Komponente

---

## Reusability Analysis

### Highly Reusable (24 Components)
**Atoms** - Können in jedem Kontext verwendet werden:
Button, Input, Badge, Card, Alert, Spinner, Heading, Text, Label, Select, Textarea, etc.

### Medium Reusable (20 Components)
**Shared Molecules + Templates** - Feature-übergreifend nutzbar:
Dialog, Table, Tabs, SearchInput, Timeline, AuthCard, Layouts

### Domain-Specific (58 Components)
**Feature Molecules + Organisms** - An spezifische Features gebunden:
ETB (25), Lagekarte (20), Einsatz (13)

### Page-Specific (6 Components)
**Pages** - Route-gebunden, nicht wiederverwendbar

---

## Key Architectural Insights

### ✅ Strengths

1. **Consistent Design System:** Alle Komponenten folgen einheitlichen Patterns
2. **Accessibility First:** Headless UI garantiert WCAG-Konformität
3. **Dark Mode Throughout:** Vollständige Dark Mode Unterstützung
4. **Type Safety:** TypeScript Interfaces für alle Props
5. **Atomic Design Adherence:** Klare Hierarchie eingehalten
6. **Feature Segregation:** Domain-Komponenten sauber getrennt
7. **Compound Patterns:** Flexible Composition durch Compound Components

### 🔄 Patterns to Note

1. **Intent-Based Styling:** Semantic Colors (primary/danger/success) statt direkter Farben
2. **Size Variants:** Konsistente Sizing (sm/md/lg) über alle Komponenten
3. **Loading States:** Einheitliche Loading-Patterns mit Spinner
4. **Error States:** Konsistente Error-Darstellung (ErrorState, FormField-Errors)
5. **Empty States:** Dedicated Empty State Komponenten (EtbEmptyState, etc.)

### 📊 Complexity Distribution

| Complexity | Components | Examples |
|-----------|-----------|----------|
| **Very Low** | 24 | Atoms (Button, Input, etc.) |
| **Low** | 14 | Shared Molecules (Dialog, Tabs) |
| **Medium** | 20 | Feature Molecules (EinsatzHeader, EtbSearchBar) |
| **High** | 35 | Feature Organisms (EtbEntryList, LagekarteView) |
| **Very High** | 10 | Complex Organisms (ETB Fullscreen, Lagekarte Drawing) |

---

## Usage Recommendations

### Starting Point for New Features
1. **Atoms:** Nutze existierende Atoms (Button, Input, Card)
2. **Shared Molecules:** Dialog, Table, SearchInput für Standard-Patterns
3. **Templates:** AdminLayout oder AuthLayout als Basis
4. **Feature-Specific:** Erstelle neue Molecules/Organisms im Feature-Ordner

### Component Selection Guide

**Need a Button?**
- Simple Action → `Button`
- Icon-Only → `IconButton`
- Close/Cancel → `CloseButton`
- Command Palette → `CommandTrigger`
- POI Selection → `PoiTypeButton`

**Need User Input?**
- Text → `Input`
- Multi-Line → `Textarea`
- Dropdown → `Select`
- Search → `SearchInput`
- Date/Time → `DateInput`
- Password → `PasswordInput`
- Color → `ColorPicker`

**Need Feedback?**
- Success/Error → `Alert` oder `Dialog.Alert`
- Loading → `LoadingState` oder `Spinner`
- Confirmation → `Dialog.Confirm` oder `ConfirmationPrompt`
- Empty Data → Create custom `EmptyState`

**Need Data Display?**
- List → `Table`
- Status → `Badge`
- Progress → `ProgressBar`
- Timeline → `Timeline`

**Need Layout?**
- Page → `AdminLayout` / `AuthLayout` / `SingleEinsatzLayout`
- Container → `Container`
- Card → `Card`

---

## Component Inventory Complete

**Total Components Documented:** 135+
**Atomic Levels:** 5 (Atoms, Molecules, Organisms, Templates, Pages)
**Features Covered:** 9 (ETB, Lagekarte, Einsatz, Admin, Auth, Dashboard, Command Palette, Form, Shared)

**Documentation Status:** ✅ Complete
**Next Steps:** Maintain this document when adding/modifying components
