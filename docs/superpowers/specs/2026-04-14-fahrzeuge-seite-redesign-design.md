# Fahrzeuge-Seite: UI/UX Redesign

**Issue:** #679
**Datum:** 2026-04-14
**Status:** Approved

## Zusammenfassung

Die Fahrzeuge-Verwaltungsseite (`/kräfte/fahrzeuge`) wird von einer redundanten 3-Ebenen-Darstellung (Statistik-Karten + EinsatzResourceWidget + gruppierte Liste) zu einem kompakten Karten-Grid mit Statustableau-Feeling und editierbarem Detail-Panel umgebaut.

## Entscheidungen

| Frage | Entscheidung | Begründung |
|-------|-------------|------------|
| Layout-Pattern | Karten-Grid (Hybrid C) | Statustableau-Feeling, kompakteste Übersicht, FMS-Farbe als Border scanbar |
| Detail-Panel | Editierbar (B) | Weniger Klicks, alle Dropdowns direkt im Panel |
| FMS auf Karte | Direkt änderbar | Schnelle Status-Änderung ohne Panel ist Kern-Workflow |
| Filter/Gruppierung | Tabs (Alle/Im Einsatz/Bereit/Weitere) | Ersetzt feste Sektionen, "Alle" als Default |
| Statistik-Header | 4 kompakte Karten behalten | Schneller Überblick, kein Redundanz mehr ohne Widget |
| EinsatzResourceWidget | Nur aus dieser Seite entfernt | An anderen Stellen (Einsatz-Überblick) bleibt es |
| FahrzeugCard (Dashboard) | Unverändert | Dashboard-Mode-aware, anderer Zweck |
| View-Toggle Grid/Liste | Nicht implementiert | YAGNI, kann als separates Enhancement nachkommen |
| Kennzeichen | Nicht prominent | Unwichtig laut User, nur im Detail-Panel sichtbar |
| Besatzung auf Karte | Nur Anzahl | Detail-Ansicht mit Namen im Panel |

## Seitenaufbau

```
┌─────────────────────────────────────────────────┐
│ Header: "Fahrzeuge"          [+ Fahrzeug hinzufügen] │
├─────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │  12  │ │   5  │ │  18  │ │ 1.5  │           │
│ │Gesamt│ │Einsatz│ │Pers. │ │Ø Bes.│           │
│ └──────┘ └──────┘ └──────┘ └──────┘           │
├─────────────────────────────────────────────────┤
│ [Alle (12)] [Im Einsatz (5)] [Bereit (4)] [Weitere (3)] │
├─────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐             │
│ │▌Florian 1/44  │ │▌Florian 1/46  │             │
│ │ FMS 3  3 Pers.│ │ FMS 4  6 Pers.│             │
│ │ Zugtrupp      │ │ 1. Gruppe     │             │
│ └───────────────┘ └───────────────┘             │
│ ┌───────────────┐ ┌───────────────┐             │
│ │▌Florian 1/83  │ │▌Florian 1/10  │             │
│ │ FMS 2  2 Pers.│ │ FMS 6  0 Pers.│             │
│ │ -             │ │ -             │             │
│ └───────────────┘ └───────────────┘             │
└─────────────────────────────────────────────────┘
```

Bei Klick auf eine Karte öffnet sich das Detail-Panel:

```
                              ┌──────────────────┐
                              │ Florian 1/44   X │
                              ├──────────────────┤
                              │   ┌──────────┐   │
                              │   │  TZ-Bild │   │
                              │   └──────────┘   │
                              │  DA-BH 123       │
                              │  HLF 20          │
                              │  [Zeichen bearb.]│
                              ├──────────────────┤
                              │ FMS-STATUS       │
                              │ [3 - Einsatz ▼]  │
                              │                  │
                              │ EINHEIT          │
                              │ [Zugtrupp    ▼]  │
                              ├──────────────────┤
                              │ BESATZUNG (3)    │
                              │ Max Mustermann GF│
                              │ Anna Schmidt  MA │
                              │ Peter Weber   AT │
                              └──────────────────┘
```

## Neue Komponenten

### 1. `FahrzeugGridCard` (Molecule)

**Pfad:** `packages/frontend/src/features/kraefte/ui/molecules/FahrzeugGridCard.tsx`

Kompakte Karte für das Fahrzeug-Grid.

**Props:**
```typescript
interface FahrzeugGridCardProps {
  fahrzeug: EinsatzFahrzeugDto;
  zeichen?: TaktischesZeichenResponseDto | null;
  einheitName?: string | null;
  onSelect: (fahrzeugId: string) => void;
  onStatusChange: (fahrzeugId: string, newStatus: FmsStatus) => void;
}
```

**Darstellung:**
- `rounded-panel border border-border-subtle bg-surface-panel shadow-panel`
- Farbiger `border-left` (3px) nach FMS-Status via `getStatusBgClasses()`
- `hover:border-border-strong` + `cursor-pointer`
- Zeile 1: TZ-Preview (sm) oder PiTruck-Icon, Funkrufname (font-semibold), FmsStatusBadge (rechts)
- Zeile 2: Besatzungsanzahl (Badge), Einheit-Badge (wenn zugewiesen)
- Klick auf FMS-Badge: `stopPropagation()` + öffnet `FmsStatusDropdown` als Popover
- Klick auf Karte (außerhalb FMS): ruft `onSelect(fahrzeug.id)`

### 2. `FahrzeugDetailPanel` (Organism)

**Pfad:** `packages/frontend/src/features/kraefte/ui/organisms/FahrzeugDetailPanel.tsx`

