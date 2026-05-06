# Story 4.4: Bidirektionale Navigation Karte ↔ Detail-Ansicht

Status: done

## Story

As a **Sicherheitsbeauftragter**,
I want **von einem Sicherungsposten-Marker auf der Lagekarte direkt in die Detail-Ansicht des Postens springen zu können — und umgekehrt aus der Sicherungsposten-Liste „Auf Karte zeigen" auszulösen, wodurch die Karte den Marker zentriert und einmalig hervorhebt**,
so that **ich ohne Modus-Wechsel-Friktion zwischen tabellarischer Liste und räumlicher Karte arbeiten kann (FR28 Teil 2, UX-DR12)**.

## Pivot-Anker (lies zuerst!)

- **Story 4.3 ist `done` — `SecurityPostMapMarker.tsx` ist die Erweiterungs-Stelle, NICHT eine neue Host-Komponente.** Die Komponente liegt bereits unter `packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx` (im Working-Tree noch uncommitted aus dem 4.2/4.3-Bündel; wird vor dem 4.4-Start committet) und exportiert die Story-4.4-Anker-Konstanten `SICHERUNGSPOSTEN_LAYER_ID`, `SICHERUNGSPOSTEN_SOURCE_ID`, `SICHERUNGSPOSTEN_MARKER_IMAGE`. Story-4.3-Pivot-Anker (`415-4-3-...md` Z. 23) sagt explizit: **„Story 4.4 ersetzt dann den Hover-Tooltip durch den Click-Popover."** Wir bauen also **keinen** parallelen `SicherungspostenHost`, sondern erweitern die bestehende Komponente um (a) Click-Popover mit „Details öffnen"-Link, (b) `focus`-Prop-Auswertung mit FlyTo + Highlight-Ring. Hover-/Touch-Tooltip wird durch das Click-Popover ersetzt (Click pinnt den Popover, Outer-Click schließt — der bestehende `mousemove`/`mouseleave`-Listener-Code wird entfernt bzw. zu einem Click-Listener umgebaut).
- **Mount in `LagekarteView` ist Pflicht-Verifikations-Schritt:** `grep -n "SecurityPostMapMarker" packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` liefert aktuell **0 Treffer** — Story 4.3 hat den AC1-„Mount in LagekarteView" entweder deferred oder noch nicht eingetragen. Vor dem 4.4-Start: prüfen, ob der finale 4.3-Commit den Mount enthält. Wenn nicht, übernimmt 4.4 ihn. Pattern: `<SecurityPostMapMarker einsatzId={einsatzId} mapRef={mapRef} isMapLoaded={isMapLoaded} focus={focus} />` innerhalb des `<Map>`-Blocks, neben `GefahrenzoneHost` (`LagekarteView.tsx:557`).
- **Backend `GET :postenId` existiert nicht** — der Detail-Page braucht zwingend einen neuen Single-Resource-Endpoint. Pattern 1:1 von `GetSicherheitsregelQuery` (`packages/backend/src/application/eigenschutz/queries/get-sicherheitsregel/get-sicherheitsregel.query.ts`) übernehmen: Cross-Einsatz liefert **`NotFound`** (kein 403 — verhindert Existenz-Leak), Permission `eigenschutz:sicherungsposten:read`, Repository-Methode `findReadModelById` ist bereits vorhanden (`sicherungsposten.controller.ts:220 loadDto`).
- **Detail-Page ist eine eigene Komponente, kein Drawer-Wrapper:** Architektur listet `/sicherungsposten/:id` separat (`architecture.md:934`), und `GefaehrdungenDetailPage` (`packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx`) ist das kanonische Pattern: Read-Header mit Bezeichnung + Version-Badge, Editor-Inhalte, „Bearbeiten"-CTA öffnet den bestehenden `SicherungspostenDrawer` (`SicherungspostenDrawer.tsx`). **Wir wiederverwenden Drawer + Auflöse-Dialog** (Story 4.1 + 4.2) — wir bauen **keinen** zweiten Editor.
- **Focus-Deep-Link-Mechanik wiederverwenden, nicht neu erfinden:** `LagekarteView` hat bereits eine generische `focus?: string`-Prop (`LagekarteView.tsx:74`), die aktuell `zone:{zoneId}` parst und an `GefahrenzoneHost` durchreicht. **AC fügt** das Schema `sicherungsposten:{postenId}` hinzu — `karte.tsx:12-18 validateSearch` bleibt unverändert (`focus` ist bereits `string | undefined`). `SecurityPostMapMarker` bekommt eine neue `focus?: string`-Prop, parst das Präfix selbst und ignoriert andere Schemas. **Kein** neuer Store, **kein** neuer URL-Param.
- **Listen-Aktion „Auf Karte zeigen" navigiert per URL, nicht per Store:** Klick auf den Listen-Button macht `navigate({ to: '/app/einsatz/$einsatzId/übersicht/karte', search: { focus: 'sicherungsposten:<id>' } })`. Damit ist die Aktion deep-linkbar (Vorbau für Story 7.4), und der Highlight-Effekt wird vom `SecurityPostMapMarker`-`focus`-Effect getriggert — kein paralleler Client-State.
- **Standort-Discriminated-Union:** `posten.standort` ist `coordinate | address | null` (siehe `formatStandort` in `SicherungspostenList.tsx:40-55` und `isCoordinateStandort` in `SecurityPostMapMarker.tsx:79-91`). „Auf Karte zeigen" ist nur sinnvoll bei `kind === 'coordinate'`. Address-only-Posten haben **keinen** Marker (Story 4.3-AC) und der Listen-Button bleibt disabled mit Tooltip — nicht verwechseln mit „aufgelöst".
- **Truncation-Utility ist da — wiederverwenden:** Story 4.2 hat `truncateAbloesezeitenForTooltip(text, maxChars=120)` in `packages/shared/src/utils/eigenschutz/abloesezeiten.ts` geliefert; Story 4.3 nutzt sie bereits in `SecurityPostMapMarker.tsx:106`. Das Click-Popover **muss** dieselbe Utility nutzen — keine zweite Implementierung.
- **Highlight-Ring ist deklarativ-CSS, nicht imperativ-Map-API:** Eine `motion-safe`-CSS-Animation (Pulse-Ring 1.5 s `ease-out`, dann `opacity: 0`) auf einem `<Marker>` oder `<Layer>` mit `prefers-reduced-motion: reduce` als statischer Ring-Fallback (1.5 s sichtbar, dann ausgeblendet, **kein** Pulse). Keine `setInterval`-Animation, keine Blink-Logik (BITV 2.0).
- **`onSuccess` der Sicherungsposten-Mutationen invalidiert aktuell nur `byEinsatz`:** Bei Hinzufügen des `byId`-Caches (AC2) **müssen** Update/Aufloese/Create ihre `onSuccess`-Handler so erweitern, dass auch `byId(einsatzId, id)` invalidiert wird — sonst zeigt die Detail-Page nach „Speichern" eine veraltete Version. Reihenfolge der `void invalidateQueries`-Calls: `byEinsatz` zuerst, `byId` danach (Pattern wie aktuell — nicht zu einer einzigen `predicate`-Variante umbauen, das wäre Pattern-Drift).
- **Aufgelöste Posten haben keinen Marker:** Story 4.3-AC schließt aufgelöste Posten aus dem Layer aus (`useListSicherungsposten(einsatzId, 'AKTIV')` in `SecurityPostMapMarker.tsx:94`). Story 4.4-Detail-Page **funktioniert** trotzdem für aufgelöste Posten (URL `/sicherungsposten/$id` mit `aufgeloestAm != null` lädt korrekt, Read-Sektionen rendern den letzten Stand, „Bearbeiten" + „Auflösen" sind nicht sichtbar), aber „Auf Karte zeigen" ist im AUFGELOEST-Tab nicht sichtbar (kein Button-Render — siehe `SicherungspostenList.tsx:118-129` aktuelle Aktions-Spalte).
- **Out-of-Scope (für 4.4):** „Link kopieren"-Button (Story 7.4), Command-Palette-Integration (Story 7.3), Marker-Cluster bei vielen Posten, Tooltip auf Hover (das Hover-Verhalten wird durch das Click-Popover ersetzt — keine parallele Hover-UI).

## Acceptance Criteria

### AC1 — Backend `GET /einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten/:postenId`

