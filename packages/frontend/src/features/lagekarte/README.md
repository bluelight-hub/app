# Lagekarte Feature Module

Konsolidierte Feature-Struktur für Lagekarte mit zentralem State Management über TanStack Store.

## Problem gelöst: "Hook Hell"

**Vorher:** 10+ spezialisierte Hooks mit impliziten Dependencies
**Nachher:** 4 konsolidierte Hooks mit zentralem State Container

Siehe [HOOK-ANALYSIS.md](./HOOK-ANALYSIS.md) für detaillierte Analyse.

## Architektur

```
features/lagekarte/
├── api/                    # TanStack Query Hooks (Backend-Kommunikation)
│   ├── queries.ts          # Query Keys Factory
│   ├── use-lagekarte.ts    # Lagekarte laden
│   ├── use-save-shapes.ts  # Shapes speichern
│   └── index.ts
├── stores/                 # TanStack Store (State Container)
│   ├── lagekarte-state.store.ts  # Zentraler State + Actions
│   └── index.ts
├── hooks/                  # Business Logic Hooks
│   ├── use-lagekarte-state.ts      # State Selektoren
│   ├── use-shape-actions.ts        # Shape CRUD Operations
│   ├── use-drawing-tools.ts        # Drawing Tool Management
│   ├── use-toolbar-positioning.ts  # Toolbar Positioning
│   ├── legacy/                     # Legacy Hooks (für DrawingLayer)
│   │   ├── useShapeSelection.ts    # @deprecated
│   │   ├── useDrawingToolSelection.ts
│   │   └── ...                     # 10 weitere Legacy-Hooks
│   └── index.ts
├── HOOK-ANALYSIS.md        # Migration Dokumentation
├── README.md               # Diese Datei
└── index.ts
```

## Usage

### 1. State lesen (Selektoren)

```tsx
import { useLagekarteState } from '@/features/lagekarte';

const DrawingLayer = () => {
  const state = useLagekarteState();

  // Subscribes nur auf shapes (re-rendert NUR bei shapes-Änderung)
  const shapes = state.useShapes();
  const selectedShapeId = state.useSelectedShapeId();

  return <div>Total Shapes: {shapes.features.length}</div>;
};
```

### 2. Shape Aktionen (Create, Update, Delete)

```tsx
import { useShapeActions } from '@/features/lagekarte';
import { useMap } from 'react-leaflet';

const DrawingLayer = () => {
  const map = useMap();
  const shapeActions = useShapeActions(map);

  const handleShapeClick = (shapeId: string) => {
    shapeActions.selectShapeById(shapeId);
  };

  const handleDeleteClick = () => {
    shapeActions.deleteSelectedShape();
  };

  return <button onClick={handleDeleteClick}>Delete</button>;
};
```

### 3. Drawing Tools (Polygon, Line, Text, etc.)

```tsx
import { useDrawingTools } from '@/features/lagekarte';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const DrawingLayer = () => {
  const map = useMap();
  const drawingTools = useDrawingTools(map);

  // Initialisiere PM Controls
  useEffect(() => {
    drawingTools.initializePm();
  }, []);

  // Tool aktivieren
  const handleToolSelect = (tool: DrawingTool) => {
    drawingTools.activateTool(tool);
  };

  return <DrawingToolbar onToolSelect={handleToolSelect} />;
};
```

### 4. Backend-Synchronisation (API Hooks)

```tsx
import { useLagekarte, useSaveShapes } from '@/features/lagekarte/api';

const LagekarteContainer = ({ einsatzId }: { einsatzId: string }) => {
  // Lagekarte laden
  const { data: initialShapes, isLoading } = useLagekarte(einsatzId);

  // Mutation zum Speichern
  const saveMutation = useSaveShapes(einsatzId);

  const handleShapesChange = (shapes: GeoJSON.FeatureCollection) => {
    saveMutation.mutate(shapes);
  };

  if (isLoading) return <Spinner />;

  return <DrawingLayer initialState={initialShapes} onShapesChange={handleShapesChange} />;
};
```

## Store Actions (Direct Access)

Für fortgeschrittene Use Cases kann direkt auf Store Actions zugegriffen werden:

```tsx
import {
  selectShape,
  addShape,
  removeShape,
  setActiveDrawingTool,
} from '@/features/lagekarte/stores';

// Shape selektieren
selectShape('shape-123');

// Tool aktivieren
setActiveDrawingTool('polygon');

// Shape hinzufügen
addShape(geoJsonFeature);
```

## Migration von alten Hooks

### useShapeSelection → useShapeActions