SlideIn-Panel mit allen editierbaren Feldern.

**Props:**
```typescript
interface FahrzeugDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
  fahrzeug: EinsatzFahrzeugDto;
  zeichen?: TaktischesZeichenResponseDto | null;
  einheiten: Array<{ id: string; name: string; typ: string }>;
  onStatusChange: (fahrzeugId: string, newStatus: FmsStatus) => void;
  onEinheitAssign: (fahrzeugId: string, einheitId: string | null) => void;
  onManageZeichen: (fahrzeugId: string) => void;
}
```

**Aufbau:**
- Nutzt `Dialog.SlideIn` mit `size="md"` und `position="right"`
- **Header:** Funkrufname + Close-Button
- **TZ-Sektion:** `ZeichenPreview` (lg) + Kennzeichen + Fahrzeugtyp + "Zeichen bearbeiten"-Button
- **Editierbare Felder:** `FmsStatusDropdown` + `EinheitZuweisungsDropdown` (beide bestehende Komponenten)
- **Besatzung:** Liste aller zugewiesenen Personen mit Namen (read-only)

### 3. `FahrzeugFilterTabs` (Molecule)

**Pfad:** `packages/frontend/src/features/kraefte/ui/molecules/FahrzeugFilterTabs.tsx`

Filter-Tabs mit Zähler.

**Props:**
```typescript
type FahrzeugFilter = 'alle' | 'einsatz' | 'bereit' | 'andere';

interface FahrzeugFilterTabsProps {
  activeFilter: FahrzeugFilter;
  onFilterChange: (filter: FahrzeugFilter) => void;
  counts: Record<FahrzeugFilter, number>;
}
```

**Darstellung:**
- Horizontal, Pill-Style (aktiv: `bg-surface-panel shadow`, inaktiv: `text-text-secondary hover:bg-action-secondary-hover`)
- Jeder Tab zeigt Label + Zähler in Klammern
- Filterlogik:
  - `alle`: Kein Filter
  - `einsatz`: FMS 3-4
  - `bereit`: FMS 2
  - `andere`: FMS 0-1, 5-9

## Geänderte Dateien

### Route-Datei (Hauptrefaktor)

**Pfad:** `packages/frontend/src/routes/app/einsatz/$einsatzId/kräfte/fahrzeuge.tsx`

Wird zum reinen Orchestrator (wie `TaktischeEinheitenPage`):
- State: `selectedFahrzeugId`, `activeFilter`, `showFahrzeugDialog`, `zeichenPanelFahrzeugId`, `assigningFahrzeugIds`
- Queries: `useEinsatzFahrzeuge`, `useEinsatzEinheiten`, `useEinsatzZeichen`
- Mutations: `useUpdateFmsStatus`, `useAssignFahrzeugZuEinheit`
- Memos: `zeichenByFahrzeug`, `einheitenMap`, `filteredFahrzeuge`, `filterCounts`
- Layout: Header → Stats → FilterTabs → Grid → DetailPanel → Dialoge

**Entfernt:**
- `EinsatzResourceWidget`-Import und -Nutzung
- Gruppierte Sektionen (Im Einsatz / Bereit / Andere)
- Inline-Fahrzeug-Rows mit dupliziertem Markup

## Wiederverwendete Komponenten (unverändert)

- `FmsStatusBadge` — Badge-Anzeige auf der Karte
- `FmsStatusDropdown` — Inline-Dropdown auf Karte + im Panel
- `EinheitZuweisungsDropdown` — Im Detail-Panel
- `ZeichenPreview` — Auf Karte (sm) und im Panel (lg)
- `FahrzeugHinzufuegenDialog` — Wird weiterhin vom Header-Button geöffnet
- `FahrzeugZeichenPanel` — Wird vom Detail-Panel aus geöffnet
- `Dialog.SlideIn` — Basis für das Detail-Panel
- `Button`, `LoadingState`, `ErrorState` — Shared UI

## Grid-Layout

```css
/* Responsive Grid */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```

- Mobile: 1 Spalte
- Tablet: 2 Spalten
- Desktop: 3 Spalten

## Interaktions-Flüsse

### FMS-Status schnell ändern (auf Karte)
1. User klickt FMS-Badge auf Karte
2. `stopPropagation()` verhindert Karten-Klick
3. FmsStatusDropdown erscheint als Popover
4. User wählt neuen Status
5. `useUpdateFmsStatus.mutate()` mit Optimistic Update
6. Badge-Farbe und Border-Left aktualisieren sich sofort

### Detail-Panel öffnen
1. User klickt Karte (außerhalb FMS-Badge)
2. `selectedFahrzeugId` wird gesetzt
3. `FahrzeugDetailPanel` öffnet als SlideIn von rechts
4. Panel zeigt alle Infos + editierbare Dropdowns

### Zeichen bearbeiten (aus Panel)
1. User klickt "Zeichen bearbeiten" im Detail-Panel
2. Detail-Panel schließt sich (nur ein Panel gleichzeitig offen)
3. `FahrzeugZeichenPanel` öffnet sich
4. Nach Schließen des Zeichen-Panels: zurück zum Grid (kein Auto-Reopen des Detail-Panels)

## Abgrenzung

- Kein View-Toggle Grid/Liste (YAGNI)
- Keine Backend-Änderungen
- `FahrzeugCard` (Dashboard) bleibt unverändert
- `EinsatzResourceWidget` bleibt an anderen Stellen
- Fahrzeug-Erfassung (Dialog) ist nicht Teil des Redesigns
- Besatzungsverwaltung bleibt read-only auf dieser Seite
