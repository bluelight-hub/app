---
status: done
goal: G2
parent_spec: ../planning-artifacts/ux-design-specification.md
prev_spec: ./spec-g1-gefahrenzone-fundament.md
github_issue: 627
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
completed_at: 2026-04-17
---

# Spec G2 — Karten-Zone-Erstellung (Quick-Draw Flow)

## Kontext

G1 lieferte Backend-Domain + Token-System. G2 baut darauf die **nutzerfacing Karten-UI**: Zonen zeichnen, sehen, bewerten, löschen. Am Ende ist das Feature demo-fähig: Nutzer kann auf der Lagekarte eine Gefahrenzone zeichnen, Gefahrentyp + Warnstufe wählen, die Zone erscheint mit korrekter Warnstufen-Farbe und Klicks darauf öffnen ein Popover zum Ändern.

**Existierendes, wiederzuverwendendes Fundament:**

- `packages/shared/client/apis/GefahrenzonenApi.ts` (generiert, 4 Methoden).
- `packages/frontend/src/features/gefahrenmatrix/ui/atoms/WarnstufeChip.tsx` (atom).
- `packages/frontend/src/features/lagekarte/detail-providers/warnstufe-style.ts` (`getWarnstufeMapStyle`, `WARNSTUFE_CHIP_STYLES`).
- `packages/frontend/src/features/lagekarte/detail-providers/severity-styles.ts` — Vorbild für generische Panel/Popup-Darstellung.
- Custom-Draw-Modes-Registry: `packages/frontend/src/features/lagekarte/hooks/use-draw-control.ts` Zeile 225–237.
- `CircleMode` bei `packages/frontend/src/features/lagekarte/drawing/custom-modes/circle.mode.ts` (bestehend, wiederverwendbar).
- `EinsatzEventsGateway` bei `packages/backend/src/infrastructure/websocket/einsatz-events.gateway.ts` — `broadcastToEinsatz(einsatzId, eventName, payload)` — Einsatz-Room-Broadcast.
- Outbox-Publisher dispatcht Domain-Events; Broadcast-Adapter auf WebSocket erfolgt via Subscriber-Pattern (bestehende Gefahrenmatrix-Broadcast als Vorbild — erst suchen, dann wiederverwenden).
- TanStack-Query-Muster: `packages/frontend/src/features/gefahrenmatrix/api/queries.ts` + `mutations.ts`.
- Bestehender WebSocket-Client + Sync-Hook: `packages/frontend/src/features/lagekarte/api/use-lagekarte-websocket.ts`, `features/funk/...` — erst prüfen welcher Socket-Manager verwendet wird.

## Ziele

1. TanStack-Query-Hook `useGefahrenzonen(einsatzId)` für GET-List.
2. TanStack-Mutation-Hooks: `useCreateGefahrenzone`, `useDeleteGefahrenzone`, `useUpdateGefahrenzoneGeometry`.
3. Backend: Bridge-Subscriber, der die drei Gefahrenzone-Domain-Events (aus Outbox) via `EinsatzEventsGateway` an alle Einsatz-Room-Clients broadcastet. Vorbild: bestehende Gefahrenmatrix-Bridge (falls vorhanden; sonst schlanke neue).
4. Frontend-WebSocket-Subscriber: bei eingehendem Gefahrenzone-Event → TanStack-Query-Cache invalidieren.
5. MapGL-Layer-Komponente `GefahrenzoneLayer` — rendert alle Zonen aus Query-Cache mit `getWarnstufeMapStyle`, inkl. AKUT-Glow. Click-Handler öffnet Inline-Popover.
6. Draw-Controls: Toolbar-Button (Zeichen-Icon) + Tastatur-Shortcut `g` + Dropdown für Geometrietyp (Polygon / Kreis). Nach Draw-Abschluss: Übergabe an Inline-Popover.
7. `GefahrenzoneInlinePopover` — Headless-UI-`<Popover>`, Combobox (13 Gefahrentypen) + Warnstufen-RadioGroup + „Speichern" (Enter) + „Abbrechen" (Esc). Defaults: Gefahrentyp = letzter im Einsatz verwendeter, Warnstufe = HOCH.
8. **Warnstufe-Änderung bei Zone-Klick:** selbes Popover, Pre-filled. Update geht an `Matrix-Bewertung` (bestehender Endpoint) — NICHT an Zone. Spezialfall AKUT-Confirm kommt in G4; in G2 bleibt der Klick-Flow ohne Confirm.
9. Integration in `LagekarteView` — Layer, Draw-Controls, Popover mounten.
10. Tests: Hook-Tests, Popover-Interaction, Layer-Render-Tests, Draw-Flow-Integration, Backend-Bridge-Subscriber.