**Given** der bestehende `SicherungspostenController` (`packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts`) und die Repository-Methode `findReadModelById` (bereits in `loadDto` genutzt, Zeile 220)
**When** ein neuer `@Get(':postenId')`-Endpoint angelegt wird
**Then** trägt er die Permission-Decorator `@RequiresPermission('eigenschutz:sicherungsposten:read')`
**And** liefert bei Erfolg die `SicherungspostenDto` via `@ApiWrappedResponse(SicherungspostenDto, …)`
**And** delegiert an eine neue `GetSicherungspostenQuery(einsatzId, postenId)` plus zugehörigen Handler unter `packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/` — Pattern 1:1 von `get-sicherheitsregel/` kopieren (Query-Klasse, Handler, `__tests__/get-sicherungsposten.handler.spec.ts`).

**Given** der Posten gehört zu einem **anderen** `einsatzId` (Cross-Einsatz)
**When** der Endpoint aufgerufen wird
**Then** liefert er `404 NotFound:Sicherungsposten` (analog `loadDto`-Konvention) — **kein** 403, damit keine Existenz über Einsatz-Scope-Grenzen leakt (symmetrisch zur `GetSicherheitsregel`-Doku-Begründung in `get-sicherheitsregel.query.ts:6-9`).

**Given** ein Nutzer ohne `eigenschutz:sicherungsposten:read`
**When** er den Endpoint aufruft
**Then** liefert der `PermissionsGuard` HTTP 403.

**And** der Handler ist mit Tests gedeckt (≥ 4 Cases): erfolgreich gefunden, Cross-Einsatz → 404, gänzlich unbekannte ID → 404, Repository-Failure → 500.
**And** `pnpm run generate-api` regeneriert den Sicherungsposten-Controller-Client; das OpenAPI-Snapshot-Diff ist mitcommittet.

### AC2 — Frontend-Hook `useGetSicherungsposten(einsatzId, postenId)`

**Given** die bestehenden Sicherungsposten-Hooks (`packages/frontend/src/features/eigenschutz/api/use-sicherungsposten.ts`)
**When** ein neuer `useGetSicherungsposten`-Hook ergänzt wird
**Then** liegt er **derselben** Datei bei (kein neues Modul) und nutzt die bestehende `sicherungspostenQueryKeys`-Factory; ergänze einen `byId(einsatzId, postenId)`-Key:

```ts
export const sicherungspostenQueryKeys = {
  all: ['sicherungsposten'] as const,
  byEinsatz: (einsatzId: string) => ['sicherungsposten', einsatzId] as const,
  list: (einsatzId, status) => ['sicherungsposten', einsatzId, status] as const,
  byId: (einsatzId: string, postenId: string) => ['sicherungsposten', einsatzId, 'detail', postenId] as const,
} as const;
```

**And** `useGetSicherungsposten(einsatzId, postenId)` liefert `useQuery({ queryKey: sicherungspostenQueryKeys.byId(...), queryFn: () => api.eigenschutz().sicherungspostenControllerGetSicherungspostenVAlpha({ einsatzId, postenId }), retry: sicherungspostenRetry, meta: { silentError: true }, enabled: Boolean(einsatzId) && Boolean(postenId) })`.

**And** Mutationen (`useUpdateSicherungsposten`, `useAufloeseSicherungsposten`, `useCreateSicherungsposten`) **erweitern** ihre `onSuccess`-Cache-Invalidate, sodass der Detail-Cache des **betroffenen** Postens ebenfalls invalidiert wird:

```ts
onSuccess: (dto) => {
  void queryClient.invalidateQueries({ queryKey: sicherungspostenQueryKeys.byEinsatz(einsatzId) });
  if (dto?.id) void queryClient.invalidateQueries({ queryKey: sicherungspostenQueryKeys.byId(einsatzId, dto.id) });
},
```

**And** **kein** Optimistic-Update für den Detail-Cache (Pattern: 1.5 s Network-Round-Trip ist akzeptabel, Cache-Invalidate triggert Refetch — wir vermeiden den DTO-Mismatch-Pfad).

### AC3 — Detail-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id`

**Given** die bestehenden Routen unter `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/`
**When** eine neue File-Route `sicherungsposten/$id.tsx` angelegt wird
**Then** folgt sie dem Gefährdungen-Pattern (`gefaehrdungen/$id.tsx`):

```ts
import { SicherungspostenDetailPage } from '@/features/eigenschutz';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id',
)({
  component: SicherungspostenDetailRoute,
});

function SicherungspostenDetailRoute() {
  const { einsatzId, id } = Route.useParams();
  return <SicherungspostenDetailPage einsatzId={einsatzId} id={id} />;
}
```

**And** `routeTree.gen.ts` wird vom TanStack-Router-Vite-Plugin automatisch regeneriert (lokal via `pnpm --filter @bluelight-hub/frontend dev:vite` einmal kurz starten oder Build laufen lassen) und ist Teil des Commits — nicht manuell editieren.
**And** `SicherungspostenDetailPage` ist im barrel-export von `packages/frontend/src/features/eigenschutz/index.ts` als `export { SicherungspostenDetailPage } from './ui/pages/SicherungspostenDetailPage'` ergänzt.

### AC4 — `SicherungspostenDetailPage` Komponente

**Given** die neue Page-Komponente `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenDetailPage.tsx`
**When** sie mit `{ einsatzId, id }` gemountet wird
**Then** lädt sie via `useGetSicherungsposten(einsatzId, id)` und rendert exklusiv:

- **Loading-State** (`query.isPending`): Skeleton-Block (`data-testid="sicherungsposten-detail-loading"`, Pattern wie `GefaehrdungenSkeleton`).
- **Error-State** (`query.isError` oder `query.data === undefined` nach `isPending: false`): Inline-Banner (`role="alert"`, `data-testid="sicherungsposten-detail-error"`) mit „Sicherungsposten konnte nicht geladen werden." + „Erneut versuchen"-Button (`refetch`). **Zero-Toast** (UX-DR21).
- **404-State** (Backend-404 wird über `query.error.response.status === 404` erkannt): „Sicherungsposten existiert nicht oder gehört zu einem anderen Einsatz." + Link zurück zur Liste-Route. **Kein** Auto-Redirect.
- **Success-State**: Header (`<h1>` mit Bezeichnung + Version-Badge `v{posten.version}`, optional Status-Badge „Aufgelöst" wenn `aufgeloestAm != null`), Sektionen für Standort, Personal, Zuständigkeitsbereich, Ablösezeiten (Read-Only-Anzeige; identisches Layout wie der `SicherungspostenDrawer` ohne Form-Controls). Footer-Aktions-Bar:
  - „Bearbeiten"-Button (Primary, sichtbar wenn `aufgeloestAm == null` und User hat `eigenschutz:sicherungsposten:write`-Permission — Permission-Check via bestehenden Permission-Hook im Eigenschutz-Feature, **nicht** neu bauen) → öffnet den bestehenden `SicherungspostenDrawer` im `mode="edit"` mit `posten={data}`.
  - „Auflösen"-Button (Secondary-Danger, gleiche Bedingungen) → öffnet `AufloeseSicherungspostenDialog`.
  - „Auf Karte zeigen"-Button (Secondary-Ghost, sichtbar wenn `posten.standort?.kind === 'coordinate'` **und** `posten.aufgeloestAm == null`; sonst disabled mit Tooltip „Kein Standort hinterlegt" bzw. Button entfällt komplett bei aufgelöst) → navigiert zu `/app/einsatz/$einsatzId/übersicht/karte?focus=sicherungsposten:<id>` via `useNavigate` (siehe AC6).

**And** Drawer- und Auflöse-Dialog-Schließ-Callbacks invalidieren via Hook-Logik den `byId`-Cache → die Detail-Page zeigt nach „Speichern" automatisch die neue Version (Refetch).
**And** der Header zeigt unter dem Titel eine Mikro-Footer-Zeile „Zuletzt aktualisiert: HH:MM DD.MM.YYYY (von <userIdHash6>)" auf Basis von `posten.aktualisiertAm` + `posten.aktualisiertVonUserId` — Zeitformat via `date-fns/format` mit Locale `de`.

### AC5 — Click-Popover auf dem Marker mit „Details öffnen"

