# Erweiterter Schraffur-Editor für Lagekarte

**Datum:** 2026-04-08
**Status:** Entwurf
**Kontext:** Die Lagekarte-Zeichenwerkzeuge sollen detailliert konfigurierbare Schraffurmuster für Polygon-Flächen bekommen — Mustertyp, Abstand, Strichstärke und Farbe.

## Ist-Zustand

- 4 feste Pattern-Typen (diagonal, cross, horizontal, vertical) als Hardcoded Canvas-Images
- Feste Linienfarbe (dunkelgrau), fester Abstand (12px), feste Strichstärke (1.5px)
- 8 separate MapboxDraw-Layer (4 Muster × aktiv/inaktiv) weil fill-pattern fälschlicherweise als nicht data-driven angenommen wurde
- `FillPattern` ist ein String-Enum: `'none' | 'hatch-diagonal' | 'hatch-cross' | ...`

## Technische Erkenntnis

MapLibre GL v5.22.0 unterstützt **data-driven `fill-pattern`** (`property-type: cross-faded-data-driven`, seit JS v0.49.0). Damit können die 8 Layer auf 2 reduziert werden (aktiv/inaktiv) und jedes Feature referenziert sein eigenes dynamisch generiertes Pattern-Image.

## Datenmodell

### HatchConfig (neu)

```typescript
interface HatchConfig {
  /** Mustertyp */
  type: 'none' | 'diagonal' | 'cross' | 'horizontal' | 'vertical';
  /** Kachel-Größe / Linienabstand in Pixel (6–32, Default: 12) */
  spacing: number;
  /** Strichstärke der Schraffurlinien in Pixel (0.5–4, Default: 1.5) */
  width: number;
  /** Linienfarbe als Hex-String. Leer = Randfarbe des Features übernehmen */
  color: string;
}
```

### DrawingStyle (geändert)

```typescript
interface DrawingStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
  strokeDasharray?: string;
  fillColor: string;
  fillOpacity: number;
  hatch: HatchConfig;        // ersetzt fillPattern: FillPattern
}

const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#3b82f6',
  opacity: 1,
  strokeWidth: 2,
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
  hatch: { type: 'none', spacing: 12, width: 1.5, color: '' },
};
```

### Feature-Property-Speicherung

Auf dem GeoJSON-Feature werden zwei Properties gespeichert:

- `hatch` — Serialisiertes `HatchConfig`-Objekt (JSON-String) für Persistenz und UI-Wiederherstellung
- `fillPattern` — Berechneter Image-Name (z.B. `hatch-diagonal-12-1.5-ef4444`) für die MapLibre-Render-Expression

`fillPattern` ist ein abgeleiteter Wert aus `hatch` + `color` (Fallback Randfarbe). Es wird bei jeder Hatch-Änderung neu berechnet.

## Pattern-Image-Generierung

### Deterministischer Image-Name

```
hatch-{type}-{spacing}-{width}-{colorHex}
```

Beispiele:
- `hatch-diagonal-12-1.5-ef4444` — Diagonale, 12px Abstand, 1.5px Strich, Rot
- `hatch-cross-8-2-1e293b` — Kreuz, 8px Abstand, 2px Strich, Dunkel

### Dynamische Canvas-Erzeugung

Die bestehende `hatch-patterns.ts` wird refactored:

- Bisherige 4 feste Pattern-Creator werden zu einer einzigen parametrisierten Funktion `createHatchImage(config: HatchConfig, resolvedColor: string): ImageData`
- `spacing` bestimmt die Canvas-Größe (Tile-Größe)
- `width` bestimmt die Linienbreite
- `resolvedColor` ist die finale Farbe (Hatch-Color oder Fallback Randfarbe)
- Die Funktion erzeugt das nahtlos kachelbare Canvas-Pattern

### Registrierung auf der Map

- Neue Funktion `ensureHatchImage(map, config, resolvedColor): string` — gibt den Image-Namen zurück
- Prüft mit `map.hasImage()` ob das Image bereits existiert
- Generiert und registriert bei Bedarf
- Wird in `handleStyleChange` aufgerufen wenn sich Hatch-Parameter ändern
- Bei Style-Wechsel (Basislayer): Alle registrierten Hatch-Images erneut erzeugen

#### Cleanup