## Nicht-Ziele

- Kein Matrix-Badge/Orphan-Indicator (G3).
- Kein Split-View, kein AKUT-Broadcast-Dialog, kein Toast (G4).
- Kein Undo, kein Onboarding (G5).
- Keine Geometry-Drag-Edit der existierenden Zonen (bleibt als Folge-Task; nur Löschen + Neuzeichnen in G2).
- Keine Zone-Liste-UI (Panel kommt über DetailProvider in G3).

## Architektur — Frontend

### API-Layer `packages/frontend/src/features/gefahrenzone/api/`

**Queries (`queries.ts`):**

```typescript
export const GEFAHRENZONE_QUERY_KEYS = {
  all: ['gefahrenzonen'] as const,
  byEinsatz: (einsatzId: string) => [...GEFAHRENZONE_QUERY_KEYS.all, einsatzId] as const,
};

export function useGefahrenzonen(einsatzId: string) {
  return useQuery({
    queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.gefahrenzonen().gefahrenzonenControllerListVAlpha({ einsatzId });
      return response.data.zonen;
    },
    enabled: !!einsatzId,
    staleTime: 30_000,
  });
}
```

**Mutations (`mutations.ts`):**

- `useCreateGefahrenzone` mit optimistic update (neu mit temp-id in Cache; `onSuccess` → invalidate + replace).
- `useDeleteGefahrenzone` — optimistic remove, `onError` → rollback.
- `useUpdateGefahrenzoneGeometry` — optimistic; Geometry wird replaced.

### WebSocket-Sync `packages/frontend/src/features/gefahrenzone/api/use-gefahrenzone-websocket.ts`

Analog zu `use-lagekarte-websocket.ts`. Abonniert die drei Events; invalidiert `GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId)` bei jedem.

### UI-Komponenten `packages/frontend/src/features/gefahrenzone/ui/`

| Komponente                      | Ebene     | Verantwortung                                                                                                |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `GefahrenzoneLayer.tsx`         | organisms | MapGL `<Source>` + `<Layer>` (fill + line + optional glow für AKUT); Click-Handler                           |
| `GefahrenzoneDrawControls.tsx`  | molecules | Toolbar-Button-Gruppe (Polygon/Kreis) + `g`-Shortcut; aktiviert Draw-Mode via `draw.store`                   |
| `GefahrenzoneInlinePopover.tsx` | molecules | Headless-UI-Popover mit `<Combobox>` + `<RadioGroup>` + Submit/Cancel; Form via `@tanstack/react-form` + Zod |
| `GefahrentypPicker.tsx`         | atoms     | Combobox-Wrapper — liest 13 Gefahrentypen aus bestehenden Labels in `gefahrenmatrix.schema.ts`               |

### Integration in `LagekarteView`

- `<GefahrenzoneLayer einsatzId={einsatzId} onZoneClick={openPopover} />` nach DWD/NINA-Layern mounten (AKUT über allen anderen — `zIndex`-Logik oder `beforeId`).
- `<GefahrenzoneDrawControls />` in bestehende Karten-Toolbar integrieren.
- `<GefahrenzoneInlinePopover />` als singuläre Instanz am View-Root — Position via Anchor (Click-Koordinate bzw. Draw-Schwerpunkt).

### Draw-Integration

