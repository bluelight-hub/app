/**
 * useBefehlWebSocket Hook
 *
 * WebSocket-Integration für Echtzeit-Befehl-Updates.
 * Verbindet zum Backend-WebSocket Gateway und invalidiert
 * Query-Cache bei relevanten Events.
 *
 * - Verbindung zum Namespace `/ws/v-alpha/befehl`
 * - Room: `einsatz:{einsatzId}:befehle`
 * - Events: `befehl.erstellt`, `befehl.zugestellt`, `befehl.quittiert`, `befehl.statusGeaendert`, `befehl.kommentarHinzugefuegt`, `rolle.geaendert` (Story 5.4 AC3), `integration.status_changed` (Story 5.3 AC6)
 * - Notification-Entscheidungslogik via pure Resolver Functions
 */

import { useCurrentUser } from '@/features/auth/api';
import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Store, useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { showBefehlAlarmToast, showKorrekturAlarmToast, showQuittierungAlarmToast } from '../ui/atoms/BefehlAlarmToast.atom';
import { markAlertSeen } from '../hooks/use-missed-befehl-alerts';
import { soundService } from '@/features/reminders/services/sound.service';
import { resolveErstelltNotification, resolveQuittiertNotification, resolveStatusGeaendertNotification } from '../lib/notification-resolver';
import { BEFEHL_QUERY_KEYS } from './queries';
import { EINSATZ_QUERY_KEYS } from '@/features/einsatz/api/queries';
import { updateIntegrationStatus, resetIntegrationStatus, type IntegrationStatus } from './use-integration-status';

/** Globaler Store fuer WebSocket-Verbindungsstatus (lesbar von jeder Komponente) */
const befehlWsStatusStore = new Store<{ isConnected: boolean }>({ isConnected: false });

/** Hook zum Lesen des WebSocket-Verbindungsstatus (ohne eigene Verbindung) */
export function useBefehlWebSocketStatus() {
  return useStore(befehlWsStatusStore, (s) => s.isConnected);
}

/** WebSocket Server URL - dynamisch aus Server-Store (wie REST-API) */
const getWsUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/** WebSocket Namespace für Befehle (versioniert) */
const WS_NAMESPACE = '/ws/v-alpha/befehl';

/** Reconnection Konfiguration */
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10000;

/** Maximale Anzahl gespeicherter Event-IDs zur Deduplizierung */
const MAX_PROCESSED_EVENTS = 500;

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

/** Prüft ob eine Mutation mit den gegebenen Key-Teilen pending ist */
function hasPendingMutation(queryClient: QueryClient, ...keys: string[]): boolean {
  return !!queryClient.getMutationCache().find({
    predicate: (m) => m.state.status === 'pending' && keys.every((k, i) => m.options.mutationKey?.[i] === k),
  });
}

/**
 * WebSocket Event Payload: Befehl erstellt
 */
export interface BefehlErstelltPayload {
  befehlId: string;
  einsatzId: string;
  nummer: string;
  auftrag: string;
  befehlsgeberName: string;
  befehlsgeberId?: string | null;
  erstellerId: string;
  empfaenger: string[];
  empfaengerIds?: string[];
  status: string;
  erteiltAm: string;
}

/**
 * WebSocket Event Payload: Befehl zugestellt
 */
export interface BefehlZugestelltPayload {
  befehlId: string;
  einsatzId: string;
  empfaengerId: string;
  zugestelltAm: string;
}

/**
 * WebSocket Event Payload: Befehl quittiert
 */
export interface BefehlQuittiertPayload {
  befehlId: string;
  einsatzId: string;
  empfaengerId: string;
  quittierungArt: string;
  quittiertAm: string;
  nummer?: string;
  erstellerId?: string;
  befehlsgeberId?: string;
}

/**
 * WebSocket Event Payload: Befehl Status geaendert
 */
export interface BefehlStatusGeaendertPayload {
  befehlId: string;
  einsatzId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  nummer?: string;
  erstellerId?: string;
  befehlsgeberId?: string;
  empfaengerIds?: string[];
}

