# Ring-3 Komponenten-Vertrag

> **Generiert:** 2026-04-17
> **Gültig ab:** Alpha 1.0.0-alpha.102
> **Quelle:** [`packages/frontend/src/shared/ui/`](../../packages/frontend/src/shared/ui/)

## Zweck

Ring 3 dokumentiert die sichtbaren Bausteine, mit denen Fachflächen gebaut werden. Er legt fest, **welche Komponenten existieren**, **wie sie heißen**, **welche Varianten sie anbieten** und **welche Regeln für Accessibility, Tests und Erweiterung gelten**.

Ring 3 setzt Ring 1 (Tokens) und Ring 2 (Shell-Struktur) voraus. Einzelheiten siehe [`00-design-system-overview.md`](./00-design-system-overview.md).

## Atomic Design

Die `shared/ui`-Schicht folgt der Atomic-Design-Pyramide. Feature-Code liegt nicht in `shared/ui`, sondern unter `packages/frontend/src/features/*/ui/`.

```
shared/ui/
├── atoms/        (46) — atomare UI-Primitive
├── molecules/    (30) — funktionale Kombinationen aus Atoms
├── organisms/    (22) — zusammengesetzte, domain-neutrale Flächen
├── templates/    (7)  — Shell-Layouts (Seitenrahmen)
├── headless/          — Headless-UI-Wrapper (z. B. Combobox)
├── hooks/             — UI-nahe Hooks (z. B. use-inline-confirmation)
├── cn.ts              — clsx + tailwind-merge Utility
├── module-colors.ts   — Modul-Farbzuordnung
└── timeBasedBackground.ts
```

**Regel:** Eine Komponente gehört in die niedrigste Ebene, auf der sie fachneutral funktioniert. Fachspezifisches bleibt im Feature.

## Namens- und Datei-Konventionen

| Ebene | Datei | Export | Test |
| --- | --- | --- | --- |
| Atom | `button.atom.tsx` | `Button` | `button.atom.spec.tsx` oder `__tests__/button.spec.tsx` |
| Molecule | `dialog.molecule.tsx` | `Dialog` (mit `Dialog.Confirm`, `Dialog.Alert`, `Dialog.SlideIn`) | `__tests__/dialog.spec.tsx` |
| Organism | `data-table.organism.tsx` | `DataTable` | `__tests__/data-table.spec.tsx` |
| Template | `AuthLayout.tsx` | `AuthLayout` | `__tests__/AuthLayout.spec.tsx` |
| Hook | `use-inline-confirmation.ts` | `useInlineConfirmation` | `__tests__/use-inline-confirmation.spec.ts` |

### Code-Konventionen

- Props als TypeScript-Interface, nicht als Type-Alias
- `React.memo` für Atoms und kleine Molecules
- `React.forwardRef` für alle Inputs, Buttons, Textareas (DOM-Ref muss erreichbar sein)
- `displayName` explizit setzen (bessere DevTools)
- Tailwind-Klassen immer über `cn()` zusammenführen (`clsx` + `tailwind-merge`)
- Design-Tokens werden über semantische Utility-Klassen konsumiert (`bg-surface-panel`, `text-text-primary`), nicht über rohe Farbwerte oder `--ring-1-*`-Variablen direkt

## Atom-Katalog

Atome sind die kleinste sichtbare Einheit. Sie haben eine klare Variant-API und keine Abhängigkeit zu einem anderen Atom (außer `cn.ts` und ggf. `spinner.atom.tsx` für Loading-States).

### Eingabe und Formular

| Komponente | Zweck | Kern-Props |
| --- | --- | --- |
| `Input` | Text-Input | `variant: default/error/inline` · `inputSize: sm/md/lg` · `leftIcon` · `rightElement` · `fullWidth` |
| `Textarea` | Mehrzeilige Eingabe | `variant` · `rows` · Auto-Grow optional |
| `Checkbox` | Headless-UI-Checkbox mit Label | `checked` · `onChange` · `disabled` · `label` |
| `RadioGroup` | Radio-Button-Gruppe | `options` · `value` · `onChange` |
| `Select` | Native `<select>`-Wrapper | `options` · `value` · `onChange` |
| `DateInput` | Datums-Eingabe | `value` · `min` · `max` |
| `Label` | Form-Label mit Pflicht-Marker | `required` · `htmlFor` |
| `FormField` | Wrapper: Label + Input + Fehler | `label` · `error` · `helperText` |
| `Switch` | Toggle-Switch (Headless UI) | `checked` · `onChange` · `size` |

