---
title: 'Gefahren-Tools ins Edit-Panel integrieren (GefahrenToolsSidebar)'
type: 'feature'
created: '2026-04-17'
status: 'done'
baseline_commit: '3d998a15cf4846335f90b2374c1506b653c25930'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/frontend/ring-3-component-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Gefahren-Tools liegen heute verstreut auf der Lagekarte: die `GefahrenzoneDrawControls` als separate Floating-Toolbar oben links, `draw_gams` als Button im Haupt-DrawToolbar und die Gefahren-Symbole in der allgemeinen Symbolbibliothek. Das erzeugt visuellen Lärm und macht es schwer, alle Werkzeuge zu einer Gefahrenzone an einem Ort zu finden.

**Approach:** Eine neue Slide-In-Sidebar `GefahrenToolsSidebar` (rechts, analog zu `KartenZeichenSidebar`) bündelt die drei Tool-Klassen in Tabs: **Zone** (Polygon/Kreis), **GAMS** (4-Radien-Zonen) und **Symbole** (Gefahrenmarker). Getoggelt wird sie über einen neuen `PiWarning`-Icon-Button in der `DrawToolbar`-Header-Zeile neben dem Taktische-Zeichen-Button. Die alte Floating-Toolbar und der `draw_gams`-Button im Haupt-Grid entfallen.

## Boundaries & Constraints

**Always:**

- Nur **eine** rechte Sidebar gleichzeitig sichtbar: Öffnen der Gefahren-Sidebar schließt `KartenZeichenSidebar` und umgekehrt (gleiches Pattern wie `SymbolPanel` ↔ `TemplatePanel`).
- Bestehende Draw-Flows bleiben erhalten: `drawContext='gefahrenzone'` + `GefahrenzoneHost`-Listener für Zone-Creation, `gams.platzieren`-Event + `useGamsZonen` für GAMS, `use-symbol-marker` für Symbole.
- `g`-Shortcut (Gefahrenzone-Polygon toggle) bleibt funktionsfähig, unabhängig von Sidebar-Zustand.
- Sidebar ist nur sichtbar, wenn `canDraw === true` (gleich wie `DrawToolbar`).
- Gefahren-Symbole bleiben zusätzlich in der bestehenden `SymbolLibrary`-Kategorie erhalten (Discoverability, keine Regression).

**Ask First:**

- Falls ein weiteres Gefahrentyp- oder GAMS-Default-Konzept nötig wird, das über den bestehenden `gefahrenzoneDrawStore` hinausgeht.

**Never:**

- Bestehenden Draw-Completion-Code (`GefahrenzoneHost`, `GefahrenzoneInlinePopover`, `useGamsZonen`, `GamsZonenPanel`) verändern — nur neu verdrahten.
- Neue Backend-Endpoints, DTOs oder API-Client-Regenerierung.
- Eigene Mapbox-Draw-Custom-Modes neu implementieren.
- Die `GefahrenzoneDrawControls`-Komponente löschen — sie wird im Zone-Tab der neuen Sidebar weiterverwendet.

## I/O & Edge-Case Matrix

| Scenario                            | Input / State                                 | Expected Output / Behavior                                                                                            | Error Handling |
| ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| Sidebar öffnen                      | Klick auf `PiWarning`-Button in `DrawToolbar` | `isGefahrenSidebarVisible=true`, `isZeichenSidebarVisible=false` (falls vorher offen), Sidebar slidet von rechts ein  | N/A            |
| Toggle Zone-Polygon in Zone-Tab     | Sidebar offen, Klick auf "Polygon"            | `drawContext='gefahrenzone'`, `drawMode='draw_polygon'` (identisch zum heutigen `GefahrenzoneDrawControls`-Verhalten) | N/A            |
| GAMS-Tab aktivieren                 | Klick auf "GAMS-Platzierung starten"          | `drawMode='draw_gams'` aktiviert; nächster Karten-Klick öffnet `GamsZonenPanel`-Popup; Sidebar bleibt offen           | N/A            |
| Symbol auswählen                    | Klick auf Gefahren-Symbol in Symbole-Tab      | `use-symbol-marker` Flow wird ausgelöst, Symbol wird zum Platzieren an Cursor gebunden                                | N/A            |
| Lock aktiviert                      | `isLocked=true` während Sidebar offen         | Sidebar schließt sich, Tool-Buttons innen sind inaktiv (analog `toggleLock`-Verhalten für andere Panels)              | N/A            |
| `g`-Shortcut im Input-Feld          | Fokus in Input der Sidebar, Taste `g`         | Kein Toggle (bestehender Guard in `GefahrenzoneDrawControls`)                                                         | N/A            |
| `canDraw=false` (Presentation-Mode) | LagekarteView ohne Edit-Rechte                | Weder Button noch Sidebar werden gerendert                                                                            | N/A            |

