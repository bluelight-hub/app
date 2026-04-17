# Design-System-Übersicht

> **Generiert:** 2026-04-17
> **Gültig ab:** Alpha 1.0.0-alpha.102
> **Sprache:** Deutsch

## Zweck

Dieses Dokument ist der Einstieg in das Design-System von Bluelight Hub. Es erklärt das **Ring-Modell** als tragende Metapher, verlinkt die verbindlichen Verträge und macht sichtbar, wo Tokens, Shell-Struktur, Komponenten und Qualitätsgates zusammenlaufen.

## Leitbild

Bluelight Hub ist eine operative Arbeitsumgebung für Blaulicht-Organisationen. Jede Designentscheidung folgt vier Leitsätzen:

- **Operative Ruhe vor Marketing-Ästhetik** — dichte, lesbare Flächen, kein optisches Rauschen
- **Bedeutung nie nur über Farbe** — jeder Status trägt zusätzlich Text, Icon oder Zähler
- **Kontinuität vor Neuerfindung** — eine visuelle Sprache vom Login bis in den Einsatz
- **Stress-Tauglichkeit vor Feature-Reichtum** — Keyboard-first, sichtbare Fokusführung, verständliche Zustände

## Das Ring-Modell

Das Design-System ist in konzentrischen **Ringen** organisiert. Jeder Ring ist ein verbindlicher Vertrag. Äußere Ringe **erweitern** den inneren Ring, **ersetzen** ihn aber nicht.

```
              ┌──────────────────────────────────┐
              │           Ring 3                 │
              │  Komponenten-Vertrag             │
              │  (Atoms, Molecules, Organisms,   │
              │   Templates)                     │
              │                                  │
              │   ┌──────────────────────────┐   │
              │   │        Ring 2            │   │
              │   │  Struktur & Qualität     │   │
              │   │  (Shell, Registry,       │   │
              │   │   Review-/Performance-   │   │
              │   │   Gates, Session-API)    │   │
              │   │                          │   │
              │   │   ┌──────────────────┐   │   │
              │   │   │     Ring 1       │   │   │
              │   │   │  Visuelle        │   │   │
              │   │   │  Sprache         │   │   │
              │   │   │  (Design-Tokens) │   │   │
              │   │   └──────────────────┘   │   │
              │   └──────────────────────────┘   │
              └──────────────────────────────────┘
```

### Ring 1 — Visuelle Sprache

**Fokus:** Tokens als Quelle der Wahrheit für Farbe, Typografie, Spacing, Radius, Shadow und Fokusführung.

| Bereich | Umfang |
| --- | --- |
| Typografie | `Inter Variable` (Sans) + `SF Mono` (Mono), 6 semantische Skalen (`text-body-xs` – `text-title-lg`) |
| Farben | Surface · Text · Border · Action · Status (info/success/warning/danger) · Warnstufen (5-stufig) |
| Spacing | `cluster` · `panel` · `shell` · Control-Padding · 5-stufige Density-Skala |
| Radius & Shadow | `radius-control/panel/pill` · `shadow-panel/raised/button-primary/focus` |
| Mode | Light/Dark-Vertrag über `.dark`-Klasse (via `next-themes`) |
| Motion | Card-Entry · Pulse · Shake · Alarm-Glow · Highlight, mit `prefers-reduced-motion`-Fallbacks |

**Quelle:** [`packages/frontend/src/index.tailwind.css`](../../packages/frontend/src/index.tailwind.css) (CSS-first via Tailwind 4 `@theme inline`)

**Doku:** [`ring-1-design-tokens.md`](./ring-1-design-tokens.md)

### Ring 2 — Struktur & Qualität

**Fokus:** Wie die Shell aus Tokens zusammengesetzt wird — und welche Qualitätsgates sie bestehen muss.

Ring 2 zerfällt in vier Teilverträge:

| Teilvertrag | Story | Inhalt | Doku |
| --- | --- | --- | --- |
| Workspace-Fundament | `1.2` | `WorkspaceShell`, `ModuleRail`, `WorkspaceContextBar`, `StatusRail`, 5 Shell-Slots, Modul-Registry, 13 Status-Zustände | [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md) |
| Review-Gates | `1.2a` | WCAG 2.1 AA · Keyboard-only · Fokus-Rückgabe · Overlay-Verhalten · Browser-Matrix · 200 %-Zoom · VoiceOver/NVDA · 4 Kern-Journeys | [`ring-2-review-gates.md`](./ring-2-review-gates.md) |
| Performance-Gates | `1.2b` | NFR1–5: `usable-state P95 ≤ 2000 ms` · `interaction-feedback ≤ 200 ms` · `status-feedback ≤ 300 ms` · `pass-rate ≥ 95 %` über 30 Läufe | [`ring-2-performance-gates.md`](./ring-2-performance-gates.md) |
| Session- und API-Vertrag | `1.2c` | Zentrale Auth-/Refresh-/Redirect-Pfade, Server-Access-Token-Vertrag, kanonische `shared/api/`-Wrapper | [`session-api-contract-ring-2.md`](./session-api-contract-ring-2.md) |