### Aktion

| Komponente | Zweck | Kern-Props |
| --- | --- | --- |
| `Button` | Haupt-Button | `intent: primary/secondary/danger/warning/success/info` · `appearance: filled/outline/ghost/minimal/heavy` · `size: sm/md/lg/icon` · `loading` · `kbd` · `fullWidth` · `animate` |
| `IconButton` | Icon-only Button | `icon` · `size` · `intent` · `label` (a11y-Pflicht) |
| `CloseButton` | X-Button für Dialoge/Overlays | `size` · `appearance` |
| `CommandTrigger` | Öffnet die Command-Palette | `kbd` |
| `ModuleOverviewButton` | Shell-Button zur Modulübersicht | — |
| `PoiTypeButton` | POI-Typ-Auswahl in der Lagekarte | `type` · `selected` |

### Status und Feedback

| Komponente | Zweck | Kern-Props |
| --- | --- | --- |
| `Badge` | Status-Label | `variant: default/success/error/warning/info` · `size` · `dot` · `dotColor` |
| `Alert` | Infobox | `status: info/warning/error/success` · `title` · `description` · automatischer `role="alert"` bei Error |
| `ProgressBar` | Fortschritt | `value` · `max` · `label` |
| `Spinner` | Lade-Indikator | `size` · `fullPage` (auch als `InlineSpinner`) |
| `Skeleton` | Platzhalter-Flächen | `width` · `height` · `rounded` |
| `ErrorState` | Fehler-Fläche für Seiten/Panels | `title` · `description` · `action` |
| `LoadingState` | Lade-Fläche mit Text | `message` |
| `ConfirmationPrompt` | Inline-Bestätigung | `onConfirm` · `onCancel` |
| `InlineConfirmation` | Zweistufige Inline-Bestätigung | `trigger` · `confirmLabel` |
| `ComingSoon` | „Demnächst"-Platzhalter | — |

### Layout und Struktur

| Komponente | Zweck |
| --- | --- |
| `Card` | Generische Karte |
| `Container` | Max-Width-Container |
| `Heading` | `<h1>` bis `<h6>` mit Token-Größen |
| `Text` | `<p>/<span>/<div>` mit Token-Farben |
| `Image` | Bild-Wrapper |

### Overlay und Navigation

| Komponente | Zweck | Kern-Props |
| --- | --- | --- |
| `Tooltip` | Hover-Tooltip | `content` · `placement` |
| `DynamicLink` | Adaptiver Link (intern/extern) | `href` |
| `ColorModeIcon` | Icon für Light/Dark/System | `mode` |

## Molecule-Katalog

Molecules kombinieren Atoms zu funktionalen Einheiten. Sie haben eine klare Aufgabe, bleiben aber domain-neutral.

### Dialoge und Overlays

| Komponente | Zweck | Varianten |
| --- | --- | --- |
| `Dialog` | Basis-Modal auf Headless UI | `size: sm/md/lg/xl/full` · `closeOnEscape` · `closeOnClickOutside` · `initialFocus` |
| `Dialog.Confirm` | Bestätigungsdialog | `variant: danger/warning/info` · `requireConfirmation` · `isProcessing` |
| `Dialog.Alert` | Benachrichtigungs-Dialog | `variant: success/error/warning/info` · Enter/Space schließen |
| `Dialog.SlideIn` | Seitlich einfahrendes Panel | `position: left/right` · `showCloseButton` · `closeOnBackdropClick` |

**Subkomponenten:** `Dialog.Title`, `Dialog.Body`, `Dialog.Footer`, `Dialog.CloseButton`.

### Formular

