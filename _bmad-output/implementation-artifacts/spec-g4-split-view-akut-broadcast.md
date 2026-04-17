---
status: done
goal: G4
parent_spec: ../planning-artifacts/ux-design-specification.md
prev_spec: ./spec-g3-matrix-integration.md
next_spec: ./spec-g5-polish.md
github_issue: 627
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
---

# Spec G4 — Split-View + AKUT-Broadcast

## Kontext

G1–G3 haben Fundament, Karten-UI und bidirektionale Sichtbarkeit geliefert. G4 schließt das Feature ab mit den zwei UX-Spec-Kernthemen, die bisher bewusst aufgeschoben wurden: **gleichberechtigtes Split-View** (Matrix + Karte gleichzeitig) und **AKUT-Broadcast** (dreistufige Eskalation + Confirm-Dialog).

Am Ende von G4 ist die vollständige #627-Auslieferung demo-fähig — Sicherheitsbeauftragter und Einsatzleiter können parallel arbeiten, und AKUT-Situationen werden nicht mehr übersehen.

## Ziele

1. **`LagekarteGefahrenmatrixSplitView`** — Layout-Komponente mit Matrix links / Karte rechts (50:50 bei ≥1680 px; 40:60 bei 1280–1679 px; unterhalb: disabled).
2. **`splitViewStore`** (react-store) — Shared Client-State: `isSplitActive`, `focusedCell`, `focusedZoneId`.
3. **URL-Search-Params** — `?split=true&focus=zone:{id}` oder `?split=true&focus=cell:{typ}:{objekt}` als Deep-Link-Source-of-Truth; Store synchronisiert bidirektional.
4. **Toggle-Buttons** — „🔗 Verknüpfte Ansicht" in beiden Routen (Lagekarte und Matrix), im Header rechts.
5. **Matrix-Zell-Klick & Zone-Klick** im Split-Modus fokussieren automatisch das jeweilige Gegenstück (ohne Route-Wechsel).
6. **Backend: WebSocket-Bridge für `GefahrenmatrixAktualisiertEvent`** — bisher nur Domain-Event mit ETB-Adapter; G4 ergänzt einen WebSocket-Broadcast-Adapter (Pattern von G2-Gefahrenzone-Bridge).
7. **`AkutBroadcastToast`** — dreistufige Eskalation (Toast → persistenter Toast → Header-Banner) bei eingehendem `gefahrenmatrix:aktualisiert` mit `warnstufe === 'AKUT'`.
8. **`AkutBroadcastDialog`** — Headless-UI-`<Dialog>`, **einzige Modal-Stelle** im gesamten Feature. Wird ausgelöst, wenn Nutzer lokal von einer niedrigeren Stufe auf `AKUT` hochstuft. Bestätigt = Mutation feuert; abgelehnt = Auswahl zurückgesetzt.
9. **Responsive Stack-Fallback** — <1280 px: Split-View-Toggle disabled mit erklärendem Tooltip; Nutzer bleibt in Vollansicht mit Focus-Preservation beim Route-Sprung.

## Nicht-Ziele

