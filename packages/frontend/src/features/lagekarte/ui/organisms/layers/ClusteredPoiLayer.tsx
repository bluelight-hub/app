import { useDeletePoi, usePois, useUpdatePoi } from '@/features/lagekarte/api';
import { POI_ICON_MAP } from '@/features/lagekarte/utils';
import type { PoiType } from '@/features/lagekarte/utils';
import { formatMgrs } from '@/features/lagekarte/utils/mgrs';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import React, { useMemo, useState, useCallback } from 'react';
import { PiTrash, PiWarning, PiXCircle } from 'react-icons/pi';
import { Marker, Popup, Source, Layer } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { toast } from 'sonner';
import type { PoiDto } from '@/shared';
import type * as GeoJSON from 'geojson';

interface ClusteredPoiLayerProps {
  lagekarteId: string | undefined;
  mapRef: React.RefObject<{ getMap: () => maplibregl.Map } | null>;
}

/**
 * POI-Icon als React-Komponente (kein dangerouslySetInnerHTML)
 */
const PoiIcon: React.FC<{ type: PoiType }> = ({ type }) => {
  const config = POI_ICON_MAP[type] || POI_ICON_MAP.SONSTIGES;
  const { Icon, color, size } = config;
  return <Icon size={size} color={color} />;
};

/**
 * ClusteredPoiLayer-Komponente für Lagekarte (MapLibre GL JS)
 *
 * Rendert POIs mit nativem MapLibre Clustering über GeoJSON Source.
 * Einzelne POIs werden als react-map-gl Marker gerendert (für Drag-Support).
 */