| Komponente | Zweck |
| --- | --- |
| `FormFieldWrapper` | Label + Input + Fehler + HelperText |
| `AddressInput` | Adressblock mit Länder-Auswahl |
| `ColorPicker` | Farbauswahl |
| `RangeSlider` | Min/Max-Slider |
| `SearchInput` | Suchfeld mit Icon |
| `PasswordInput` | Passwort mit Show/Hide |
| `PasswordStrengthIndicator` | Passwort-Stärke-Meter (+ `.lazy`-Variante) |
| `PoiTypeDropdown` | POI-Typ-Auswahl |

### Aktion

| Komponente | Zweck |
| --- | --- |
| `ConfirmButton` | Button mit optionalem Inline-Confirm |
| `CopyButton` | Copy-to-Clipboard mit Feedback |
| `ColorModeButton` | Light/Dark-Toggle |
| `ColorModeMenu` | Menü mit Mode-Optionen |

### Daten und Darstellung

| Komponente | Zweck |
| --- | --- |
| `DataTable` (alt: `table.molecule.tsx`) | TanStack-Table-Wrapper (leichter Kontext) |
| `Tabs` | Tab-Navigation (Headless UI) |
| `Timeline` | Vertikale Event-Timeline |
| `Breadcrumbs` | Breadcrumb-Navigation |
| `EmptyState` | „Keine Daten"-Fläche |
| `StatCard` | Statistik-Karte mit Zahl + Label |
| `EntityStatusBadge` | Entität mit Statuspunkt |
| `LogoWithIndicator` | Logo mit Statuspunkt (z. B. Server-Online) |

### Auth

| Komponente | Zweck |
| --- | --- |
| `AuthCard` | Container für Auth-Formulare |
| `AuthFooter` | Footer mit Version, Links, Server-Hinweis |

## Organism-Katalog

Organisms sind zusammengesetzte, weiterhin domain-neutrale Flächen. Sie leben meist als Subordner mit eigenen Hooks und Subkomponenten.

### Shell und Workspace

| Komponente | Zweck | Ring-2-Anker |
| --- | --- | --- |
| `Sidebar` | Haupt-Sidebar-Navigation | — |
| `WorkspaceContextBar` | Kontext-Leiste (Einsatz, Titel, Sekundäraktionen) | Context Slot |
| `StatusRail` | Live-Status-Fläche (Sync/Offline/Warnings) | Status Slot |
| `ModuleRail` | Modul-Navigation (liegt primär unter `features/workspace/ui`, aber folgt demselben Vertrag) | Navigation Slot |

### Command Palette

| Komponente | Zweck |
| --- | --- |
| `CommandPalette` | Hauptkomponente (Combobox-basiert, Portal-gerendert) |
| `CommandPaletteErrorBoundary` | Isolierende Error Boundary |
| `CommandBreadcrumb` | Breadcrumb innerhalb der Palette |
| `CommandItem` / `SubCommandItem` | Einzel-Einträge (auch verschachtelt) |
| `CommandFooter` | Footer mit Shortcut-Hinweisen |

### Daten und Filter

| Komponente | Zweck |
| --- | --- |
| `DataTable` (Organism) | Vollständiger TanStack-Table-Wrapper mit Pagination, Sorting, Filter |
| `FilterPanel` | Filter-Sidebar |
| `MobileFilterDialog` | Filter als Mobile-Dialog |
| `MobileStatusBar` | Status-Bar für Mobile |
| `StatusCard` | Statistik-/Status-Karte |
| `PriorityPanel` | Priorisierungspanel |

### Infrastruktur

| Komponente | Zweck |
| --- | --- |
| `ErrorBoundary` | React Error Boundary mit Fallback-UI |

## Template-Katalog

Templates sind Shell-Layouts. Sie definieren die äußere Rahmung einer Seite und werden bewusst **nicht** über den zentralen Barrel exportiert, um zirkuläre Abhängigkeiten zu Features zu vermeiden.

