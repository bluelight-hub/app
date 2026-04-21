# 10 — UI/UX & Design-System

> **Einstieg** in die visuelle Sprache, Shell-Struktur und Komponenten von Bluelight Hub.
> Dieses Dokument ist der **Pointer** aus der Projekt-Dokumentation in das vollständige Design-System unter [`docs/frontend/`](../frontend/). Tokens, Ringe und Komponenten-Verträge werden dort gepflegt, damit es nur **eine Quelle der Wahrheit** gibt.

---

## 10.1 Leitbild

Bluelight Hub ist eine operative Arbeitsumgebung für **weiße Hilfsorganisationen** (DRK, JUH, MHD, ASB, DLRG) im Sanitätsdienst und Katastrophenschutz. Jede Designentscheidung folgt vier Sätzen — sie sind kein Marketing, sondern Prüfsteine:

- **Operative Ruhe vor Marketing-Ästhetik** — dichte, lesbare Flächen, kein optisches Rauschen.
- **Bedeutung nie nur über Farbe** — jeder Status trägt zusätzlich Text, Icon oder Zähler.
- **Kontinuität vor Neuerfindung** — eine visuelle Sprache vom Login bis in den Einsatz.
- **Stress-Tauglichkeit vor Feature-Reichtum** — Keyboard-first, sichtbare Fokusführung, verständliche Zustände.

Abgeleitete Pflichten:

- Warnstufen, Alarme und Live-Updates kommunizieren **immer** als Dreifach-Signal (Farbe **+** Text/Zähler **+** Icon oder Motion).
- `prefers-reduced-motion: reduce` wird in jeder Motion-Deklaration mitgedacht — es gibt keine Animation ohne statischen Fallback.
- Light- und Dark-Mode sind gleichwertig, kein „Darkmode-Nachzügler“.

---

## 10.2 Das Ring-Modell

Das Design-System ist in drei **konzentrischen Ringen** organisiert. Äußere Ringe **erweitern** den inneren Ring, ersetzen ihn aber nicht. Wer einen Ring überspringen will, muss gute Gründe aufschreiben — in der Regel in einer ADR.

```
Ring 3 — Komponenten-Vertrag (Atoms · Molecules · Organisms · Templates)
 │
 └── Ring 2 — Struktur & Qualität (Shell · Registry · Gates · Session-API)
      │
      └── Ring 1 — Visuelle Sprache (Design-Tokens)
```

| Ring   | Was enthält er?                                                                                  | Kanonische Doku                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Ring 1 | Tokens für Farbe, Typo, Spacing, Radius, Shadow, Motion, Warnstufen, Fokusführung                | [`ring-1-design-tokens.md`](../frontend/ring-1-design-tokens.md)                                   |
| Ring 2 | Workspace-Shell, Modul-Registry, 13 Status-Zustände, Review- und Performance-Gates, Session/API  | [`workspace-fundament-ring-2.md`](../frontend/workspace-fundament-ring-2.md), [`ring-2-review-gates.md`](../frontend/ring-2-review-gates.md), [`ring-2-performance-gates.md`](../frontend/ring-2-performance-gates.md), [`session-api-contract-ring-2.md`](../frontend/session-api-contract-ring-2.md) |
| Ring 3 | 46 Atoms · 30 Molecules · 22 Organisms · 7 Templates unter `shared/ui/`                          | [`ring-3-component-contract.md`](../frontend/ring-3-component-contract.md)                         |

Zusatz: [`00-design-system-overview.md`](../frontend/00-design-system-overview.md) (verbindlicher Einstieg mit Guardrails) und [`ui-ux-state-current.md`](../frontend/ui-ux-state-current.md) (lebender Umsetzungsstand).

---

## 10.3 Ring 1 — Visuelle Sprache im Schnellüberblick

**Technischer Sitz:** [`packages/frontend/src/index.tailwind.css`](../../packages/frontend/src/index.tailwind.css) — Tokens als CSS-Custom-Properties mit Präfix `--ring-1-*`, ausgespielt nach Tailwind 4 via `@theme inline`.

### Typografie

- Schriften: `Inter Variable` (Sans, `--font-sans`), `SF Mono` / UI-Mono-Fallbacks (`--font-mono`).
- 6 semantische Skalen: `text-body-xs | sm | md` und `text-title-sm | md | lg`. Fließtext `text-body-md` (1rem / 1.5rem).

### Farbsystem

