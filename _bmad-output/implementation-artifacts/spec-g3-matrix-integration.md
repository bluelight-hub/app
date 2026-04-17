---
status: done
goal: G3
parent_spec: ../planning-artifacts/ux-design-specification.md
prev_spec: ./spec-g2-karten-zone-erstellung.md
github_issue: 627
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
completed_at: 2026-04-17
---

# Spec G3 — Matrix-Integration (Bidirektionale Sichtbarkeit)

## Kontext

G1 lieferte Backend + Design-Tokens, G2 lieferte die Karten-UI (Zonen zeichnen/bewerten/löschen). G3 schließt den Kreis: die **Gefahrenmatrix** zeigt sichtbar, welche Matrix-Zellen räumlich verortet sind — und die Karten-Seite bekommt ein Detail-Panel, das von einer Zone zurück zur Matrix-Zelle führt.

Damit ist **bidirektionale Sichtbarkeit** ohne Split-View erreicht (Split-View kommt in G4):

- Matrix-Zelle → erkennt: „Diese Zelle hat 2 Zonen auf der Karte" oder „HOCH ohne räumliche Verortung — offener Punkt".
- Zone-Click auf Karte → Panel öffnet → zeigt Metadaten + Button „Zur Matrix-Zelle".

**Existierendes Fundament (aus G1/G2 + Bestand):**

- `useGefahrenzonen(einsatzId)` → Array `GefahrenzoneDto[]` inkl. abgeleiteter `warnstufe`.
- `useGefahrenmatrix(einsatzId)` → `data.bewertungen[]` mit `(gefahrentyp, schutzobjekt, warnstufe)`.
- `GefahrenmatrixGrid` (`features/gefahrenmatrix/ui/organisms/`) + `GefahrenmatrixCell` (molecule) — bestehende Rendering-Pipeline.
- `LayerDetailProvider`-Interface + `registerDetailProvider` (`features/lagekarte/detail-providers/`). DWD + NINA sind Vorbilder.
- `WarnstufeChip` (G1), `WARNSTUFE_CHIP_STYLES` + `getWarnstufeMapStyle` (G1).
- `GefahrenzoneInlinePopover` (G2) — wird aus Panel wiederverwendet für Edit.
- TanStack-Router mit Search-Params (beliebig setzbar via `navigate`).

## Ziele

1. **`ZoneCountBadge`**-Atom — kleiner klickbarer Indikator „🗺 2" in Matrix-Zellen; Click navigiert zur Lagekarte mit Fokus auf die zugehörigen Zonen.
2. **`OrphanWarningIndicator`**-Atom — dezenter „⚠ Ohne räumliche Verortung"-Hinweis in Matrix-Zellen mit Warnstufe ≠ `KEINE` aber ohne Zone.
3. **Erweiterung `GefahrenmatrixCell`** — nimmt optional `zoneCount` und `hasOrphanWarning` Props; rendert Badge/Indicator in Zell-Ecke rechts oben.
4. **`GefahrenmatrixGrid`** — gruppiert Zonen client-seitig nach `(gefahrentyp, schutzobjekt)` via `useGefahrenzonen`, reicht counts an Zellen durch.
5. **`GefahrenzonenDetailProvider`** — implementiert `LayerDetailProvider`; `queryFeature` findet die Zone an Klick-Koordinaten; `renderPopup` zeigt kurze Zusammenfassung; `renderPanel` zeigt volle Metadaten + Aktionen.
6. **Detail-Panel-Inhalt** — Zone-Bezeichnung, Gefahrentyp-Label, Schutzobjekt-Label, `WarnstufeChip`, Ersteller + Erstellt-Zeit + letzte Änderung, Buttons: „Zur Matrix-Zelle springen" / „Bearbeiten" (öffnet `GefahrenzoneInlinePopover`) / „Zone löschen" (Confirm).
7. **Deep-Link-Mechanik** — URL-Search-Params `focus=cell:{typ}:{objekt}` (Matrix-Route) und `focus=zone:{zoneId}` (Lagekarte-Route) werden beim Öffnen gesetzt; Scroll-Fokus + Badge-Glow-Pulse (1,5 s) für das Ziel-Element.
8. **Integration** in `GefahrenmatrixFullscreenView` (bestehend) + Provider-Registrierung.