| Template | Zweck |
| --- | --- |
| `AuthLayout` | Login/Invite-Rahmen mit Ambient-Gradient und Top-Glow |
| `AdminLayout` | Admin-Bereich mit eigener Navigation |
| `AdminDashboardLayout` | Admin-Dashboard-Variante |
| `SingleEinsatzLayout` | Operativer Arbeitsraum für einen Einsatz (Shell-Slots) |
| `single-einsatz-layout.utils.ts` | Utility-Funktionen für Layout-Komposition |

## Headless- und Utility-Bausteine

| Baustein | Zweck |
| --- | --- |
| `headless/combobox.tsx` | Erweiterter Combobox-Wrapper: gruppierte Items, Custom-Value, Leading-Icon, `openOnFocus`, Error-State |
| `headless/provider.tsx` | Gemeinsame Shared-UI-Provider-Komposition |
| `headless/color-mode.tsx` | `ColorMode`-Type und Provider-Props |
| `cn.ts` | `cn(...)` = `twMerge(clsx(...))` |
| `module-colors.ts` | `getModuleColor`, `getModuleActiveColor` — Modul-Farbzuordnung |
| `timeBasedBackground.ts` | Zeit-basierte Ambient-Hintergrundlogik |

## Varianten-API (Beispiel `Button`)

Das `Button`-Atom ist das dichteste Beispiel für die Ring-3-Varianten-API:

- **`intent`** (semantische Bedeutung): `primary` · `secondary` · `danger` · `warning` · `success` · `info`
- **`appearance`** (visueller Stil): `filled` · `outline` · `ghost` · `minimal` · `heavy`
- **`size`** (Fläche): `sm` · `md` · `lg` · `icon`
- **Flags**: `loading`, `fullWidth`, `animate`
- **Tastatur-Hinweis**: `kbd="cmd+k"` rendert einen semantischen `<kbd>`-Badge im Button

Diese Varianten werden über fest indizierte Style-Maps aufgelöst (`INTENT_COLORS[intent][appearance]`), nicht über ad-hoc `clsx`-Verzweigungen. Neue Varianten gehören in die Map, nicht in den Consumer.

## Accessibility-Defaults

Jedes Atom und Molecule hält mindestens folgende Regeln ein:

- Sichtbarer Fokus-Ring über `focus-visible:shadow-focus-ring` (Ring 1)
- Semantische Rolle (`role="alert"` bei Error-Alerts, `role="status"` bei Live-Status)
- Labels für alle interaktiven Elemente (Icon-only-Buttons mit `aria-label`)
- `aria-busy` für Loading-States, `aria-live="polite"` für dynamische Rückmeldungen
- Tastatur-Bedienbarkeit: `Enter`/`Space` für Aktionen, `Escape` schließt Overlays, Fokus kehrt nach Overlay-Schluss zurück

Komplexe Flächen (Dialog, Combobox, Tabs, Switch, Checkbox) nutzen **Headless UI**, um Tastatur- und Screenreader-Verhalten garantiert korrekt zu halten. Eigene DOM-/Event-Logik für `Escape`, Outside-Click oder Fokus-Fallen ist nicht erlaubt.

## Theming

- Light- und Dark-Mode werden über `.dark` auf `<html>` gesteuert (`next-themes`).
- Komponenten konsumieren **ausschließlich** semantische Tokens (`bg-surface-panel`, `text-text-primary`, `border-border-subtle`, `bg-status-danger-surface` …).
- Neue Farbwerte werden in [`ring-1-design-tokens.md`](./ring-1-design-tokens.md) diskutiert und in [`packages/frontend/src/index.tailwind.css`](../../packages/frontend/src/index.tailwind.css) gepflegt. Direkte Hex-Werte in Components sind nicht erlaubt.

## Motion und Alarm-Feedback

Bluelight Hub hat spezialisierte Animationen für Alarm-Eskalation:

| Utility | Einsatz |
| --- | --- |
| `.animate-card-entry` | Dialog-/Card-Einblendung |
| `.animate-pulse-shadow` | dezenter Puls (Stufe 1 Alarm) |
| `.animate-pulse-urgent` | verstärkter Puls (Stufe 2 Alarm, GPU-optimiert) |
| `.animate-border-glow-urgent` | Border-Glow bei kritischen Zuständen |
| `.animate-pulse-audio-failed` | Shake + Scale bei Audio-Ausfall |
| `.animate-highlight` / `-new` / `-updated` | Echtzeit-Highlight-Flash |
| `.animate-floating-pill-entrance` / `-exit` | Floating-UI-Elemente |