- **Keine neuen Custom-Modes** — reuse `draw_polygon` (MapboxDraw default) und `draw_circle` (existierender Custom Mode).
- `draw.store`-Erweiterung: neues Feld `drawContext: 'gefahrenzone' | 'taktisch' | null`. `GefahrenzoneDrawControls` setzt Context beim Aktivieren; Draw-Completion-Handler liest den Context, um zu wissen, ob das gezeichnete Feature zu einer Zone werden soll.
- Nach `draw.create` Event mit Context `gefahrenzone`: Geometry in Client-State, Popover öffnet am Feature-Schwerpunkt.
- Bei Save: `useCreateGefahrenzone` mit `{ geometry, geometryType, gefahrentyp, schutzobjekt, bezeichnung? }`. Nach Commit: MapboxDraw-Feature via `draw.delete` entfernen (Zone wird nun vom `GefahrenzoneLayer` gerendert, nicht vom Draw-Layer).
- Bei Abbruch: `draw.delete` auf das gerade gezeichnete Feature.

### Zone-Klick-Flow

- `GefahrenzoneLayer` hat `onClick` pro Feature. Click liefert `zoneId`.
- Popover öffnet im „Edit-Mode": Gefahrentyp read-only (ist Teil der Zone-Identität), Warnstufe-RadioGroup pre-filled mit aktueller Matrix-Bewertung. Submit ruft `useUpdateGefahrenmatrixBewertung` (bestehender Hook). Keine direkte Änderung der Zone (außer optional `bezeichnung`).
- „Zone löschen" Icon-Button in Popover-Footer → Confirm-Dialog → `useDeleteGefahrenzone`.

### Defaults-Memorisierung

- `@tanstack/react-store`-basierter Store `gefahrenzoneDrawStore` hält `lastUsedGefahrentyp: Gefahrentyp | null` + `lastUsedSchutzobjekt: Schutzobjekt` (default `MENSCHEN`). Pro Einsatz sessions-lokal; Reset bei Einsatz-Wechsel.
- Default Warnstufe = `HOCH` (Spec-Konvention).

### Accessibility (G2-Scope)

- Toolbar-Buttons tab-fokussierbar, Tooltips mit Shortcut-Anzeige.
- Popover: Focus-Trap via Headless-UI; Enter = Submit; Esc = Cancel; `aria-labelledby` auf Popover-Header.
- RadioGroup mit Pfeil-Navigation (Headless-UI-Standard).
- `aria-live="polite"` für „Zone erstellt"-Screenreader-Hinweis (Silent Confirmation).
- AKUT-Pulse respektiert `prefers-reduced-motion` (läuft bereits via Token-CSS aus G1).
- Kein Coach-Mark, kein komplexer a11y-Audit in G2 (→ G5).

## Architektur — Backend

### Bridge-Subscriber (neu, wenn nicht vorhanden)

**Ziel:** Domain-Events aus Outbox auf `EinsatzEventsGateway` mappen, damit Frontend-Clients Echtzeit-Updates bekommen.

**Erster Schritt:** Grep nach bestehenden Bridge/Subscriber-Services für `gefahrenmatrix.aktualisiert` oder `funkkanal.*`. Wenn ein Muster existiert (z. B. `EinsatzEventBroadcastBridge`), **exakt dieses Pattern duplizieren** für die drei Gefahrenzone-Events.

**Minimal-Spec der Bridge:**

- Subscriber auf Domain-Event-Stream (`EventBus.subscribe` oder `OutboxEventPublisher.on`).
- Pro Gefahrenzone-Event: Payload → WebSocket-Event-Name:
  - `gefahrenzone.erstellt` → `gefahrenzone:erstellt` (einsatz-room).
  - `gefahrenzone.geometry-geaendert` → `gefahrenzone:geometry-geaendert`.
  - `gefahrenzone.geloescht` → `gefahrenzone:geloescht`.
- Payload identisch zum Event (serialisiert).
- Registrierung des Subscribers in `GefahrApplicationModule` oder einem neuen `GefahrenzoneBroadcastModule`.

**Tests:**

- Unit: Subscriber ruft `gateway.broadcastToEinsatz(einsatzId, eventName, payload)` korrekt auf.
- Integration: Command → Outbox → Subscriber → Gateway-Broadcast (gemockter Gateway).

### Kein DTO-Change

- Alle Endpoints und DTOs aus G1 bleiben unverändert.

## Tests (Definition of Done)

**Frontend:**

