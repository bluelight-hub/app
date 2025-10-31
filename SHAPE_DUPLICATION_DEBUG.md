# Shape Duplication Bug - Debug & Test Plan

## Problem
Shapes werden trotz Deduplizierungs-Fix mehrfach angezeigt nach:
- Initial Load der Seite
- Auto-Save (2s nach Shape-Erstellung)
- TanStack Query Refetch/Invalidation

## Implementierte Lösung (DrawingLayer.tsx)

### Änderungen

**Robuste Deduplizierung mit 3 Quellen:**
1. `layersRef.current` - Tracked Leaflet Layers
2. `shapesRef.current` - GeoJSON Feature State
3. `map.eachLayer()` - ALLE Layers auf der Karte

**Console-Logs für Debugging:**
```typescript
// Bei Effect-Trigger
console.log('[DrawingLayer] Initial Load Effect Triggered', { ... })

// Bei Already-Loaded Skip
console.log('[DrawingLayer] Skipping - already loaded')

// Existierende Shape-IDs
console.log('[DrawingLayer] Existing Shape IDs:', [...])

// Pro Shape Processing
console.log('[DrawingLayer] Processing Shape', { shapeId, exists, ... })

// Skip Duplicate
console.log('[DrawingLayer] ⏭️ Skipping duplicate:', shapeId)

// Add New Shape
console.log('[DrawingLayer] ➕ Adding shape:', shapeId)

// Load Complete Summary
console.log('[DrawingLayer] Initial Load Complete:', { addedCount, skippedCount })
```

## Manuelle Test-Schritte

### Voraussetzungen
1. Frontend Dev Server läuft auf `:3001`
2. Browser DevTools geöffnet (F12)
3. Console Tab aktiv
4. Console-Filter: "DrawingLayer" für relevante Logs

### Test 1: Initial Page Load
1. **Action:** Navigiere zu Lagekarte-Seite eines Einsatzes
2. **Expected Console Logs:**
   ```
   [DrawingLayer] Initial Load Effect Triggered { initialShapesLoaded: false, featuresCount: N, existingLayersCount: 0 }
   [DrawingLayer] Existing Shape IDs: []
   [DrawingLayer] Processing Shape { shapeId: "...", existsInLayersRef: false, ... }
   [DrawingLayer] ➕ Adding shape: ...
   ... (für alle N Shapes)
   [DrawingLayer] Initial Load Complete: { addedCount: N, skippedCount: 0 }
   ```
3. **Expected Visual:** Shapes erscheinen EINMALIG auf Karte
4. **Test:** Count Shapes visuell - sollte = featuresCount sein

### Test 2: Shape Creation + Auto-Save
1. **Action:** Zeichne ein neues Polygon auf der Karte
2. **Expected:** Shape erscheint sofort nach Fertigstellung
3. **Action:** Warte 2 Sekunden (Auto-Save Trigger)
4. **Expected Console Logs:**
   ```
   [DrawingLayer] Initial Load Effect Triggered { initialShapesLoaded: true, ... }
   [DrawingLayer] Skipping - already loaded
   ```
5. **Expected Visual:** Shape wird NICHT dupliziert
6. **Test:** Count Shapes visuell - sollte = vorher + 1 sein

### Test 3: Multiple Shape Creation
1. **Action:** Zeichne 3 neue Shapes nacheinander
2. **Expected:** Jedes Shape erscheint einmal nach Erstellung
3. **Action:** Warte 2 Sekunden (Auto-Save nach letztem Shape)
4. **Expected Console Logs:**
   ```
   [DrawingLayer] Initial Load Effect Triggered { initialShapesLoaded: true, ... }
   [DrawingLayer] Skipping - already loaded
   ```
5. **Expected Visual:** Keine Duplikate
6. **Test:** Count Shapes visuell - sollte = initial + 3 sein

### Test 4: Full Page Reload
1. **Action:** Hard Reload (Cmd+Shift+R / Ctrl+Shift+R)
2. **Expected Console Logs:**
   ```
   [DrawingLayer] Initial Load Effect Triggered { initialShapesLoaded: false, featuresCount: N, existingLayersCount: 0 }
   [DrawingLayer] Existing Shape IDs: []
   ... Processing all N shapes ...
   [DrawingLayer] Initial Load Complete: { addedCount: N, skippedCount: 0 }
   ```
3. **Expected Visual:** Alle N Shapes erscheinen EINMALIG
4. **Test:** Count Shapes visuell - sollte = featuresCount sein

