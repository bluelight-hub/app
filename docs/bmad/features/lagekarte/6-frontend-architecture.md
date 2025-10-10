# 6. Frontend Architecture

## 6.1 Component Organization (Atomic Design)

Das Lagekarte-Feature folgt dem etablierten **Atomic Design Pattern** des Projekts. Alle Komponenten werden im bestehenden Component-Tree integriert.

### Component Hierarchy

```
packages/frontend/src/components/
├── atoms/
│   ├── map/
│   │   ├── MapTile.tsx              # 🆕 Single Tile-Anzeige mit Error-Handling
│   │   ├── MapMarker.tsx            # 🆕 Basis-Marker (ohne Clustering)
│   │   ├── MapTooltip.tsx           # 🆕 Hover-Tooltip für POIs
│   │   └── MapControlButton.tsx     # 🆕 Basis-Button für Map-Controls
│
├── molecules/
│   ├── lagekarte/
│   │   ├── PoiMarker.tsx            # 🆕 POI-Marker mit Icon + Popup
│   │   ├── PoiCluster.tsx           # 🆕 Marker-Cluster-Group
│   │   ├── PoiForm.tsx              # 🆕 POI-Erstellungs-Formular
│   │   ├── PoiCard.tsx              # 🆕 POI-Detail-Card im Popup
│   │   ├── LayerControl.tsx         # 🆕 Layer-Visibility-Toggle
│   │   ├── DrawingToolbar.tsx       # 🆕 Drawing-Tools-Leiste
│   │   ├── OfflineDownloadDialog.tsx # 🆕 Tile-Download-Dialog
│   │   └── GeocodingSearch.tsx      # 🆕 Adress-Suche mit Autocomplete
│
└── organisms/
    └── lagekarte/
        ├── LagekarteMap.tsx         # 🆕 Haupt-Map-Container (Leaflet)
        ├── LagekarteToolbar.tsx     # 🆕 Top-Toolbar (Zoom, Layer, Export)
        ├── LagekarteSidebar.tsx     # 🆕 Sidebar für POI-Liste
        ├── PoiManagementPanel.tsx   # 🆕 POI-CRUD-Panel
        └── ScreenshotExportModal.tsx # 🆕 Screenshot-Export-zu-ETB
```

---

## 6.2 Key Frontend Components

### 6.2.1 LagekarteMap (Organism)

**Purpose:** Root-Component für Leaflet-Map-Rendering und State-Synchronisation.

**Key Responsibilities:**
- Leaflet-Map-Initialisierung mit react-leaflet
- Rendering von Tile-Layers, POI-Markers, Drawing-Layers
- Event-Handling (Click, Drag, Zoom)
- Debounced State-Sync zum Backend (2s Delay)

**Props:**
```typescript
interface LagekarteMapProps {
  einsatzId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  readOnly?: boolean; // Für Screenshot-Export
}
```

**State Management:**
- **Local State:** Leaflet-Map-Instance (useRef)
- **TanStack Query:** POI-Daten via `useLagekarteData(einsatzId)`
- **TanStack Store:** Drawing-State via `useLagekarteStore()`

**Integration:**
```tsx
// packages/frontend/src/components/organisms/lagekarte/LagekarteMap.tsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useLagekarteData } from '@/hooks/lagekarte/useLagekarteData';
import { useLagekarteStore } from '@/stores/lagekarteStore';

export const LagekarteMap = ({ einsatzId, initialCenter, initialZoom = 13 }: LagekarteMapProps) => {
  const { pois, isLoading } = useLagekarteData(einsatzId);
  const { drawingState, setDrawingState } = useLagekarteStore();

  // Debounced Backend-Sync
  const { mutate: saveLagekarteState } = useSaveLagekarteState(einsatzId);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveLagekarteState({ state: drawingState });
    }, 2000);
    return () => clearTimeout(timer);
  }, [drawingState]);

  return (
    <MapContainer center={initialCenter} zoom={initialZoom}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <PoiMarkerLayer pois={pois} />
      <DrawingLayer state={drawingState} onChange={setDrawingState} />
    </MapContainer>
  );
};
```

---

### 6.2.2 PoiMarker (Molecule)

**Purpose:** POI-Marker mit Clustering und Custom-Icons.

**Key Responsibilities:**
- POI-Icon-Rendering basierend auf `PoiType`
- Marker-Clustering via leaflet.markercluster
- Popup mit POI-Details (PoiCard)
- Drag & Drop für Position-Update

**Props:**
```typescript
interface PoiMarkerProps {
  poi: LagekartePoi;
  onUpdate: (id: string, data: Partial<LagekartePoi>) => void;
  onDelete: (id: string) => void;
  draggable?: boolean;
}
```