/**
 * WebSocket Event Payload: Kommentar hinzugefügt
 */
export interface BefehlKommentarHinzugefuegtPayload {
  eventId: string;
  befehlId: string;
  kommentarId: string;
  authorId: string;
  text: string;
  isRueckfrage: boolean;
  parentId?: string;
}

/**
 * WebSocket Connection Status
 */
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Hook Options
 */
export interface UseBefehlWebSocketOptions {
  /** Einsatz-ID für Room-Subscription */
  einsatzId: string;
  /** Ob WebSocket aktiviert sein soll (default: true) */
  enabled?: boolean;
  /** Callback bei neuen Befehlen (fuer Notification Hook) */
  onBefehlErstellt?: (event: BefehlErstelltPayload) => void;
  /** Callback bei quittierten Befehlen (fuer Badge-Update) */
  onBefehlQuittiert?: (event: BefehlQuittiertPayload) => void;
  /** Callback bei neuen Kommentaren (fuer Rueckfrage-Notification) */
  onKommentarHinzugefuegt?: (event: BefehlKommentarHinzugefuegtPayload) => void;
}

/**
 * Hook Return Type
 */
export interface UseBefehlWebSocketReturn {
  /** Aktueller Verbindungsstatus */
  status: WebSocketStatus;
  /** Ob verbunden */
  isConnected: boolean;
  /** Manuelles Verbinden */
  connect: () => void;
  /** Manuelles Trennen */
  disconnect: () => void;
}

/**
 * Wendet ein Notification-Result an (Sound + Toast/Alarm).
 */
function applyNotification(
  result: ReturnType<typeof resolveErstelltNotification>,
  context: {
    event: {
      befehlId: string;
      einsatzId: string;
      nummer?: string;
      befehlsgeberName?: string;
      auftrag?: string;
      erteiltAm?: string;
      quittiertAm?: string;
      quittierungArt?: string;
      timestamp?: string;
      empfaengerId?: string;
    };
  },
): void {
  const { event } = context;
  if (result.kind === 'alarm') {
    if (result.alarmKind === 'befehl-erstellt') {
      soundService.playAlarm('info').catch(() => {
        /* non-critical */
      });
      showBefehlAlarmToast(event.befehlId, event.einsatzId, event.nummer ?? '', event.befehlsgeberName ?? '', event.auftrag ?? '', event.erteiltAm ?? '');
    } else if (result.alarmKind === 'quittierung-kritisch') {
      soundService.playAlarm('warning').catch(() => {
        /* non-critical */
      });
      showQuittierungAlarmToast(event.befehlId, event.einsatzId, event.nummer ?? '', event.quittierungArt as 'RUECKFRAGE' | 'NICHT_VERSTANDEN', event.quittiertAm ?? '');
      // Als gesehen markieren, damit useMissedBefehlAlerts bei Reload keinen Doppel-Toast zeigt
      markAlertSeen(`quittierung:${event.befehlId}:${event.empfaengerId}:${event.quittiertAm}`);
    } else if (result.alarmKind === 'befehl-korrigiert') {
      soundService.playAlarm('info').catch(() => {
        /* non-critical */
      });
      showKorrekturAlarmToast(event.befehlId, event.einsatzId, event.nummer ?? '', event.timestamp ?? new Date().toISOString());
      markAlertSeen(`korrektur:${event.befehlId}`);
    }
  } else if (result.kind === 'toast') {
    toast[result.level](result.title, { description: result.description });
  }
}

/**
 * WebSocket Hook für Echtzeit-Befehl-Updates
 *
 * Verbindet automatisch beim Mount und invalidiert Query-Cache
 * bei relevanten Events. Notification-Entscheidungslogik via
 * pure Resolver Functions (notification-resolver.ts).
 */
