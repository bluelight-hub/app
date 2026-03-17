# Workspace-Fundament für Ring 2

## Zweck

Story `1.2` etabliert den technischen Unterbau für sichtbare Ring-2-Flächen. Ziel ist kein fertiger Fach-Workspace, sondern ein belastbarer gemeinsamer Vertrag zwischen `shared/ui` und `features/workspace`, auf den Folge-Stories ohne neue Shell-Sonderwege aufsetzen können.

Die zugehörige Architekturentscheidung ist in [`ADR-004: Frontend-Workspace-Orchestrierung als eigene Feature-Schicht`](../adr/adr-004-frontend-workspace-orchestrierung.md) dokumentiert.

Das Workspace-Fundament ergänzt die Ring-1-Tokens aus [`ring-1-design-tokens.md`](./ring-1-design-tokens.md) um Strukturregeln für:

- typisierte Modul- und Seiten-Registry
- Shell-Komposition über klar benannte Slots
- einheitliche Status-, Fokus- und Overlay-Regeln
- Scope-Grenzen für die Foundations-Story

Die verbindlichen Abnahme- und Review-Regeln für Ring 2 sind in [`ring-2-review-gates.md`](./ring-2-review-gates.md) dokumentiert. Diese Doku ergänzt das Fundament um prüfbare Gates für Accessibility, Browser-Matrix, Zoom, Responsive-Verhalten und journey-basierte Qualität.

Die messbaren Performance-Gates für die Ring-2-Kernflächen liegen ergänzend in [`ring-2-performance-gates.md`](./ring-2-performance-gates.md).

## Scope dieser Story

### In Scope

- Workspace-Primitives für Kontext, Navigation, Status und Overlay
- `features/workspace` als Orchestrierungsschicht für Shell und Registry
- typisierter Workspace-Contract statt lose verteilter Moduldefinitionen
- konsistente Status- und Fokusmuster für workspace-nahe Bausteine
- technische Doku und Frontend-Checks für den neuen Vertrag

### Nicht in Scope

- Accessibility-Browser- und Responsive-Review-Gates aus Story `1.2a`
- Performance-Gates aus Story `1.2b`
- Session-, Auth- oder API-Härtung aus Story `1.2c`
- komplette Migration aller Fachflächen auf neue Ring-2-Inhalte
- neue globale Storage-, Auth- oder API-Schichten

Wenn bei der Umsetzung zusätzliche Guardrails nötig werden, müssen sie dokumentiert oder in Folge-Stories verschoben werden. Sie gehören nicht stillschweigend in Story `1.2`.

## Architekturgrenzen

Die Frontend-Grenze bleibt:

`routes -> features -> shared`

Für das Workspace-Fundament bedeutet das:

- Route-Dateien bleiben dünn und verantworten nur URL-Vertrag, Guards und Einstieg in die Shell.
- `features/workspace` verdrahtet Registry, Slot-Struktur, Command-Palette-Anbindung und globale Statusführung.
- `shared/ui` enthält ausschließlich fachneutrale sichtbare Primitives. Keine Einsatz-, Rollen- oder API-Logik in `shared/ui`.

## Kanonische Begriffe

Diese Begriffe sind für Story `1.2` die verbindliche Namenswelt in Code, Tests und Doku:

- `WorkspaceShell`
- `WorkspaceContextBar`
- `ModuleRail`
- `StatusRail`

Dokumentations-Aliase wie `WorkspaceShellFrame`, `EinsatzContextBar` oder `WorkspaceSidebar` sind nur als erläuternde Begriffe zulässig. Im Code dürfen keine parallelen Namenswelten entstehen.

## Registry-Regeln

Die Workspace-Registry ist die verbindliche Quelle für sichtbare Shell-Navigation. Sie ersetzt verstreute Inline-Definitionen und freie Shortcut-Strings.

### Mindestfelder pro Modul

Jeder Registry-Eintrag soll mindestens enthalten:

| Feld | Zweck |
| --- | --- |
| `id` | stabiler technischer Schlüssel |
| `label` | sichtbare Modulbezeichnung |
| `routeTarget` | primäres Route-Ziel für den Modulanstieg |
| `description` | kurzer Orientierungstext für Shell und Übersicht |
| `icon` | sichtbares Symbol für Rail, Übersicht und Command Palette |
| `shortcut` | strukturierte Shortcut-Metadaten statt Inline-Text |
| `badgeHint` | optionale Marker- oder Badge-Information |
| `visibility` | vorbereitete Sichtbarkeitsregel, auch wenn zunächst meist `visible` |
| `priority` | vorbereitete Priorisierung für spätere Sortierung |
| `subPages` | typisierte Liste der Shell-seitig navigierbaren Unterseiten |