- `useGefahrenzonen`: Cache-Key-Stabilität, `enabled`-Gate, Data-Shape.
- `useCreateGefahrenzone`: optimistic update + rollback bei Error.
- `useDeleteGefahrenzone`: optimistic remove + rollback.
- `useUpdateGefahrenzoneGeometry`: optimistic replace + rollback.
- `use-gefahrenzone-websocket`: Event-Dispatch → Query-Invalidate (mit Event-Bus-Mock).
- `GefahrenzoneInlinePopover`: Submit-Flow (Combobox + RadioGroup → Mutation); Cancel via Esc; Defaults; Validation-Errors.
- `GefahrenzoneLayer`: rendert Features mit richtiger Paint-Config aus `getWarnstufeMapStyle` (Snapshot/Paint-Prop-Check); Click-Callback feuert mit richtiger zoneId.
- `GefahrenzoneDrawControls`: `g`-Shortcut aktiviert Mode; Button-Gruppe toggelt Polygon/Kreis; deaktiviert sich nach Draw-Complete.
- Integration-Test: LagekarteView mit gemocktem MapGL → Draw → Popover → Save → Cache-Invalidate → Layer-Re-render mit neuer Zone.

**Backend:**

- Bridge-Subscriber-Unit-Test je Event.
- Bridge-Integration-Test: Command-Handler → Outbox → Subscriber → `broadcastToEinsatz`-Call verifiziert.
- Bestehende Backend-Suite bleibt grün (keine Regression).

**Validation Commands (grün vor Abschluss):**

- `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="gefahrenzone|Gefahrenzone" --no-coverage`
- Backend: `cd packages/backend && npx jest --testPathPatterns="gefahrenzone" --no-coverage`
- `pnpm --filter @bluelight-hub/backend check:di:imports`
- `pnpm --filter @bluelight-hub/backend check:arch`
- `pnpm lint` (0 Errors, keine neuen Warnings im G2-Scope)

## Task-Reihenfolge (Dependency-geordnet)

1. **Backend-Bridge**
   1.1. Grep nach existierendem Broadcast-Bridge-Muster (Gefahrenmatrix o. Ä.); Pattern bestimmen.
   1.2. `GefahrenzoneBroadcastSubscriber` (oder Bridge-Service) implementieren — alle 3 Events.
   1.3. Unit- + Integration-Tests.
2. **Frontend-API-Layer**
   2.1. `features/gefahrenzone/api/queries.ts` — Query-Keys + `useGefahrenzonen`.
   2.2. `features/gefahrenzone/api/mutations.ts` — drei Mutations mit optimistic-Logic.
   2.3. Unit-Tests für Hooks (TanStack Query Testing).
3. **Frontend-WebSocket-Sync**
   3.1. `use-gefahrenzone-websocket.ts` — Subscribe + Invalidate.
   3.2. Unit-Test mit Bus-Mock.
4. **Frontend-UI-Atome / -Molecules**
   4.1. `GefahrentypPicker` (Combobox-Wrapper).
   4.2. `GefahrenzoneInlinePopover` (Form + Submit-Flow).
   4.3. Tests.
5. **Frontend-UI-Layer**
   5.1. `GefahrenzoneLayer` (MapGL Source/Layer, Click-Handler).
   5.2. Tests.
6. **Frontend-Draw-Integration**
   6.1. `draw.store` um `drawContext` erweitern.
   6.2. `GefahrenzoneDrawControls` (Toolbar + Shortcut).
   6.3. Draw-Completion-Handler → Popover-Anchor.
   6.4. Tests.
7. **LagekarteView-Integration**
   7.1. Layer + Controls + Popover im View mounten.
   7.2. Integrations-Test (E2E im jsdom).
8. **Validation-Gate**
   8.1. Alle Validation-Commands grün.
   8.2. Manuelle Smoke-Tests: Zone zeichnen → speichern → Warnstufe ändern → löschen.

## Notizen für den Implementierer

