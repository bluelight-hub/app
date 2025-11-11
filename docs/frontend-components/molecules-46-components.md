# Molecules (46 Components)

Molecules kombinieren Atoms zu wiederverwendbaren Komponenten. Sie sind entweder **Feature-spezifisch** (einsatz, etb, lagekarte) oder **Shared** (übergreifend nutzbar).

## Shared Molecules (14)

### Dialog (`dialog.molecule.tsx`)
**Komplexeste Molecule** mit 4 Varianten:

1. **Base Dialog:** Modal mit Size-Optionen (sm-full), Custom Close Behavior, Headless UI Transitions
2. **Dialog.Confirm:** Bestätigungsdialog mit Icon, Variant (danger/warning/info), Optional Checkbox-Confirmation, Enter-Key Support
3. **Dialog.Alert:** Benachrichtigungsdialog (success/error/warning/info) mit Colored Background
4. **Dialog.SlideIn:** Slide-In-Panel von links/rechts, Backdrop, Close Button

**Sub-Components:** `Dialog.Title`, `Dialog.Body`, `Dialog.Footer`, `Dialog.CloseButton`

**Features:** Headless UI, Keyboard Support, Loading States, Accessibility (Focus Management)

### Tabs (`tabs.molecule.tsx`)
Headless UI TabGroup mit Items-Array (label + content), Dark Mode, Selected State Styling.

### Table (`table.molecule.tsx`)
**Namespace-Export** mit 7 Sub-Components:
- `Table.Root`, `Table.Header`, `Table.Body`, `Table.Row`, `Table.Head`, `Table.Cell`, `Table.Caption`
- **Bonus:** `Table.Skeleton` - Loading State mit konfigurierbaren Rows/Columns

**Features:** Sortable Headers, Hover States, Dark Mode, Responsive Overflow

### SearchInput (`search-input.molecule.tsx`)
Input mit eingebautem Debouncing (@tanstack/pacer), Search Icon, Clear Button.
**Callbacks:** `onChange` (sofort) + `onDebouncedChange` (verzögert für API).

### ColorModeButton (`color-mode-button.molecule.tsx`)
Button mit ColorModeIcon, togglet Color Mode.

### ColorModeMenu (`color-mode-menu.molecule.tsx`)
Headless UI Menu mit 3 Optionen (Light/Dark/System), Icons, Checkmark für aktiven Mode.

### PasswordInput (`password-input.molecule.tsx`)
Input mit Toggle-Button für Sichtbarkeit (Eye-Icon), Optional Strength Indicator Integration.

### PasswordStrengthIndicator (`password-strength-indicator.molecule.tsx`)
Passwort-Stärke-Anzeige mit ProgressBar, Farbcodierung (red-yellow-green), Kriterien-Liste.
**Lazy Variant:** `password-strength-indicator.lazy.tsx` für Code-Splitting.

### PoiTypeDropdown (`poi-type-dropdown.molecule.tsx`)
Headless UI Menu für POI-Type-Auswahl, nutzt PoiTypeButton, Searchable, Icons, Active State.

### LogoWithIndicator (`logo-with-indicator.molecule.tsx`)
Logo mit Optional Badge/Dot für Status-Anzeige (z.B. Offline).

### Timeline (`timeline.molecule.tsx`)
Vertikale Timeline mit Items, Icons, Timestamps, Connected Lines.

### AuthCard (`auth-card.molecule.tsx`)
Card-Wrapper für Auth-Flows (Login/Setup) mit Logo, Heading, Description.

### AuthFooter (`auth-footer.molecule.tsx`)
Footer mit Links (Impressum, Datenschutz, etc.).

---

## Feature-Specific Molecules (32)

### Einsatz (13)
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

### ETB (8)
- **EtbSearchBar:** SearchInput für Einträge
- **EtbFilterControls:** Filter-Controls (Kategorie, Datum, etc.)
- **EtbResultsCount:** Anzeige der Ergebnisanzahl
- **EtbFormActions:** Action-Buttons für Formulare (Save/Cancel)
- **EtbTableHeader:** Table Header mit Sortierung
- **EtbTableBody:** Table Body mit Entries
- **EtbEmptyState:** Empty State für keine Einträge
- **EtbTextbausteinPreview:** Preview für Textbausteine

### Lagekarte (4)
- **LayerToggle:** Toggle für Map-Layer (Online/Offline)
- **OfflineIndicator:** Indikator für Offline-Status
- **SelectedShapeToolbar:** Toolbar für ausgewählte Shapes (Edit/Delete)
- **ShapeContextMenu:** Context Menu für Shapes

### Dashboard (2)
- **StatusCard:** Dashboard-Card mit Statistik
- **MobileStatusBar:** Status-Bar für Mobile

### Admin (1)
- **UserFormFields:** Form-Fields für User-Management

### Auth (1)
- **AuthLoading:** Loading State für Auth-Flows

### Form (3)
- **ColorPicker:** Color Picker mit Preset-Farben
- **RangeSlider:** Slider für Range-Selection
- **FormFieldWrapper:** Generic Wrapper für Form-Fields

---