### Test 5: Query Refetch Simulation
1. **Action:** In React DevTools → Components → `LagekarteDetails` → Force Update
2. **Expected Console Logs:**
   ```
   [DrawingLayer] Initial Load Effect Triggered { initialShapesLoaded: true, ... }
   [DrawingLayer] Skipping - already loaded
   ```
3. **Expected Visual:** Keine Duplikate
4. **Test:** Count Shapes - sollte unverändert bleiben

## Debug-Szenarien bei Fehlern

### Szenario A: Shapes werden trotzdem dupliziert

**Diagnose:**
1. Check Console Log "Existing Shape IDs"
   - Ist das Array leer beim zweiten Load?
   - Enthalten die IDs die erwarteten Shape-IDs?

2. Check Console Log "Processing Shape"
   - Zeigt `existsInLayersRef: false` obwohl Shape schon da?
   - Stimmen `shapeId` Werte zwischen Loads überein?

3. Check `initialShapesLoaded` Flag
   - Wird es auf `true` gesetzt nach erstem Load?
   - Wird es zurückgesetzt (Component Unmount)?

**Mögliche Ursachen:**
- Shape-IDs ändern sich zwischen Loads (Backend generiert neue IDs)
- Type-Mismatch: String vs Number IDs
- `initialShapesLoadedRef` wird zu früh zurückgesetzt
- Component wird unmounted/remounted

### Szenario B: Shapes fehlen komplett

**Diagnose:**
1. Check Console Log "Initial Load Effect Triggered"
   - Läuft Effect überhaupt?
   - Ist `featuresCount > 0`?

2. Check Console Log "Processing Shape"
   - Werden Shapes verarbeitet?
   - Werden alle geskipped wegen Duplikaten?

**Mögliche Ursachen:**
- `initialState` ist undefined/null
- Alle Shapes werden fälschlicherweise geskipped
- Deduplizierungs-Set zu aggressiv

### Szenario C: Shapes laden nur teilweise

**Diagnose:**
1. Check Console Log "Initial Load Complete"
   - Stimmen `addedCount` und `skippedCount` Summe mit `featuresCount`?
   - Wenn nicht: Wo gehen Shapes verloren?

2. Check für Errors in Console
   - Wirft Leaflet Errors beim Layer-Add?
   - Gibt es Geometrie-Probleme in GeoJSON?

## Cleanup nach erfolgreichem Test

Nach Bestätigung dass ALLE Tests GRÜN sind:

1. **Remove ALL console.log statements** aus DrawingLayer.tsx
2. **Commit:** `🐛(lagekarte): Fix Shape Duplication on Initial Load`
3. **Commit Message:**
   ```
   🐛(lagekarte): Fix Shape Duplication on Initial Load

   Problem: Shapes wurden mehrfach angezeigt nach Auto-Save/Query-Refetch

   Root Cause:
   - initialState Dependency in useEffect triggerte erneuten Load
   - Deduplizierung prüfte nur layersRef, nicht map.eachLayer
   - Race Condition zwischen Set-Check und Layer-Add

   Lösung:
   - Robuste 3-Quellen Deduplizierung (layersRef, shapesRef, map.eachLayer)
   - Explicit Tracking von addedCount/skippedCount
   - initialShapesLoadedRef Guard bleibt aktiv über Component Lifecycle

   Testing:
   - ✅ Initial Load: Keine Duplikate
   - ✅ Auto-Save (2s): Keine Duplikate
   - ✅ Multiple Shapes: Keine Duplikate
   - ✅ Page Reload: Keine Duplikate
   - ✅ Query Refetch: Keine Duplikate
   ```

## Test-Protokoll

**Tester:** _______________
**Datum:** _______________
**Branch:** bluelight-hub-48-lagekarte-fix-issues

| Test | Status | Notizen |
|------|--------|---------|
| Test 1: Initial Load | ☐ PASS ☐ FAIL | |
| Test 2: Auto-Save | ☐ PASS ☐ FAIL | |
| Test 3: Multiple Shapes | ☐ PASS ☐ FAIL | |
| Test 4: Page Reload | ☐ PASS ☐ FAIL | |
| Test 5: Query Refetch | ☐ PASS ☐ FAIL | |

**Ergebnis:** ☐ Alle Tests GRÜN → Cleanup + Commit | ☐ Fehler → Debug mit Szenario A/B/C