### Regeln für `routeTarget`

- `routeTarget` ist der kanonische Haupteinstieg eines Moduls.
- Das Feld darf nicht implizit aus dem ersten Array-Element geraten, sondern muss bewusst modelliert werden.
- Wenn ein Modul mehrere Unterseiten hat, bleibt `routeTarget` trotzdem eindeutig.
- Im aktiven Einsatz zeigt `routeTarget` immer auf den kanonischen Arbeitsraum-Pfad des Moduls. Redirects aus Legacy-Pfaden bleiben erlaubt, aber sie enden auf demselben Shell-Pfad.

### Regeln für `shortcut`

- Shortcuts gehören in die Registry, nicht in JSX-Strings oder Tooltips.
- Die Shell liest Shortcut-Metadaten aus dem Contract und rendert Anzeige, Hilfe und Hotkeys daraus.
- Fachflächen dürfen keine eigene konkurrierende Shortcut-Notation einführen.
- Disabled- oder versteckte Ziele dürfen nicht über Command Palette, Shortcut-Hilfe oder Schnellnavigation so erscheinen, als wären sie aktiv nutzbar.

### Regeln für `badgeHint`

- Badges sind Teil des Vertrages, nicht zufällige UI-Dekoration.
- Badge-Daten dürfen numerisch oder textlich sein, müssen aber semantisch benannt bleiben.
- Statusrelevante Badges sollen zusätzlich einen lesbaren Text oder `aria`-Hinweis haben.

## Shell-Slots

Die Shell wird über stabile Slots zusammengesetzt. So bleibt der Rahmen konsistent, während Folge-Stories nur definierte Bereiche erweitern.

### 1. Context Slot

Der Context Slot zeigt den aktiven Arbeitskontext:

- Rücksprung oder Shell-Rahmenaktion
- Einsatzkennung und Titel
- sekundäre Kontextinformationen wie Alarmstichwort oder Ort
- ergänzende Meta-Aktionen wie Vollbild oder Statusbadges

Der Context Slot ist kein Sammelort für Fachaktionen.

### 2. Navigation Slot

Der Navigation Slot zeigt die modulare Hauptnavigation:

- `ModuleRail` für Modulwechsel
- Modulübersicht oder gleichwertiger Überblicks-Overlay
- Shortcut-Hilfe für Shell-Navigation direkt an den Modul-Triggern, nicht nur als Tooltip
- klare Trennung zwischen Hauptnavigation und Sekundäraktionen
- die Desktop-Seitennavigation bleibt über Modulwechsel stabil und wird nicht pro aktivem Modul neu zusammengesetzt

### 3. Content Slot

Der Content Slot ist ausschließlich für die aktive Fachfläche zuständig.

- Fachinhalte werden hier gerendert.
- Story `1.2` liefert nur den Rahmen, nicht die vollständige fachliche Neugestaltung.
- `SingleEinsatzDashboard.tsx` und ähnliche Fachflächen bleiben inhaltlich weitgehend unangetastet.

### 4. Status Slot

Der Status Slot ist für sichtbare Arbeitszustände reserviert:

- Verbindungs- oder Sync-Zustände
- Warnungen oder eingeschränkte Zustände
- Blockierungen, `readonly` oder Recovery-Hinweise
- ein nicht-fehlerhafter Basiszustand, damit die Statusfläche im Normalbetrieb nicht verschwindet
- Shell-nahe Meta-Informationen, wenn sie für den Arbeitsfluss relevant sind
- kein Status-Rail-Einsatz für Informationen, die im aktuellen Kontext bereits redundant sichtbar sind

Quick Actions dürfen neben dem Status Slot existieren, aber nicht mit Statusmeldungen vermischt werden.

### 5. Overlay Slot

Der Overlay Slot bündelt Shell-nahe Overlays:

- Modulübersicht
- Command Palette
- shell-nahe Dialoge und Menüs

Er nutzt bestehende Fokus- und Schließlogik. Neue Einzellösungen für `Escape`, Backdrop, Fokus-Rückgabe oder Positionierung sind nicht zulässig.

## Statusverhalten

Workspace-Status ist nur dann vollständig, wenn er sowohl visuell als auch semantisch lesbar ist.

### Verbindliche Regeln