export function useBefehlWebSocket({ einsatzId, enabled = true, onBefehlErstellt, onBefehlQuittiert, onKommentarHinzugefuegt }: UseBefehlWebSocketOptions): UseBefehlWebSocketReturn {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id;
  const socketRef = useRef<Socket | null>(null);
  const [status, _setStatus] = useState<WebSocketStatus>('disconnected');

  // Status-Setter der auch den globalen Store aktualisiert
  const setStatus = useCallback((newStatus: WebSocketStatus) => {
    _setStatus(newStatus);
    befehlWsStatusStore.setState(() => ({ isConnected: newStatus === 'connected' }));
  }, []);

  // Ref für aktuelle einsatzId um stale Closures im connect Handler zu vermeiden
  const currentEinsatzIdRef = useRef(einsatzId);
  currentEinsatzIdRef.current = einsatzId;

  // Ref für aktuelle userId um stale Closures in Event Handlers zu vermeiden
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Refs fuer Callbacks (stabile Referenz)
  const onBefehlErstelltRef = useRef(onBefehlErstellt);
  onBefehlErstelltRef.current = onBefehlErstellt;
  const onBefehlQuittiertRef = useRef(onBefehlQuittiert);
  onBefehlQuittiertRef.current = onBefehlQuittiert;
  const onKommentarHinzugefuegtRef = useRef(onKommentarHinzugefuegt);
  onKommentarHinzugefuegtRef.current = onKommentarHinzugefuegt;

  // Deduplizierung: processedEventIds Set, geleert bei Disconnect
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  /**
   * Invalidiert den Befehle-Query-Cache.
   * Bei befehlId wird zusätzlich Detail/Verlauf invalidiert.
   */
  const invalidateCache = useCallback(
    (befehlId?: string) => {
      logger.debug('WebSocket: Invalidating befehle cache', { einsatzId, befehlId });
      queryClient.invalidateQueries({
        queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
      });
      if (befehlId) {
        queryClient.invalidateQueries({
          queryKey: BEFEHL_QUERY_KEYS.detail(befehlId),
        });
      }
    },
    [queryClient, einsatzId],
  );

  /**
   * Handler für 'befehl.erstellt' Event
   */
  const handleBefehlErstellt = useCallback(
    (event: BefehlErstelltPayload) => {
      if (!event?.befehlId || !event?.einsatzId) {
        logger.warn('WebSocket: Invalid befehl.erstellt payload', event);
        return;
      }

      logger.info('WebSocket: Befehl erstellt', event);

      // Deduplizierung
      const eventKey = `${event.befehlId}:erstellt:${event.erteiltAm}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Callback fuer Notification Hook
      onBefehlErstelltRef.current?.(event);

      // Notification via Resolver
      const userId = currentUserIdRef.current;
      const result = resolveErstelltNotification(event, userId);
      applyNotification(result, { event });

      // Cache invalidieren (skip bei pending Mutation)
      if (!hasPendingMutation(queryClient, 'befehl', 'create')) {
        invalidateCache(event.befehlId);
      }
    },
    [invalidateCache, queryClient],
  );

  /**
   * Handler für 'befehl.zugestellt' Event
   */
  const handleBefehlZugestellt = useCallback(
    (event: BefehlZugestelltPayload) => {
      if (!event?.befehlId || !event?.einsatzId) {
        logger.warn('WebSocket: Invalid befehl.zugestellt payload', event);
        return;
      }

      logger.info('WebSocket: Befehl zugestellt', event);

      // Deduplizierung
      const eventKey = `${event.befehlId}:zugestellt:${event.zugestelltAm}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Cache invalidieren (skip bei pending Mutation)
      if (!hasPendingMutation(queryClient, 'befehl', 'create')) {
        invalidateCache(event.befehlId);
      }

      // Toast
      const userId = currentUserIdRef.current;
      const isOwnZustellung = userId && event.empfaengerId === userId;
      toast.info('Befehl zugestellt', {
        description: isOwnZustellung ? 'Ein Befehl wurde dir zugestellt' : 'Befehl wurde an Empfänger zugestellt',
      });
    },
    [invalidateCache, queryClient],
  );

  /**
   * Handler für 'befehl.quittiert' Event
   */
  const handleBefehlQuittiert = useCallback(
    (event: BefehlQuittiertPayload) => {
      if (!event?.befehlId || !event?.einsatzId) {
        logger.warn('WebSocket: Invalid befehl.quittiert payload', event);
        return;
      }

      logger.info('WebSocket: Befehl quittiert', event);

      // Deduplizierung
      const eventKey = `${event.befehlId}:quittiert:${event.quittiertAm}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Callback fuer Badge-Update
      onBefehlQuittiertRef.current?.(event);

      // Notification via Resolver
      const userId = currentUserIdRef.current;
      const result = resolveQuittiertNotification(event, userId);
      applyNotification(result, { event });

      // Cache invalidieren (skip bei pending Mutation)
      if (!hasPendingMutation(queryClient, 'befehl', 'quittieren')) {
        invalidateCache(event.befehlId);
      }
    },
    [invalidateCache, queryClient],
  );

  /**
   * Handler für 'befehl.statusGeaendert' Event
   */
  const handleBefehlStatusGeaendert = useCallback(
    (event: BefehlStatusGeaendertPayload) => {
      if (!event?.befehlId || !event?.einsatzId) {
        logger.warn('WebSocket: Invalid befehl.statusGeaendert payload', event);
        return;
      }

      logger.info('WebSocket: Befehl Status geändert', event);

      // Deduplizierung
      const eventKey = `${event.befehlId}:statusGeaendert:${event.timestamp}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Notification via Resolver
      const userId = currentUserIdRef.current;
      const result = resolveStatusGeaendertNotification(event, userId);
      applyNotification(result, { event });

      // Cache immer invalidieren bei Status-Aenderungen
      invalidateCache(event.befehlId);
    },
    [invalidateCache],
  );

  /**
   * Handler für 'befehl.kommentarHinzugefuegt' Event
   */
  const handleKommentarHinzugefuegt = useCallback(
    (event: BefehlKommentarHinzugefuegtPayload) => {
      if (!event?.befehlId || !event?.kommentarId) {
        logger.warn('WebSocket: Invalid befehl.kommentarHinzugefuegt payload', event);
        return;
      }

      logger.info('WebSocket: Kommentar hinzugefügt', event);

      // Deduplizierung
      const eventKey = `${event.befehlId}:kommentar:${event.kommentarId}`;
      if (processedEventIdsRef.current.has(eventKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Callback
      onKommentarHinzugefuegtRef.current?.(event);

      const userId = currentUserIdRef.current;
      const isOwnKommentar = userId && event.authorId === userId;

      // Cache invalidieren (skip bei pending Mutation)
      if (!hasPendingMutation(queryClient, 'befehl', 'kommentar')) {
        invalidateCache();
      }

      // Toast nur bei Rückfragen von anderen Usern
      if (!isOwnKommentar && event.isRueckfrage) {
        toast.info('Neue Rückfrage', {
          description: (event.text ?? '').substring(0, 80),
        });
      }
    },
    [invalidateCache, queryClient],
  );

  // Handler-Refs für stabile connect Dependencies (kein Reconnect bei Handler-Änderung)
  const handleBefehlErstelltRef = useRef(handleBefehlErstellt);
  handleBefehlErstelltRef.current = handleBefehlErstellt;
  const handleBefehlZugestelltRef = useRef(handleBefehlZugestellt);
  handleBefehlZugestelltRef.current = handleBefehlZugestellt;
  const handleBefehlQuittiertRef = useRef(handleBefehlQuittiert);
  handleBefehlQuittiertRef.current = handleBefehlQuittiert;
  const handleBefehlStatusGeaendertRef = useRef(handleBefehlStatusGeaendert);
  handleBefehlStatusGeaendertRef.current = handleBefehlStatusGeaendert;
  const handleKommentarHinzugefuegtRef = useRef(handleKommentarHinzugefuegt);
  handleKommentarHinzugefuegtRef.current = handleKommentarHinzugefuegt;

  /**
   * Verbindung herstellen
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.debug('WebSocket: Already connected');
      return;
    }

    if (!enabled || !einsatzId) return;

    setStatus('connecting');
    const wsUrl = getWsUrl();
    logger.info('WebSocket: Connecting to', { url: wsUrl, namespace: WS_NAMESPACE, einsatzId });

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
      logger.info('WebSocket: Connected, joining room', { room: `einsatz:${currentEinsatzId}:befehle` });
      setStatus('connected');
      processedEventIdsRef.current.clear();
      socket.emit('join:einsatz', { einsatzId: currentEinsatzId });
    });

    socket.on('disconnect', (reason) => {
      logger.warn('WebSocket: Disconnected', { reason });
      setStatus('disconnected');
      processedEventIdsRef.current.clear();
      resetIntegrationStatus();
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket: Connection error', error);
      setStatus('error');
    });

    // Events über Refs registrieren (stabile connect Dependencies, kein Reconnect)
    socket.on('befehl.erstellt', (event) => handleBefehlErstelltRef.current(event));
    socket.on('befehl.zugestellt', (event) => handleBefehlZugestelltRef.current(event));
    socket.on('befehl.quittiert', (event) => handleBefehlQuittiertRef.current(event));
    socket.on('befehl.statusGeaendert', (event) => handleBefehlStatusGeaendertRef.current(event));
    socket.on('befehl.kommentarHinzugefuegt', (event) => handleKommentarHinzugefuegtRef.current(event));

    // Empfaenger-Status-Aenderung (WP3.4) - Cache invalidieren
    socket.on('befehl.empfaengerStatusGeaendert', (payload: { befehlId: string; empfaengerEntityId: string; aktion: string; timestamp: string }) => {
      if (!payload?.befehlId) {
        logger.warn('WebSocket: Invalid befehl.empfaengerStatusGeaendert payload', payload);
        return;
      }
      const dedupeKey = `empfaengerStatus:${payload.befehlId}:${payload.empfaengerEntityId}:${payload.timestamp}`;
      if (processedEventIdsRef.current.has(dedupeKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, dedupeKey);

      logger.info('WebSocket: Empfaenger-Status geaendert', payload);
      invalidateCache(payload.befehlId);
    });

    // Rollen-Aenderung Events (Story 5.4 AC3) - Rollen-Cache invalidieren
    socket.on('rolle.geaendert', (payload: { einsatzId: string; timestamp: string }) => {
      if (!payload?.einsatzId) {
        logger.warn('WebSocket: Invalid rolle.geaendert payload', payload);
        return;
      }

      const dedupeKey = `rolle.geaendert:${payload.einsatzId}:${payload.timestamp}`;
      if (processedEventIdsRef.current.has(dedupeKey)) return;
      addToProcessedEvents(processedEventIdsRef.current, dedupeKey);

      logger.info('WebSocket: Rolle geändert', payload);
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.rollen(payload.einsatzId),
      });
      toast.info('Rollenzuweisungen aktualisiert', {
        description: 'Die Berechtigungen im Einsatz wurden geändert',
      });
    });

    // Integration Status Events (Story 5.3 AC5/AC6)
    socket.on('integration.status_changed', (payload: IntegrationStatus) => {
      if (!payload?.serviceName || !payload?.state) {
        logger.warn('WebSocket: Invalid integration.status_changed payload', payload);
        return;
      }
      logger.info('WebSocket: Integration status changed', payload);
      updateIntegrationStatus(payload);
    });

    socketRef.current = socket;
  }, [enabled, einsatzId, queryClient, invalidateCache, setStatus]);

  /**
   * Verbindung trennen
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      logger.info('WebSocket: Disconnecting');
      if (socketRef.current.connected) {
        socketRef.current.emit('leave:einsatz', { einsatzId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      processedEventIdsRef.current.clear();
      resetIntegrationStatus();
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
  };
}