**Icon-Mapping:**
```typescript
const POI_ICONS: Record<PoiType, L.Icon> = {
  EINSATZORT: new L.Icon({ iconUrl: '/icons/einsatzort.svg', iconSize: [32, 32] }),
  EINSATZLEITUNG: new L.Icon({ iconUrl: '/icons/el.svg', iconSize: [32, 32] }),
  FAHRZEUG: new L.Icon({ iconUrl: '/icons/fahrzeug.svg', iconSize: [28, 28] }),
  // ... 10 weitere Typen
};
```

---

### 6.2.3 DrawingToolbar (Molecule)

**Purpose:** Toolbar für Drawing-Tools (Polygon, Line, Rectangle).

**Key Responsibilities:**
- Integration von **Leaflet.PM** (NOT leaflet-draw - veraltet!)
- Drawing-Mode-Toggle (Polygon, Line, Rectangle)
- Drawing-Undo/Redo
- Drawing-Color-Picker

**Implementation:**
```tsx
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import '@geoman-io/leaflet-geoman-free';

export const DrawingLayer = ({ state, onChange }: DrawingLayerProps) => {
  const map = useMap();

  useEffect(() => {
    // Initialize Leaflet.PM
    map.pm.addControls({
      position: 'topright',
      drawPolygon: true,
      drawPolyline: true,
      drawRectangle: true,
      drawCircle: false, // GeoJSON unterstützt keine Circles
      drawMarker: false, // POIs sind separate Entities
    });

    // Event handlers
    map.on('pm:create', (e) => {
      onChange({ ...state, features: [...state.features, e.layer.toGeoJSON()] });
    });
    map.on('pm:edit', (e) => handleEdit(e));
    map.on('pm:remove', (e) => handleDelete(e));

    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  return null; // Leaflet.PM renders directly to map
};
```

---

## 6.3 State Management Architecture

Das Lagekarte-Feature nutzt **zwei State-Layers**:

### 6.3.1 Server-State (TanStack Query)

**Zweck:** Backend-synchronisierte Daten (POIs, Lagekarte-State).

**Query Keys:**
```typescript
// packages/frontend/src/queryKeys.ts
export const LAGEKARTE_QUERY_KEYS = {
  all: ['lagekarte'] as const,
  byEinsatz: (einsatzId: string) => [...LAGEKARTE_QUERY_KEYS.all, 'einsatz', einsatzId] as const,
  pois: (einsatzId: string) => [...LAGEKARTE_QUERY_KEYS.all, 'pois', einsatzId] as const,
  poi: (poiId: string) => [...LAGEKARTE_QUERY_KEYS.all, 'poi', poiId] as const,
} as const;
```

**Custom Hooks:**
```typescript
// packages/frontend/src/hooks/lagekarte/useLagekarteData.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';

export const useLagekarteData = (einsatzId: string) => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: () => api.lagekarte().getLagekarteByEinsatzId({ einsatzId }),
    staleTime: 30000,
    retry: 3,
  });
};

export const usePois = (einsatzId: string, type?: PoiType) => {
  return useQuery({
    queryKey: LAGEKARTE_QUERY_KEYS.pois(einsatzId),
    queryFn: () => api.lagekarte().getPois({ einsatzId, type }),
    staleTime: 10000,
  });
};

export const useCreatePoi = (einsatzId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePoiDto) =>
      api.lagekarte().createPoi({ einsatzId, createPoiDto: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LAGEKARTE_QUERY_KEYS.pois(einsatzId) });
      toast.success('POI erstellt');
    },
  });
};
```

---

### 6.3.2 Client-State (TanStack Store)

**Zweck:** Lokaler UI-State (Drawing-State, Layer-Visibility, Zoom-Level).