## Nicht-Ziele

- **Kein Split-View** (G4).
- **Kein AKUT-Broadcast-Dialog, kein Toast-Eskalation** (G4).
- **Kein Undo** (G5).
- **Kein Onboarding-Coach-Mark** (G5).
- Keine Presence-Indicators (Figma-style Avatare) — out of scope für #627.
- Kein neuer Backend-Endpoint: Zone-Count wird client-seitig gruppiert.

## Architektur — Frontend

### Zone-Gruppierung (Shared Hook)

**Pfad:** `packages/frontend/src/features/gefahrenzone/api/use-gefahrenzonen-by-cell.ts`

```typescript
type CellKey = `${GefahrentypValue}:${SchutzobjektValue}`;

interface GefahrenzonenByCell {
  byCell: Map<CellKey, GefahrenzoneDto[]>;
  countByCell: Map<CellKey, number>;
}

export function useGefahrenzonenByCell(einsatzId: string): {
  data: GefahrenzonenByCell;
  isLoading: boolean;
} {
  const { data: zonen = [], isLoading } = useGefahrenzonen(einsatzId);
  const grouped = useMemo(() => {
    const byCell = new Map<CellKey, GefahrenzoneDto[]>();
    for (const z of zonen) {
      const key: CellKey = `${z.gefahrentyp}:${z.schutzobjekt}`;
      const bucket = byCell.get(key) ?? [];
      bucket.push(z);
      byCell.set(key, bucket);
    }
    const countByCell = new Map(Array.from(byCell.entries()).map(([k, v]) => [k, v.length]));
    return { byCell, countByCell };
  }, [zonen]);
  return { data: grouped, isLoading };
}
```

Reusable in `GefahrenmatrixGrid` (für Cell-Badges), `GefahrenzonenDetailPanel` (wenn Zonen je Zelle gebraucht werden), sowie G4 (Split-View-Fokus).

### UI-Atome

**`ZoneCountBadge.tsx`** (`features/gefahrenmatrix/ui/atoms/` — gemeinsame Location, da semantisch zur Matrix-Zelle gehört):

```typescript
interface ZoneCountBadgeProps {
  count: number;
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}
```

- Render: Pill mit Map-Icon (`PiMapPin` aus `react-icons/pi`) + Zahl. Klickbar, tab-fokussierbar.
- Farbe: `bg-surface-raised text-action-primary border-border-subtle`. Hover: `border-action-primary`.
- `aria-label` default: `"{count} räumlich verortete Zonen auf der Karte. Öffnet Lagekarte."`.
- Nicht gerendert wenn `count === 0`.

**`OrphanWarningIndicator.tsx`** (`features/gefahrenmatrix/ui/atoms/`):

```typescript
interface OrphanWarningIndicatorProps {
  warnstufe: WarnstufeValue; // nur anzeigen wenn != 'KEINE'
  className?: string;
}
```

- Render: kleiner `PiWarning`-Icon in `text-warnstufe-{stufe}-text` mit Tooltip „Warnstufe {Label} ohne räumliche Verortung — offener Punkt".
- `aria-label`: `"Warnstufe {Label} ohne räumliche Verortung – offener Punkt"`.
- Nicht gerendert wenn `warnstufe === 'KEINE'`.

### Matrix-Cell-Erweiterung

**`GefahrenmatrixCell` Props erweitern:**

```typescript
interface GefahrenmatrixCellProps {
  // bestehend...
  zoneCount?: number;
  hasOrphan?: boolean;
  onZoneBadgeClick?: () => void;
}
```