</frozen-after-approval>

## Code Map

- `packages/frontend/src/features/lagekarte/stores/draw.store.ts` -- neuen State `isGefahrenSidebarVisible`, `gefahrenSidebarTab: 'zone' | 'gams' | 'symbole'` + `toggleGefahrenSidebar`-Action (mit Mutex zu `isZeichenSidebarVisible`).
- `packages/frontend/src/features/lagekarte/ui/molecules/GefahrenToolsSidebar.molecule.tsx` -- **NEU**. Slide-In-Panel rechts, Tabs (Zone/GAMS/Symbole), Struktur abgeleitet aus `KartenZeichenSidebar.molecule.tsx`.
- `packages/frontend/src/features/lagekarte/ui/molecules/DrawToolbar.molecule.tsx` -- `PiWarning`-Button in der oberen Knopf-Reihe (neben `PiShieldStar`) einfügen; `draw_gams` aus `TOOLBAR_ITEMS` entfernen. `toggleZeichenSidebar` erweitern: schließt `isGefahrenSidebarVisible`.
- `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` -- Floating-Toolbar-Render `<GefahrenzoneDrawControls />` (Zeilen ~578–583) entfernen; `<GefahrenToolsSidebar einsatzId={…} isVisible={…} />` einhängen.
- `packages/frontend/src/features/gefahrenzone/ui/molecules/GefahrenzoneDrawControls.tsx` -- unverändert, wird im Zone-Tab der neuen Sidebar wiederverwendet.
- `packages/frontend/src/features/lagekarte/drawing/symbols/gefahren.ts` -- Symbole-Quelle für den Symbole-Tab.
- `packages/frontend/src/features/lagekarte/hooks/use-symbol-marker.ts` -- bestehender Hook, wird für Symbol-Platzierung aus Sidebar genutzt.
- `packages/frontend/src/features/lagekarte/ui/molecules/__tests__/DrawToolbar.molecule.spec.tsx` -- Mock und Test für neuen Button + fehlenden `draw_gams`-Button aktualisieren.

## Tasks & Acceptance

**Execution:**

- [x] `packages/frontend/src/features/lagekarte/stores/draw.store.ts` -- State `isGefahrenSidebarVisible`, `gefahrenSidebarTab` + Actions `toggleGefahrenSidebar`, `setGefahrenSidebarTab` einfügen; Mutex zu `isZeichenSidebarVisible` in beiden Toggle-Actions; Lock-Reset ergänzen.
- [x] `packages/frontend/src/features/lagekarte/ui/molecules/GefahrenToolsSidebar.molecule.tsx` -- neue Slide-In-Komponente mit Header (`PiWarning` + Close), Tab-Leiste (Zone/GAMS/Symbole) und drei Panel-Inhalten: Zone-Tab rendert `<GefahrenzoneDrawControls className="w-full" />`; GAMS-Tab zeigt Erklärtext + Button `onClick={() => setDrawMode('draw_gams')}`; Symbole-Tab rendert Grid aus `SYMBOLS_GEFAHREN` mit `use-symbol-marker`-Binding analog zu `SymbolLibraryPanel`.
- [x] `packages/frontend/src/features/lagekarte/ui/molecules/DrawToolbar.molecule.tsx` -- `PiWarning`-Button in der oberen Button-Reihe hinzufügen (zwischen `PiShieldStar` und Lock), mit `aria-pressed={isGefahrenSidebarVisible}` und `onClick={toggleGefahrenSidebar}`; `{ mode: 'draw_gams', … }` aus `TOOLBAR_ITEMS` entfernen.
- [x] `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` -- Block `{canDraw && (<div …><GefahrenzoneDrawControls /></div>)}` (Zeilen 578–583) löschen; `<GefahrenToolsSidebar einsatzId={einsatzId} isVisible={isGefahrenSidebarVisible} />` neben `<KartenZeichenSidebar …>` einhängen; fehlenden Import für Store-Selector ergänzen.
- [x] `packages/frontend/src/features/lagekarte/ui/molecules/__tests__/GefahrenToolsSidebar.molecule.spec.tsx` -- **NEU**. Tests für: Rendering aller drei Tabs, Tab-Wechsel, Zone-Polygon-Button setzt Context, GAMS-Button triggert `setDrawMode('draw_gams')`, Symbol-Klick bindet Symbol, Sichtbarkeits-Transform via `isVisible`-Prop.
- [x] `packages/frontend/src/features/lagekarte/ui/molecules/__tests__/DrawToolbar.molecule.spec.tsx` -- Mock um `toggleGefahrenSidebar` + `isGefahrenSidebarVisible` erweitern; Assertion ergänzen, dass `PiWarning`-Button vorhanden und `draw_gams`-Button nicht mehr in `TOOLBAR_ITEMS` enthalten ist.
- [x] `packages/frontend/src/features/lagekarte/stores/__tests__/draw.store.spec.ts` (falls vorhanden, sonst überspringen) -- Mutex-Verhalten zwischen Gefahren- und Zeichen-Sidebar verifizieren.