```tsx
// Legacy (noch von DrawingLayer verwendet)
import { useShapeSelection } from '@/features/lagekarte/hooks/legacy';
const { selectedShapeId, setSelectedShapeId } = useShapeSelection(...);

// Nachher
import { useLagekarteState, useShapeActions } from '@/features/lagekarte';
const state = useLagekarteState();
const selectedShapeId = state.useSelectedShapeId();
const shapeActions = useShapeActions(map);
shapeActions.selectShapeById('shape-123');
```

### useShapeEventHandlers → useShapeActions

```tsx
// Legacy (noch von DrawingLayer verwendet)
import { useShapeEventHandlers } from '@/features/lagekarte/hooks/legacy';
useShapeEventHandlers({ map, layersRef, shapesRef, setShapes, onShapesChange, ... });

// Nachher
import { useShapeActions } from '@/features/lagekarte';
const shapeActions = useShapeActions(map);

// pm:create Event Handler wird zu:
const handleCreate = (e: PmEvent) => {
  const geoJson = layer.toGeoJSON();
  shapeActions.createShape(geoJson, layer, onShapeCreated);
};
```

### useDrawingToolSelection → useDrawingTools

```tsx
// Legacy (noch von DrawingLayer verwendet)
import { useDrawingToolSelection } from '@/features/lagekarte/hooks/legacy';
useDrawingToolSelection({ map, selectedTool, setSelectedShapeId });

// Nachher
import { useDrawingTools } from '@/features/lagekarte';
const drawingTools = useDrawingTools(map);
drawingTools.activateTool('polygon');
```

## State Shape

```typescript
interface LagekarteState {
  // Shape Data
  shapes: GeoJSON.FeatureCollection;

  // Selection
  selectedShapeIds: Set<string>;
  highlightedShapeIds: Set<string>;

  // Drawing
  activeDrawingTool: DrawingTool | null;
  isPmInitialized: boolean;

  // UI
  toolbarVisible: boolean;
  toolbarPosition: { x: number; y: number } | null;
  contextMenu: { isOpen: boolean; position: { x: number; y: number }; shapeId: string } | null;

  // Internal
  layers: Map<string, L.Layer>;
  originalStyles: Map<string, OriginalStyle>;
  maxShapes: number;
}
```

## Benefits

1. **Reduzierte Komplexität:** 4 Hooks statt 10+
2. **Zentrale State-Verwaltung:** Single Source of Truth
3. **Klare Verantwortlichkeit:** Jeder Hook hat definierte Aufgabe
4. **Bessere Testbarkeit:** Store Actions können isoliert getestet werden
5. **Weniger Prop-Drilling:** Store ist global zugreifbar
6. **Performance:** Store Selektoren verhindern unnötige Re-Renders
7. **Type-Safe:** Vollständig TypeScript-typisiert

## Testing

```tsx
import { lagekarteStore, addShape, selectShape } from '@/features/lagekarte/stores';

describe('Lagekarte Store', () => {
  beforeEach(() => {
    lagekarteStore.setState(initialState);
  });

  it('should add shape', () => {
    addShape(mockGeoJsonFeature);
    expect(lagekarteStore.state.shapes.features).toHaveLength(1);
  });

  it('should select shape', () => {
    selectShape('shape-123');
    expect(lagekarteStore.state.selectedShapeIds.has('shape-123')).toBe(true);
  });
});
```

## Legacy Hooks (deprecated)

Die folgenden Hooks wurden konsolidiert und befinden sich nun in `hooks/legacy/`.
Sie werden noch von `DrawingLayer.tsx` verwendet, sollten aber bei neuen Entwicklungen
nicht mehr genutzt werden:

- ⚠️ `useShapeSelection` → `hooks/legacy/`
- ⚠️ `useShapeHighlighting` → `hooks/legacy/`
- ⚠️ `useShapeEventHandlers` → `hooks/legacy/`
- ⚠️ `useKeyboardShortcuts` → `hooks/legacy/`
- ⚠️ `useTextMarkerHandling` → `hooks/legacy/`
- ⚠️ `useShapeStyleUpdates` → `hooks/legacy/`
- ⚠️ `useDrawingToolSelection` → `hooks/legacy/`
- ⚠️ `useLeafletPMControls` → `hooks/legacy/`
- ⚠️ `useShapeLoading` → `hooks/legacy/`
- ⚠️ `useToolbarPositioning` → `hooks/legacy/`

**Import-Pfad für Legacy-Hooks:**
```tsx
import { useShapeSelection } from '@/features/lagekarte/hooks/legacy';
```

**Neue Hooks (empfohlen):**
- ✅ `useLagekarteState` (State lesen)
- ✅ `useShapeActions` (Shape Operations)
- ✅ `useDrawingTools` (Drawing Tools)
- ✅ `useToolbarPositioning` (Toolbar Positioning)

**TODO:** DrawingLayer.tsx auf neue Hooks migrieren (siehe HOOK-ANALYSIS.md)