- Badge oben rechts in der Zelle (`absolute top-0.5 right-0.5`).
- Indicator unten rechts oder neben Badge (nur einer sichtbar gleichzeitig: `zoneCount > 0` gewinnt).
- Cell-Container braucht `relative`-Positioning (minimaler CSS-Aufwand).

### `GefahrenmatrixGrid` — Integration

- `useGefahrenzonenByCell(einsatzId)` zusätzlich zu `useGefahrenmatrix`.
- In `renderSection` pro Zelle: `countByCell.get(key) ?? 0`, `hasOrphan = warnstufe !== 'KEINE' && count === 0`.
- Badge-Click-Handler: `navigate('/einsatz/:id/lagekarte', { search: { focus: 'zone:all-for-cell', typ, objekt } })` oder ähnlich — konkrete URL-Form in TanStack-Router-Pattern des Projekts prüfen.

### Detail-Provider

**Pfad:** `packages/frontend/src/features/lagekarte/detail-providers/gefahrenzonen/gefahrenzonen-detail-provider.tsx`

**Vorbild:** `packages/frontend/src/features/lagekarte/detail-providers/dwd/dwd-detail-provider.tsx` (falls `.tsx`; sonst `.ts`).

**Struktur:**

```typescript
class GefahrenzonenDetailProvider implements LayerDetailProvider {
  id = 'gefahrenzonen';
  constructor(
    private getZonen: () => GefahrenzoneDto[], // TanStack-Cache-Getter
    private isLayerActive: () => boolean, // Toggle-State
  ) {}
  isActive(): boolean {
    return this.isLayerActive();
  }
  async queryFeature(lng, lat, map): Promise<LayerFeatureInfo | null> {
    // Point-in-Polygon gegen alle Zonen; Turf-style ohne externe Lib
    // (einfache Ray-Casting-Formel, 20 LOC)
    const hit = this.getZonen().find((z) => isPointInGeoJsonPolygon({ lng, lat }, z.geometry));
    return hit ? { providerId: this.id, data: hit } : null;
  }
  renderPopup(info): ReactNode {
    /* kurze Card: WarnstufeChip + Gefahrentyp-Label + „Details →" */
  }
  renderPanel(info): ReactNode {
    /* GefahrenzoneDetailPanel mit allen Metadaten + Aktionen */
  }
}
```

**Point-in-Polygon:** inline Ray-Casting (keine Turf-Dep). 20 LOC, testbar.

**Registrierung:** `registerDetailProvider(new GefahrenzonenDetailProvider(...))` im Lagekarte-Init (ähnlich DWD/NINA).

### `GefahrenzoneDetailPanel` (organism)

**Pfad:** `packages/frontend/src/features/gefahrenzone/ui/organisms/GefahrenzoneDetailPanel.tsx`

**Inhalt:**

- Header: `WarnstufeChip` + Gefahrentyp-Label.
- Metadaten-Grid:
  - Schutzobjekt: Label.
  - Geometrietyp: Polygon/Kreis.
  - Ersteller + „vor 3 min" (relative Zeit).
  - Letzte Änderung (falls vorhanden).
  - Zone-ID (collapsible, für Debug).
- Aktionen:
  - **„Zur Matrix-Zelle"** — Primary — `navigate('/einsatz/:id/sicherheit/gefahren', { search: { focus: `cell:${typ}:${objekt}` } })`.
  - **„Bearbeiten"** — Secondary — öffnet `GefahrenzoneInlinePopover` im Edit-Mode (G2-Komponente wiederverwenden).
  - **„Zone löschen"** — Destructive — Confirm-Dialog → `useDeleteGefahrenzone`.

**Zurücknavigations-Mechanik:**

- Matrix-Route liest Search-Param `focus`. Beim Mount: falls `focus` gesetzt, scrollt Zelle ins Viewport (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) und setzt 1,5 s-`ring-2 ring-action-primary`-Pulse via temporärer CSS-Klasse.
- Param wird nach Fokus-Effekt NICHT entfernt (Deep-Link-bookmarkable).