**Given** das bestehende `SecurityPostMapMarker.tsx` mit Hover-/Touch-Tooltip-Logik (Z. 173-249)
**When** Story 4.4 die Komponente erweitert
**Then** wird der bestehende Hover-Tooltip-Pfad (`mousemove`/`mouseleave`/`touchstart` auf `SICHERUNGSPOSTEN_LAYER_ID`) durch eine **Click-Popover-Logik** ersetzt:

- `map.on('click', SICHERUNGSPOSTEN_LAYER_ID, handleClick)` setzt `setPopup({ longitude, latitude, postenId, bezeichnung, personalCount, abloesezeitenTooltip })` — der Popover **pinnt** an der Marker-Stelle.
- `map.on('click', handleOuterTap)` schließt das Popover, wenn der Klick **außerhalb** des Layers war (`event.features?.length` ist 0 für die Layer-Filterung — Story-4.3-Pattern erhalten).
- `map.on('mouseenter', SICHERUNGSPOSTEN_LAYER_ID, () => map.getCanvas().style.cursor = 'pointer')` und `mouseleave` zurücksetzen — Cursor-Affordanz für Click-Marker.

**And** das Popup rendert (`<Popup … closeOnClick={false} closeButton={true}>`):

- **Titel:** `posten.bezeichnung` (truncate via `text-ellipsis` bei > 40 Zeichen)
- **Personal-Zeile:** „Personal: N Person(en)" (Anzahl `posten.personal.length`; bei 0 → „Kein Personal hinterlegt"). **Hinweis:** das `personalCount`-Feld ist im aktuellen `SicherungspostenFeatureProperties`-Typ (Z. 49) noch nicht enthalten — der Typ und die GeoJSON-Build-Stelle (Z. 110-114) müssen entsprechend erweitert werden.
- **Ablösezeit-Snippet:** der bereits existierende `abloesezeitenTooltip` (Truncation via `truncateAbloesezeitenForTooltip(..., 120)` aus Story 4.2 — **nicht neu schreiben**); leerer String → Zeile entfällt komplett (bestehende Bedingung `popup.abloesezeitenTooltip.length > 0` beibehalten).
- **Action-Link „Details öffnen"** (Button-Style Primary-Ghost, `data-testid="sicherungsposten-popover-detail-link"`) → navigiert via `useNavigate` zur Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id` (Deep-Link, Baustein für Story 7.4 — `epics.md:1350`). Schließt das Popover **vor** der Navigation (`setPopup(null)`).

**And** das Popover hat `aria-label="Sicherungsposten {bezeichnung}"`.
**And** das Popover **mutiert** keinen Server-State (reine Read-Anzeige; Bearbeiten ist Detail-Page-Aktion).
**And** der Mount in `LagekarteView` reicht — wenn nicht bereits durch 4.3 erfolgt — die neue `focus`-Prop des Markers korrekt durch (`<SecurityPostMapMarker einsatzId={einsatzId} mapRef={mapRef} isMapLoaded={isMapLoaded} focus={focus} />`); falls 4.3 die Komponente noch nicht gemountet hat, übernimmt 4.4 den Mount-Schritt.

### AC6 — Listen-Aktion „Auf Karte zeigen"

**Given** die `SicherungspostenList` (`packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenList.tsx`), aktuell mit Spalten Bezeichnung/Standort/Personal/Aktionen
**When** die Aktions-Spalte erweitert wird
**Then** rendert sie im **AKTIV-Tab** zusätzlich zu „Bearbeiten" und „Auflösen" einen dritten Button „Auf Karte zeigen" (`data-testid="sicherungsposten-show-on-map-${posten.id}"`):