**Architekturgrundlage:** [`ADR-004: Frontend-Workspace-Orchestrierung`](../adr/adr-004-frontend-workspace-orchestrierung.md)

### Ring 3 — Komponenten-Vertrag

**Fokus:** Die sichtbaren Bausteine, mit denen Fachflächen gebaut werden.

Ring 3 sortiert die Komponenten unter [`packages/frontend/src/shared/ui/`](../../packages/frontend/src/shared/ui/) nach Atomic Design und legt verbindliche Regeln fest für Namensgebung, Varianten-APIs, Accessibility-Defaults, Tests und Erweiterungswege.

| Ebene | Anzahl | Rolle |
| --- | --- | --- |
| Atoms | 46 | atomare UI-Primitive (Button, Input, Badge, Icon-Button, …) |
| Molecules | 30 | funktionale Kombinationen (Dialog, Table, Timeline, Password-Input, …) |
| Organisms | 22 | domain-neutrale Flächen (Sidebar, Command-Palette, Workspace-Rails, Data-Table) |
| Templates | 7 | Shell-Layouts (`AuthLayout`, `SingleEinsatzLayout`, `AdminLayout`, …) |

**Doku:** [`ring-3-component-contract.md`](./ring-3-component-contract.md)

## Guardrails zwischen den Ringen

Die Ringe sind bewusst nicht austauschbar. Für jede neue Fläche gilt:

- **Tokens vor Einzelwerten:** Neue Farben, Radien oder Spacings werden in Ring 1 ergänzt, nie lokal ausgehandelt.
- **Shell vor Shortcut-Logik:** Modul-Navigation, Shortcuts und Overlays kommen aus Ring 2, nie aus einem Feature-Store.
- **Ring 3 vor eigener UI-Schicht:** `shared/ui` ist die einzige generische UI-Schicht. Features dürfen komponieren, aber keine zweite Primitive-Welt aufbauen.
- **API- und Session-Pfade zentral:** Einstieg, Login, Refresh und Server-Scope laufen ausschließlich über die zentralen Wrapper aus Ring 2c.

## Technologie-Stack (Stand 2026-04-17)

| Bereich | Wert |
| --- | --- |
| UI-Framework | React 19.1 |
| Build-Tool | Vite 6.3 |
| Desktop-Shell | Tauri 2.10 (macOS arm64/x64, Windows, Linux, iOS, Android) |
| Styling | Tailwind CSS 4.2 (CSS-first via `@theme inline`) |
| Headless-Primitives | `@headlessui/react` 2.2 |
| Icons | `react-icons` (Phosphor, Prefix `Pi`) |
| Variants | `class-variance-authority` 0.7 + `cn()`-Utility (`clsx` + `tailwind-merge`) |
| Mode-Steuerung | `next-themes` über `.dark`-Klasse |
| Routing | TanStack Router 1.168 (72 File-based Routes) |
| State | TanStack Query 5.99 (Server) + TanStack Store 0.10 (Client) |
| Forms | TanStack Form 1.29 + Zod 4.3 |
| Tables | TanStack Table + `react-virtual` |
| Map | MapLibre GL 5.22 + React Map GL 8.1 + Mapbox Draw 1.5 (9 Custom Modi) + Turf 7.3 |
| Tests | Vitest 4.1 + React Testing Library 16.3 + jsdom 29 |

## Einordnung in die Gesamt-Doku

| Nachbar-Doku | Rolle |
| --- | --- |
| [`../project-documentation/03-frontend-architektur.md`](../project-documentation/03-frontend-architektur.md) | Feature-/Routen-Struktur, TanStack-Ökosystem, Build-Targets |
| [`../deep-dive-frontend.md`](../deep-dive-frontend.md) | Historische Deep-Dive-Dokumentation (Stand 2026-01) |
| [`../adr/adr-004-frontend-workspace-orchestrierung.md`](../adr/adr-004-frontend-workspace-orchestrierung.md) | Architekturentscheidung hinter Ring 2 |
| [`./ui-ux-state-current.md`](./ui-ux-state-current.md) | Lebender Status-Report: was fertig ist, was offen bleibt |

## Wie dieses Dokument pflegen

- **Strukturänderungen am Ring-Modell** — hier zuerst dokumentieren, danach den betreffenden Ring-Vertrag anpassen.
- **Neue Ringe (4+)** — hier begründen, warum ein neuer Ring nötig ist, und die Grenze zu existierenden Ringen definieren.
- **Stack-Versionen** — bei größeren Upgrades (React, Tailwind, TanStack) aktualisieren; Patches dürfen im Alltag auflaufen.
- **Verweise auf ADRs** — jeder Ring muss auf die ADR zurückzeigen, die seine Existenz begründet.
