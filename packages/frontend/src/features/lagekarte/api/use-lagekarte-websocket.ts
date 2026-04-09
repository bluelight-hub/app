/**
 * useLagekarteWebSocket Hook
 *
 * WebSocket-Integration für Echtzeit-Lagekarte-Synchronisierung.
 * Verbindet zum Backend-WebSocket Gateway und ermöglicht
 * bidirektionale Feature-Deltas (Create/Update/Delete).
 *
 * - Verbindung zum Namespace `/ws/v-alpha/lagekarte`
 * - Room-Join: `join:einsatz` mit `{ einsatzId }`
 * - Events: `lagekarte:feature.created`, `lagekarte:feature.updated`,
 *   `lagekarte:feature.deleted`, `lagekarte:state.geaendert`
 * - Deduplizierung via processedEventIds Set
 */

import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { createStore, useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { LAGEKARTE_QUERY_KEYS } from './queries';
import type * as GeoJSON from 'geojson';

// ============================================
// Types
// ============================================

/** WebSocket-Verbindungsstatus */
export type LagekarteWebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Payload für Feature-Created Event */
export interface LagekarteFeatureCreatedPayload {
  einsatzId: string;
  feature: GeoJSON.Feature;
  timestamp: string;
}

/** Payload für Feature-Updated Event */
export interface LagekarteFeatureUpdatedPayload {
  einsatzId: string;
  features: GeoJSON.Feature[];
  timestamp: string;
}

/** Payload für Feature-Deleted Event */
export interface LagekarteFeatureDeletedPayload {
  einsatzId: string;
  featureIds: string[];
  timestamp: string;
}

/** Payload für State-geändert Event */
export interface LagekarteStateGeaendertPayload {
  einsatzId: string;
  lagekarteId: string;
  timestamp: string;
}

/** Hook-Optionen */
export interface UseLagekarteWebSocketOptions {
  /** Einsatz-ID für Room-Subscription */
  einsatzId: string;
  /** Ob WebSocket aktiviert sein soll (default: true) */
  enabled?: boolean;
  /** Callback bei erstelltem Feature */
  onFeatureCreated?: (payload: LagekarteFeatureCreatedPayload) => void;
  /** Callback bei aktualisierten Features */
  onFeatureUpdated?: (payload: LagekarteFeatureUpdatedPayload) => void;
  /** Callback bei gelöschten Features */
  onFeatureDeleted?: (payload: LagekarteFeatureDeletedPayload) => void;
}

/** Hook-Rückgabewert */
export interface UseLagekarteWebSocketReturn {
  /** Aktueller Verbindungsstatus */
  status: LagekarteWebSocketStatus;
  /** Ob verbunden */
  isConnected: boolean;
  /** Manuelles Verbinden */
  connect: () => void;
  /** Manuelles Trennen */
  disconnect: () => void;
  /** Feature-Created Delta an andere Clients senden */
  sendFeatureCreated: (einsatzId: string, feature: GeoJSON.Feature) => void;
  /** Feature-Updated Delta an andere Clients senden */
  sendFeatureUpdated: (einsatzId: string, features: GeoJSON.Feature[]) => void;
  /** Feature-Deleted Delta an andere Clients senden */
  sendFeatureDeleted: (einsatzId: string, featureIds: string[]) => void;
}

// ============================================
// Globaler Store für Verbindungsstatus
// ============================================

/** Globaler Store für WebSocket-Verbindungsstatus (lesbar von jeder Komponente) */
const lagekarteWsStatusStore = createStore<{ isConnected: boolean }>({ isConnected: false });

/** Hook zum Lesen des WebSocket-Verbindungsstatus (ohne eigene Verbindung) */
export function useLagekarteWebSocketStatus() {
  return useStore(lagekarteWsStatusStore, (s) => s.isConnected);
}

// ============================================
// Konstanten
// ============================================

/** WebSocket Server URL - dynamisch aus Server-Store (wie REST-API) */
const getWsUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/** WebSocket Namespace für Lagekarte (versioniert) */
const WS_NAMESPACE = '/ws/v-alpha/lagekarte';

/** Reconnection Konfiguration */
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10000;

/** Maximale Anzahl gespeicherter Event-IDs zur Deduplizierung */
const MAX_PROCESSED_EVENTS = 500;

// ============================================
// Hilfsfunktionen
// ============================================

/**
 * Fügt einen Event-Key zum Deduplizierungs-Set hinzu und begrenzt die Größe.
 * Bei Überschreitung wird die ältere Hälfte entfernt.
 */
function addToProcessedEvents(set: Set<string>, key: string): void {
  set.add(key);
  if (set.size > MAX_PROCESSED_EVENTS) {
    const entries = [...set];
    set.clear();
    for (const entry of entries.slice(entries.length >> 1)) {
      set.add(entry);
    }
  }
}

/** Prüft ob eine Save-Mutation pending ist */
function hasPendingSaveMutation(queryClient: QueryClient): boolean {
  return !!queryClient.getMutationCache().find({
    predicate: (m) => m.state.status === 'pending' && m.options.mutationKey?.includes('lagekarte-save'),
  });
}

// ============================================
// Hook
// ============================================

/**
 * WebSocket Hook für Echtzeit-Lagekarte-Synchronisierung
 *
 * Verbindet automatisch beim Mount und ermöglicht bidirektionale
 * Feature-Deltas (Create/Update/Delete) zwischen Clients.
 * Bei `lagekarte:state.geaendert` wird der Query-Cache invalidiert,
 * sofern keine Save-Mutation läuft.
 */
export function useLagekarteWebSocket({ einsatzId, enabled = true, onFeatureCreated, onFeatureUpdated, onFeatureDeleted }: UseLagekarteWebSocketOptions): UseLagekarteWebSocketReturn {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, _setStatus] = useState<LagekarteWebSocketStatus>('disconnected');

  // Status-Setter der auch den globalen Store aktualisiert
  const setStatus = useCallback((newStatus: LagekarteWebSocketStatus) => {
    _setStatus(newStatus);
    lagekarteWsStatusStore.setState(() => ({ isConnected: newStatus === 'connected' }));
  }, []);

  // Ref für aktuelle einsatzId um stale Closures im connect Handler zu vermeiden
  const currentEinsatzIdRef = useRef(einsatzId);
  currentEinsatzIdRef.current = einsatzId;

  // Refs für Callbacks (stabile Referenz, verhindert stale Closures)
  const onFeatureCreatedRef = useRef(onFeatureCreated);
  onFeatureCreatedRef.current = onFeatureCreated;
  const onFeatureUpdatedRef = useRef(onFeatureUpdated);
  onFeatureUpdatedRef.current = onFeatureUpdated;
  const onFeatureDeletedRef = useRef(onFeatureDeleted);
  onFeatureDeletedRef.current = onFeatureDeleted;

  // Deduplizierung: processedEventIds Set, geleert bei Disconnect
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  // ============================================
  // Event-Handler
  // ============================================

  /** Handler für `lagekarte:feature.created` Event */
  const handleFeatureCreated = useCallback((payload: LagekarteFeatureCreatedPayload) => {
    if (!payload?.feature || !payload?.einsatzId) {
      logger.warn('WebSocket: Ungültiges lagekarte:feature.created Payload', payload);
      return;
    }

    const featureId = String(payload.feature.id ?? '');
    const eventKey = `feature.created:${featureId}:${payload.timestamp}`;
    if (processedEventIdsRef.current.has(eventKey)) return;
    addToProcessedEvents(processedEventIdsRef.current, eventKey);

    logger.info('WebSocket: Feature erstellt (remote)', { featureId });
    onFeatureCreatedRef.current?.(payload);
  }, []);

  /** Handler für `lagekarte:feature.updated` Event */
  const handleFeatureUpdated = useCallback((payload: LagekarteFeatureUpdatedPayload) => {
    if (!payload?.features || !payload?.einsatzId) {
      logger.warn('WebSocket: Ungültiges lagekarte:feature.updated Payload', payload);
      return;
    }

    const featureIds = payload.features.map((f) => String(f.id ?? '')).join(',');
    const eventKey = `feature.updated:${featureIds}:${payload.timestamp}`;
    if (processedEventIdsRef.current.has(eventKey)) return;
    addToProcessedEvents(processedEventIdsRef.current, eventKey);

    logger.info('WebSocket: Features aktualisiert (remote)', { count: payload.features.length });
    onFeatureUpdatedRef.current?.(payload);
  }, []);

  /** Handler für `lagekarte:feature.deleted` Event */
  const handleFeatureDeleted = useCallback((payload: LagekarteFeatureDeletedPayload) => {
    if (!payload?.featureIds || !payload?.einsatzId) {
      logger.warn('WebSocket: Ungültiges lagekarte:feature.deleted Payload', payload);
      return;
    }

    const eventKey = `feature.deleted:${payload.featureIds.join(',')}:${payload.timestamp}`;
    if (processedEventIdsRef.current.has(eventKey)) return;
    addToProcessedEvents(processedEventIdsRef.current, eventKey);

    logger.info('WebSocket: Features gelöscht (remote)', { featureIds: payload.featureIds });
    onFeatureDeletedRef.current?.(payload);
  }, []);

  /** Handler für `lagekarte:state.geaendert` Event */
  const handleStateGeaendert = useCallback(
    (payload: LagekarteStateGeaendertPayload) => {
      if (!payload?.einsatzId) {
        logger.warn('WebSocket: Ungültiges lagekarte:state.geaendert Payload', payload);
        return;
      }

      const eventKey = `state.geaendert:${payload.lagekarteId}:${payload.timestamp}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      logger.info('WebSocket: Lagekarte-State geändert', { lagekarteId: payload.lagekarteId });

      // Cache nur invalidieren wenn keine Save-Mutation läuft
      if (!hasPendingSaveMutation(queryClient)) {
        queryClient.invalidateQueries({
          queryKey: LAGEKARTE_QUERY_KEYS.byEinsatz(payload.einsatzId),
        });
      }
    },
    [queryClient],
  );

  // Handler-Refs für stabile connect Dependencies (kein Reconnect bei Handler-Änderung)
  const handleFeatureCreatedRef = useRef(handleFeatureCreated);
  handleFeatureCreatedRef.current = handleFeatureCreated;
  const handleFeatureUpdatedRef = useRef(handleFeatureUpdated);
  handleFeatureUpdatedRef.current = handleFeatureUpdated;
  const handleFeatureDeletedRef = useRef(handleFeatureDeleted);
  handleFeatureDeletedRef.current = handleFeatureDeleted;
  const handleStateGeaendertRef = useRef(handleStateGeaendert);
  handleStateGeaendertRef.current = handleStateGeaendert;

  // ============================================
  // Sende-Funktionen
  // ============================================

  /** Feature-Created Delta senden */
  const sendFeatureCreated = useCallback((einsatzId: string, feature: GeoJSON.Feature) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      logger.warn('WebSocket: Kann Feature-Created nicht senden, nicht verbunden');
      return;
    }
    const payload: LagekarteFeatureCreatedPayload = {
      einsatzId,
      feature,
      timestamp: new Date().toISOString(),
    };
    socket.emit('lagekarte:feature.created', payload);
    logger.debug('WebSocket: Feature-Created gesendet', { featureId: feature.id });
  }, []);

  /** Feature-Updated Delta senden */
  const sendFeatureUpdated = useCallback((einsatzId: string, features: GeoJSON.Feature[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      logger.warn('WebSocket: Kann Feature-Updated nicht senden, nicht verbunden');
      return;
    }
    const payload: LagekarteFeatureUpdatedPayload = {
      einsatzId,
      features,
      timestamp: new Date().toISOString(),
    };
    socket.emit('lagekarte:feature.updated', payload);
    logger.debug('WebSocket: Feature-Updated gesendet', { count: features.length });
  }, []);

  /** Feature-Deleted Delta senden */
  const sendFeatureDeleted = useCallback((einsatzId: string, featureIds: string[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      logger.warn('WebSocket: Kann Feature-Deleted nicht senden, nicht verbunden');
      return;
    }
    const payload: LagekarteFeatureDeletedPayload = {
      einsatzId,
      featureIds,
      timestamp: new Date().toISOString(),
    };
    socket.emit('lagekarte:feature.deleted', payload);
    logger.debug('WebSocket: Feature-Deleted gesendet', { featureIds });
  }, []);

  // ============================================
  // Verbindung herstellen / trennen
  // ============================================

  /** Verbindung herstellen */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.debug('WebSocket: Lagekarte bereits verbunden');
      return;
    }

    if (!enabled || !einsatzId) return;

    setStatus('connecting');
    const wsUrl = getWsUrl();
    logger.info('WebSocket: Verbinde zu Lagekarte', { url: wsUrl, namespace: WS_NAMESPACE, einsatzId });

    const socket = io(`${wsUrl}${WS_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
      reconnectionAttempts: 10,
      withCredentials: true,
    });

    socket.on('connect', () => {
      const currentEinsatzId = currentEinsatzIdRef.current;
      logger.info('WebSocket: Lagekarte verbunden, trete Room bei', { einsatzId: currentEinsatzId });
      setStatus('connected');
      processedEventIdsRef.current.clear();
      socket.emit('join:einsatz', { einsatzId: currentEinsatzId });
    });

    socket.on('disconnect', (reason) => {
      logger.warn('WebSocket: Lagekarte getrennt', { reason });
      setStatus('disconnected');
      processedEventIdsRef.current.clear();
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket: Lagekarte Verbindungsfehler', error);
      setStatus('error');
    });

    // Events über Refs registrieren (stabile connect Dependencies, kein Reconnect)
    socket.on('lagekarte:feature.created', (event) => handleFeatureCreatedRef.current(event));
    socket.on('lagekarte:feature.updated', (event) => handleFeatureUpdatedRef.current(event));
    socket.on('lagekarte:feature.deleted', (event) => handleFeatureDeletedRef.current(event));
    socket.on('lagekarte:state.geaendert', (event) => handleStateGeaendertRef.current(event));

    socketRef.current = socket;
  }, [enabled, einsatzId, setStatus]);

  /** Verbindung trennen */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      logger.info('WebSocket: Lagekarte wird getrennt');
      if (socketRef.current.connected) {
        socketRef.current.emit('leave:einsatz', { einsatzId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      processedEventIdsRef.current.clear();
    }
  }, [einsatzId, setStatus]);

  // Auto-Connect beim Mount
  useEffect(() => {
    let cleanedUp = false;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    if (enabled && einsatzId) {
      connectTimer = setTimeout(() => {
        if (!cleanedUp) {
          connect();
        }
      }, 0);
    }

    return () => {
      cleanedUp = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      disconnect();
    };
  }, [enabled, einsatzId, connect, disconnect]);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    sendFeatureCreated,
    sendFeatureUpdated,
    sendFeatureDeleted,
  };
}