- Kein Undo (G5).
- Kein Coach-Mark-Onboarding (G5).
- Keine Visual-Regression-Tests (G5).
- Kein Sound-File-Design (nur System-Beep oder leichte Web-Audio-Generated-Tone; Sound-Asset ist Polish-Thema und kann als Stub laufen, wenn nötig).
- Keine Offline-Queue (out of scope #627 laut UX-Spec).

## Architektur — Backend

### Neuer Broadcast-Adapter

**Pfad:** `packages/backend/src/infrastructure/events/adapters/gefahrenmatrix-aktualisiert-broadcast.adapter.ts`

**Vorbild:** `gefahrenzone-event.adapter.ts` aus G2 (exakt duplizieren, nur Event-Klasse + Channel-Name anpassen).

- `@OnEvent('gefahrenmatrix.aktualisiert')` → `einsatzEventPublisher.broadcastToEinsatz(einsatzId, 'gefahrenmatrix:aktualisiert', payload)`.
- Payload: identisch zum serialisierten Event (`{ einsatzId, gefahrentyp, schutzobjekt, warnstufe, aktualisiertVon }`).
- `EinsatzEventName`-Typ erweitern um `'gefahrenmatrix:aktualisiert'`.
- Registrierung: `event-adapters.module.ts` + `adapters/index.ts` (wie G2).
- Unit- + Integration-Spec analog.

**Keine Änderung an Matrix-Command/Handler.** Event wird bereits gefeuert, nur Consumer-Adapter neu.

## Architektur — Frontend

### Store

**Pfad:** `packages/frontend/src/features/einsatz/stores/split-view.store.ts`

```typescript
interface SplitViewState {
  isActive: boolean;
  focus: { kind: 'zone'; zoneId: string } | { kind: 'cell'; gefahrentyp: GefahrentypValue; schutzobjekt: SchutzobjektValue } | null;
}

export const splitViewStore = new Store<SplitViewState>({ isActive: false, focus: null });
export const splitViewActions = { toggle(), activate(focus), setFocus(focus), deactivate() };
```

### URL-Sync

**Hook:** `packages/frontend/src/features/einsatz/hooks/use-split-view-url-sync.ts`

- Liest TanStack-Router-Search-Params `split`, `focus`.
- Schreibt Store-Änderungen zurück in URL via `navigate({ search })`.
- Reaktion auf externe URL-Änderungen (Browser-Back, Bookmark): Store aktualisiert.

### Layout-Komponente

**Pfad:** `packages/frontend/src/features/einsatz/ui/layouts/LagekarteGefahrenmatrixSplitView.tsx`

- Grid-Layout mit Tailwind: `grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,40%)_minmax(0,60%)]`.
- Unter `xl` (<1280 px): Split deaktiviert, nur Vollansicht.
- Linke Spalte: `GefahrenmatrixFullscreenView` (bestehend) im Readonly-Toggle-Off-Modus.
- Rechte Spalte: `LagekarteView` (bestehend).
- Beide Spalten respektieren `focusedCell`/`focusedZoneId` aus Store für Auto-Scroll / Zoom.

### Toggle-Button

**Pfad:** `packages/frontend/src/features/einsatz/ui/molecules/SplitViewToggle.tsx`

- Heroicon-Equivalent (Phosphor: `PiColumns` oder `PiCaretDoubleRight`).
- Label „🔗 Verknüpfte Ansicht" (Text nur bei ≥`lg`, sonst Icon + Tooltip).
- Click → `splitViewActions.toggle()`.
- Unter `xl`: disabled mit Tooltip „Verknüpfte Ansicht ab 1280 px Breite verfügbar".
- Tastatur-Shortcut `cmd+shift+g` (aus UX-Spec) via globalem Listener im Router-Root.

### Matrix-Zell-Klick + Zone-Klick im Split-Modus

- Matrix-`GefahrenmatrixCell` akzeptiert `onCellActivate` callback (zusätzlich zu bestehendem `onChange`).
- Im Split-Modus: Klick auf Zelle → `splitViewActions.setFocus({ kind: 'cell', ... })` → Karte zoomt auf Bounding-Box aller Zonen dieser Zelle + blinkt 1,5 s.
- Gleich in der anderen Richtung: Zone-Click → `setFocus({ kind: 'zone', zoneId })` → Matrix scrollt zur Zelle + Pulse.
- Außerhalb Split: Klick-Verhalten bleibt wie G3 (Detail-Panel / Warnstufen-Editor).

### AKUT-Broadcast-Toast

**Pfad:** `packages/frontend/src/features/gefahrenzone/ui/organisms/AkutBroadcastToast.tsx`

- Subscribes auf `gefahrenmatrix:aktualisiert` WebSocket-Events.
- Filter: nur wenn `warnstufe === 'AKUT'` UND `aktualisiertVon !== currentUserId` (eigener Broadcast triggert keinen eigenen Alert).
- **Stufe 1 — Sofort-Toast:** Sonner-Toast `duration: 10_000`, mit Inhalt „🔴 AKUT: {GefahrentypLabel} · {Absender} · vor {n}s"; Click → `navigate('/einsatz/:id/lagekarte', { search: { split: true, focus: `cell:${typ}:${objekt}` } })`.
- **Stufe 2 — Persistenter Toast:** nach 10 s ohne Interaktion → Toast wird zu persistent (keine Auto-Dismiss).
- **Stufe 3 — Header-Banner:** nach 30 s ohne Interaktion → persistenter Banner im App-Header (unterhalb Navigation); Click → navigate + banner dismiss; Manuelles Dismiss via X-Button.
- Sound: System-Beep-Emulation via Web-Audio-API (`AudioContext` + `OscillatorNode`, 500 ms, 800 Hz, fade-out) — **abschaltbar** via Settings-Store (default: an). Kein externes Asset.
- `aria-live="assertive"` für Screen-Reader; `prefers-reduced-motion`: keine Slide-in-Animation, nur statisches Erscheinen.

### AKUT-Confirm-Dialog (lokal)

**Pfad:** `packages/frontend/src/features/gefahrenzone/ui/organisms/AkutBroadcastDialog.tsx`

- Wrapper-Logik um `useUpdateGefahrenmatrixBewertung`: wenn ein Update von einer niedrigeren Warnstufe auf `AKUT` erfolgt, zwischengeschaltet.
- Headless-UI-`<Dialog>`:
  - Title: „AKUT-Warnstufe senden?"
  - Body: „Du bist dabei, einen AKUT-Broadcast für {Gefahrentyp} – {Schutzobjekt} an alle Einsatzteilnehmer zu senden. Das löst bei allen Empfängern Toast + Sound aus."
  - Secondary-Button: „Abbrechen" (Esc).
  - Primary-Button: „AKUT senden" (Enter + `bg-warnstufe-akut-fill`).
- Bestätigt → Mutation feuert normal. Abgelehnt → lokale Warnstufe rollt zurück zur vorigen (optimistic-update-Reversal).
- Einsatzort: im `GefahrenmatrixCell`-Editor UND im `GefahrenzoneInlinePopover` (G2) einhaken — **zentrale Hook** `useAkutConfirm()`, der die Mutation mit Dialog-Gate wrappt.
- **Einzige Modal-Stelle** im Feature (alle anderen Flows sind Popover/Panel/Toast).

### Responsive Strategie

- Hook `useSplitViewResponsive()`: liest `window.matchMedia('(min-width: 1280px)')`.
- Wenn unter Threshold: Toggle disabled mit Tooltip.
- Falls Split-Modus aktiv und Fenster shrinkt: Store-`deactivate` + Info-Toast „Verknüpfte Ansicht benötigt mind. 1280 px — wechsele zurück zur Vollansicht".

## Tests (Definition of Done)

**Backend:**

- `GefahrenmatrixAktualisiertBroadcastAdapter`: Unit + Integration wie G2.
- `EinsatzEventName`-Typ-Erweiterung überall konsistent.

**Frontend:**

- `splitViewStore` + `useSplitViewUrlSync`: Store → URL → Store Round-Trip; externe Param-Änderung sync; Back/Forward navigation state.
- `LagekarteGefahrenmatrixSplitView`: rendert unterhalb `xl` als Vollansicht; oberhalb Split-Grid.
- `SplitViewToggle`: disabled state + Tooltip; Shortcut-Trigger.
- Matrix-Cell-Focus-Roundtrip: Click in Matrix → Karte zoomt; Click in Karte → Matrix scrollt (jsdom mocking).
- `AkutBroadcastToast`: Stufe 1/2/3 Eskalation (Timer-Mocks); Filter für eigene vs. fremde Events; Sound-Toggle respektiert; Reduced-Motion-Fallback.
- `AkutBroadcastDialog` + `useAkutConfirm`: Confirm → Mutation feuert; Abbruch → Rollback; Enter/Esc-Handling; Modal-Focus-Trap via Headless-UI.
- Integration: Matrix-Update von HOCH → AKUT öffnet Dialog, nach Confirm feuert WebSocket → anderer Client erhält Toast (End-to-End im jsdom mit Socket-Mock).

**Validation Commands:**

- Backend: `cd packages/backend && npx jest --testPathPatterns="gefahrenmatrix|split|akut" --no-coverage`
- Frontend: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="split|akut|AkutBroadcast|SplitView" --no-coverage`
- `check:di:imports`, `check:arch`, `pnpm lint` (0 Errors)

## Task-Reihenfolge

1. **Backend-Bridge** für `gefahrenmatrix.aktualisiert` (Adapter + Tests + `EinsatzEventName`-Erweiterung).
2. **`splitViewStore`** + **`useSplitViewUrlSync`** Hook + Tests.
3. **`SplitViewToggle`** + Shortcut `cmd+shift+g` + Tests.
4. **`LagekarteGefahrenmatrixSplitView`** Layout + Responsive-Fallback + Tests.
5. **Focus-Roundtrip** — Matrix-Cell- und Zone-Click-Integration im Split-Modus + Tests.
6. **`useAkutConfirm`** Hook + **`AkutBroadcastDialog`** + Tests.
7. **Einhaken** des Confirm-Hooks in `GefahrenmatrixCell`-Editor + `GefahrenzoneInlinePopover`.
8. **`AkutBroadcastToast`** Dreistufige Eskalation + Sound + Tests.
9. **Route-Integration** — Toggle in Lagekarte-Header + Matrix-Header.
10. **Validation-Gate** + manueller Smoke-Test zwischen zwei Browser-Sessions.

## Notizen für den Implementierer

- **Sound-Asset:** Web-Audio-API reicht für G4. Ein gutes File-Asset ist G5-Polish.
- **URL-Search-Params:** TanStack-Router-Muster des Projekts nutzen; Z-Schema validieren, damit invalide `focus`-Werte geräuschlos ignoriert werden.
- **Focus-Koordination:** bereits teilweise in G3 für Deep-Links etabliert — in G4 erweitern für Split-Modus-Live-Fokus.
- **AKUT-Confirm** ist die einzige Modal-Stelle. Im Rest des Features unbedingt keine weiteren Modals einführen.
- **Eigener Broadcast ohne Toast** (Absender-ID-Filter): UX-Spec-Detail — „niemand erschreckt sich vor der eigenen Handlung".
- **Focus-Preservation bei Vollansicht-Sprung** (< xl): Matrix-Scroll-State und Karten-Viewport merken via Store, restore nach Route-Wechsel.
- **Commits:** `✨(split-view): ...`, `✨(akut): ...`, `🧪(...): ...`.

## Abschluss-Signal

`status: done`, `## Spec Change Log`, Übergabe an G5 (Polish).

## Spec Change Log

- **2026-04-17 · Frontend-Engineer:** G4 Frontend komplett implementiert.
  - `splitViewStore` (react-store) + `useSplitViewUrlSync` + `useSplitViewResponsive` + `useSplitViewHotkey` (`cmd/ctrl+shift+g`).
  - `LagekarteGefahrenmatrixSplitView` Layout (40:60 xl / 50:50 2xl) in `features/einsatz/ui/layouts/`.
  - `SplitViewToggle` Molecule (aria-switch, disabled <xl, Tooltip).
  - Route-Integration in `gefahren.tsx` + `karte.tsx` (inkl. `validateSearch` für `split`).
  - Focus-Roundtrip: `GefahrenmatrixCell.onMouseDownCapture` → `setFocus(cell)`; `GefahrenzoneDetailPanel`-Mount → `setFocus(zone)`; BBox-`fitBounds` in `GefahrenzoneHost` für Cell-Focus.
  - `useAkutConfirm` Hook + `AkutBroadcastDialog` (Headless-UI; einzige Modal-Stelle). Eingehakt in `GefahrenmatrixGrid`, `GefahrenzoneDetailPanel`, `GefahrenzoneHost`-Create-Flow.
  - `akutBroadcastStore` mit dreistufiger Eskalation (toast → persistent → banner) + `playAkutBeep` (Web-Audio-OscillatorNode, 500ms 800Hz; localStorage-persistierter Sound-Toggle).
  - `AkutBroadcastToast` Organism mit `aria-live="assertive"`, Sound-Toggle im Banner, Navigate-On-Click zum Split-View.
  - `useGefahrenmatrixWebSocket` mit Self-Filter (`aktualisiertVon === currentUserId`); global gemountet in `SingleEinsatzLayout`.
  - Spec-135-Fix: `useSplitViewResponsive` deaktiviert Split automatisch bei Viewport-Shrink unter 1280 px + Info-Toast.
  - Tests: 36 neue Unit-Tests (Store, URL-Sync, Toggle, Dialog, AkutConfirm, AkutBroadcastStore, AkutBroadcastToast), 4531/4531 Full-Suite grün, TSC grün, Lint 0 Errors.
  - Follow-up für G5: Integration-Test Matrix→Dialog→WebSocket→Toast; Self-Filter-Unit-Test für `useGefahrenmatrixWebSocket`; Reduced-Motion-Audit-Doku.