**Acceptance Criteria:**

- Given `canDraw=true` und geschlossene Sidebars, when User auf den neuen `PiWarning`-Button in der `DrawToolbar` klickt, then `GefahrenToolsSidebar` slidet von rechts ein und `KartenZeichenSidebar` bleibt unsichtbar.
- Given `GefahrenToolsSidebar` offen mit aktivem Zone-Tab, when User auf "Polygon" klickt, then `drawContext='gefahrenzone'` und `drawMode='draw_polygon'` im Store, identisch zum bisherigen Verhalten der entfernten Floating-Toolbar.
- Given `GefahrenToolsSidebar` offen mit aktivem GAMS-Tab, when User "GAMS-Platzierung starten" klickt und danach auf die Karte klickt, then öffnet sich das bestehende `GamsZonenPanel`-Popup zur Radien-Konfiguration.
- Given `KartenZeichenSidebar` offen, when User die `GefahrenToolsSidebar` öffnet, then schließt `KartenZeichenSidebar` automatisch (und umgekehrt).
- Given Lagekarte im `presentation`-Mode (`canDraw=false`), when sie gerendert wird, then ist weder der `PiWarning`-Button noch die `GefahrenToolsSidebar` im DOM.
- Given die alte `GefahrenzoneDrawControls`-Floating-Toolbar, when `LagekarteView` rendert, then erscheint sie **nicht** mehr oben links (Regression-Check).

## Spec Change Log

### 2026-04-17 — Review-Runde 1 (step-04, iteration 1), keine Loopback

Alle Findings aus den drei Reviewern (Blind Hunter, Edge Case Hunter, Acceptance Auditor) als **patch** oder **defer/reject** klassifiziert — keine `bad_spec`/`intent_gap`.

Angewendete Patches auf den Code (ohne Spec-Regeneration):

- `draw.store.ts` — `toggleGefahrenSidebar` setzt beim Schließen `drawContext=null` + `drawMode='select'` zurück, wenn `drawContext === 'gefahrenzone'` oder `drawMode === 'draw_gams'` war. Verhindert, dass ein hängender Gefahren-Flow nach Sidebar-Close weitere Karten-Klicks konsumiert.
- `draw.store.ts` — `toggleLock` setzt zusätzlich `drawContext=null` + `pendingZeichenPlacement=null`, damit nach Entsperren kein gecacheter Flow in den falschen Consumer leakt.
- `GefahrenToolsSidebar.molecule.tsx` — Inaktive Tab-Inhalte werden NICHT mehr gemountet (nur das aktuelle Panel). Verhindert u. a. leakenden `g`-Shortcut-Listener aus `GefahrenzoneDrawControls`, wenn GAMS/Symbole aktiv sind.
- `GefahrenToolsSidebar.molecule.tsx` — `text-white` → `text-text-inverse` (Ring-3-Token), `displayName` gesetzt, `inert`-Attribut bei `!isVisible` ergänzt.
- `stores/__tests__/draw.store.spec.ts` — **NEU**. 7 Tests: Mutex-Verhalten (beide Richtungen), Close-Reset für Gefahrenzone + GAMS, Lock-Reset auf `drawContext` + `pendingZeichenPlacement`.

KEEP:

- Single-Sidebar-Mutex via Store-Flags (analog `toggleSymbolPanel` ↔ `toggleTemplatePanel`).
- Wiederverwendung von `GefahrenzoneDrawControls` im Zone-Tab (keine Duplikation).
- `canDraw`-Gating für Button + Sidebar in `LagekarteView.tsx`.
- `onSelectSymbol`-Prop statt `einsatzId` — dokumentierter Intent-Drift, äquivalent zum Spec, da der Symbol-Flow zentral via `useSymbolMarker` in `LagekarteView` läuft.

Deferred: bestehender `focus:shadow-focus`-Mismatch in `GefahrenzoneDrawControls` (pre-existing, nicht in diesem Change eingeführt).

## Design Notes