| Kategorie  | Tokens                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Surface    | `canvas`, `panel`, `raised` (= `elevated`), `overlay`, `inverse`, `sidebar`                                          |
| Text       | `primary`, `secondary`, `muted`, `inverse`                                                                           |
| Border     | `subtle`, `strong`, `inverse`                                                                                        |
| Action     | `primary` (+ `hover`/`pressed`), `secondary` (+ `hover`/`pressed`), `focus-ring`                                     |
| Status     | `info`, `success`, `warning`, `danger` — jeweils als `-surface` / `-border` / `-text`                                |
| Warnstufen | `keine`, `niedrig`, `mittel`, `hoch`, `akut` — jeweils `-fill` / `-stroke` / `-text`, `akut` zusätzlich `-glow`      |
| Akzent     | `primary-50` … `primary-950` (11 Schritte der Primäraktions-Palette)                                                 |

**Dreifach-Signal-Regel für Warnstufen & Alarme:** Farbe **+** Text/Zähler **+** Icon oder Motion. Niemals nur Rot, niemals nur Pulsieren.

### Spacing, Radius, Shadow

Ring 1 basiert auf einem **4px-Raster** (Basis `0.25rem`):

| Kategorie | Tokens                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Spacing   | `cluster` (.5rem), `panel` (1rem), `shell` (1.25rem), `control-x` (.75rem), `control-y` (.5rem)      |
| Density   | `density-0` (.25rem) → `density-4` (1rem) — Unterstufen für kompakte Operationsflächen                |
| Radius    | `control` (.375rem), `panel` (.5rem), `pill` (9999px)                                                 |
| Shadow    | `panel`, `raised`, `button-primary`, `focus`, sowie Alarm-Varianten (`alarm-glow-*`, `-urgent`, `-audio-failed`) |

### Modi

- **Dark-Mode-Schalter:** Klasse `.dark` auf `<html>`, orchestriert von `next-themes`.
- **Token-Parität:** Jede Semantik (`action-primary`, `status-*`, `warnstufe-*`, Shadows, Gradients) besitzt einen Light- **und** Dark-Wert.
- **Touch:** Custom Variant `touch` (`@media (hover:none) and (pointer:coarse)`) für Mobile-/Tauri-Touch-Flächen.

### Motion

