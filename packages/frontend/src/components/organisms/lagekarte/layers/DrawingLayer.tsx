import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { DrawingTool } from '../toolbar/DrawingToolbar';
import { DEFAULT_SHAPE_STYLE } from '@/utils/drawing-styles';
import type React from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import type * as GeoJSON from 'geojson';

/**
 * Maximum number of shapes per Lagekarte (Performance-Limit)
 */
const MAX_SHAPES = 100;

/**
 * Generate unique shape ID using crypto.randomUUID()
 * Fallback to Date.now() + random suffix for older browsers
 */
const generateShapeId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix to avoid collisions
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

interface DrawingLayerProps {
  /**
   * ID des Einsatzes
   */
  einsatzId: string;
  /**
   * Aktuell ausgewähltes Drawing-Tool
   */
  selectedTool: DrawingTool;
  /**
   * Initial State (GeoJSON FeatureCollection) aus Backend
   */
  initialState?: GeoJSON.FeatureCollection;
  /**
   * Shape das updated werden soll (z.B. nach Label-Änderung)
   */
  shapeToUpdate?: GeoJSON.Feature | null;
  /**
   * Callback wenn Shapes sich ändern (für Backend-Persistierung)
   */
  onShapesChange: (shapes: GeoJSON.FeatureCollection) => void;
  /**
   * Callback wenn Shape-Limit erreicht wird
   */
  onShapeLimitReached?: () => void;
  /**
   * Callback wenn neuer Shape erstellt wurde (öffnet Label-Modal)
   */
  onShapeCreated?: (shape: GeoJSON.Feature) => void;
  /**
   * Callback wenn Shape-Update abgeschlossen ist
   */
  onShapeUpdateComplete?: () => void;
}

/**
 * DrawingLayer-Komponente für Lagekarte
 *
 * Integriert Leaflet.PM (Geoman) zum Zeichnen von Polygonen, Linien und Rechtecken
 * auf der Karte. Shapes werden als GeoJSON FeatureCollection gespeichert.
 *
 * @param einsatzId - ID des Einsatzes
 * @param selectedTool - Aktuell ausgewähltes Drawing-Tool
 * @param onShapesChange - Callback für Shape-Änderungen (Backend-Persistierung)
 * @param onShapeLimitReached - Callback wenn Shape-Limit (100) erreicht wird
 * @param onShapeCreated - Callback wenn neuer Shape erstellt wurde
 *
 * @remarks
 * - Verwendet Leaflet.PM (NOT leaflet-draw - veraltet!)
 * - Shape-Limit: Max 100 Shapes per Lagekarte
 * - Event-Handler: pm:create, pm:edit, pm:remove
 * - Shapes haben Default-Style bis Typ-Auswahl im Label-Modal
 *
 * @example
 * ```tsx
 * <DrawingLayer
 *   einsatzId="einsatz-123"
 *   selectedTool={selectedTool}
 *   onShapesChange={(shapes) => saveMutation.mutate(shapes)}
 *   onShapeLimitReached={() => toast.error('Max 100 Shapes')}
 *   onShapeCreated={(shape) => setShapeLabelModalOpen(true)}
 * />
 * ```
 */
