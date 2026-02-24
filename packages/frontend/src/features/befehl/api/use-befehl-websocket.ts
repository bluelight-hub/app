/**
 * useBefehlWebSocket Hook
 *
 * WebSocket-Integration für Echtzeit-Befehl-Updates.
 * Verbindet zum Backend-WebSocket Gateway und invalidiert
 * Query-Cache bei relevanten Events.
 *
 * - Verbindung zum Namespace `/ws/v-alpha/befehl`
 * - Room: `einsatz:{einsatzId}:befehle`
 * - Events: `befehl.erstellt`, `befehl.zugestellt`, `befehl.quittiert`, `befehl.kommentarHinzugefuegt`, `rolle.geaendert` (Story 5.4 AC3), `integration.status_changed` (Story 5.3 AC6)
 * - Toast-Notification bei Team-Member Events
 */

import { useCurrentUser } from '@/features/auth/api';
import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { BEFEHL_QUERY_KEYS } from './queries';
import { EINSATZ_QUERY_KEYS } from '@/features/einsatz/api/queries';
import { updateIntegrationStatus, resetIntegrationStatus, type IntegrationStatus } from './use-integration-status';

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
 * WebSocket Hook für Echtzeit-Befehl-Updates
 *
 * Verbindet automatisch beim Mount und invalidiert Query-Cache
 * bei relevanten Events.
 *
 * @example
 * ```tsx
 * function BefehlePage({ einsatzId }: Props) {
 *   const { status, isConnected } = useBefehlWebSocket({
 *     einsatzId,
 *   });
 *
 *   return (
 *     <div>
 *       <StatusIndicator connected={isConnected} />
 *       <BefehleList einsatzId={einsatzId} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useBefehlWebSocket({ einsatzId, enabled = true, onBefehlErstellt, onBefehlQuittiert, onKommentarHinzugefuegt }: UseBefehlWebSocketOptions): UseBefehlWebSocketReturn {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id;
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

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
   * Invalidiert den Befehle-Query-Cache
   */
  const invalidateCache = useCallback(() => {
    logger.debug('WebSocket: Invalidating befehle cache', { einsatzId });
    // Invalidiert ALLE list-Queries fuer diesen Einsatz (inkl. gefilterter Varianten)
    // listPrefix matcht: ['befehl', 'list', einsatzId, ...filters]
    queryClient.invalidateQueries({
      queryKey: BEFEHL_QUERY_KEYS.listPrefix(einsatzId),
    });
  }, [queryClient, einsatzId]);

  /**
   * Handler für 'befehl.erstellt' Event
   *
   * Toast nur bei Events von anderen Usern anzeigen (nicht bei eigenen Actions)
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
      if (processedEventIdsRef.current.has(eventKey)) {
        logger.debug('WebSocket: Skipping duplicate befehl.erstellt event', { eventKey });
        return;
      }
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Nutze Ref statt Closure für aktuelle userId
      const userId = currentUserIdRef.current;
      const isOwnEvent = userId && event.erstellerId === userId;

      // C7: Check if mutation is pending for this befehl
      const mutationCache = queryClient.getMutationCache();
      const pendingMutation = mutationCache.find({
        predicate: (mutation) => mutation.state.status === 'pending' && mutation.options.mutationKey?.[0] === 'befehl' && mutation.options.mutationKey?.[1] === 'create',
      });

      // Callback fuer Notification Hook IMMER aufrufen (nach Deduplizierung),
      // auch bei pending Mutation - andere User-Events sollen Notifications erzeugen
      onBefehlErstelltRef.current?.(event);

      if (pendingMutation) {
        logger.debug('WebSocket: Skipping cache invalidation - mutation pending', {
          befehlId: event.befehlId,
        });
        // Toast trotzdem bei Team-Events anzeigen
        if (!isOwnEvent) {
          toast.info(`Neuer Befehl #${event.nummer}`, {
            description: (event.auftrag ?? '').substring(0, 80),
          });
        }
        return;
      }

      invalidateCache();

      // Toast nur bei Team-Events (nicht eigene Actions)
      if (!isOwnEvent) {
        toast.info(`Neuer Befehl #${event.nummer}`, {
          description: (event.auftrag ?? '').substring(0, 80),
        });
      }
    },
    [invalidateCache, queryClient],
  );

  /**
   * Handler für 'befehl.zugestellt' Event
   *
   * Toast nur bei Events von anderen Usern anzeigen (nicht bei eigenen Actions)
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
      if (processedEventIdsRef.current.has(eventKey)) {
        logger.debug('WebSocket: Skipping duplicate befehl.zugestellt event', { eventKey });
        return;
      }
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // C7: Check if mutation is pending for this befehl
      const mutationCache = queryClient.getMutationCache();
      const pendingMutation = mutationCache.find({
        predicate: (mutation) => mutation.state.status === 'pending' && mutation.options.mutationKey?.[0] === 'befehl' && mutation.options.mutationKey?.[1] === 'create',
      });

      if (pendingMutation) {
        logger.debug('WebSocket: Skipping cache invalidation - zustellung mutation pending', {
          befehlId: event.befehlId,
        });
        // Toast trotzdem bei Team-Events anzeigen
        const userId = currentUserIdRef.current;
        const isOwnZustellung = userId && event.empfaengerId === userId;
        if (!isOwnZustellung) {
          toast.info('Befehl zugestellt', {
            description: `Befehl wurde an Empfänger zugestellt`,
          });
        }
        return;
      }

      invalidateCache();

      // Toast für Team-Events: Andere Teammitglieder informieren
      const userId = currentUserIdRef.current;
      const isOwnZustellung = userId && event.empfaengerId === userId;

      if (isOwnZustellung) {
        toast.info('Befehl zugestellt', {
          description: 'Ein Befehl wurde dir zugestellt',
        });
      } else {
        toast.info('Befehl zugestellt', {
          description: `Befehl wurde an Empfänger zugestellt`,
        });
      }
    },
    [invalidateCache, queryClient],
  );

  /**
   * Handler für 'befehl.quittiert' Event
   *
   * Toast nur bei Events von anderen Usern anzeigen (nicht bei eigener Quittierung)
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
      if (processedEventIdsRef.current.has(eventKey)) {
        logger.debug('WebSocket: Skipping duplicate befehl.quittiert event', { eventKey });
        return;
      }
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Callback fuer Badge-Update IMMER aufrufen (nach Deduplizierung)
      onBefehlQuittiertRef.current?.(event);

      // C7: Check if mutation is pending for this befehl
      const mutationCache = queryClient.getMutationCache();
      const pendingMutation = mutationCache.find({
        predicate: (mutation) => mutation.state.status === 'pending' && mutation.options.mutationKey?.[0] === 'befehl' && mutation.options.mutationKey?.[1] === 'quittieren',
      });

      if (pendingMutation) {
        logger.debug('WebSocket: Skipping cache invalidation - quittierung mutation pending', {
          befehlId: event.befehlId,
        });
        // Toast trotzdem bei Team-Events anzeigen
        const userId = currentUserIdRef.current;
        const isOwnQuittierung = userId && event.empfaengerId === userId;
        if (!isOwnQuittierung) {
          toast.info('Befehl quittiert', {
            description: 'Ein Empfänger hat den Befehl quittiert',
          });
        }
        return;
      }

      invalidateCache();

      // Toast nur bei Team-Events (nicht eigene Quittierung)
      const userId = currentUserIdRef.current;
      const isOwnQuittierung = userId && event.empfaengerId === userId;

      if (!isOwnQuittierung) {
        // Warnung bei NICHT_VERSTANDEN - Befehl wird kritisch
        if (event.quittierungArt === 'NICHT_VERSTANDEN') {
          // Versuche Befehlsnummer aus Cache zu laden
          let befehlNummer = '';
          const cachedBefehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.listPrefix(einsatzId));
          if (Array.isArray(cachedBefehle)) {
            const cachedBefehl = cachedBefehle.find((b) => b.id === event.befehlId);
            if (cachedBefehl) befehlNummer = ` #${cachedBefehl.nummer}`;
          }

          toast.warning(`Befehl${befehlNummer} nicht verstanden`, {
            description: 'Ein Empfänger hat einen Befehl als "Nicht verstanden" quittiert',
          });
        } else {
          toast.info('Befehl quittiert', {
            description: 'Ein Empfänger hat den Befehl quittiert',
          });
        }
      }
    },
    [invalidateCache, queryClient, einsatzId],
  );

  /**
   * Handler für 'befehl.kommentarHinzugefuegt' Event
   *
   * Toast nur bei Rückfragen von anderen Usern anzeigen
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
      if (processedEventIdsRef.current.has(eventKey)) {
        logger.debug('WebSocket: Skipping duplicate befehl.kommentarHinzugefuegt event', { eventKey });
        return;
      }
      addToProcessedEvents(processedEventIdsRef.current, eventKey);

      // Callback IMMER aufrufen (nach Deduplizierung)
      onKommentarHinzugefuegtRef.current?.(event);

      const userId = currentUserIdRef.current;
      const isOwnKommentar = userId && event.authorId === userId;

      // Mutation-Pending Check (analog zu anderen Handlern)
      const mutationCache = queryClient.getMutationCache();
      const pendingMutation = mutationCache.find({
        predicate: (mutation) => mutation.state.status === 'pending' && mutation.options.mutationKey?.[0] === 'befehl' && mutation.options.mutationKey?.[1] === 'kommentar',
      });

      if (pendingMutation) {
        logger.debug('WebSocket: Skipping cache invalidation - kommentar mutation pending', { befehlId: event.befehlId });
        if (!isOwnKommentar && event.isRueckfrage) {
          toast.info('Neue Rückfrage', {
            description: (event.text ?? '').substring(0, 80),
          });
        }
        return;
      }

      invalidateCache();

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

    if (!enabled || !einsatzId) {
      logger.debug('WebSocket: Not connecting (disabled or no einsatzId)');
      return;
    }

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
      // Nutze currentEinsatzIdRef.current statt einsatzId aus Closure
      const currentEinsatzId = currentEinsatzIdRef.current;
      const currentRoomName = `einsatz:${currentEinsatzId}:befehle`;

      logger.info('WebSocket: Connected, joining room', { room: currentRoomName });
      setStatus('connected');
      processedEventIdsRef.current.clear();

      // Room beitreten mit aktueller einsatzId
      socket.emit('join:einsatz', { einsatzId: currentEinsatzId });
    });

    socket.on('disconnect', (reason) => {
      logger.warn('WebSocket: Disconnected', { reason });
      setStatus('disconnected');
      // Processed Events bei Disconnect leeren
      processedEventIdsRef.current.clear();
      // Integration Status zuruecksetzen (kein WS = kein Live-Status)
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
    socket.on('befehl.kommentarHinzugefuegt', (event) => handleKommentarHinzugefuegtRef.current(event));

    // Rollen-Aenderung Events (Story 5.4 AC3) - Rollen-Cache invalidieren
    socket.on('rolle.geaendert', (payload: { einsatzId: string; timestamp: string }) => {
      if (!payload?.einsatzId) {
        logger.warn('WebSocket: Invalid rolle.geaendert payload', payload);
        return;
      }

      // Deduplizierung (L2-Fix)
      const dedupeKey = `rolle.geaendert:${payload.einsatzId}:${payload.timestamp}`;
      if (processedEventIdsRef.current.has(dedupeKey)) {
        logger.debug('WebSocket: Duplicate rolle.geaendert event, skipping', payload);
        return;
      }
      addToProcessedEvents(processedEventIdsRef.current, dedupeKey);

      logger.info('WebSocket: Rolle geändert', payload);
      // Rollen-Cache invalidieren → useEinsatzRollen und useBefehlPermissions aktualisieren sich
      queryClient.invalidateQueries({
        queryKey: EINSATZ_QUERY_KEYS.rollen(payload.einsatzId),
      });
      toast.info('Rollenzuweisungen aktualisiert', {
        description: 'Die Berechtigungen im Einsatz wurden geändert',
      });
    });

    // Integration Status Events (Story 5.3 AC5/AC6) - ueber bestehende WebSocket-Verbindung
    socket.on('integration.status_changed', (payload: IntegrationStatus) => {
      if (!payload?.serviceName || !payload?.state) {
        logger.warn('WebSocket: Invalid integration.status_changed payload', payload);
        return;
      }
      logger.info('WebSocket: Integration status changed', payload);
      updateIntegrationStatus(payload);
    });

    socketRef.current = socket;
  }, [enabled, einsatzId, queryClient]);

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
  }, [einsatzId]);

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
