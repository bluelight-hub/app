# Shape Duplication - Schneller Test-Guide

## ⚡ Quick Test (5 Minuten)

### Setup
1. Öffne `http://localhost:3001` im Browser
2. Öffne DevTools (F12) → Console Tab
3. Navigiere zu Lagekarte eines Einsatzes

### Tests

**Test 1: Initial Load ✓**
- Shapes erscheinen EINMALIG
- Console: `[DrawingLayer] Initial Load Complete: { addedCount: X, skippedCount: 0 }`

**Test 2: Auto-Save (2s) ✓**
- Zeichne ein Polygon
- Warte 2 Sekunden
- Console: `[DrawingLayer] Skipping - already loaded`
- Shape NICHT dupliziert

**Test 3: Page Reload ✓**
- Hard Reload (Cmd+Shift+R)
- Alle Shapes erscheinen EINMALIG
- Console: Gleich wie Test 1

## ✅ Wenn alle Tests GRÜN

```bash
# 1. Remove console.logs
# Öffne DrawingLayer.tsx und entferne ALLE console.log() Zeilen

# 2. Commit
git add .
git commit -m "🐛(lagekarte): Fix Shape Duplication on Initial Load

Problem: Shapes wurden mehrfach angezeigt nach Auto-Save/Query-Refetch

Lösung:
- Robuste 3-Quellen Deduplizierung (layersRef, shapesRef, map.eachLayer)
- initialShapesLoadedRef Guard über Component Lifecycle

Testing:
- ✅ Initial Load: Keine Duplikate
- ✅ Auto-Save: Keine Duplikate
- ✅ Page Reload: Keine Duplikate

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🐛 Bei Problemen

Siehe `/Users/rubeen/dev/personal/bluelight-hub/SHAPE_DUPLICATION_DEBUG.md` für detaillierte Debug-Szenarien.