### Accessibility (G3-Scope)

- Badge tab-fokussierbar, Enter/Space aktiviert.
- Indicator mit Tooltip + `aria-label`.
- Panel-Header als `h2` mit `id`, Panel-Container `role="region"` + `aria-labelledby`.
- Navigations-Trigger (Badge → Karte, Button → Matrix) sind `<button>` oder `<Link>`, keine `<div onClick>`.
- Fokus-Pulse respektiert `prefers-reduced-motion`: statt Ring-Animation ein einmaliges Border-Blink über 300 ms.

## Architektur — Backend

**Keine Änderungen.** Die Matrix-Zelle-Zoning-Beziehung ist clientseitig aus bestehenden Endpoints ableitbar:

- `GET /einsatz/:einsatzId/gefahrenmatrix` (bestehend) → Bewertungen.
- `GET /einsatz/:einsatzId/gefahrenzonen` (G1) → Zonen mit `gefahrentyp` + `schutzobjekt`.

## Tests (Definition of Done)

**Frontend:**

- `useGefahrenzonenByCell`: Map-Aufbau, leere Eingabe, multiple Zonen pro Zelle.
- `ZoneCountBadge`: Render + Click + `aria-label`; nicht gerendert bei `count === 0`.
- `OrphanWarningIndicator`: Render nur wenn `warnstufe !== 'KEINE'`; Tooltip-Inhalt; `aria-label`.
- `GefahrenmatrixCell` (erweitert): Badge + Indicator erscheinen richtig; Badge gewinnt wenn beide Props zutreffen (Edge-Case: `zoneCount > 0 && hasOrphan` sollte eigentlich nicht vorkommen — Test dokumentiert Erwartung).
- `GefahrenzonenDetailProvider`: `queryFeature` (Point-in-Polygon Hit + Miss + Null-Return bei inaktivem Layer); `renderPopup` + `renderPanel` rendern ohne Crash mit Sample-Daten.
- `GefahrenzoneDetailPanel`: alle Aktionen wirken (Delete → Confirm → Mutation; „Zur Matrix" → navigate mit korrektem Search-Param; „Bearbeiten" öffnet Popover).
- `GefahrenmatrixGrid` (Integration): Mock-Hooks liefern Matrix + Zonen → richtige Zellen haben Badge/Indicator; Badge-Click triggert `navigate`.
- Deep-Link-Roundtrip (Integration mit TanStack-Router-Memory): Search-Param `focus=cell:X:Y` → Matrix-View scrollt; `focus=zone:Z` → Lagekarte-View öffnet Panel.

**Validation Commands (grün vor Abschluss):**

- `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="gefahrenzone|Gefahrenzone|GefahrenmatrixCell|GefahrenmatrixGrid|DetailProvider|DetailPanel|ZoneCountBadge|OrphanWarningIndicator" --no-coverage`
- `pnpm lint` (0 Errors, keine neuen Warnings im G3-Scope)
- Manuelle Smoke: Matrix-Zelle mit 0/1/2 Zonen + Orphan-Fall; Klick auf Badge → Lagekarte mit Fokus; Klick auf Zone → Panel → „Zur Matrix-Zelle" → zurück zur Matrix-Zelle.

## Task-Reihenfolge

1. **`useGefahrenzonenByCell`** Hook + Unit-Test.
2. **`ZoneCountBadge`** + **`OrphanWarningIndicator`** Atome + Tests.
3. **`GefahrenmatrixCell`** erweitern um Badge/Indicator (Props + Rendering) + Tests.
4. **`GefahrenmatrixGrid`** Integration — `useGefahrenzonenByCell`, Counts durchreichen, Badge-Click → `navigate` + Deep-Link-Param + Test.
5. **Matrix-Route** — Deep-Link-Focus-Handler (`useEffect` auf `searchParams.focus` → `scrollIntoView` + Pulse) + Test.
6. **`isPointInGeoJsonPolygon`** Utility + Unit-Test (Ray-Casting, 3–5 Cases inkl. Edges).
7. **`GefahrenzonenDetailProvider`** + Tests (Provider-Interface-Methoden).
8. **`GefahrenzoneDetailPanel`** + Tests (Actions + Navigation).
9. **Provider-Registrierung** in Lagekarte-Init + Smoke-Test.
10. **Lagekarte-Route** Deep-Link-Fokus (`focus=zone:X` → Panel auto-open) + Test.
11. **Validation-Gate** — alle Commands grün + manuelle Smoke.