- Status niemals nur über Farbe vermitteln.
- Jeder sichtbare Status braucht mindestens Text, Icon, Zähler oder eine gleichwertige Beschriftung.
- Die Statusfläche bleibt auch im gesunden Standardzustand sichtbar und fällt nicht auf `null` zurück.
- Interaktive Statusflächen brauchen sinnvolle `aria`-Texte.
- Fokus und aktiver Zustand folgen demselben Produktvokabular wie der restliche Ring-1-Vertrag.

### Zustände, die der Vertrag abdecken muss

| Zustand | Erwartete Bedeutung |
| --- | --- |
| `loading` | Daten oder Shell-Teil lädt noch |
| `pending` | Aktion läuft an oder wartet auf Abschluss |
| `warning` | aufmerksamkeitsbedürftig, aber nicht blockierend |
| `error` | klarer Fehlerzustand mit sichtbarer Einordnung |
| `offline` | keine oder verlorene Verbindung |
| `local draft` | nur lokal vorhanden, noch nicht synchronisiert |
| `syncing` | wird gerade abgeglichen |
| `synced` | zuletzt erfolgreich synchronisiert |
| `failed` | Synchronisation oder Aktion ist fehlgeschlagen |
| `conflict/retry` | Konflikt oder nötiger Wiederholungsversuch |
| `degraded connection` | Verbindung ist vorhanden, aber instabil oder eingeschränkt |
| `readonly/locked` | aktuell nicht bearbeitbar |
| `focus/active` | aktiv oder im Fokus, ohne nur Farbwechsel als Signal |

### Fokus- und Aktivmuster

- aktive Module, Unterseiten und Shell-Trigger nutzen denselben Fokus-Ring und dieselbe sichtbare Aktivsprache
- keine separaten Fokus-Hacks je Fachfläche
- Fokus muss auf Light- und Dark-Flächen gleich klar erkennbar bleiben

## Overlay- und Menüregeln

- Für Dialoge wird das bestehende Shared-Dialog-Primitive genutzt.
- Für Switcher oder Auswahlmenüs sind bestehende Headless-UI-Patterns mit einheitlicher Shell-Sprache zu bevorzugen.
- Workspace-nahe Overlays dürfen keine eigene DOM- oder Event-Logik für `Escape`, Outside-Click oder Fokus-Fallen aufbauen.
- Command Palette bleibt Shell-Verhalten und wird nicht pro Fachfläche neu implementiert.

## Persistenz- und Recovery-Grenzen

- Falls Story `1.2` erste Recovery- oder Rückkehrzustände einführt, muss die bestehende Storage-Abstraktion unter `packages/frontend/src/shared/services/storage/` genutzt werden.
- Neue rohe `localStorage`-Hilfen sind nicht zulässig.
- Schlüssel und Persistenzkonzepte sollen mindestens nach `server`, `user`, `role`, `einsatz` und `feature` gedacht werden.
- Workspace- oder Feature-Stores dürfen keine Auth-Tokens, Session-Geheimnisse oder sonstige API-sensitive Daten halten.

## Leitlinien für Folge-Stories

- Neue Ring-2-Flächen bauen auf Registry und Shell-Slots auf, statt neue Shell-Muster zu erfinden.
- Fachfeatures dürfen innerhalb des Content Slots eigene UI-Kompositionen haben, aber keine konkurrierende Shell.
- `shared/ui` bleibt die einzige generische sichtbare UI-Schicht.
- `features/workspace` ist der richtige Ort für Shell-Orchestrierung, nicht für Fachlogik.
- Disabled- oder später freizugebende Registry-Ziele müssen nicht nur in Navigation und Command Palette ausgeblendet oder deaktiviert sein, sondern auch per Routing-Guard auf einen freigegebenen kanonischen Workspace-Pfad zurückführen.

## Mindestprüfung für Story `1.2`

Vor Abschluss der Story sollen mindestens diese Punkte überprüft werden:

- gezielte Vitest-Abdeckung für Registry, WorkspaceShell und Accessibility-Labels
- Contract- oder Layout-Tests für die neue Shell-Komposition
- `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit`
- `pnpm --filter @bluelight-hub/frontend lint:check`

## Bezug zu Story `1.1`

Story `1.2` erweitert den Ring-1-Vertrag, ersetzt ihn aber nicht.

- Ring-1-Tokens bleiben die sichtbare Grundlage.
- Story `1.2` ergänzt Struktur- und Verhaltensregeln für Shell und Navigation.
- Folge-Stories sollen Tokens, Shell-Slots und Registry gemeinsam verwenden.
