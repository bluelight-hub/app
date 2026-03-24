import { useDeletePoi, usePois, useUpdatePoi } from '@/features/lagekarte/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { getPoiIcon } from '@/features/lagekarte/utils';
import { createClusterIcon } from '@/features/lagekarte/utils';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { formatMgrs } from '@/features/lagekarte/utils/mgrs';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import React, { useMemo, useState } from 'react';
import { PiTrash, PiWarning, PiXCircle } from 'react-icons/pi';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { toast } from 'sonner';
import type { LeafletMouseEvent } from 'leaflet';
import type { PoiDto } from '@/shared';

interface ClusteredPoiLayerProps {
  lagekarteId: string | undefined;
}

/**
 * ClusteredPoiLayer-Komponente für Lagekarte (Story 48.6)
 *
 * Rendert alle POIs (Points of Interest) als geclusterte Marker auf der Karte.
 * - Verwendet MarkerClusterGroup für automatisches Clustering bei >3 POIs in Nähe
 * - Fetcht POIs via TanStack Query Hook
 * - Verwendet typenspezifische Icons aus react-icons
 * - Zeigt Popup mit POI-Details bei Klick
 * - Behandelt Loading- und Error-States
 * - Performance-optimiert mit React.memo() und useMemo()
 * - Barrierefrei mit ARIA-Labels für Screen Reader
 *
 * @param lagekarteId - ID der aktuellen Lagekarte
 *
 * @remarks
 * Performance-Optimierungen:
 * - React.memo() verhindert unnötige Re-Renders
 * - useMemo() cached POI-Validierung und Icon-Berechnung
 * - MarkerClusterGroup reduziert DOM-Nodes (1000 POIs → ~20 Cluster)
 *
 * Performance-Ziel (AC: IV1):
 * - <3 Sekunden Ladezeit bei 1000 POIs (auf 4G Verbindung)
 * - <100ms Cluster-Update-Zeit (Zoom/Pan)
 *
 * Clustering-Behavior (AC: 1-4):
 * - Ab 3+ POIs in Nähe (50px radius) → automatisches Clustering
 * - Cluster zeigt Anzahl der enthaltenen POIs
 * - Klick auf Cluster → Zoom in + Cluster aufteilen
 * - Zoom out → POIs werden wieder geclustert
 * - Max-Zoom (18) → Spiderfy-Modus (overlapping markers spread out)
 */