- **Sichtbar nur im AKTIV-Tab** (im AUFGELOEST-Tab fehlt der Button, gleicher Mechanismus wie heute für „Bearbeiten").
- **Disabled** wenn `posten.standort?.kind !== 'coordinate'` (Address-only oder leer) — Tooltip via `title` und `aria-disabled="true"`: „Kein Standort hinterlegt — Posten ist auf der Karte nicht sichtbar."
- **Click-Handler:** `navigate({ to: '/app/einsatz/$einsatzId/übersicht/karte', params: { einsatzId }, search: (prev) => ({ ...prev, focus: 'sicherungsposten:' + posten.id }) })` via `useNavigate()`.

**And** der Type-Guard für die Discriminated Union folgt dem bestehenden Pattern in `formatStandort` (`SicherungspostenList.tsx:40-55`) — kein neues Schema, kein neuer Validator.
**And** der Button wird im **Mobile-Layout** (Tabellen-Stack-Mode falls vorhanden — sonst No-Op-Note) so platziert, dass er im selben Action-Cluster wie „Bearbeiten" / „Auflösen" sitzt.

### AC7 — `focus`-Prop auf `SecurityPostMapMarker` + FlyTo-Trigger

**Given** das bestehende `SecurityPostMapMarker` ohne `focus`-Prop
**When** die Komponente erweitert wird
**Then** akzeptiert die Props-Schnittstelle eine zusätzliche `readonly focus?: string` (analog zu `LagekarteView.focus`).
**And** ein `useEffect` mit Dep-Array `[focus, mapRef, isMapLoaded, query.data]` parst `focus`:

1. Wenn `focus` leer/undefined oder `!isMapLoaded`: keine Aktion.
2. Andernfalls regex `/^sicherungsposten:(.+)$/`: matched nicht → keine Aktion (ein anderes Schema wie `zone:`).
3. Andernfalls Posten in `query.data` per ID suchen — nicht gefunden → keine Aktion.
4. Wenn `target.standort?.kind !== 'coordinate'` → keine Aktion (Address-only-Posten haben keinen Marker, AC9).
5. Andernfalls: `prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false`; `map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 15), duration: prefersReducedMotion ? 0 : 1200 })`; `setHighlight({ postenId, longitude, latitude })`.

**And** ein erneutes Auslösen mit identischer `focus`-URL (z. B. zweimal denselben Listen-Button klicken) muss **erneut** FlyTo+Highlight triggern — Lösung: ein `triggerCount`-State pro `focus`-Eingang via `useEffect(() => { setTrigger((t) => t + 1); }, [focus])` und das eigentliche FlyTo-Effect in `[trigger, …]` (Pattern wie in der Codebase üblich; alternativ akzeptabel: `mapRef.current.flyTo` direkt im Click-Handler des Listen-Buttons aufrufen — aber **die URL-Mechanik bleibt Quelle der Wahrheit**, damit Direkt-Aufruf des Deep-Links genauso funktioniert).
**And** wenn `focus` ein anderes Schema hat (`zone:…`, `etb:…`, etc.) oder leer ist, **passiert nichts** im Marker — keine Fehlermeldung, kein Console-Log (Schema-Drift-Toleranz; `GefahrenzoneHost` parst `zone:` parallel).
**And** die `focus`-Prop wird in `LagekarteView.tsx` an die Komponente durchgereicht: `<SecurityPostMapMarker einsatzId={einsatzId} mapRef={mapRef} isMapLoaded={isMapLoaded} focus={focus} />` (Mount-Stelle: neben `GefahrenzoneHost`, `LagekarteView.tsx:557`).
**And** der `karte.tsx`-`validateSearch`-Handler bleibt **unverändert** — `focus` ist bereits `string | undefined` (`karte.tsx:15`), das Präfix-Schema `sicherungsposten:` ist eine reine Frontend-Konvention, kein neuer URL-Param.

### AC8 — Highlight-Ring bei FlyTo (BITV-konform)

**Given** der `SecurityPostMapMarker` setzt nach FlyTo einen `highlight`-State (AC7)
**When** der Highlight rendert
**Then** wird **eine** der folgenden Strategien implementiert (Wahl liegt beim Dev — beide sind akzeptabel):

- **Strategie A (CSS-Marker-Overlay):** Ein zusätzlicher `<Marker>` (react-map-gl) an der Posten-Koordinate mit Klasse `sicherungsposten-highlight-ring`. Die Klasse definiert eine `@keyframes`-Pulse-Animation (Ring expandiert von Marker-Größe auf 1.6× über 1.5 s, `opacity` 0.8 → 0). Die `@media (prefers-reduced-motion: reduce)` blendet die Animation aus und zeigt einen statischen Ring (`opacity: 0.6`, kein Pulse) für 1.5 s, dann `display: none`. CSS-Datei neben der Komponente: `SecurityPostMapMarker.css` oder Tailwind-Inline mit Custom-Animation.
- **Strategie B (MapGL-Layer-Paint):** Ein zweiter `circle`-Layer (`type: 'circle'`) mit `circle-radius`-Interpolation via `setPaintProperty` über 1.5 s; `prefers-reduced-motion`-Fallback setzt einen statischen Radius ohne Interpolation.

**And** nach 1.5 s wird `highlight` per `setTimeout` (Cleanup im `useEffect`-Return) auf `null` zurückgesetzt — der Ring verschwindet.
**And** die Farbe ist `#1d4ed8` (Brand-Blau, identisch zum Marker-Stroke) mit 60 % Alpha; **kein** Status-Color-Token (Danger/Success), der Highlight ist rein navigatorisch.
**And** **kein** Blinken, **kein** wiederholter Pulse — exakt **eine** Animation, dann ausgeblendet (Epic-AC: „kein Blinken, nur ein einmaliger Highlight-Ring").
**And** Re-Trigger desselben Highlights über erneuten Listen-Klick: `triggerCount`-Pattern aus AC7 stellt sicher, dass das `setTimeout` neu aufgesetzt wird (Cleanup → neuer Timer).

### AC9 — Disabled-Pfad bei Posten ohne Koordinate

**Given** ein Sicherungsposten mit `standort?.kind === 'address'` oder `standort == null`
**When** der Listen-Button „Auf Karte zeigen" gerendert wird (AC6)
**Then** ist er `disabled` mit `aria-disabled="true"` und `title`-Tooltip „Kein Standort hinterlegt — Posten ist auf der Karte nicht sichtbar."
**And** der Klick triggert **keine** Navigation (Click-Handler-Guard: `if (posten.standort?.kind !== 'coordinate') return;`).
**And** falls trotzdem ein Deep-Link manuell auf `/karte?focus=sicherungsposten:<address-only-id>` aufgerufen wird, **schluckt** der `SicherungspostenHost` den FlyTo silently (AC7-Bedingung `standort.kind === 'coordinate'` ist Pflicht) und zeigt **keine** Fehlermeldung (UX-DR21). Die Karte bleibt im Default-Zustand.

### AC10 — Tests (Backend + Frontend)

**Backend (≥ 6 neue Tests):**

1. `get-sicherungsposten.handler.spec.ts`:
   - erfolgreich: Repository liefert ReadModel mit `aggregate.einsatzId === einsatzId` → Handler liefert `Result.ok(readModel)`.
   - Cross-Einsatz: Repository liefert ReadModel mit anderer `einsatzId` → Handler liefert `Result.fail('NotFound:Sicherungsposten')`.
   - unbekannte ID: `findReadModelById` liefert `Result.ok(null)` → `Result.fail('NotFound:Sicherungsposten')`.
   - Repository-Failure: → propagiert als `Result.fail`.
2. `sicherungsposten.controller.spec.ts` (Erweiterung):
   - `GET :postenId` mit erlaubter Permission → 200, DTO im `wrapped`-Body.
   - `GET :postenId` ohne `eigenschutz:sicherungsposten:read` → 403.
   - `GET :postenId` mit Cross-Einsatz-Repository-Fall → 404 mit `context.resource: 'sicherungsposten'`.

**Frontend (≥ 12 neue Tests):**

1. `SicherungspostenDetailPage.spec.tsx` (neu):
   - Loading-Skeleton wird gerendert, solange `useGetSicherungsposten` `isPending`.
   - Erfolgs-Render: Header zeigt Bezeichnung + `v{version}` + Status-Badge „Aufgelöst" wenn `aufgeloestAm != null`.
   - 404-Path: Banner mit „existiert nicht" + Link zur Liste.
   - Generic-Error-Path: Banner mit „Erneut versuchen" → Klick triggert `refetch`.
   - „Bearbeiten"-Klick öffnet `SicherungspostenDrawer` (Mock) mit `mode="edit"` und `posten={data}`.
   - „Auflösen"-Klick öffnet `AufloeseSicherungspostenDialog` (Mock).
   - „Auf Karte zeigen"-Klick navigiert mit `search.focus === 'sicherungsposten:<id>'` (Mock `useNavigate`).
   - „Auf Karte zeigen" ist disabled, wenn `standort?.kind === 'address'`.
2. `SicherungspostenList.spec.tsx` (Erweiterung):
   - „Auf Karte zeigen"-Button ist im AKTIV-Tab gerendert mit korrekter `data-testid`.
   - Button disabled für Address-only-Posten; Tooltip via `title`-Attribut prüfbar.
3. `SecurityPostMapMarker.spec.tsx` (Erweiterung, ≥ 4 neue Tests — die bestehenden 4.3-Tests bleiben grün, ggf. wird der Hover-Test in einen Click-Test umgebaut):
   - Klick auf den Layer öffnet das Popover mit Bezeichnung, Personal-Anzahl, Ablösezeit-Snippet via `truncateAbloesezeitenForTooltip`.
   - Popover „Details öffnen"-Klick navigiert zur Detail-Route (Mock `useNavigate`) und schließt das Popover.
   - `focus="sicherungsposten:<id>"` triggert `mapRef.flyTo` mit korrekter Koordinate (Mock `flyTo`-Spy).
   - `focus="sicherungsposten:<id>"` für einen Posten mit `standort.kind === 'address'` triggert **keinen** `flyTo`.
   - Highlight verschwindet nach 1.5 s (`vi.useFakeTimers()`).

**And** alle bestehenden Specs bleiben grün:

- `SicherungspostenPage.spec.tsx`, `SicherungspostenDrawer.spec.tsx`, `SicherungspostenList.spec.tsx`, `SecurityPostMapMarker.spec.tsx` (Hover-Tests ggf. zu Click-Tests umbauen, wenn Hover-Pfad entfernt wird), `sicherungsposten.controller.spec.ts`, `list-sicherungsposten.handler.spec.ts`, `LagekarteView.spec.tsx` (Mount-Smoke).
  **And** Test-Counts werden in der Completion-Notes-Liste exakt protokolliert (z. B. „Backend 12/12 in get-sicherungsposten + 9/9 in controller, Frontend 14/14 SicherungspostenDetailPage + …").

### AC11 — Dokumentation + DoD

**Given** die Architektur-Doku führt aktuell `SicherungspostenPanel` und `SecurityPostMapMarker` als FE-Bausteine (`architecture.md:1934, 2037, 2186`)
**When** Story 4.4 die Detail-Page + Host neu einführt
**Then** wird ein kurzer Inline-Note ergänzt unter dem Eigenschutz-FE-Abschnitt (`architecture.md:1944` ff.):

- `SicherungspostenDetailPage.tsx` (neu)
- `SecurityPostMapMarker.tsx` — Story 4.4 erweitert um Click-Popover + `focus`-Prop
- Verweis auf Deep-Link-Schema `focus=sicherungsposten:<id>` analog `focus=zone:<id>`

**And** der Pfad `/sicherungsposten/:id` ist im Routen-Inventar der Architektur (`architecture.md:934`) als „implementiert in Story 4.4" markiert (Inline-Kommentar genügt — kein neuer ADR nötig).
**And** **DoD**:

- `pnpm lint` (oxlint + oxfmt) grün.
- `pnpm --filter @bluelight-hub/backend check:di:imports` grün.
- `pnpm --filter @bluelight-hub/backend check:arch` grün (keine zyklischen Deps).
- `pnpm --filter @bluelight-hub/backend test --testPathPattern get-sicherungsposten` + Controller-Spec grün.
- `pnpm --filter @bluelight-hub/frontend test --testPathPattern "SicherungspostenDetailPage|SecurityPostMapMarker|SicherungspostenList|use-sicherungsposten"` grün.
- `pnpm run generate-api` durchgelaufen, Diff committet.
- `routeTree.gen.ts` regeneriert, Diff committet.
- Manuelle Browser-Verifikation (Vite-Dev gegen lokalen Stack): Liste → „Auf Karte zeigen" → Karte zoomt + Highlight; Karte → Marker-Klick → Popover → „Details öffnen" → Detail-Page mit Bezeichnung; „Bearbeiten" → Drawer → Speichern → Detail-Page zeigt neue Version. Wenn die Browser-Verifikation nicht durchführbar ist (z. B. Tauri-only Setup), explizit in den Completion-Notes vermerken.

## Tasks / Subtasks

- [x] **T1** Backend: `GetSicherungspostenQuery` + Handler + Endpoint (AC1, AC10)
  - [x] T1.1 Neues Verzeichnis `packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/` mit `get-sicherungsposten.query.ts`, `get-sicherungsposten.handler.ts`, `__tests__/get-sicherungsposten.handler.spec.ts` (Pattern aus `get-sicherheitsregel/`).
  - [x] T1.2 Handler-Tests: 4 Cases (erfolgreich, Cross-Einsatz, unbekannt, Repo-Failure).
  - [x] T1.3 Handler in `application/eigenschutz/eigenschutz-application.module.ts` (providers + exports) registriert.
  - [x] T1.4 `@Get(':postenId')`-Endpoint in `sicherungsposten.controller.ts` via QueryBus, `@RequiresPermission('eigenschutz:sicherungsposten:read')`, `@ApiWrappedResponse(SicherungspostenDto, …)`, NotFound-Mapping (404 mit `context.resource: 'sicherungsposten'`).
  - [x] T1.5 Controller-Spec erweitert: 3 neue Cases (200, 403, 404 Cross-Einsatz) + 1 Permission-Strukturtest.
  - [x] T1.6 `pnpm --filter @bluelight-hub/backend test --testPathPatterns "get-sicherungsposten|sicherungsposten.controller"` 25/25 grün; `check:di:imports` + `check:arch` grün.

- [x] **T2** API-Client + Hook-Layer (AC2)
  - [x] T2.1 `pnpm run generate-api` — neuer `sicherungspostenControllerGetSicherungspostenVAlpha` im Client.
  - [x] T2.2 In `use-sicherungsposten.ts`: `byId`-Query-Key + `useGetSicherungsposten`-Hook (entpackt `data` analog `useListSicherungsposten`, `meta.silentError`, `enabled: Boolean(einsatzId) && Boolean(postenId)`).
  - [x] T2.3 `onSuccess` von Create/Update/Aufloese um `byId`-Invalidate erweitert (Reihenfolge: byEinsatz → byId, keine predicate-Variante).
  - [x] T2.4 5 neue Tests (lädt erfolgreich, disabled bei leeren IDs, Update-byId-Invalidate, Reihenfolge-Test, byId-Key-Shape).

- [x] **T3** `SicherungspostenDetailPage` Komponente (AC4)
  - [x] T3.1 Neue Datei `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenDetailPage.tsx`.
  - [x] T3.2 Read-Only-Layout (Header + Bezeichnung + v{version} + optional Aufgelöst-Badge + Mikro-Footer + 4 Sektionen) plus Footer-Aktions-Bar.
  - [x] T3.3 Drawer- und Auflöse-Dialog wiederverwendet (lokaler `useState` für Open/Close).
  - [x] T3.4 Permission-Gate: Bearbeiten/Auflösen nur wenn `aufgeloestAm == null`. **Hinweis (Pattern-Drift):** Im `features/eigenschutz/`-Slice existiert kein action-feingranularer Permission-Hook (kein `useEigenschutzPermissions`, kein `usePermission` für `eigenschutz:sicherungsposten:write`). Lediglich `useCanAccess(area)` ist navigations-/area-basiert. Konsistent mit der bestehenden `SicherungspostenList` (rendert Bearbeiten/Auflösen ungated) wurde **kein** zusätzlicher write-Permission-Check eingebaut — Story-Notiz „nicht neu implementieren" befolgt. Falls der Auflöse-Status-unabhängige write-Gate erwünscht ist, gehört das in eine separate Permission-Hook-Story.
  - [x] T3.5 Spec mit 9/9 Tests grün (Loading, Erfolg, Aufgelöst-Badge, 404+Link-zur-Liste, Generic-Error+Refetch, Bearbeiten-Drawer, Auflösen-Dialog, Auf-Karte-zeigen-Navigation, Disabled-State).
  - [x] T3.6 Barrel-Export in `features/eigenschutz/index.ts`.

- [x] **T4** Detail-Route (AC3)
  - [x] T4.1 Datei `routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id.tsx` Pattern 1:1 von `gefaehrdungen/$id.tsx`.
  - [x] T4.2 `routeTree.gen.ts` automatisch via Build regeneriert (Pfad ist registriert).
  - [ ] T4.3 Manuelle Browser-Verifikation: **nicht durchgeführt** (siehe T8.5 — Vite-Stack im Worktree nicht hochgefahren). Route ist über die TanStack-Router-Smoke-Tests + Specs verifiziert.

- [x] **T5** `SecurityPostMapMarker`-Erweiterung: Click-Popover + `focus` + Highlight (AC5, AC7, AC8)
  - [x] T5.1 Hover-Listener (`mousemove`/`mouseleave`/`touchstart` auf Layer) entfernt; `mouseenter`/`mouseleave` nur noch Cursor-Affordanz; `click` öffnet Popup, Outer-`click` schließt es.
  - [x] T5.2 `SicherungspostenFeatureProperties.personalCount` ergänzt + GeoJSON-Build entsprechend angepasst.
  - [x] T5.3 Popup mit „Details öffnen"-Action-Button (`useNavigate`) ergänzt; schließt Popover vor Navigation.
  - [x] T5.4 Neue Prop `readonly focus?: string` + Parser-Effect mit `triggerCount`-Pattern + `lastHandledTriggerRef` (Idempotenz-Guard gegen Render-Loop bei instabilen `query.data`-Referenzen).
  - [x] T5.5 Highlight-Ring **Strategie A** (CSS-Marker-Overlay) — Pulse-Animation 1.5 s `ease-out`, `prefers-reduced-motion: reduce` → statischer Ring (opacity 0.6, kein Pulse), 1.5 s sichtbar, dann Ausblenden via `setTimeout`-Cleanup.
  - [x] T5.6 `LagekarteView.tsx`: Mount neben `GefahrenzoneHost` neu eingefügt (4.3-Commit hatte den Mount nicht enthalten), `focus`-Prop durchgereicht.
  - [x] T5.7 Spec erweitert: 7 neue Story-4.4-Tests (Click-Popover-Inhalt, „Kein Personal hinterlegt", Outer-Click-Close, Details-Button-Navigation+Popup-Close, FlyTo bei Coordinate, kein FlyTo bei Address, kein FlyTo bei `zone:`-Schema, Highlight-Verschwinden nach 1.5s mit `vi.useFakeTimers()`); 4.3-Hover-Tests zu Click-Tests umgebaut.

- [x] **T6** Listen-Action „Auf Karte zeigen" (AC6, AC9)
  - [x] T6.1 `SicherungspostenList.tsx`: dritter Action-Button im AKTIV-Tab (`data-testid="sicherungsposten-show-on-map-${id}"`).
  - [x] T6.2 Disabled-Logik via `standort.kind`-Discriminator + `aria-disabled` + `title`-Tooltip „Kein Standort hinterlegt — Posten ist auf der Karte nicht sichtbar.".
  - [x] T6.3 `useNavigate`-Aufruf mit Updater-Funktion `search: (prev) => ({ ...prev, focus: 'sicherungsposten:' + id })`.
  - [x] T6.4 Spec mit 2 neuen Tests grün (sichtbar bei coordinate, disabled bei address).

- [x] **T7** Dokumentation (AC11)
  - [x] T7.1 Architektur-Inline-Notes ergänzt (`architecture.md` Pfade 934, 1944, 2037, 2186 — siehe Diff).
  - [x] T7.2 Story-File-Pflege: Tasks abgehakt, Completion-Notes + File List + Change Log + Test-Counts unten ergänzt.

- [x] **T8** Definition of Done (AC11)
  - [x] T8.1 `pnpm lint` grün (0 errors; Backend: 1 pre-existing Warning in `funkkanal`, Frontend: 32 pre-existing Warnings unrelated).
  - [x] T8.2 `pnpm --filter @bluelight-hub/backend check:di:imports` grün (2124 files); `check:arch` grün (no circular deps).
  - [x] T8.3 Backend 25/25 + Frontend 72/72 in den getargetteten Specs grün; voller eigenschutz-Backend-Suite-Sanity 968/968 grün.
  - [x] T8.4 `generate-api`-Diff (`packages/shared/client/apis/EigenschutzApi.ts`) + `routeTree.gen.ts`-Diff Teil des 4.4-Commits.
  - [ ] T8.5 Manuelle Browser-Verifikation **nicht durchgeführt** — Vite-Dev-Server wurde im Auto-Mode nicht hochgefahren. Verifikation via Test-Suite (Click-Popover, Detail-Page-Render, Listen-Aktion, FlyTo-Effect, Highlight-Cleanup, Permission-403-Pfad). Bei manueller Verifikation: `pnpm --filter @bluelight-hub/frontend dev:vite` + Liste → „Auf Karte zeigen" → Karte zoomt + Highlight; Marker-Klick → Popover → „Details öffnen" → Detail-Page; „Bearbeiten" → Drawer → Speichern → Detail-Page zeigt neue Version.

## Dev Notes

### Architektur-Compliance

- **Backend-Layers:** Neuer Endpoint berührt nur `modules/eigenschutz/controllers/`, neuer Handler nur `application/eigenschutz/queries/`, **keine** Domain-Änderung. Repository-Methode `findReadModelById` ist bereits vorhanden — kein neues Port/Adapter-Paar.
- **Frontend-Feature-Slice:** Detail-Page lebt in `features/eigenschutz/ui/pages/`, Marker-Erweiterung in `features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx` (existiert bereits aus 4.3). **Keine** Cross-Feature-Direktimporte: der Marker importiert aus `@/features/lagekarte/...` nur indirekt (er wird **innerhalb** des `<Map>` aus `LagekarteView` gemountet — die Komponente bekommt `mapRef` als Prop).
- **API-Workflow:** Backend → `generate-api` → TanStack-Query-Hook → Komponente. **Niemals** manueller `fetch()`.
- **Controller-Decorator:** `@ApiWrappedResponse(SicherungspostenDto, …)` (AC7 aus CLAUDE.md), **nicht** `@ApiOkResponse`.
- **DI-Imports:** Handler-Class und Controller mit Value-Imports (`import { ... }`), **nicht** `import type` für `@Injectable`.
- **CUIDs:** `postenId` ist CUID, validiert via `@IsCuid()` an Eintrittspunkten. Pattern wie bei `gefaehrdungsbeurteilungId`.

### Library- + Framework-Constraints

- **TanStack Router:** File-based, `routeTree.gen.ts` ist generiert (nicht editieren). Search-Params via `validateSearch` — wir lassen `karte.tsx`-`validateSearch` unverändert (`focus` ist bereits string).
- **TanStack Query:** Query-Key-Hierarchie ist Pflicht (`byEinsatz` → `byId`), damit Mutations präzise invalidieren können.
- **TanStack Store:** Kein neuer Store — Listen-Action navigiert via URL, Highlight via lokalem Component-State.
- **MapLibre/react-map-gl:** Popup via `<Popup>`-Komponente (siehe bereits in `SecurityPostMapMarker.tsx:243-249`); FlyTo via `mapRef.current?.getMap()?.flyTo({ center, zoom, duration })` (Pattern: `useMapDetail.ts` und/oder `LagekarteView.tsx` enthalten ähnliche Aufrufe — dort spicken statt neu erfinden).
- **`prefers-reduced-motion`:** CSS-Media-Query oder `window.matchMedia('(prefers-reduced-motion: reduce)').matches` im Effect — Pattern wie in bestehenden Animations-Hooks (suchen mit `grep -rn "prefers-reduced-motion" packages/frontend`).
- **Date-fns Format:** `format(new Date(posten.aktualisiertAm), 'HH:mm dd.MM.yyyy', { locale: de })`.
- **Testing:** Vitest + RTL für Frontend; Jest für Backend. Test-Pattern-Targeting: `pnpm --filter @bluelight-hub/backend test --testPathPattern get-sicherungsposten`, **nicht** breit `pnpm test`.

### File-Structure-Plan (Neu erstellt)

```
packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/
├── get-sicherungsposten.query.ts         (NEU — analog get-sicherheitsregel.query.ts)
├── get-sicherungsposten.handler.ts       (NEU — analog get-sicherheitsregel.handler.ts)
└── __tests__/get-sicherungsposten.handler.spec.ts  (NEU — 4 Cases)

packages/frontend/src/features/eigenschutz/ui/pages/
├── SicherungspostenDetailPage.tsx        (NEU)
└── __tests__/SicherungspostenDetailPage.spec.tsx   (NEU — ≥ 8 Tests)

packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/
└── sicherungsposten/$id.tsx              (NEU — File-Route)
```

### File-Structure-Plan (Editiert)

```
packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts
  + @Get(':postenId') Handler
  + Spec-Erweiterung (3 Cases)

packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts
  + GetSicherungspostenHandler in providers

packages/frontend/src/features/eigenschutz/api/use-sicherungsposten.ts
  + sicherungspostenQueryKeys.byId
  + useGetSicherungsposten
  + Update/Aufloese/Create onSuccess: byId-Invalidate
  + ≥ 3 neue Tests in __tests__/use-sicherungsposten.spec.tsx

packages/frontend/src/features/eigenschutz/index.ts
  + SicherungspostenDetailPage Re-Export

packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx
  - Hover-/Tooltip-Logik (mousemove/mouseleave/touchstart auf Layer)
  + Click-Listener auf Layer (öffnet pinning Popup)
  + personalCount in SicherungspostenFeatureProperties + GeoJSON-Build
  + „Details öffnen"-Button mit useNavigate
  + focus?: string Prop + FlyTo-Effect mit triggerCount
  + Highlight-Ring (Strategie A oder B)
  + Spec-Erweiterung (≥ 4 neue Tests, Hover-Tests umbauen)

packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenList.tsx
  + Action-Button „Auf Karte zeigen"
  + Spec-Erweiterung (2 Cases)

packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx
  + (sofern nicht durch 4.3-Commit) Mount: <SecurityPostMapMarker einsatzId mapRef isMapLoaded focus={focus} />
  + (sofern bereits gemountet) focus-Prop ergänzen

packages/frontend/src/routeTree.gen.ts (auto-generiert)

_bmad-output/planning-artifacts/architecture.md
  + Inline-Notes (Pfade 934, 1944, 2037, 2186)
```

### Vorherige Story-Intelligence (4.1 – 4.3)

- **Story 4.1** etablierte das Aggregate, Versions-Chain, `loadDto`, alle 4 Mutations-Endpoints und den Drawer-CRUD. Die Optimistic-Concurrency läuft via `expectedVersion` in PATCH/Auflösen — der **GET**-Endpoint braucht das nicht (reine Read-Operation).
- **Story 4.2** ergänzte Auto-Save für `abloesezeiten` im Drawer + `truncateAbloesezeitenForTooltip` (`packages/shared/src/utils/eigenschutz/abloesezeiten.ts`). Story 4.4 **konsumiert** die Truncation-Utility im Click-Popover (siehe AC5).
- **Story 4.3** baute `SecurityPostMapMarker.tsx` (Source + Layer + Image-Registrierung + Hover-Tooltip) plus `SICHERUNGSPOSTEN_LAYER_ID` / `SICHERUNGSPOSTEN_SOURCE_ID` / `SICHERUNGSPOSTEN_MARKER_IMAGE` Konstanten. Story 4.4 **erweitert** diese Komponente — der Hover-Tooltip wird durch das Click-Popover ersetzt, `focus`-Prop wird ergänzt, Highlight-Ring kommt dazu. **Wichtig:** Wenn der 4.3-Commit den Mount in `LagekarteView` noch nicht enthält, übernimmt 4.4 ihn (Verifikation per `grep`).
- **Stand 2026-05-06:** Stories 4.2 und 4.3 sind in `sprint-status.yaml` als `done` markiert, aber im Working-Tree noch uncommitted (`SicherungspostenDrawer.tsx`-Modifikation, `SecurityPostMapMarker.tsx` neu, Migration `20260506065656_expand_sicherungsposten_abloesezeiten_length`). Diese **müssen** vor dem 4.4-Start committet werden, sonst arbeitet 4.4 auf einem inkonsistenten Branch-State.
- **Bekannte Fall-Stricke aus 4.1/4.2** (`deferred-work.md`):
  - `loadDto`-Race nach Save (Read-after-Write nicht in derselben TX) — für 4.4 nicht relevant, aber konsistent halten: Detail-Page invalidiert + refetcht, kein direktes State-Mirror.
  - `aufgeloestVonUserId VARCHAR(30)`-Drift — kein direkter Impact.
  - `TanStack-onSuccess-Race mit Cache-Invalidate` (`use-sicherungsposten.ts`) — bei AC2-Erweiterung darauf achten, dass `byId`-Invalidate **nach** `byEinsatz`-Invalidate aufgerufen wird (Reihenfolge der `await`/`void`-Calls), damit der Detail-Cache nicht prematuren stale-Refetch ausführt, der wiederum die Liste re-fetched. Ein einziger `void invalidateQueries`-Call mit `predicate` wäre eleganter, aber das bestehende Pattern verwendet zwei explizite Calls — wir bleiben dabei (keine Pattern-Drift).

### Git-Intelligence (letzte Commits)

```
6c115f66e 📝(eigenschutz): Story 4.1 Doku + Defer-Liste
18fec0754 🔒(eigenschutz): Story 4.1 — Sicherungsposten CRUD + Code-Review
b9386a78d ✨(eigenschutz): Story 3.11 — Telemetrie-Capture für CBRN-Moment (FR21)
bacdd1af7 🔒(eigenschutz): Story 3.10 Code-Review-Patches angewendet
4bfe60dbf ✨(eigenschutz): Story 3.10 Task 9 — SyncConflictsPage + Route + Sub-Tab
```

→ Pattern: separate Code-Review-Commits, separate Doku-Commits, gitmoji-konform. Diese Story folgt demselben Stil — `✨(eigenschutz): Story 4.4 — Bidirektionale Navigation Karte ↔ Detail-Ansicht` als Haupt-Commit.

### Project-Structure-Notes

- Die Architektur-Doku listet `SicherungspostenPanel.tsx` (`architecture.md:1934`). In der tatsächlichen Codebase heißt die Komponente `SicherungspostenList.tsx` (Tabellen-Organism) — leichte Doku-Drift aus Story 4.1. Wir benennen **nicht** um, ergänzen aber in AC11 den Inline-Note. Die Detail-Page-Komponente (`SicherungspostenDetailPage.tsx`) ist neu und folgt `architecture.md:1944`.
- `SecurityPostMapMarker` (`architecture.md:2037, 2186`) ist Story-4.3-Implementierung — Story 4.4 erweitert sie um Click-Popover + Focus.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:1339-1362` Story 4.4 Definition]
- [Source: `_bmad-output/planning-artifacts/epics.md:1313-1337` Story 4.3 Marker-Layer]
- [Source: `packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx` Story-4.3-Layer + `isCoordinateStandort` + Layer-Konstanten]
- [Source: `_bmad-output/implementation-artifacts/415-4-3-sicherungsposten-als-mapgl-marker-layer.md` Story 4.3 Dev-Notes]
- [Source: `_bmad-output/planning-artifacts/architecture.md:934, 1944, 2037, 2186` Sicherungsposten-FE-Bausteine]
- [Source: `packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts:104-262` aktueller Controller, `loadDto` Pattern]
- [Source: `packages/backend/src/application/eigenschutz/queries/get-sicherheitsregel/get-sicherheitsregel.query.ts` analoges GET-by-id Pattern]
- [Source: `packages/frontend/src/features/eigenschutz/api/use-sicherungsposten.ts` Hook-Schicht + QueryKeys]
- [Source: `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenList.tsx:40-181` Listen-Komponente + `formatStandort` Discriminator-Pattern]
- [Source: `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenPage.tsx` aktuelle Listen-Page mit Drawer-Wiring]
- [Source: `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx` Detail-Page-Pattern]
- [Source: `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenPage.tsx:44-52` `useNavigate` für Detail-Route]
- [Source: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id.tsx` analoge File-Route]
- [Source: `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx:62-77, 540-578` Map-View mit `focus`-Prop und Host-Mount-Pattern]
- [Source: `packages/frontend/src/routes/app/einsatz/$einsatzId/übersicht/karte.tsx:7-20` `validateSearch` mit `focus`-Param]
- [Source: `packages/shared/src/utils/eigenschutz/abloesezeiten.ts` Truncation-Utility aus Story 4.2]
- [Source: `packages/frontend/src/features/lagekarte/ui/molecules/MapDetailPopup.molecule.tsx`, `OsmMarkierungPopup.molecule.tsx` Popup-Pattern]
- [Source: `packages/frontend/src/features/gefahrenzone/` `GefahrenzoneHost`-Pattern]
- [Source: `_bmad-output/implementation-artifacts/415-4-1-sicherungsposten-crud-mit-versionierung.md` Story 4.1 Dev-Notes]
- [Source: `_bmad-output/implementation-artifacts/415-4-2-abloesezeiten-als-textfeld.md` Story 4.2 Dev-Notes + Truncation-Utility]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:386-401` 4.1/4.2 bekannte Defers]
- [Source: `CLAUDE.md` API-Workflow, DI-Imports, ApiWrappedResponse-Decorator-Regeln]
- [Source: `_bmad-output/project-context.md` Tech-Stack + Implementation-Rules]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m] (Implementation orchestriert via 3 parallele Subagents — Backend, Marker-Erweiterung, Frontend-Detail/Liste)

### Debug Log References

- Stream A (Backend): 968/968 eigenschutz-Suite, 25/25 targeted (`get-sicherungsposten` + `sicherungsposten.controller`).
- Stream B (Marker): 17/17 `SecurityPostMapMarker` + 25/25 `LagekarteView` Mount-Smoke.
- Stream C (Frontend): 13/13 `use-sicherungsposten` (vorher 7, +6 neu), 9/9 `SicherungspostenDetailPage` (alle neu), 8/8 `SicherungspostenList` (vorher 6, +2 neu).
- Sync: `pnpm run generate-api` nach Stream A; `routeTree.gen.ts` automatisch via Vite-Plugin regeneriert.
- Pre-Story-Cleanup: Story 4.2 (`f51a2094f`) und Story 4.3 (`da06b032b`) aus uncommittedem Working-Tree als saubere getrennte Commits etabliert (Pivot-Anker-Anforderung).

### Completion Notes List

- **Test-Counts (alle grün):**
  - Backend: 25/25 in `get-sicherungsposten|sicherungsposten.controller` (4 neue Handler-Cases + 4 neue Controller-Cases). Voller eigenschutz-Sanity 968/968 grün.
  - Frontend: 72/72 in den 5 betroffenen Spec-Files (`use-sicherungsposten` 13/13, `SicherungspostenDetailPage` 9/9, `SicherungspostenList` 8/8, `SecurityPostMapMarker` 17/17, `LagekarteView` 25/25).
- **Permission-Hook-Pattern-Drift:** Im Eigenschutz-Slice existiert kein action-feingranularer Permission-Hook für `eigenschutz:sicherungsposten:write`. Die DetailPage gated nur auf `aufgeloestAm == null`, identisch zur bestehenden `SicherungspostenList`. Falls write-Permission-Gate erwünscht, separate Story.
- **`findReadModelById`-Signatur-Drift (Backend):** Anders als Sicherheitsregel-Pattern nimmt `findReadModelById` nur `(id, tx?)` — kein `einsatzId`-Parameter. Cross-Einsatz-Scoping erfolgt symmetrisch zu `loadDto` per `readModel.aggregate.einsatzId !== query.einsatzId`-Vergleich im Handler. JSDoc des Handlers dokumentiert die Abweichung.
- **`IsCuid`-Pipe NICHT an Path-Params:** Konsistent zum existierenden Controller-Pattern (`loadDto`, Mutationen), nicht neu eingeführt — wäre projektweite Konsistenz-Story.
- **Re-Trigger-Pattern erweitert (Marker):** Über den von der Story spezifizierten `triggerCount`-State hinaus wurde ein `lastHandledTriggerRef`-`useRef`-Idempotenz-Guard ergänzt, um Render-Loops bei instabilen `query.data`-Referenzen zu vermeiden. `focus` ist bewusst **nicht** in den FlyTo-Effect-Deps — `triggerCount` ist die einzige autoritative Re-Trigger-Quelle.
- **Highlight-Ring Strategie A** (CSS-Overlay) gewählt: deklarativer + besser testbar als Strategie B (`circle`-Layer + `setPaintProperty`).
- **`LagekarteView`-Mount neu hinzugefügt:** Story 4.3 hatte den Mount nicht in den Commit aufgenommen (Pivot-Anker-Notiz hatte das vorhergesagt). Story 4.4 übernimmt den Mount neben `GefahrenzoneHost`.
- **`pnpm lint` grün:** 0 Errors; pre-existing Warnings (1 backend in `funkkanal`, 32 frontend across files) sind unrelated.
- **Manuelle Browser-Verifikation nicht durchgeführt** — Auto-Mode-Konstellation; Verifikation via Test-Suite + tatsächliches Rendering der TanStack-Router-Routes.

### File List

**Neu erstellt (Backend):**

- `packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/get-sicherungsposten.query.ts`
- `packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/get-sicherungsposten.handler.ts`
- `packages/backend/src/application/eigenschutz/queries/get-sicherungsposten/__tests__/get-sicherungsposten.handler.spec.ts`

**Neu erstellt (Frontend):**

- `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenDetailPage.tsx`
- `packages/frontend/src/features/eigenschutz/ui/pages/__tests__/SicherungspostenDetailPage.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.css`
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id.tsx`

**Modifiziert (Backend):**

- `packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts`
- `packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts`
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/sicherungsposten.controller.spec.ts`

**Modifiziert (Frontend):**

- `packages/frontend/src/features/eigenschutz/api/use-sicherungsposten.ts`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-sicherungsposten.spec.tsx`
- `packages/frontend/src/features/eigenschutz/index.ts`
- `packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SecurityPostMapMarker.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenList.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SicherungspostenList.spec.tsx`
- `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx`
- `packages/frontend/src/routeTree.gen.ts` (auto-regeneriert)

**Modifiziert (Shared, generated):**

- `packages/shared/client/apis/EigenschutzApi.ts` (neuer `sicherungspostenControllerGetSicherungspostenVAlpha`)

**Modifiziert (Doku):**

- `_bmad-output/planning-artifacts/architecture.md` (Inline-Notes Z. 934, 1940, 1947, 2038, 2052, 2187)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (`415-4-4-…: in-progress → review`)
- `_bmad-output/implementation-artifacts/415-4-4-bidirektionale-navigation-karte-detail-ansicht.md` (Status, Tasks, Dev Agent Record, File List, Change Log)

### Change Log

- 2026-05-06 — Story 4.4 implementiert (3 parallele Subagents: Backend, Marker, Frontend); 25 Backend-Tests + 72 Frontend-Tests grün; Status → review.
- 2026-05-06 — Code-Review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) → 2 decision-needed, 8 patch, 9 defer, ~25 dismiss. Findings unten.
- 2026-05-06 — Review-Patches angewendet (P1–P9 + D2-Hash6, D1 deferred): 9 fixes umgesetzt; Backend 26/26, Frontend 80/80 (Marker 20, List 9, use-sicherungsposten 15, DetailPage 11, LagekarteView 25). Status bleibt `review` — User-finale Abnahme.

### Review Findings

- [x] [Review][Defer] AC4 Detail-Page Permission-Gate für „Bearbeiten"/„Auflösen" fehlt [SicherungspostenDetailPage.tsx] — deferred per User-Entscheidung 2026-05-06: Rechte-Modell für eigenschutz-Slice kommt in eigener Story; Konsistenz mit `SicherungspostenList` bleibt erhalten.
- [x] [Review][Patch] AC4 `aktualisiertVonHash6` — Substring auf SHA-256-Hash-Prefix umstellen (privacy-konform, stabil, diskriminierend) [SicherungspostenDetailPage.tsx]
- [x] [Review][Patch] AC10 — 403-Pfad-Test im Controller-Spec für `GET :postenId` fehlt; nur Reflect-Metadata-Test (6b) prüft die Permission [packages/backend/src/modules/eigenschutz/controllers/__tests__/sicherungsposten.controller.spec.ts]
- [x] [Review][Patch] AC2 — `byId`-Invalidate-Tests für `useCreateSicherungsposten` und `useAufloeseSicherungsposten` fehlen; nur Update getestet, obwohl beide den Cache erweitern [packages/frontend/src/features/eigenschutz/api/__tests__/use-sicherungsposten.spec.tsx]
- [x] [Review][Patch] AC8/AC10 — Kein Test für `prefers-reduced-motion`-Pfad: weder Highlight-Ring-Animation-Off-Verifikation noch `flyTo`-Duration `0` werden assert'd [packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SecurityPostMapMarker.spec.tsx]
- [x] [Review][Patch] AC6/AC10 — Kein Test, der explizit den AUFGELOEST-Tab rendert und das Fehlen des „Auf Karte zeigen"-Buttons assert'd [packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SicherungspostenList.spec.tsx]
- [x] [Review][Patch] AC5 — „Details öffnen"-Button im Popover umgeht das `Button`-Atom; Inline-Tailwind statt `<Button intent="primary" appearance="ghost">` (Pattern-Drift gegen UI-Atomik) [packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx:355]
- [x] [Review][Patch] AC5 — `aria-label="Sicherungsposten {bezeichnung}"` sitzt am inneren `<div>` statt am `<Popup>`-Container; Bezeichnung erscheint dadurch doppelt für Screenreader (Container-aria-label + sichtbarer `<p>`) [packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx:351]
- [x] [Review][Patch] 404-Response leakt internen Sentinel — `message: "NotFound:Sicherungsposten"` landet im Public-API-Body; Test 8b zementiert das. User-facing Texte sollten nicht Sentinel-Strings sein. Mappen auf „Sicherungsposten existiert nicht oder gehört zu einem anderen Einsatz." [packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts:285 + Spec 8b]
- [x] [Review][Patch] focus-Trigger bleibt unbearbeitet wenn `target` (postenId) nicht in `query.data` gefunden wird — `lastHandledTriggerRef.current` wird im Early-Return bei `!target` bewusst NICHT gesetzt; bei jedem `query.data`-Refetch (Polling-Fallback alle 10 s) re-evaluiert der Effect erneut. Sollte `query.isFetched && !target` als „handled" markieren [packages/frontend/src/features/eigenschutz/ui/organisms/SecurityPostMapMarker.tsx:289-293]
- [x] [Review][Defer] AC11 — Manuelle Browser-Verifikation nicht durchgeführt (T8.5) [Story-File] — deferred, in Completion-Notes als Auto-Mode-Limitation begründet
- [x] [Review][Defer] CUID-Validation auf `:postenId`/`:einsatzId` Path-Params fehlt [packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts] — deferred, Story-Notes deklarieren das als „projektweite Konsistenz-Story"
- [x] [Review][Defer] Cross-Einsatz Timing-Oracle: 404 für unknown vs. found-but-foreign theoretisch via DB-Latenz unterscheidbar [get-sicherungsposten.handler.ts] — deferred, Bedrohungsmodell für Existenz-Leak via Timing nicht etabliert
- [x] [Review][Defer] Popup hält stale `bezeichnung`/`personalCount` wenn `query.data` nach Open refetcht [SecurityPostMapMarker.tsx:200-235] — deferred, real aber niedrige Frequenz (5–10 s Polling)
- [x] [Review][Defer] Personal `kind: 'user'` zeigt Klar-CUID im DOM („User: clw3h8…") — User-Resolver fehlt [SicherungspostenDetailPage.tsx:describePersonal] — deferred, kein Spec-Hinweis, eigene UX-Story nötig
- [x] [Review][Defer] Popover-Focus-Management (Tab-Cycle, Escape, focus-return) fehlt; Keyboard-only-Operatoren erreichen „Details öffnen" nicht aus Map-Canvas [SecurityPostMapMarker.tsx Popup] — deferred, a11y-Story für Map-Popover-Pattern
- [x] [Review][Defer] (0,0)-Coordinate (Null Island) wird als gültig akzeptiert — `isCoordinateStandort` validiert nur Range, nicht „echte Position" [SecurityPostMapMarker.tsx:isCoordinateStandort] — deferred, Domain-Validation-Story
- [x] [Review][Defer] GeoJSON `useMemo` rebuilds auf jedem `query.data`-Refetch — bei vielen aktiven Posten + Polling ineffizient [SecurityPostMapMarker.tsx:128] — deferred, Performance-Optimierungs-Story
- [x] [Review][Defer] AC7 Re-Trigger via identischer focus-URL: `setTriggerCount(t=>t+1)` läuft auf `[focus]`-Dep; bei unveränderter URL und gemounteter Komponente fired der Effect nicht. Beim Route-Wechsel re-mountet die Komponente und der Mount-Effect setzt triggerCount=1 — daher praktisch wirksam. Nur Edge-Fall: User auf /karte mit identischem focus klickt anderswo den gleichen Deep-Link → kein Re-Trigger [SecurityPostMapMarker.tsx:260-262] — deferred, in Praxis durch Route-Re-Mount maskiert