Kein neues State-Management-Pattern — der bestehende `drawStore` wird um zwei Felder und zwei Actions erweitert. Der Mutex zwischen den beiden Sidebars folgt exakt dem Pattern von `toggleSymbolPanel`/`toggleTemplatePanel` (setzt das andere Panel beim Öffnen auf `false`). Der Zone-Tab verwendet `GefahrenzoneDrawControls` als fertige Sub-Komponente — keine Duplikation der Polygon/Kreis-Logik. Der GAMS-Tab ist bewusst minimal (ein Button + kurze Beschreibung), da die Radien-Konfiguration ohnehin erst nach dem Karten-Klick im `GamsZonenPanel`-Popup passiert. Der Symbole-Tab spiegelt die `gefahren`-Kategorie aus der allgemeinen SymbolLibrary, um mit dem Pattern der `KartenZeichenSidebar` (Panel-internes Grid) konsistent zu sein.

## Verification

**Commands:**

- `pnpm --filter @bluelight-hub/frontend test -- --testPathPatterns="GefahrenToolsSidebar|DrawToolbar|draw.store"` -- alle neuen/geänderten Tests grün.
- `pnpm lint` -- keine neuen oxlint/oxfmt-Findings.
- `pnpm --filter @bluelight-hub/frontend typecheck` -- 0 TypeScript-Fehler.

**Manual checks:**

- Lagekarte öffnen (`https://localhost:3090`), `PiWarning`-Button in der DrawToolbar anklicken → Sidebar öffnet sich rechts, drei Tabs sichtbar.
- In Zone-Tab Polygon zeichnen → bestehender `GefahrenzoneInlinePopover`-Flow läuft unverändert (Gefahrentyp/Schutzobjekt/Warnstufe wählen, speichern).
- In GAMS-Tab auf Start klicken, dann auf die Karte → `GamsZonenPanel`-Popup erscheint.
- Oben links: keine Floating-Gefahrenzone-Toolbar mehr sichtbar.
- Haupt-DrawToolbar (expanded): kein `PiTarget` (GAMS) mehr im Grid.

## Suggested Review Order

**Neue UI-Komponente (Haupt-Entry-Point)**

- Kern der Änderung: drei Tabs, conditional Mount, Wiederverwendung von `GefahrenzoneDrawControls`.
  [`GefahrenToolsSidebar.molecule.tsx:43`](../../packages/frontend/src/features/lagekarte/ui/molecules/GefahrenToolsSidebar.molecule.tsx#L43)
- Conditional-Mount-Logik — inaktive Tabs bleiben außer DOM (verhindert leakende Listener).
  [`GefahrenToolsSidebar.molecule.tsx:98`](../../packages/frontend/src/features/lagekarte/ui/molecules/GefahrenToolsSidebar.molecule.tsx#L98)

**Store: Mutex- und Reset-Semantik**

- Neue Actions + Mutex zu `toggleZeichenSidebar`, Close-Reset von `drawContext`/`drawMode`.
  [`draw.store.ts:254`](../../packages/frontend/src/features/lagekarte/stores/draw.store.ts#L254)
- `toggleLock` räumt `drawContext` + `pendingZeichenPlacement` auf (Review-Patch).
  [`draw.store.ts:162`](../../packages/frontend/src/features/lagekarte/stores/draw.store.ts#L162)
- Neuer State-Shape (Flag + Tab).
  [`draw.store.ts:61`](../../packages/frontend/src/features/lagekarte/stores/draw.store.ts#L61)

**DrawToolbar: Verdrahtung + Entfernung**

- Neuer `PiWarning`-Button in der oberen Button-Reihe, togglet Gefahren-Sidebar.
  [`DrawToolbar.molecule.tsx:125`](../../packages/frontend/src/features/lagekarte/ui/molecules/DrawToolbar.molecule.tsx#L125)
- `draw_gams` aus `TOOLBAR_ITEMS` entfernt — liegt jetzt nur noch im GAMS-Tab.
  [`DrawToolbar.molecule.tsx:73`](../../packages/frontend/src/features/lagekarte/ui/molecules/DrawToolbar.molecule.tsx#L73)

**LagekarteView: Integration**

- Floating-Toolbar entfernt, neue Sidebar unter `canDraw` eingehängt mit `handleSelectSymbol`-Binding.
  [`LagekarteView.tsx:638`](../../packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx#L638)

**Tests**

- Store-Verhalten (Mutex + Close-Reset + Lock-Reset) — neu.
  [`draw.store.spec.ts:19`](../../packages/frontend/src/features/lagekarte/stores/__tests__/draw.store.spec.ts#L19)
- Sidebar-Rendering, Tab-Wechsel, Conditional Mount, inert.
  [`GefahrenToolsSidebar.molecule.spec.tsx:68`](../../packages/frontend/src/features/lagekarte/ui/molecules/__tests__/GefahrenToolsSidebar.molecule.spec.tsx#L68)
- DrawToolbar-Regression (draw_gams fehlt, PiWarning vorhanden).
  [`DrawToolbar.molecule.spec.tsx:80`](../../packages/frontend/src/features/lagekarte/ui/molecules/__tests__/DrawToolbar.molecule.spec.tsx#L80)