Alle Animationen liegen als `@keyframes` + `animate-*`-Klassen in `index.tailwind.css`. Für **jede** Animation existiert ein Reduced-Motion-Fallback im selben Block. Details und Liste: [`ring-1-design-tokens.md#motion-tokens`](../frontend/ring-1-design-tokens.md#motion-tokens).

**Verbot:** Keine Inline-`@keyframes` in Feature-Komponenten, keine `animate-*`-Eigenbauten außerhalb von Ring 1.

---

## 10.4 Ring 2 — Workspace-Shell

Die Shell ist die **einzige** Quelle für Modul-Navigation, Einsatz-Kontext und Status-Anzeige. Features dürfen darin wohnen, aber keine Parallel-Shell aufbauen.

| Baustein              | Rolle                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `WorkspaceShell`      | Oberster Rahmen mit 5 Slots: `context`, `navigation`, `primary`, `status`, `overlay`                           |
| `WorkspaceContextBar` | Einsatz-Kontext (Nummer, Titel, Statusbadge), Rücksprung zu Übersicht                                         |
| `ModuleRail`          | Modul-Navigation aus typisierter Modul-Registry (`id`, `label`, `routeTarget`, `icon`, `shortcut`, `badgeHint`) |
| `StatusRail`          | Live-Status (Online/Offline, WebSocket, Server, Alarm-Badge, Benutzer)                                         |
| `CommandPalette`      | Keyboard-Einstieg (⌘K) für Suche & Aktionen                                                                    |
| `SingleEinsatzLayout` | Template für den operativen Arbeitsraum eines einzelnen Einsatzes                                              |

### 13 Status-Zustände (verbindlich)

`loading` · `pending` · `warning` · `error` · `offline` · `local draft` · `syncing` · `synced` · `failed` · `conflict/retry` · `degraded connection` · `readonly/locked` · `focus/active`. Jeder Zustand produziert **mindestens Text + Icon oder Zähler** — Farbe allein ist nie ausreichend.

### Qualitätsgates

| Gate         | Mindeststandard                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | WCAG 2.1 AA, Keyboard-only kompletter Flow, Fokus-Rückgabe nach Modals, 200 %-Zoom, VoiceOver/NVDA manuell abgenommen, 4 Kern-Journeys getestet                    |
| Performance  | NFR1: `usable-state P95 ≤ 2000 ms` · NFR2: `interaction-feedback ≤ 200 ms` · NFR3: `status-feedback ≤ 300 ms` · NFR4: Pass-Rate ≥ 95 % über 30 Läufe                |
| Session/API  | Auth-/Refresh-/Redirect-Pfade zentral, kein Feature darf eigenes Auth/Refresh implementieren                                                                        |

Architekturgrundlage: [`ADR-004: Frontend-Workspace-Orchestrierung`](../adr/adr-004-frontend-workspace-orchestrierung.md).

---

## 10.5 Ring 3 — Komponenten-Vertrag

`packages/frontend/src/shared/ui/` ist die **einzige** generische UI-Schicht. Features dürfen komponieren, aber keine zweite Primitive-Welt aufbauen.

| Ebene      | Anzahl | Rolle                                                                                       |
| ---------- | -----: | ------------------------------------------------------------------------------------------- |
| Atoms      |     46 | UI-Primitive: `Button`, `Input`, `Badge`, `Spinner`, `Heading`, `IconButton`, `Tooltip`, …  |
| Molecules  |     30 | Funktionale Kombinationen: `Dialog`, `Table`, `Tabs`, `Breadcrumbs`, `PasswordInput`, …     |
| Organisms  |     22 | Domain-neutrale Flächen: `Sidebar`, `CommandPalette`, `DataTable`, `ErrorBoundary`, Workspace-Rails |
| Templates  |      7 | Shell-Layouts: `AuthLayout`, `SingleEinsatzLayout`, `AdminLayout`, …                        |

### Varianten-API (verbindlich)

- **Styling:** Tailwind + `class-variance-authority` (CVA) + `cn()`-Utility (`clsx` + `tailwind-merge`).
- **Konventionen:** Varianten-Namen `intent`, `appearance`, `size` — konsistent über alle Atoms.
- **Barrel-Export:** `shared/ui/index.ts` exportiert Atoms, Molecules, Headless und Workspace-Organisms. Templates werden **nicht** barrel-exportiert (feature-spezifische Imports).
- **Feature-Primitives:** Wenn wiederverwendbar → in `shared/ui` hoch. Feature-lokal bleibt nur, was fachlich gebunden ist (z. B. `taktische-zeichen/`).

### Modul-Farbtopf

Modul-Farben kommen ausschließlich aus [`shared/ui/module-colors.ts`](../../packages/frontend/src/shared/ui/module-colors.ts) und mappen auf Ring-1-Status- und Action-Tokens. Module fügen **keine** eigenen Hex-Farben hinzu.

---

## 10.6 Entscheidungsschneisen (Do / Don't)

| Szenario                                                     | Richtig                                                                                            | Falsch                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Neue Farbe/Radius/Spacing nötig                              | Token in `index.tailwind.css` ergänzen, Light + Dark                                               | Hex-Wert inline oder per `style={}` setzen                               |
| Wiederverwendbares Primitive nötig                            | In `shared/ui/atoms` oder `molecules` anlegen, via Barrel exportieren                              | Feature-lokal in `features/<x>/ui/atoms` versenken und kopieren          |
| Modal / Dialog mit Fokus-Rückgabe                             | `molecules/dialog.molecule.tsx` + Headless UI Dialog                                               | Eigenes `div` mit `fixed inset-0`                                        |
| Status „offline“ anzeigen                                    | Text + Icon, Surface aus `status-*` oder Warnstufen-Tokens, `animate-*` aus Ring 1                | Nur roter Punkt ohne Text                                                |
| Auth/Refresh im Feature                                       | Zentraler `shared/api/`-Wrapper (`fetchWithRefresh`, `Configuration`)                             | Eigenen Refresh-Handler pro Feature                                      |
| Modul-Navigation / Shortcut hinzufügen                        | In der typisierten Modul-Registry (Ring 2) ergänzen                                                | Inline-`<Link>`-Jungle in der Shell                                      |
| Animation neu einführen                                       | `@keyframes` + `animate-*`-Klasse + Reduced-Motion-Fallback in `index.tailwind.css`                | Inline-Styles oder Framer-Motion pro Komponente                          |
| Formular                                                      | TanStack Form + Zod-Schema unter `features/*/schemas/`                                             | `react-hook-form` (Legacy — in Migration) oder rohes `<form>`           |

---

## 10.7 Pflege dieses Dokuments

Dieses Dokument ist **Pointer**, keine zweite Token-Liste. Wenn sich Tokens ändern:

1. `packages/frontend/src/index.tailwind.css` ist Single Source of Truth.
2. `docs/frontend/ring-1-design-tokens.md` an Code angleichen.
3. Dieses Dokument **nur** anfassen, wenn sich Kategorien, Ringe, Regeln oder Verbote ändern — nicht für einzelne Werte.
4. `ui-ux-state-current.md` für Status-Snapshots pflegen.

Siehe auch: [`00-index.md`](./00-index.md) · [`03-frontend-architektur.md`](./03-frontend-architektur.md) · [`ADR-004`](../adr/adr-004-frontend-workspace-orchestrierung.md).
