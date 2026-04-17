---
status: ready-for-dev
goal: G5
parent_spec: ../planning-artifacts/ux-design-specification.md
prev_spec: ./spec-g4-split-view-akut-broadcast.md
github_issue: 627
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
---

# Spec G5 — Polish (Onboarding, Undo, Reduced-Motion, a11y-Audit, Visual-Regression)

## Kontext

G1–G4 haben das komplette #627-Feature funktional fertiggestellt. G5 ist Polish: nicht-funktionale Qualitätsarbeit, die das Feature produktionsreif macht. Jeder Block in G5 ist unabhängig und kann bei Zeitdruck separat geschoben werden — aber in Summe liefert G5 den Qualitätssprung.

## Ziele

1. **Onboarding-Coach-Mark** — einmalige Tour „So springst du zwischen Matrix und Karte" beim ersten Einsatz mit aktiver Gefahrenzone.
2. **Undo-Mechanik** (`cmd+z`) — 30 s-Rückgängig-Fenster für Create/Update-Geometry/Delete auf Gefahrenzonen; Client-State-basiert, nutzt bestehende Commands zur Re-Application.
3. **Reduced-Motion-Audit** — alle in G2–G4 eingeführten Animationen gegen `prefers-reduced-motion: reduce` validieren; wo nötig ergänzen.
4. **a11y-Audit mit axe-core** — Playwright-basierter Automated-Check pro Route (Matrix, Lagekarte, Split-View) + Manual-Check mit VoiceOver/NVDA für AKUT-Narration.
5. **Visual-Regression via Playwright-Screenshots** — entkoppelt von Storybook (das im Projekt nicht existiert). Deterministic Screenshots für Warnstufen-Chip, Matrix-Cell-States, Lagekarte-Layer.

## Nicht-Ziele

- **Storybook einführen:** gehört nicht hierher. Wenn später gewünscht: eigene ADR.
- Offline-Queue / Connection-Loss-Banner: aus Scope #627 explizit raus (UX-Spec).
- Presence-Avatare auf Zonen: out of scope.
- Command-Palette-Integration für Gefahrenzone-Commands: gehört zu einem CP-Erweiterungs-Task (nicht G5).

## Architektur

### 1. Onboarding-Coach-Mark

**Client-State:** `packages/frontend/src/features/gefahrenzone/stores/onboarding.store.ts` — `{ coachMarkSeen: boolean }`, persisted via `localStorage` (Key: `bluelight:coachmark:gefahrenzone:v1`).

**Komponente:** `packages/frontend/src/features/gefahrenzone/ui/organisms/GefahrenzoneCoachMark.tsx`

- Headless-UI `<Popover>` mit 3–4 Steps:
  1. „Gefahrenmatrix": Badge-Highlight in einer Zelle.
  2. „Zeichnen auf der Karte": Toolbar-Button-Highlight.
  3. „Verknüpfte Ansicht": Toggle-Button-Highlight.
  4. „AKUT-Broadcast": kurzer Hinweis.
- Skip-Button (Top-Right) + „Verstanden"-Button (primary) setzt `coachMarkSeen = true`.
- Mount-Bedingung: `isSplitViewRouteActive` UND `useGefahrenzonen(einsatzId).data.length > 0` UND `!coachMarkSeen`.
- Reduced-Motion: Transitions instant.
- Tastatur: `Esc` = Skip, Pfeiltasten = navigieren, Enter = next/close.

### 2. Undo-Mechanik

**Store:** `packages/frontend/src/features/gefahrenzone/stores/undo.store.ts`

```typescript
interface UndoableAction {
  id: string;
  kind: 'create' | 'update-geometry' | 'delete';
  timestamp: number;
  payload: {
    before?: GefahrenzoneDto; // für update/delete
    after?: GefahrenzoneDto; // für create/update
  };
}

const undoStore = new Store<{ stack: UndoableAction[] }>({ stack: [] });
```

**Logic:**

- Nach jeder Mutation (Create/UpdateGeometry/Delete) wird ein `UndoableAction` auf den Stack gepusht.
- 30 s-Timer pro Aktion: nach Ablauf Action vom Stack entfernt.
- `cmd+z`-Handler (global via Event-Listener im `LagekarteView`-Root):
  - Pop neueste Action vom Stack.
  - `kind: 'create'` → `useDeleteGefahrenzone(after.id)`.
  - `kind: 'delete'` → `useCreateGefahrenzone(before)` (mit neuer ID, Original-ID ist weg).
  - `kind: 'update-geometry'` → `useUpdateGefahrenzoneGeometry(before.id, before.geometry)`.
- Nach Undo: Toast „Aktion zurückgenommen · Wiederherstellen" mit Button (auch 30 s gültig; klick → re-applyt die ursprüngliche Action via passende Mutation).
- **Wichtig:** der Undo nutzt **bestehende Commands** — kein separater Backend-Undo-Command. Aus Server-Sicht sind Undo/Redo normale Create/Update/Delete-Calls.

**Hook:** `useGefahrenzoneUndo()` in `features/gefahrenzone/hooks/` — kapselt Store, Timer-Management, Mutation-Aufrufe, Toast-Rendering.

**Edge-Cases:**

- Zone wurde in der Zwischenzeit von anderem User verändert → Undo-Mutation kann scheitern (404 oder Stale) → Error-Toast „Undo nicht mehr möglich, Zone wurde zwischenzeitlich verändert".
- User ist offline → Undo deaktiviert (Disabled-Shortcut + Tooltip).

### 3. Reduced-Motion-Audit