Alle Animationen respektieren `prefers-reduced-motion` und fallen auf statische Schatten- oder Opacity-Varianten zurück.

## Erweiterungsregeln

Vor dem Hinzufügen einer neuen Komponente:

1. **Gibt es bereits ein Atom/Molecule, das den Job macht?** Dann komponieren, nicht kopieren.
2. **Ist die Komponente fachneutral?**
   - Ja → `shared/ui/{atoms|molecules|organisms}/`
   - Nein → `features/<feature>/ui/{atoms|molecules|organisms}/`
3. **Braucht die Komponente eine Variant-API?** Dann via fest indizierte Style-Maps (siehe `Button`), nicht per `clsx`-Kette.
4. **Nutzt sie Tokens?** Nur semantische Utilities (`bg-surface-*`, `text-text-*`). Keine rohen Farbcodes oder `--ring-1-*`-Referenzen im Consumer.
5. **Hat sie Tastatur- und Screenreader-Verhalten?** Wenn komplex → Headless UI. Wenn einfach → mindestens `aria-label`, `aria-busy`, `role` prüfen.
6. **Unit-Test-Skelett:** Rendering, Varianten-Matrix, Focus/Keyboard, Disabled/Loading-State.
7. **Barrel-Export:** Über die jeweilige `index.ts`, außer für Templates.

## Testing-Vertrag

| Art | Pflicht | Werkzeug |
| --- | --- | --- |
| Snapshot/Rendering | optional | Vitest + React Testing Library |
| Varianten-Matrix | empfohlen für Atoms mit ≥ 3 Varianten | Vitest |
| Interaktion | Pflicht für Dialog, Combobox, Buttons mit Loading | `@testing-library/user-event` |
| Accessibility | Pflicht für Dialog, Alert, Live-Status | Rollen-Queries, `aria-*`-Assertions |
| Ring-1-Contract | Pflicht | [`__tests__/ring-1-design-tokens.spec.ts`](../../packages/frontend/src/shared/ui/__tests__/ring-1-design-tokens.spec.ts), [`__tests__/ring-1-theme-contract.spec.ts`](../../packages/frontend/src/shared/ui/__tests__/ring-1-theme-contract.spec.ts) |
| Ring-2-Layout-Contract | Pflicht für Templates | [`templates/__tests__/ring-1-layout-contract.spec.ts`](../../packages/frontend/src/shared/ui/templates/__tests__/ring-1-layout-contract.spec.ts) |

## Guardrails

- Keine zweite UI-Schicht neben `shared/ui`. Features komponieren, dürfen aber nicht parallel eigene Primitives aufbauen.
- Keine Inline-Styles oder CSS-in-JS. Nur Tailwind-Utility-Klassen über `cn()`.
- Keine Feature-Imports aus `shared/ui`. `shared/ui` hängt nur von sich selbst, Tailwind, Headless UI, `react-icons` und TanStack-Primitives ab.
- Keine direkte `--ring-1-*`-Referenz im Component-Code. Nur semantische Utilities.
- Keine eigenen Fokus-Ringe pro Fachfläche. `shadow-focus-ring` aus Ring 1 ist verbindlich.

## Verweise

- Tokens: [`ring-1-design-tokens.md`](./ring-1-design-tokens.md)
- Shell: [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md)
- Review-Gates: [`ring-2-review-gates.md`](./ring-2-review-gates.md)
- Performance-Gates: [`ring-2-performance-gates.md`](./ring-2-performance-gates.md)
- Session- und API-Vertrag: [`session-api-contract-ring-2.md`](./session-api-contract-ring-2.md)
- Aktueller Umsetzungsstand: [`ui-ux-state-current.md`](./ui-ux-state-current.md)
- Architekturentscheidung: [`../adr/adr-004-frontend-workspace-orchestrierung.md`](../adr/adr-004-frontend-workspace-orchestrierung.md)