**Store Definition:**
```tsx
// packages/frontend/src/stores/lagekarteStore.ts
import { Store, useStore } from '@tanstack/react-store';
import type { GeoJSON } from 'geojson';

interface LagekarteStoreState {
  // Drawing State (debounced Backend-Sync)
  drawingState: GeoJSON.FeatureCollection;

  // UI State (nicht synchronisiert)
  visibleLayers: {
    pois: boolean;
    drawings: boolean;
    tiles: boolean;
  };

  // Map State
  center: [number, number];
  zoom: number;

  // Offline State
  offlineMode: boolean;
  downloadedTileBounds: L.LatLngBounds | null;
}

export const lagekarteStore = new Store<LagekarteStoreState>({
  drawingState: { type: 'FeatureCollection', features: [] },
  visibleLayers: { pois: true, drawings: true, tiles: true },
  center: [51.1657, 10.4515], // Deutschland-Zentrum
  zoom: 6,
  offlineMode: false,
  downloadedTileBounds: null,
});

export function useLagekarteStore() {
  const store = useStore(lagekarteStore);

  const setDrawingState = (state: GeoJSON.FeatureCollection) => {
    lagekarteStore.setState((prev) => ({ ...prev, drawingState: state }));
  };

  const toggleLayer = (layer: keyof LagekarteStoreState['visibleLayers']) => {
    lagekarteStore.setState((prev) => ({
      ...prev,
      visibleLayers: { ...prev.visibleLayers, [layer]: !prev.visibleLayers[layer] },
    }));
  };

  return { ...store, setDrawingState, toggleLayer };
}
```

---

## 6.4 Routing Architecture

**Neue Route:** `/app/einsatz/$einsatzId/lagekarte`

**Route Definition:**
```tsx
// packages/frontend/src/routes/app/einsatz/$einsatzId/lagekarte.tsx
import { createFileRoute } from '@tanstack/react-router';
import { LagekarteView } from '@/components/pages/lagekarte/LagekarteView';

export const Route = createFileRoute('/app/einsatz/$einsatzId/lagekarte')({
  component: RouteComponent,
  // Lazy-Loading für 220KB Leaflet-Bundle
  loader: () => import('@/components/pages/lagekarte/LagekarteView'),
});

function RouteComponent() {
  const { einsatzId } = Route.useParams();

  return <LagekarteView einsatzId={einsatzId} />;
}
```

**Page Component:**
```tsx
// packages/frontend/src/components/pages/lagekarte/LagekarteView.tsx
import { Suspense, lazy } from 'react';
import { LoadingState } from '@/components/atoms/LoadingState';

// Lazy-Load Leaflet-Bundle
const LagekarteMap = lazy(() => import('@/components/organisms/lagekarte/LagekarteMap'));

export const LagekarteView = ({ einsatzId }: { einsatzId: string }) => {
  const { data: lagekarte, isLoading } = useLagekarteData(einsatzId);

  if (isLoading) return <LoadingState />;

  return (
    <div className="h-screen flex flex-col">
      <LagekarteToolbar einsatzId={einsatzId} />
      <div className="flex-1 relative">
        <Suspense fallback={<LoadingState />}>
          <LagekarteMap
            einsatzId={einsatzId}
            initialCenter={lagekarte?.center}
            initialZoom={lagekarte?.zoom}
          />
        </Suspense>
        <LagekarteSidebar einsatzId={einsatzId} />
      </div>
    </div>
  );
};
```

**Navigation Integration:**
```typescript
// Existierende Einsatz-Navigation erweitern
const einsatzNavigation = [
  { label: 'Übersicht', path: '/übersicht' },
  { label: 'ETB', path: '/führung/etb' },
  { label: 'Lagekarte', path: '/lagekarte' }, // 🆕 Neuer Link
  // ...
];
```

---

## 6.5 Offline Strategy

**Implementierung:** TanStack Query Persistence Plugin + leaflet.offline

### 6.5.1 Query Persistence Setup

```tsx
// packages/frontend/src/main.tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 Tage Cache
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'BLUELIGHT_QUERY_CACHE',
});

// App-Root mit Persistence
<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
  <App />
</PersistQueryClientProvider>
```

### 6.5.2 Offline Tile-Caching

```tsx
// packages/frontend/src/utils/offlineTileCache.ts
import { TileLayerOffline } from 'react-leaflet-offline';
import localforage from 'localforage';

export const offlineTileStorage = localforage.createInstance({
  name: 'bluelight-lagekarte',
  storeName: 'tiles',
});

// Tile-Download für Offline-Nutzung
export async function downloadTilesForBounds(
  bounds: L.LatLngBounds,
  zoomLevels: number[]
): Promise<void> {
  const tileUrls = calculateTileUrls(bounds, zoomLevels);

  for (const url of tileUrls) {
    const response = await fetch(url);
    const blob = await response.blob();
    await offlineTileStorage.setItem(url, blob);
  }

  toast.success(`${tileUrls.length} Kacheln heruntergeladen`);
}
```

**Offline-Detection:**
```typescript
// packages/frontend/src/hooks/useOfflineStatus.ts
import { useEffect, useState } from 'react';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}
```

---

## 6.6 Leaflet Integration

### 6.6.1 Dependencies