## Notizen für den Implementierer

- **Feature-Zuordnung:** `useGefahrenzonenByCell` + Detail-Provider + DetailPanel im `features/gefahrenzone`-Slice. Badge/Indicator im `features/gefahrenmatrix`-Slice (UI gehört zur Matrix-Zelle).
- **`GefahrenzoneInlinePopover` aus G2** wird in „Bearbeiten"-Aktion wiederverwendet — nicht duplizieren.
- **Point-in-Polygon**: inline Ray-Casting ausreicht (alle Zonen sind Polygone nach G1-VO). Keine turf-Dep. 20–30 LOC inkl. Typen.
- **Router-Search-Params**: Pattern aus existierenden Features übernehmen (z. B. `features/einsatz/` oder `features/funk/`). Falls der Router-Helper eine Type-Safe API bietet, diese nutzen.
- **Deep-Link-Fokus**: nach erstem Trigger Param **nicht** entfernen (Bookmark-Fähigkeit). Nur das visuelle Pulse-Effekt ist einmalig.
- **AKUT-Confirm** bleibt in G4 — hier NICHT implementieren.
- **Panel vs. Popup:** Popup = kurze Card (Popover am Klick-Punkt), Panel = Side-Panel (via `LayerDetailProvider.renderPanel`, Mechanismus existiert). Beide rendern aus demselben Provider.
- **Commits:** `✨(gefahrenzone): ...`, `✨(gefahrenmatrix): ...`, `🧪(gefahrenzone): ...`.

## Abschluss-Signal

`status: done` im Frontmatter, `## Spec Change Log` mit Files/Abweichungen/Tests, Übergabe an G4.

## Spec Change Log

**Datum:** 2026-04-17
**Branch:** `627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher`
**Team:** `lagekarte-gefahrenmatrix` (team-lead, frontend-engineer)

### Commits (1)

- `b9c89294e` ✨(gefahrenzone): G3 — Matrix-Badges + Detail-Provider + Deep-Links (frontend-engineer; 24 Files, +1246/-134)

### Neue/geänderte Files

**Neu:**

- `features/gefahrenzone/api/use-gefahrenzonen-by-cell.ts` (+ Test)
- `features/gefahrenzone/lib/point-in-polygon.ts` (+ Test, inline Ray-Casting ohne turf)
- `features/gefahrenzone/ui/organisms/GefahrenzoneDetailPanel.tsx` (+ Test)
- `features/gefahrenzone/ui/organisms/GefahrenzoneDetailPopup.tsx`
- `features/gefahrenmatrix/ui/atoms/ZoneCountBadge.tsx` (+ Test)
- `features/gefahrenmatrix/ui/atoms/OrphanWarningIndicator.tsx` (+ Test)
- `features/gefahrenmatrix/ui/molecules/__tests__/GefahrenmatrixCell.spec.tsx`
- `features/lagekarte/detail-providers/gefahrenzonen/gefahrenzonen-detail-provider.tsx` (+ Test)

**Geändert:**