export const ClusteredPoiLayer: React.FC<ClusteredPoiLayerProps> = React.memo(({ lagekarteId }) => {
  const { data: pois, isLoading, error } = usePois(lagekarteId);
  const updatePoiMutation = useUpdatePoi();
  const deletePoiMutation = useDeletePoi();

  // Delete Confirmation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poiToDelete, setPoiToDelete] = useState<PoiDto | null>(null);

  // Berechne gültige und ungültige POIs (Performance-optimiert mit useMemo)
  // WICHTIG: Muss VOR allen early returns stehen (React Hooks Rules)
  const { validPois, skippedCount } = useMemo(() => {
    if (!pois || pois.length === 0) {
      return { validPois: [], skippedCount: 0 };
    }

    const valid: typeof pois = [];
    let skipped = 0;

    for (const poi of pois) {
      const lat = poi.coordinate?.lat;
      const lng = poi.coordinate?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        console.warn(`POI ${poi.id} has invalid coordinates:`, {
          lat,
          lng,
        });
        skipped++;
      } else {
        valid.push(poi);
      }
    }

    return { validPois: valid, skippedCount: skipped };
  }, [pois]);

  // Loading-State: Spinner in oberer rechter Ecke
  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 z-50 rounded-lg bg-surface-panel p-3 shadow-lg">
        <Spinner size="sm" type="ring" />
      </div>
    );
  }

  // Error-State: Error-Badge in Map-Ecke
  if (error) {
    console.error('POI-Fetch-Fehler:', error);
    return (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg border-2 border-status-danger-border bg-status-danger-surface p-3 shadow-lg">
        <PiXCircle className="h-5 w-5 text-status-danger-text" />
        <p className="font-medium text-body-sm text-status-danger-text">POIs konnten nicht geladen werden</p>
      </div>
    );
  }

  // Keine POIs vorhanden
  if (!pois || pois.length === 0) {
    return null;
  }

  /**
   * Handler für Drag-End-Event (POI verschieben)
   * @param e - Leaflet Drag-End Event
   * @param poiId - ID des POI der verschoben wurde
   */
  const handleDragEnd = (e: LeafletMouseEvent, poiId: string) => {
    if (!lagekarteId) return;

    const marker = e.target;
    const { lat, lng } = marker.getLatLng();

    // Update POI mit neuen Koordinaten
    updatePoiMutation.mutate(
      {
        poiId,
        lagekarteId,
        data: {
          coordinate: { lat, lng },
        },
      },
      {
        onSuccess: () => {
          toast.success('POI verschoben', {
            description: 'Die Position wurde aktualisiert.',
          });
        },
        onError: async (mutationError) => {
          const message = await getApiErrorMessage(mutationError, 'Der POI konnte nicht verschoben werden.');
          toast.error('Fehler beim Verschieben', {
            description: message,
          });
        },
      },
    );
  };

  /**
   * Handler für Rechtsklick auf POI (Löschen-Dialog öffnen)
   * @param e - Leaflet Mouse Event
   * @param poi - POI der gelöscht werden soll
   */
  const handleRightClick = (e: LeafletMouseEvent, poi: PoiDto) => {
    e.originalEvent.preventDefault(); // Verhindere natives Context-Menü
    setPoiToDelete(poi);
    setDeleteDialogOpen(true);
  };

  /**
   * Handler für POI-Löschen (nach Bestätigung)
   */
  const handleDeleteConfirm = () => {
    if (!poiToDelete || !lagekarteId) return;

    deletePoiMutation.mutate(
      {
        poiId: poiToDelete.id,
        lagekarteId,
      },
      {
        onSuccess: () => {
          toast.success('POI gelöscht', {
            description: 'Der POI wurde erfolgreich entfernt.',
          });
        },
        onError: async (mutationError) => {
          const message = await getApiErrorMessage(mutationError, 'Der POI konnte nicht gelöscht werden.');
          toast.error('Fehler beim Löschen', {
            description: message,
          });
        },
      },
    );

    // Dialog schließen
    setDeleteDialogOpen(false);
    setPoiToDelete(null);
  };

  /**
   * Handler für Löschen-Abbruch
   */
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPoiToDelete(null);
  };

  return (
    <>
      {/* Warning-Badge für übersprungene POIs */}
      {skippedCount > 0 && (
        <div className="absolute right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border-2 border-status-warning-border bg-status-warning-surface p-3 shadow-lg">
          <PiWarning className="h-5 w-5 text-status-warning-text" />
          <p className="font-medium text-body-sm text-status-warning-text">
            {skippedCount} POI{skippedCount > 1 ? 's' : ''} konnten nicht angezeigt werden (ungültige Koordinaten)
          </p>
        </div>
      )}

      {/* MarkerClusterGroup wraps POI markers for automatic clustering */}
      <MarkerClusterGroup maxClusterRadius={50} spiderfyOnMaxZoom={true} showCoverageOnHover={false} zoomToBoundsOnClick={true} disableClusteringAtZoom={18} iconCreateFunction={createClusterIcon}>
        {/* Render gültige POI-Marker */}
        {validPois.map((poi) => {
          const icon = getPoiIcon(poi.category);
          // ACCESSIBILITY: Create descriptive ARIA label for screen readers
          const ariaLabel = `${poi.category}: ${poi.name}${poi.beschreibung ? ` - ${poi.beschreibung}` : ''}`;

          return (
            <Marker
              key={poi.id}
              position={[poi.coordinate.lat, poi.coordinate.lng]}
              icon={icon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => handleDragEnd(e, poi.id),
                contextmenu: (e) => handleRightClick(e, poi),
              }}
              title={ariaLabel}
              alt={ariaLabel}
              aria-label={ariaLabel}
            >
              <Popup className="poi-popup">
                <div className="rounded-lg bg-surface-panel p-4 shadow-lg">
                  {/* POI-Name */}
                  <h3 className="mb-2 font-semibold text-lg">{poi.name}</h3>

                  {/* POI-Kategorie */}
                  <p className="mb-1 text-body-sm text-text-secondary">{poi.category}</p>

                  {/* MGRS-Koordinaten */}
                  {poi.coordinate.mgrs && <p className="mb-1 font-mono text-body-xs text-text-muted">{formatMgrs(poi.coordinate.mgrs)}</p>}

                  {/* Beschreibung (optional) */}
                  {poi.beschreibung && <p className="text-body-sm text-text-secondary">{poi.beschreibung}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} className="relative z-[9999]">
        <DialogBackdrop className="fixed inset-0 bg-surface-inverse/30 backdrop-blur-sm transition-opacity" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg border border-border-subtle bg-surface-panel p-6 shadow-xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-status-danger-surface">
                <PiTrash className="h-6 w-6 text-status-danger-text" aria-hidden="true" />
              </div>

              <div className="flex-1">
                <DialogTitle as="h3" className="font-semibold text-text-primary text-lg">
                  POI löschen?
                </DialogTitle>

                <p className="mt-2 text-body-sm text-text-secondary">
                  Möchten Sie <span className="font-semibold">{poiToDelete?.name || 'diesen POI'}</span> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button intent="secondary" appearance="outlined" size="md" onClick={handleDeleteCancel}>
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