const DrawingLayerComponent: React.FC<DrawingLayerProps> = ({
  einsatzId: _einsatzId,
  selectedTool,
  initialState,
  shapeToUpdate,
  onShapesChange,
  onShapeLimitReached,
  onShapeCreated,
  onShapeUpdateComplete,
}) => {
  const map = useMap();
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection>(
    initialState && initialState.type === 'FeatureCollection' && Array.isArray(initialState.features)
      ? initialState
      : {
          type: 'FeatureCollection',
          features: [],
        },
  );

  // State für Shape-Selection
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Ref für Layer-Tracking (avoid duplicate layers)
  const layersRef = useRef<Map<number, L.Layer>>(new Map());

  // Ref für aktuelle shapes (um stale closures zu vermeiden)
  const shapesRef = useRef(shapes);

  // Ref zum Tracking ob initial shapes bereits geladen wurden
  const initialShapesLoadedRef = useRef(false);

  // Ref für original styles (vor Highlighting)
  const originalStylesRef = useRef<Map<string, any>>(new Map());

  // Update shapesRef bei shapes-Änderung
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  /**
   * Initialize Leaflet.PM Controls
   */
  useEffect(() => {
    // Add Leaflet.PM Controls to map
    map.pm.addControls({
      position: 'topright',
      drawPolygon: false, // We control via DrawingToolbar
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawText: false, // We control via DrawingToolbar (Text-Tool)
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    // Hide default PM controls (we use custom DrawingToolbar)
    map.pm.Toolbar.setButtonDisabled('drawPolygon', true);
    map.pm.Toolbar.setButtonDisabled('drawPolyline', true);
    map.pm.Toolbar.setButtonDisabled('drawRectangle', true);

    // Cleanup on unmount
    return () => {
      map.pm.removeControls();

      // Clear layer references to prevent memory leaks
      layersRef.current.forEach((layer) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current.clear();
    };
  }, [map]);

  /**
   * Load initial shapes from backend (on mount)
   *
   * BUGFIX: Deduplizierung verhindert doppelte Shapes nach TanStack Query Refetch
   * - Problem: initialState Objektreferenz ändert sich bei Query-Invalidierung
   * - Lösung: Prüfe existierende Shape-IDs in layersRef vor Layer-Add
   */
  useEffect(() => {
    // Nur einmal beim Mount laden
    if (initialShapesLoadedRef.current) return;
    if (!initialState?.features || initialState.features.length === 0) return;

    // Deduplizierung: Sammle bereits geladene Shape-IDs aus layersRef
    const existingShapeIds = new Set<string>(Array.from(layersRef.current.entries()).map(([shapeId]) => String(shapeId)));

    // Import Leaflet for L.geoJSON and L.marker
    import('leaflet').then((L) => {
      // Add shapes to map using L.geoJSON
      initialState.features.forEach((feature) => {
        const shapeId = feature.properties?.id;

        // DEDUPLIZIERUNG: Skip wenn Shape bereits existiert
        if (shapeId && existingShapeIds.has(String(shapeId))) {
          console.debug('[DrawingLayer] Skipping duplicate shape:', shapeId);
          return;
        }

        // Check if this is a Text marker (Point geometry with text property)
        const isTextMarker = feature.geometry.type === 'Point' && feature.properties?.text;

        let layer: L.Layer | null = null;

        if (isTextMarker) {
          // Create Text marker using Leaflet.PM API
          const coordinates = feature.geometry.coordinates as [number, number];

          // Sanitize text content to prevent XSS
          const safeText = feature.properties.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

          const textMarker = L.marker([coordinates[1], coordinates[0]], {
            icon: L.divIcon({
              html: `<div class="lagekarte-text-marker">${safeText}</div>`,
              className: '',
              iconSize: undefined,
            }),
            draggable: false, // Draggable only when in edit mode
          });

          // Add to map and store text content in layer
          textMarker.addTo(map);

          // Store text content for later editing
          (textMarker as any)._textContent = feature.properties.text;

          layer = textMarker;
        } else {
          // Normal shapes (Polygon, LineString, etc.)
          layer = L.geoJSON(feature, {
            style: DEFAULT_SHAPE_STYLE,
          }).getLayers()[0] as L.Layer;

          if (layer) {
            layer.addTo(map);
          }
        }

        if (layer) {
          // WICHTIG: Nicht automatisch in Edit-Mode versetzen!
          // Edit-Mode wird nur aktiviert wenn User "Bearbeiten" Tool auswählt
          // (layer as any).pm?.enable(); // REMOVED

          // Track layer and store shapeId directly on the layer
          const finalShapeId = shapeId || generateShapeId();
          (layer as any)._shapeId = finalShapeId; // Store ID on layer for later retrieval
          layersRef.current.set(finalShapeId, layer);

          // Add click handler for selection
          const handleLayerClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            const clickedLayer = e.target;
            const clickedShapeId = (clickedLayer as any)._shapeId;
            if (clickedShapeId) {
              setSelectedShapeId(clickedShapeId);
            }
          };
          layer.on('click', handleLayerClick);
        }
      });

      initialShapesLoadedRef.current = true;
    });
  }, [map, initialState]);

  /**
   * Handle Drawing-Tool selection from Toolbar
   */
  useEffect(() => {
    if (!selectedTool) {
      // Deactivate all drawing modes
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();
      // Deselect shape when tool is cleared
      setSelectedShapeId(null);
      return;
    }

    // Activate drawing mode based on selected tool
    switch (selectedTool) {
      case 'polygon':
        map.pm.enableDraw('Polygon', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'polyline':
        map.pm.enableDraw('Line', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'rectangle':
        map.pm.enableDraw('Rectangle', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'text':
        map.pm.enableDraw('Text', {
          textOptions: {
            text: 'Beschriftung',
            className: 'lagekarte-text-marker',
          },
        });
        break;
      case 'edit':
        map.pm.disableDraw();
        map.pm.enableGlobalEditMode();
        break;
      case 'delete':
        map.pm.disableDraw();
        map.pm.enableGlobalRemovalMode();
        break;
      default:
        map.pm.disableDraw();
    }

    // Deselect shape when tool changes
    setSelectedShapeId(null);

    // Cleanup: Deactivate when tool changes
    return () => {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();
    };
  }, [selectedTool, map]);

  /**
   * Handle Shape Selection via Click
   * - Click auf Shape: Selektiere und highlighte
   * - Click auf leere Karte: Deselektiere
   */
  useEffect(() => {
    /**
     * Helper: Apply highlight style to selected layer
     */
    const highlightLayer = (layer: L.Layer, shapeId: string) => {
      // Skip text markers (no style to highlight)
      if ((layer as any).options?.icon) {
        return;
      }

      // Store original style if not already stored
      if (!originalStylesRef.current.has(shapeId) && (layer as any).setStyle) {
        const currentStyle = (layer as any).options;
        originalStylesRef.current.set(shapeId, {
          color: currentStyle.color,
          weight: currentStyle.weight,
          opacity: currentStyle.opacity,
          fillOpacity: currentStyle.fillOpacity,
        });
      }

      // Apply highlight style
      if ((layer as any).setStyle) {
        (layer as any).setStyle({
          color: '#3b82f6', // blue-500
          weight: 4,
          opacity: 1.0,
          fillOpacity: 0.5,
        });
      }
    };

    /**
     * Helper: Remove highlight style from layer
     */
    const unhighlightLayer = (layer: L.Layer, shapeId: string) => {
      // Skip text markers
      if ((layer as any).options?.icon) {
        return;
      }

      // Restore original style if available
      const originalStyle = originalStylesRef.current.get(shapeId);
      if (originalStyle && (layer as any).setStyle) {
        (layer as any).setStyle(originalStyle);
        originalStylesRef.current.delete(shapeId);
      }
    };

    /**
     * Click-Handler für Layer-Selection
     */
    const handleLayerClick = (e: L.LeafletMouseEvent) => {
      // Prevent map click from firing
      L.DomEvent.stopPropagation(e);

      const layer = e.target;
      const shapeId = (layer as any)._shapeId;

      if (shapeId) {
        // Deselect previous shape
        if (selectedShapeId && selectedShapeId !== shapeId) {
          const prevLayer = layersRef.current.get(selectedShapeId);
          if (prevLayer) {
            unhighlightLayer(prevLayer, selectedShapeId);
          }
        }

        // Select and highlight current shape
        setSelectedShapeId(shapeId);
        highlightLayer(layer, shapeId);
      }
    };

    /**
     * Click-Handler für Map (Deselection)
     */
    const handleMapClick = () => {
      if (selectedShapeId) {
        // Unhighlight previous selected shape
        const prevLayer = layersRef.current.get(selectedShapeId);
        if (prevLayer) {
          unhighlightLayer(prevLayer, selectedShapeId);
        }
        setSelectedShapeId(null);
      }
    };

    // Register click handlers on all existing layers
    layersRef.current.forEach((layer) => {
      layer.on('click', handleLayerClick);
    });

    // Register map click handler
    map.on('click', handleMapClick);

    // Cleanup
    return () => {
      layersRef.current.forEach((layer) => {
        layer.off('click', handleLayerClick);
      });
      map.off('click', handleMapClick);
    };
  }, [map, selectedShapeId]);

  /**
   * Apply/Remove highlighting when selectedShapeId changes
   */
  useEffect(() => {
    // Remove highlight from all shapes
    layersRef.current.forEach((layer, shapeId) => {
      const originalStyle = originalStylesRef.current.get(shapeId);
      if (originalStyle && (layer as any).setStyle) {
        (layer as any).setStyle(originalStyle);
        originalStylesRef.current.delete(shapeId);
      }
    });

    // Apply highlight to selected shape
    if (selectedShapeId) {
      const selectedLayer = layersRef.current.get(selectedShapeId);
      if (selectedLayer && (selectedLayer as any).setStyle) {
        // Store original style
        const currentStyle = (selectedLayer as any).options;
        originalStylesRef.current.set(selectedShapeId, {
          color: currentStyle.color,
          weight: currentStyle.weight,
          opacity: currentStyle.opacity,
          fillOpacity: currentStyle.fillOpacity,
        });

        // Apply highlight
        (selectedLayer as any).setStyle({
          color: '#3b82f6', // blue-500
          weight: 4,
          opacity: 1.0,
          fillOpacity: 0.5,
        });
      }
    }
  }, [selectedShapeId]);

  /**
   * Event Handler: pm:create
   * Called when user creates a new shape
   */
  useEffect(() => {
    const handleCreate = (e: any) => {
      const layer = e.layer;

      // Check shape limit (use shapesRef.current for latest state)
      if (shapesRef.current.features.length >= MAX_SHAPES) {
        // Remove created layer immediately
        map.removeLayer(layer);
        onShapeLimitReached?.();
        return;
      }

      // Convert to GeoJSON
      const geoJson = layer.toGeoJSON() as GeoJSON.Feature;

      // Extract text content for Text markers
      // Leaflet.PM text markers store their content in different places
      let textContent = null;

      // Try multiple methods to extract text from the layer
      if ((layer as any)._textContent) {
        // Custom property we set
        textContent = (layer as any)._textContent;
      } else if ((layer as any).getElement) {
        // Try to get from DOM element
        const element = (layer as any).getElement();
        const textDiv = element?.querySelector('.lagekarte-text-marker, [contenteditable]');
        textContent = textDiv?.textContent || textDiv?.innerText;
      }

      // If still no text, try event shape property
      if (!textContent && e.shape === 'Text') {
        textContent = 'Beschriftung'; // Default text from textOptions
      }

      // Add shape ID for tracking (using unique ID generator)
      const shapeId = generateShapeId();
      geoJson.properties = {
        ...geoJson.properties,
        id: shapeId,
        createdAt: new Date().toISOString(),
        // Add text property for Text markers
        ...(textContent && { text: textContent }),
      };

      // Track layer and store shapeId directly on the layer
      (layer as any)._shapeId = shapeId;
      layersRef.current.set(shapeId, layer);

      // Add click handler to new layer for selection
      const handleLayerClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const clickedLayer = e.target;
        const clickedShapeId = (clickedLayer as any)._shapeId;
        if (clickedShapeId) {
          setSelectedShapeId(clickedShapeId);
        }
      };
      layer.on('click', handleLayerClick);

      // Add to shapes collection (use shapesRef.current)
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [...shapesRef.current.features, geoJson],
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);

      // Trigger Label-Modal
      onShapeCreated?.(geoJson);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
    };
  }, [map, onShapesChange, onShapeLimitReached, onShapeCreated]);

  /**
   * Event Handler: pm:edit
   * Called when user edits an existing shape
   */
  useEffect(() => {
    const handleEdit = (e: any) => {
      const layer = e.layer;
      const updatedGeoJson = layer.toGeoJSON() as GeoJSON.Feature;

      // Extract updated text content for Text markers
      let textContent = null;
      if ((layer as any).getElement) {
        const element = (layer as any).getElement();
        textContent = element?.querySelector('.lagekarte-text-marker')?.textContent || element?.textContent;
      }

      // Find shape by layer
      const shapeId = updatedGeoJson.properties?.id;
      if (!shapeId) return;

      // Update shape in collection (use shapesRef.current)
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shapesRef.current.features.map((feature) => {
          if (feature.properties?.id === shapeId) {
            return {
              ...feature,
              geometry: updatedGeoJson.geometry,
              properties: {
                ...feature.properties,
                // Update text property if this is a Text marker
                ...(textContent && { text: textContent }),
              },
            };
          }
          return feature;
        }),
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);
    };

    map.on('pm:edit', handleEdit);

    return () => {
      map.off('pm:edit', handleEdit);
    };
  }, [map, onShapesChange]);

  /**
   * Event Handler: Text content changes (input/change on Leaflet.PM textarea)
   * Leaflet.PM text markers use a textarea element for editing,
   * and don't trigger pm:edit for text changes.
   * We use a debounced input handler to save changes.
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Use useCallback-equivalent pattern by defining handler inside useEffect
    // but with stable dependencies to prevent "wrong listener type" errors
    const handleTextChange = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;

      // Check if this is a Leaflet.PM text marker textarea
      if (!target.matches('textarea.pm-textarea')) {
        return;
      }

      const newText = target.value || '';

      // Find the parent marker element
      const markerIcon = target.closest('.leaflet-marker-icon.pm-text-marker');
      if (!markerIcon) {
        return;
      }

      // Find the layer associated with this marker
      let shapeId: number | null = null;

      map.eachLayer((layer: any) => {
        if (layer.getElement && layer.getElement() === markerIcon) {
          // Get shape ID directly from layer (stored during initialization or creation)
          shapeId = (layer as any)._shapeId;
        }
      });

      if (!shapeId) {
        return;
      }

      // Debounce: Wait 500ms after last input before saving
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Update shape in collection (use shapesRef to avoid stale closure)
        const updatedShapes: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: shapesRef.current.features.map((feature) => {
            if (feature.properties?.id === shapeId) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  text: newText,
                },
              };
            }
            return feature;
          }),
        };

        setShapes(updatedShapes);
        onShapesChange(updatedShapes);
      }, 500);
    };

    // Listen for input events (fires while typing)
    const mapContainer = map.getContainer();

    // Add event listeners with capturing phase
    // IMPORTANT: Must use same options in removeEventListener
    const listenerOptions = { capture: true };
    mapContainer.addEventListener('input', handleTextChange, listenerOptions);
    mapContainer.addEventListener('change', handleTextChange, listenerOptions);

    return () => {
      clearTimeout(timeoutId);
      // CRITICAL: Must use same options as addEventListener
      mapContainer.removeEventListener('input', handleTextChange, listenerOptions);
      mapContainer.removeEventListener('change', handleTextChange, listenerOptions);
    };
  }, [map, onShapesChange]);

  /**
   * Event Handler: pm:remove
   * Called when user deletes a shape
   */
  useEffect(() => {
    const handleRemove = (e: any) => {
      const layer = e.layer;
      const geoJson = layer.toGeoJSON() as GeoJSON.Feature;
      const shapeId = geoJson.properties?.id;

      if (!shapeId) return;

      // Remove from tracking
      layersRef.current.delete(shapeId);

      // Remove from shapes collection (use shapesRef.current)
      const updatedShapes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shapesRef.current.features.filter((feature) => feature.properties?.id !== shapeId),
      };
      setShapes(updatedShapes);
      onShapesChange(updatedShapes);
    };

    map.on('pm:remove', handleRemove);

    return () => {
      map.off('pm:remove', handleRemove);
    };
  }, [map, onShapesChange]);

  /**
   * Handle shape updates (e.g. label changes from ShapeLabelModal)
   */
  useEffect(() => {
    if (!shapeToUpdate) return;

    const shapeId = shapeToUpdate.properties?.id;
    if (!shapeId) {
      onShapeUpdateComplete?.();
      return;
    }

    // Update shape in collection
    const updatedShapes: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: shapesRef.current.features.map((feature) => (feature.properties?.id === shapeId ? { ...feature, properties: shapeToUpdate.properties } : feature)),
    };

    setShapes(updatedShapes);
    onShapesChange(updatedShapes);

    // Notify parent that update is complete
    onShapeUpdateComplete?.();
  }, [shapeToUpdate, onShapesChange, onShapeUpdateComplete]);

  // DrawingLayer renders nothing (Leaflet.PM renders directly to map)
  return null;
};

/**
 * Performance-optimized DrawingLayer with React.memo()
 * Prevents unnecessary re-renders when parent components update
 */
export const DrawingLayer = memo(DrawingLayerComponent);