- Systematischer Durchlauf aller in G2–G4 neu eingeführten Animationen:
  - G2: Popover-Transitions, Draw-Mode-Indicator.
  - G3: Badge-Click-Pulse, Deep-Link-Fokus-Pulse.
  - G4: Split-View-Transition, Toast-Slide-In, Toggle-Animation.
- Pro Animation: prüfe, ob `@media (prefers-reduced-motion: reduce)` aktiv ist oder `useReducedMotion`-Hook-Check. Wenn fehlt → ergänzen (CSS-basiert, wie G1-Pattern).
- Dokument-Artefakt: `_bmad-output/implementation-artifacts/g5-reduced-motion-audit.md` — Checkliste pro Komponente: Animation-Name, Fallback, Status (✅/⚠️/❌).

### 4. a11y-Audit

**Automated (Playwright + `@axe-core/playwright`):**

- E2E-Test `packages/frontend/e2e/gefahrenzone-a11y.spec.ts` (oder bestehenden E2E-Ordner).
- Für jede relevante Route:
  - `/einsatz/:id/sicherheit/gefahren` (Matrix) — mit und ohne Zonen.
  - `/einsatz/:id/lagekarte` — mit und ohne Zonen, mit offenem Popover + Panel.
  - Split-View-Route (via Search-Params).
- Assertions: keine axe-Violations mit Severity `critical` oder `serious`.
- Bekannte Warnings dokumentieren als erwartet.

**Manual:**

- VoiceOver (macOS) + NVDA (Windows) Stichprobe; Narration-Skript für AKUT-Eingehen prüfen.
- Dokument: `g5-manual-a11y-audit.md` mit Findings + Fixes.

### 5. Visual-Regression via Playwright

- Storybook-frei; nutzt Playwright-`expect(page).toHaveScreenshot()`.
- E2E-Test `packages/frontend/e2e/gefahrenzone-visual.spec.ts`:
  - `WarnstufeChip` alle 5 Stufen × 3 Varianten × Light/Dark (als dedizierte Preview-Route `/dev/warnstufe-chips` aufsetzen — minimal, rendert nur Chips in Grid; Dev-Only).
  - Matrix mit 0/1/2 Zonen pro Zelle + Orphan-Fall.
  - Lagekarte mit 3 Zonen in 3 verschiedenen Warnstufen.
  - AKUT-Toast alle 3 Stufen.
- Screenshots in `packages/frontend/e2e/__screenshots__/` committen; CI vergleicht auf Byte-Diff mit Toleranz.
- **Viewport-fixiert:** 1920×1080; Sub-Tests auch 1440×900 und 1280×800.
- `prefers-reduced-motion: reduce` explizit in einer Sub-Suite, damit keine Flake durch AKUT-Pulse.

## Tests

**Frontend:**

- `undo.store` + `useGefahrenzoneUndo`: Push, Pop, Timer-Ablauf, 3 Action-Kinds, Redo-Logic, Stale-Handling.
- `onboarding.store`: Persist, Reset-Mechanik (Dev-Tool-Hook für QA).
- `GefahrenzoneCoachMark`: Mount-Bedingung, Skip/Weiter/Schließen, `coachMarkSeen` wird gesetzt.
- E2E: Undo-Roundtrip (create → undo → redo → delete → undo); Coach-Mark sichtbar beim ersten Mal, unsichtbar beim zweiten.
- E2E: axe-core 0 Violations.
- E2E: Visual-Regression grün (erste Runs committen Baseline).

**Validation Commands:**

- `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="undo|CoachMark|onboarding" --no-coverage`
- `pnpm --filter @bluelight-hub/frontend exec playwright test e2e/gefahrenzone-a11y.spec.ts` (wenn Playwright im Projekt konfiguriert; sonst als Follow-up markieren).
- `pnpm --filter @bluelight-hub/frontend exec playwright test e2e/gefahrenzone-visual.spec.ts`
- `pnpm lint` (0 Errors)

## Task-Reihenfolge

1. **Reduced-Motion-Audit** (Dokument + Fixes).
2. **Undo-Mechanik** (Store + Hook + Integration + Tests).
3. **Onboarding-Coach-Mark** (Store + Komponente + Mount-Logic + Tests).
4. **Playwright-Setup verifizieren** — existiert Config? Sonst minimal aufsetzen (separater Sub-Task oder Follow-Up je nach Projekt-Stand).
5. **a11y-Audit** (E2E-Test + Manual-Check-Dokument).
6. **Visual-Regression** (Dev-Preview-Route + Screenshots + E2E-Tests).
7. **Validation-Gate** + Übergabe.

## Notizen

- **Playwright ist NICHT im Projekt installiert.** Verifiziert: keine `playwright.config.*`, kein `playwright`-Package in `packages/*/package.json`. Konsequenz: Abschnitte **4 (Automated a11y-Audit)** und **5 (Visual-Regression)** werden als **Follow-Up / Scheduled-Work** außerhalb G5 ausgewiesen. Sub-Tasks in G5 sind somit nur **1 (Reduced-Motion-Audit), 2 (Undo), 3 (Onboarding)** — plus **5a (Manual a11y-Audit)** mit VoiceOver/NVDA-Checkliste.
- Falls der User Playwright-Setup als Teil von G5 will: separaten Sub-Task dafür anlegen (Config, CI-Integration, Baseline-Seed) — das ist ein eigenständiges Vorhaben.
- **Backend:** **keine Änderungen** — Undo nutzt bestehende Commands.
- **Keine Breaking Changes** — Polish darf keine Regressionen einführen. Validation-Gate läuft gegen gesamte Test-Suite.

## Abschluss-Signal

`status: done`, `## Spec Change Log`, **Feature #627 komplett**. ADR-Finalisierung + ggf. finale Review + PR-Erstellung sind außerhalb Skill-Scope.