Alte, nicht mehr referenzierte Images werden nicht aktiv gelöscht. Die Anzahl ist durch die endlichen Parameterkombinationen begrenzt (Slider-Steps). Bei Style-Wechsel (der alle Images löscht) werden nur die aktuell benötigten neu registriert.

## MapboxDraw Layer-Vereinfachung

### Vorher (8 Layer)

4 Muster × 2 States (aktiv/inaktiv), jeweils mit festem `fill-pattern` und Filter auf `user_fillPattern`.

### Nachher (2 Layer)

```javascript
// Inaktiv
{
  id: 'gl-draw-polygon-hatch-inactive',
  type: 'fill',
  filter: ['all',
    ['==', 'active', 'false'],
    ['==', '$type', 'Polygon'],
    ['!=', 'mode', 'static'],
    ['has', 'user_fillPattern'],
    ['!=', ['get', 'user_fillPattern'], ''],
  ],
  paint: {
    'fill-pattern': ['get', 'user_fillPattern'],
    'fill-opacity': ['coalesce', ['get', 'user_fillOpacity'], 0.2],
  },
}

// Aktiv (analog mit active = true)
```

Ein einzelner Layer pro State, der den Image-Namen direkt aus dem Feature liest.

## UI-Design (Aufklapp-Sektion)

### Layout im DrawStylePanel

```
[Farbe-Swatches]
[Linienstärke: Dünn | Mittel | Dick]
[Deckkraft: ====|====== 20%]
[Schraffur]
  [/] [X] [=] [||] [∅]     ← Muster-Buttons
  ▼ Anpassen...              ← Disclosure (nur wenn Muster != none)
  ┌─────────────────────┐
  │ Abstand    ====|=  12px │
  │ Stärke     ==|==  1.5px │
  │ Farbe  [Auto ✓] [●●●●] │
  └─────────────────────┘
[Beschriftung]               ← nur für Text-Features
```

### Interaktionsverhalten

- **Muster-Buttons**: Klick setzt `hatch.type`. Bei Wechsel von `none` zu einem Muster wird die Aufklapp-Sektion automatisch **nicht** geöffnet (erst bei Klick auf "Anpassen...").
- **"Anpassen..."**: Toggle-Button, öffnet/schließt die Detail-Sektion. Nur sichtbar wenn `hatch.type !== 'none'`.
- **Abstand-Slider**: Range 6–32, Step 2, zeigt Wert in px
- **Stärke-Slider**: Range 0.5–4, Step 0.5, zeigt Wert in px
- **Farbe**: "Auto"-Checkbox (= Randfarbe übernehmen) + gleiche Farb-Swatches wie oben. Auto ist Default. Deaktiviert zeigt separate Farbauswahl.
- Alle Änderungen werden sofort angewendet (Live-Preview via `draw.add()` Render-Trick).

### State-Management

Der Aufklapp-Status ("Anpassen..." offen/zu) ist lokaler UI-State (`useState` im DrawStylePanel), kein persistierter Wert. Er resettet beim Feature-Wechsel.

## Migration

### Abwärtskompatibilität

Features mit altem `fillPattern`-Format (z.B. `'hatch-diagonal'`) müssen weiterhin funktionieren:

- Beim Laden eines alten Features: Wenn `fillPattern` ein alter Enum-Wert ist und kein `hatch`-Property existiert, wird ein `HatchConfig` mit Default-Werten erzeugt (`spacing: 12, width: 1.5, color: ''`).
- Der alte `fillPattern`-Wert wird in den neuen `hatch.type` konvertiert (Strip `hatch-` Prefix).
- Diese Konversion passiert in LagekarteView beim Feature-Selektion und im useDrawControl beim initialen Laden.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `drawing/types.ts` | `HatchConfig` Interface, `DrawingStyle.hatch` statt `fillPattern` |
| `drawing/hatch-patterns.ts` | Parametrisierte Image-Generierung, `ensureHatchImage()` |
| `drawing/draw-styles.ts` | 8 Layer → 2 Layer, data-driven `fill-pattern` |
| `DrawStylePanel.molecule.tsx` | Aufklapp-Sektion mit Slidern + Farbauswahl |
| `LagekarteView.tsx` | Hatch-Config lesen/schreiben, Image-Registrierung, Migration |
| `use-draw-control.ts` | `hatch` + `fillPattern` auf neue Features setzen |