- `features/gefahrenzone/api/index.ts` — `useGefahrenzonenByCell`, `cellKey` exportiert.
- `features/gefahrenzone/ui/organisms/GefahrenzoneHost.tsx` — G2-Click-Handler entfernt (Provider übernimmt); `focus`-Prop; Einsatz-ID-Setter für Provider; Panel-Mount am View-Root für Deep-Link.
- `features/gefahrenzone/ui/organisms/__tests__/GefahrenzoneHost.spec.tsx` — Tests aktualisiert (Click → Deep-Link).
- `features/gefahrenmatrix/ui/molecules/GefahrenmatrixCell.tsx` — Badge/Orphan-Rendering + `isFocusTarget`-Prop.
- `features/gefahrenmatrix/ui/organisms/GefahrenmatrixGrid.tsx` — `useGefahrenzonenByCell` + `focus`-Param + ScrollIntoView.
- `features/lagekarte/detail-providers/index.ts` — Provider registriert.
- `features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx` — `focus`-Prop durchreichen.
- Routen `sicherheit/gefahren.tsx` und `übersicht/karte.tsx` — `focus?: string` im Search-Schema; Badge-Click → navigate.
- `index.tailwind.css` — `@keyframes gefahrenmatrix-cell-pulse` + Reduced-Motion-Fallback (einmaliger Border-Flash 300 ms).

### Abweichungen vom Plan (mit Begründung)

1. **Deep-Link-Panel als zweiter Mount-Pfad** — direkt vom `GefahrenzoneHost` als `<aside>`, nicht über `LayerDetailProvider.renderPanel`. Grund: MapDetail-Flow ist click-gesteuert (Punkt → `queryFeature`), Deep-Link ist ID-gesteuert (Zone aus Query-Cache direkt). Synthetische Provider-Aufrufe wären hacky. Panel-Komponente ist identisch, nur Mount-Pfad unterscheidet sich.
2. **G2-Host-Click-Handler entfernt** — `GefahrenzonenDetailProvider` übernimmt den Klick-Flow über `queryAllDetailProviders` → `MapDetailPopup` → `MapDetailPanel`. Damit Gefahrenzone konsistent mit DWD/NINA. Alter Host-Test-Case ersetzt.
3. **Provider-State via globalen `queryClient` + Modul-Level `currentEinsatzId`** statt Provider-Factory. Setter `setGefahrenzonenProviderEinsatzId` vom `GefahrenzoneHost`-Mount aufgerufen. Einfacher als Factory + Registry-Unregister-Hook.
4. **Badge-Click-Navigation-Target:** navigate zu `/übersicht/karte?focus=cell:X:Y` (statt `/lagekarte`, wie in Spec). Route im Projekt heißt `/übersicht/karte` — Spec-Text war generisch.

### Tests

| Bereich                   | Ergebnis                                               |
| ------------------------- | ------------------------------------------------------ |
| G3 + gefahrenmatrix-Scope | **100/100 grün** (16 Test-Files)                       |
| Frontend-Suite gesamt     | **4492/4492 grün** (370 Test-Files — keine Regression) |
| `tsc --noEmit`            | ✅ clean                                               |
| `pnpm lint`               | ✅ 0 Errors, 28 Warnings (pre-existing)                |

### Manueller Smoke (nicht automatisiert im Gate — zu prüfen vor Release)

- Matrix-Zelle mit 0/1/2 Zonen + Orphan-Fall (Warnstufe ohne Zone).
- Badge-Klick → `/übersicht/karte?focus=cell:X:Y`.
- Zone-Click auf Karte → Popup → Panel → „Zur Matrix-Zelle" → Zelle pulst.
- Deep-Link `?focus=zone:<id>` → Panel öffnet, Karte zoomt.
- Dark-Mode Badge + Indicator.

### Übergabe an G4

- `useGefahrenzonenByCell` ist auch der Fokus-Handler für Split-View-Matrix-Zell-Klick (G4 Mechanik C).
- `GefahrenzoneDetailPanel` + `GefahrenzoneInlinePopover` sind wiederverwendbar im Split-Modus.
- `@keyframes gefahrenmatrix-cell-pulse` bereits da — Split-View-Fokus-Pulse kann das reusen.
- Routen haben bereits `focus`-Search-Param — G4 ergänzt `split=true` dazu.