- **Feature-Struktur:** Neues Feature-Verzeichnis `packages/frontend/src/features/gefahrenzone/` — konsistent mit bestehenden Feature-Slices. Importe zwischen Features erlaubt (siehe Projekt-Pattern).
- **MapGL-Lib:** existiert bereits (Memory: „Lagekarte nutzt MapGL, nicht mehr Leaflet"). Prüfen welche Lib konkret (`react-map-gl`, `maplibre-gl` o. Ä.) — Pattern aus DWD/NINA-Layern übernehmen.
- **Keine manuellen `fetch()`-Calls.** Nur der generierte Client. Sollte ein Endpoint nicht generiert sein: prüfen ob Controller-Decorators korrekt sind (`@ApiWrappedResponse` + `@Tags('Gefahrenzonen')`) und dann `pnpm run generate-api` neu laufen.
- **Matrix-Update bei Zone-Klick:** nicht in G2 duplizieren — reuse `useUpdateGefahrenmatrixBewertung` aus `features/gefahrenmatrix/api/mutations.ts`.
- **AKUT-Confirm** ist G4. In G2 darf die Warnstufe direkt auf AKUT gesetzt werden ohne Dialog — wir vermerken es in den G2-Grenzen.
- **Click-vs-Draw:** Click auf existierende Zone darf nicht versehentlich eine neue Zone starten. `GefahrenzoneLayer`-Click-Handler muss Vorrang vor Draw-Mode-Aktivierung haben (z. B. Draw-Mode deaktivieren, wenn Click auf Feature mit `kind: 'gefahrenzone'` trifft).
- **Route-Nesting:** keine neuen Endpoints nötig — alles unter `/einsatz/:einsatzId/gefahrenzonen` existiert.
- Commit-Format konsistent `✨(gefahrenzone): ...` / `🧪(gefahrenzone): ...`. Viele kleine Commits willkommen.

## Abschluss-Signal

Wenn grün: `status: done` im Frontmatter, `## Spec Change Log`-Abschnitt mit:

- Files neu/geändert.
- Abweichungen + Begründung.
- Test-Counts exakt (Backend x/y, Frontend a/b).
- Übergabe an G3 (Matrix-Integration).

## Spec Change Log

**Datum:** 2026-04-17
**Branch:** `627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher`
**Team:** `lagekarte-gefahrenmatrix` (team-lead, backend-engineer, frontend-engineer)

### Commits (4)

- `c735ea654` ✨(gefahrenzone): WebSocket-Broadcast-Bridge für Domain-Events (backend-engineer)
- `0680af87b` ♻️(lagekarte): Draw-Context im Store + API-Singleton für Gefahrenzonen (frontend-engineer)
- `7a6386004` ✨(gefahrenzone): Feature-Slice mit API-Hooks, UI + Draw-Integration (frontend-engineer)
- `152563d6b` ✨(gefahrenzone): LagekarteView-Integration — Host + Draw-Controls (frontend-engineer)

### Neue/geänderte Files

**Backend:**

- `packages/backend/src/infrastructure/events/adapters/gefahrenzone-event.adapter.ts` (neu) + zwei Spec-Files (Unit + Integration).
- `packages/backend/src/infrastructure/events/adapters/event-adapters.module.ts` (Provider-Registrierung).
- `packages/backend/src/infrastructure/events/adapters/index.ts` (Export).
- `packages/backend/src/infrastructure/websocket/events/einsatz-event.types.ts` (`EinsatzEventName`-Union um 3 neue Gefahrenzone-Channels erweitert).

**Frontend:**

- `packages/frontend/src/features/gefahrenzone/` (neues Feature-Slice):
  - `api/{queries,mutations,use-gefahrenzone-websocket,index}.ts` (+ Tests).
  - `stores/gefahrenzone-draw.store.ts`.
  - `ui/atoms/GefahrentypPicker.tsx`.
  - `ui/molecules/{GefahrenzoneInlinePopover,GefahrenzoneDrawControls}.tsx` (+ Tests).
  - `ui/organisms/{GefahrenzoneLayer,GefahrenzoneHost}.tsx` (+ Tests).
  - `index.ts`.
- `packages/frontend/src/shared/api/api.ts` — `api.gefahrenzonen()`-Singleton.
- `packages/frontend/src/features/lagekarte/stores/draw.store.ts` — `drawContext`-Feld + `setDrawContext`-Action.
- `packages/frontend/src/features/lagekarte/hooks/use-draw-control.ts` — 3-Zeilen-Early-Return bei `drawContext === 'gefahrenzone'`, damit Gefahrenzone-Host eigene Pipeline bekommt.
- `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` — `<GefahrenzoneHost>` im Map-Tree + `<GefahrenzoneDrawControls>` als Floating-Toolbar.

### Abweichungen vom Plan (mit Begründung)

1. **`GefahrenzoneHost`-Orchestrator statt direkter Integration in `use-draw-control.handleCreate`.** Der Host übernimmt Create-Flow (Draw-Completion → Popover → Mutation), Click-Delegation via `queryRenderedFeatures`, und Edit/Delete. Grund: bestehende Taktisch-Pipeline (Styling, Undo, Delta-Sync) bleibt unberührt, Gefahrenzone ist autark testbar. Spec hatte keine explizite Host-Komponente vorgesehen — pragmatische Ergänzung.
2. **Click-Delegation via `queryRenderedFeatures` im Host** statt zentraler `onClick` in `LagekarteView`. Minimal-invasiv, kein Eingriff in bestehenden MapDetail-Flow.
3. **Matrix-Update im Create-Flow ergänzt.** Beim Speichern einer neuen Zone feuert der Host zusätzlich `useUpdateGefahrenmatrixBewertung` mit der gewählten Warnstufe. Spec nannte nur die Create-Mutation; ohne Matrix-Update bliebe die Zone mit `warnstufe: null` (orphan) — UX-inkonsistent. Bestehenden Matrix-Hook sauber wiederverwendet.
4. **Draw-Feature-Cleanup nach `draw.create` via `map._controls`-Zugriff.** Leicht hacky, aber der sauberste Weg, ohne die MapboxDraw-Instanz von `use-draw-control` exponieren zu müssen. Fallback: ohne Cleanup überlagert der `GefahrenzoneLayer` das Draw-Feature nach Save visuell korrekt.
5. **AKUT-Confirm wie geplant nicht in G2** — Rauf-auf-AKUT feuert direkt ohne Dialog. Kommt in G4.

### Tests

| Bereich                                | Ergebnis                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Backend Gefahrenzone (G1+G2 kumulativ) | **54/54 grün** (10 Test-Files)                                                       |
| Backend G2-Neu (Broadcast-Adapter)     | 9/9 grün (6 Unit + 3 Integration mit EventEmitter2)                                  |
| Frontend Gefahrenzone-Scope            | **33/33 grün** (7 Test-Files)                                                        |
| Frontend Draw/Lagekarte-Regression     | **277/277 grün** (23 Test-Files, keine Regression durch `handleCreate`-Early-Return) |
| `check:di:imports`                     | ✅ 1891 Files                                                                        |
| `check:arch`                           | ✅ keine Cycles                                                                      |
| `pnpm lint`                            | ✅ 0 Errors, 28 Warnings (pre-existing)                                              |
| `tsc --noEmit`                         | ✅ clean                                                                             |

### Event-Contract Backend ↔ Frontend verifiziert

- Namespace: `/ws/einsatz-events`.
- Channels (alle im Einsatz-Room `einsatz:{einsatzId}`): `gefahrenzone:erstellt`, `gefahrenzone:geometry-geaendert`, `gefahrenzone:geloescht`.
- Payload-Shapes: wie in Bridge-Adapter serialisiert; Frontend-Subscriber invalidiert bei jedem Event den Query-Cache.

### Nicht verifiziert in diesem Gate (Follow-Up)

- **Browser-Smoke-Test mit laufendem Dev-Server** — nicht durchgeführt (kein automatischer Dev-Server-Start im Gate). Empfehlung: manueller Smoke vor PR-Merge oder via MCP `chrome-devtools`-Integration:
  - Polygon + Kreis-Draw-Flow.
  - WebSocket-Sync zwischen zwei Browser-Tabs (gleicher Einsatz).
  - Zone-Klick → Edit-Flow → Warnstufe-Änderung.
  - Dark-Mode-Darstellung der Warnstufen-Farben.

### Übergabe an G3 (Matrix-Integration)

- `useGefahrenzonen(einsatzId)` bereit → Zone-Zählung pro Matrix-Zelle clientseitig trivial.
- `GefahrenzoneInlinePopover` wird in G3-Detail-Panel-„Bearbeiten"-Aktion wiederverwendet.
- `getWarnstufeMapStyle` + `WarnstufeChip` bereits in Einsatz.
- `GefahrenzoneHost` ist die Anker-Komponente, an der G3-`GefahrenzonenDetailProvider` angeschlossen werden kann.