```json
// packages/frontend/package.json (🆕 Hinzuzufügen)
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "leaflet.offline": "^2.1.0",
    "leaflet.markercluster": "^1.5.3",
    "@geoman-io/leaflet-geoman-free": "^2.16.0",
    "@types/leaflet": "^1.9.8",
    "@types/leaflet.markercluster": "^1.5.4"
  }
}
```

**WICHTIG:** Verwende `@geoman-io/leaflet-geoman-free` statt des veralteten `leaflet-draw`!

### 6.6.2 Leaflet CSS Import

```typescript
// packages/frontend/src/main.tsx
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
```

### 6.6.3 Custom Leaflet Icon-Fix (Vite-Workaround)

```typescript
// packages/frontend/src/utils/leafletIconFix.ts
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});
```

---

## 6.7 Performance Optimizations

### 6.7.1 Lazy-Loading Strategy

**Bundle-Size-Reduktion:**
```typescript
// Leaflet-Bundle nur auf Lagekarte-Route laden
const LagekarteMap = lazy(() => import('./organisms/lagekarte/LagekarteMap'));
```

**Ergebnis:**
- Main-Bundle: ~1.2MB (ohne Leaflet)
- Lagekarte-Bundle: ~220KB (Leaflet + Plugins)
- Lazy-Load-Time: <500ms (bei 3G)

### 6.7.2 POI-Marker-Clustering

```tsx
import MarkerClusterGroup from 'react-leaflet-cluster';

export const PoiMarkerLayer = ({ pois }: { pois: LagekartePoi[] }) => {
  return (
    <MarkerClusterGroup>
      {pois.map((poi) => (
        <PoiMarker key={poi.id} poi={poi} />
      ))}
    </MarkerClusterGroup>
  );
};
```

**Clustering-Strategie:**
- Cluster ab 3+ POIs in 50px Radius
- Cluster-Icon zeigt POI-Count
- Spiderfy-Animation bei Cluster-Click

### 6.7.3 Debounced State-Sync

```typescript
// Nur alle 2 Sekunden Backend-Update
const debouncedSave = useMemo(
  () => debounce((state: GeoJSON.FeatureCollection) => {
    saveLagekarteState({ state });
  }, 2000),
  []
);
```

---

## 6.8 Accessibility & Responsive Design

### 6.8.1 Keyboard Navigation

- **Tab:** Fokus durch Map-Controls
- **Enter:** Marker-Popup öffnen
- **Escape:** Popup/Modal schließen
- **Arrow Keys:** Map-Panning (wenn fokussiert)

### 6.8.2 Touch-Optimierung

```tsx
// Leaflet Touch-Konfiguration
<MapContainer
  touchZoom={true}
  doubleClickZoom={true}
  scrollWheelZoom={false} // Verhindert ungewolltes Zoomen beim Scrollen
  tap={true}
/>
```

### 6.8.3 Responsive Breakpoints

```tsx
// Tailwind-basierte Responsive-Anpassung
<div className="
  h-screen flex
  flex-col md:flex-row
">
  {/* Sidebar: Mobile unten, Desktop rechts */}
  <LagekarteSidebar className="
    h-64 md:h-full
    w-full md:w-80
    order-1 md:order-2
  " />

  {/* Map: Mobile oben, Desktop links */}
  <LagekarteMap className="
    flex-1
    order-2 md:order-1
  " />
</div>
```

---

## 6.9 Error Handling (Frontend)

### 6.9.1 Map-Loading-Error

```tsx
export const LagekarteMap = ({ einsatzId }: LagekarteMapProps) => {
  const { data, error, isLoading } = useLagekarteData(einsatzId);

  if (error) {
    return (
      <ErrorState
        title="Lagekarte konnte nicht geladen werden"
        message={getApiErrorMessage(error)}
        retry={() => queryClient.invalidateQueries()}
      />
    );
  }

  // ...
};
```

### 6.9.2 Tile-Loading-Error

```tsx
<TileLayer
  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  eventHandlers={{
    tileerror: (e) => {
      logger.error('Tile failed to load', e);
      // Fallback zu cached Offline-Tiles
      if (offlineMode) {
        e.tile.src = await offlineTileStorage.getItem(e.tile.src);
      }
    },
  }}
/>
```

### 6.9.3 Geocoding-Error

```tsx
export const useGeocodeAddress = () => {
  return useMutation({
    mutationFn: (address: string) => api.lagekarte().geocode({ address }),
    onError: (error: ResponseError) => {
      if (error.status === 429) {
        toast.error('Rate-Limit erreicht', {
          description: 'Bitte warte 1 Sekunde vor der nächsten Suche'
        });
      } else {
        toast.error('Adresse nicht gefunden');
      }
    },
  });
};
```

---