export const ClusteredPoiLayer: React.FC<ClusteredPoiLayerProps> = React.memo(({ lagekarteId, mapRef }) => {
  const { data: pois, isLoading, error } = usePois(lagekarteId);
  const updatePoiMutation = useUpdatePoi();
  const deletePoiMutation = useDeletePoi();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poiToDelete, setPoiToDelete] = useState<PoiDto | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const { validPois, skippedCount } = useMemo(() => {
    if (!pois || pois.length === 0) return { validPois: [], skippedCount: 0 };

    const valid: typeof pois = [];
    let skipped = 0;

    for (const poi of pois) {
      const lat = poi.coordinate?.lat;
      const lng = poi.coordinate?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        skipped++;
      } else {
        valid.push(poi);
      }
    }

    return { validPois: valid, skippedCount: skipped };
  }, [pois]);

  // GeoJSON für Cluster-Source
  const clusterGeoJson: GeoJSON.FeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: validPois.map((poi) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [poi.coordinate.lng, poi.coordinate.lat],
        },
        properties: {
          id: poi.id,
          name: poi.name,
          category: poi.category,
        },
      })),
    }),
    [validPois],
  );

  const selectedPoi = useMemo(() => validPois.find((p) => p.id === selectedPoiId), [validPois, selectedPoiId]);

  const handleClusterClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map || !e.features?.length) return;

      const clusterId = e.features[0].properties?.cluster_id;
      const source = map.getSource('poi-source') as maplibregl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geometry = e.features![0].geometry;
        if (geometry.type === 'Point') {
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom + 1,
          });
        }
      });
    },
    [mapRef],
  );

  const handleDragEnd = useCallback(
    (e: { lngLat: { lng: number; lat: number } }, poiId: string) => {
      if (!lagekarteId) return;

      updatePoiMutation.mutate(
        {
          poiId,
          lagekarteId,
          data: { coordinate: { lat: e.lngLat.lat, lng: e.lngLat.lng } },
        },
        {
          onSuccess: () => toast.success('POI verschoben', { description: 'Die Position wurde aktualisiert.' }),
          onError: async (mutationError) => {
            const message = await getApiErrorMessage(mutationError, 'Der POI konnte nicht verschoben werden.');
            toast.error('Fehler beim Verschieben', { description: message });
          },
        },
      );
    },
    [lagekarteId, updatePoiMutation],
  );

  const handleRightClick = useCallback((e: React.MouseEvent, poi: PoiDto) => {
    e.preventDefault();
    setPoiToDelete(poi);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = () => {
    if (!poiToDelete || !lagekarteId) return;

    deletePoiMutation.mutate(
      { poiId: poiToDelete.id, lagekarteId },
      {
        onSuccess: () => toast.success('POI gelöscht', { description: 'Der POI wurde erfolgreich entfernt.' }),
        onError: async (mutationError) => {
          const message = await getApiErrorMessage(mutationError, 'Der POI konnte nicht gelöscht werden.');
          toast.error('Fehler beim Löschen', { description: message });
        },
      },
    );

    setDeleteDialogOpen(false);
    setPoiToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 z-50 rounded-lg bg-surface-panel p-3 shadow-lg">
        <Spinner size="sm" type="ring" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg border-2 border-status-danger-border bg-status-danger-surface p-3 shadow-lg">
        <PiXCircle className="h-5 w-5 text-status-danger-text" />
        <p className="text-body-sm font-medium text-status-danger-text">POIs konnten nicht geladen werden</p>
      </div>
    );
  }

  if (!pois || pois.length === 0) return null;

  return (
    <>
      {skippedCount > 0 && (
        <div className="absolute right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border-2 border-status-warning-border bg-status-warning-surface p-3 shadow-lg">
          <PiWarning className="h-5 w-5 text-status-warning-text" />
          <p className="text-body-sm font-medium text-status-warning-text">
            {skippedCount} POI{skippedCount > 1 ? 's' : ''} konnten nicht angezeigt werden (ungültige Koordinaten)
          </p>
        </div>
      )}

      {/* Native MapLibre Cluster-Source */}
      <Source id="poi-source" type="geojson" data={clusterGeoJson} cluster={true} clusterMaxZoom={17} clusterRadius={50}>
        {/* Cluster-Kreise */}
        <Layer
          id="poi-clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': ['step', ['get', 'point_count'], '#3b82f6', 10, '#f97316', 100, '#ef4444'],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 100, 30],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          }}
          onClick={handleClusterClick}
        />
        {/* Cluster-Zähler */}
        <Layer
          id="poi-cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-size': 14,
          }}
          paint={{
            'text-color': '#ffffff',
          }}
        />
      </Source>

      {/* Einzelne POI-Marker (für Drag-Support und Custom Icons) */}
      {validPois.map((poi) => {
        const ariaLabel = `${poi.category}: ${poi.name}${poi.beschreibung ? ` - ${poi.beschreibung}` : ''}`;

        return (
          <Marker
            key={poi.id}
            longitude={poi.coordinate.lng}
            latitude={poi.coordinate.lat}
            draggable={true}
            onDragEnd={(e) => handleDragEnd(e, poi.id)}
            onClick={() => setSelectedPoiId(poi.id)}
            anchor="bottom"
          >
            <div className="poi-marker cursor-pointer" title={ariaLabel} aria-label={ariaLabel} onContextMenu={(e) => handleRightClick(e, poi)}>
              <PoiIcon type={poi.category} />
            </div>
          </Marker>
        );
      })}

      {/* Popup für selektierten POI */}
      {selectedPoi && (
        <Popup longitude={selectedPoi.coordinate.lng} latitude={selectedPoi.coordinate.lat} onClose={() => setSelectedPoiId(null)} closeOnClick={false} anchor="bottom" offset={24}>
          <div className="rounded-lg bg-surface-panel p-4 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">{selectedPoi.name}</h3>
            <p className="mb-1 text-body-sm text-text-secondary">{selectedPoi.category}</p>
            {selectedPoi.coordinate.mgrs && <p className="mb-1 font-mono text-body-xs text-text-muted">{formatMgrs(selectedPoi.coordinate.mgrs)}</p>}
            {selectedPoi.beschreibung && <p className="text-body-sm text-text-secondary">{selectedPoi.beschreibung}</p>}
          </div>
        </Popup>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPoiToDelete(null);
        }}
        className="relative z-[9999]"
      >
        <DialogBackdrop className="fixed inset-0 bg-surface-inverse/30 backdrop-blur-sm transition-opacity" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg border border-border-subtle bg-surface-panel p-6 shadow-xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-danger-surface">
                <PiTrash className="h-6 w-6 text-status-danger-text" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <DialogTitle as="h3" className="text-lg font-semibold text-text-primary">
                  POI löschen?
                </DialogTitle>
                <p className="mt-2 text-body-sm text-text-secondary">
                  Möchten Sie <span className="font-semibold">{poiToDelete?.name || 'diesen POI'}</span> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                intent="secondary"
                appearance="outlined"
                size="md"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setPoiToDelete(null);
                }}
              >
                Abbrechen
              </Button>
              <Button intent="danger" appearance="filled" size="md" onClick={handleDeleteConfirm} disabled={deletePoiMutation.isPending}>
                {deletePoiMutation.isPending ? (
                  <>
                    <Spinner size="sm" type="ring" />
                    <span className="ml-2">Löschen...</span>
                  </>
                ) : (
                  'Löschen'
                )}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
});
