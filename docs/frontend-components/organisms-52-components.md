# Organisms (52 Components)

Organisms sind komplexe, feature-complete Komponenten mit Business Logic.

## Command Palette (6)
- **CommandPalette:** Hauptkomponente, Headless UI Combobox, Keyboard Navigation
- **CommandPaletteErrorBoundary:** Error Handling
- **CommandBreadcrumb:** Breadcrumb für Navigation-Kontext
- **CommandFooter:** Footer mit Keyboard Hints
- **CommandItem:** Item mit Icon, Label, Keyboard Shortcut
- **SubCommandItem:** Nested Command Item

## Admin (4)
- **UsersTable:** Table mit User-Liste, Actions (Edit/Delete)
- **CreateUserDialog:** Dialog für User-Erstellung mit Form
- **EditUserDialog:** Dialog für User-Bearbeitung
- **ConfirmDeleteDialog:** Confirmation für User-Löschung

## Auth (2)
- **LoginWindow:** Login-Formular mit Validation
- **UnifiedAuthForm:** Unified Form für Login/Signup

## Dashboard (2)
- **FilterPanel:** Filter-Panel mit Controls
- **MobileFilterDialog:** Dialog-Variante für Mobile

## Einsatz (5)
- **EinsatzDashboard:** Haupt-Dashboard mit Overview
- **SingleEinsatzDashboard:** Dashboard für einzelnen Einsatz
- **EinsatzDetailView:** Detail-Ansicht mit allen Informationen
- **EinsatzCreateForm:** Form für Einsatz-Erstellung
- **ArchiveConfirmationModal:** Modal für Archivierung

## ETB (17)
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

## Lagekarte (16)
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
