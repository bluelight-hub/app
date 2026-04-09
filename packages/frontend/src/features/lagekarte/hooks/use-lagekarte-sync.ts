/**
 * useLagekarteSync Hook
 *
 * Koordiniert WebSocket-Synchronisierung mit dem MapboxDraw-Control.
 * Empfängt remote Feature-Deltas und wendet sie auf die Draw-Instanz an.
 * Bietet eine `sendDelta`-Funktion zum Versenden eigener Änderungen.
 */

import { useCallback, useRef } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type * as GeoJSON from 'geojson';
import { logger } from '@/shared/lib/logger';
import {
  useLagekarteWebSocket,
  type LagekarteFeatureCreatedPayload,
  type LagekarteFeatureUpdatedPayload,
  type LagekarteFeatureDeletedPayload,
  type LagekarteWebSocketStatus,
} from '../api/use-lagekarte-websocket';

// ============================================
// Types
// ============================================

export interface UseLagekarteSyncOptions {
  /** Einsatz-ID für WebSocket-Subscription */
  einsatzId: string;
  /** Referenz auf die MapboxDraw-Instanz */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Flag das anzeigt ob gerade ein Remote-Update angewendet wird */
  isRemoteApplyRef: React.MutableRefObject<boolean>;
  /** Ob die Synchronisierung aktiviert sein soll (default: true) */
  enabled?: boolean;
}

export interface UseLagekarteSyncReturn {
  /** Aktueller WebSocket-Verbindungsstatus */
  wsStatus: LagekarteWebSocketStatus;
  /** Ob WebSocket verbunden ist */
  isConnected: boolean;
  /** Sendet ein Feature-Delta an andere Clients */
  sendDelta: (type: 'create' | 'update' | 'delete', payload: { features?: GeoJSON.Feature[]; featureIds?: string[] }) => void;
}

// ============================================
// Hook
// ============================================

/**
 * Synchronisiert MapboxDraw mit anderen Clients über WebSocket.
 *
 * - Empfangene Feature-Deltas werden direkt auf die Draw-Instanz angewendet
 * - `isRemoteApplyRef` wird während Remote-Updates gesetzt um lokale
 *   Event-Handler (handleCreate/handleUpdate/handleDelete) zu blockieren
 * - `sendDelta` abstrahiert die einzelnen send-Funktionen des WS-Hooks
 */
export function useLagekarteSync({ einsatzId, drawRef, isRemoteApplyRef, enabled = true }: UseLagekarteSyncOptions): UseLagekarteSyncReturn {
  /** Remote-Feature hinzufügen (draw.add mit isRemoteApply Guard) */
  const applyRemoteFeature = useCallback(
    (feature: GeoJSON.Feature) => {
      const draw = drawRef.current;
      if (!draw) {
        logger.warn('Sync: Draw-Instanz nicht verfügbar, Remote-Feature wird ignoriert');
        return;
      }
      try {
        isRemoteApplyRef.current = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draw.add(feature as any);
      } catch (error) {
        logger.error('Sync: Fehler beim Anwenden von Remote-Feature', error);
      } finally {
        isRemoteApplyRef.current = false;
      }
    },
    [drawRef, isRemoteApplyRef],
  );

  /** Remote-Features löschen (draw.delete mit isRemoteApply Guard) */
  const applyRemoteDelete = useCallback(
    (featureIds: string[]) => {
      const draw = drawRef.current;
      if (!draw) {
        logger.warn('Sync: Draw-Instanz nicht verfügbar, Remote-Delete wird ignoriert');
        return;
      }
      try {
        isRemoteApplyRef.current = true;
        draw.delete(featureIds);
      } catch (error) {
        logger.error('Sync: Fehler beim Löschen von Remote-Features', error);
      } finally {
        isRemoteApplyRef.current = false;
      }
    },
    [drawRef, isRemoteApplyRef],
  );

  // ============================================
  // WebSocket-Callbacks
  // ============================================

  const handleFeatureCreated = useCallback(
    (payload: LagekarteFeatureCreatedPayload) => {
      logger.info('Sync: Remote Feature erstellt', { featureId: payload.feature.id });
      applyRemoteFeature(payload.feature);
    },
    [applyRemoteFeature],
  );

  const handleFeatureUpdated = useCallback(
    (payload: LagekarteFeatureUpdatedPayload) => {
      logger.info('Sync: Remote Features aktualisiert', { count: payload.features.length });
      for (const feature of payload.features) {
        applyRemoteFeature(feature);
      }
    },
    [applyRemoteFeature],
  );

  const handleFeatureDeleted = useCallback(
    (payload: LagekarteFeatureDeletedPayload) => {
      logger.info('Sync: Remote Features gelöscht', { featureIds: payload.featureIds });
      applyRemoteDelete(payload.featureIds);
    },
    [applyRemoteDelete],
  );

  // ============================================
  // WebSocket-Hook
  // ============================================

  const {
    status: wsStatus,
    isConnected,
    sendFeatureCreated,
    sendFeatureUpdated,
    sendFeatureDeleted,
  } = useLagekarteWebSocket({
    einsatzId,
    enabled,
    onFeatureCreated: handleFeatureCreated,
    onFeatureUpdated: handleFeatureUpdated,
    onFeatureDeleted: handleFeatureDeleted,
  });

  // ============================================
  // sendDelta Abstraktion
  // ============================================

  /** Sendet ein Feature-Delta an andere Clients */
  const sendDelta = useCallback(
    (type: 'create' | 'update' | 'delete', payload: { features?: GeoJSON.Feature[]; featureIds?: string[] }) => {
      switch (type) {
        case 'create':
          if (payload.features?.[0]) {
            sendFeatureCreated(einsatzId, payload.features[0]);
          }
          break;
        case 'update':
          if (payload.features?.length) {
            sendFeatureUpdated(einsatzId, payload.features);
          }
          break;
        case 'delete':
          if (payload.featureIds?.length) {
            sendFeatureDeleted(einsatzId, payload.featureIds);
          }
          break;
      }
    },
    [einsatzId, sendFeatureCreated, sendFeatureUpdated, sendFeatureDeleted],
  );

  return {
    wsStatus,
    isConnected,
    sendDelta,
  };
}
