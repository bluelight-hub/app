/**
 * useIntegrationWebSocket - WebSocket-Hook fuer Echtzeit-Integrationsübersicht.
 *
 * Nutzt den bestehenden Monitoring-WebSocket Namespace und invalidiert
 * den Integrations-Overview-Cache bei relevanten Events.
 *
 * AC2: Fehler innerhalb 5 Sekunden sichtbar
 * - system.health_changed -> Cache-Invalidierung -> Re-Render (<1s)
 * - system.warnung mit warnungTyp CIRCUIT_BREAKER -> sofortige Invalidierung
 * - Fallback: REST-Polling alle 10s (in useIntegrationOverview konfiguriert)
 */

import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ADMIN_QUERY_KEYS } from '../api/queries';

const WS_NAMESPACE = '/ws/v-alpha/monitoring';
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10000;

/**
 * Hook fuer WebSocket-basierte Echtzeit-Updates der Integrationsübersicht.
 *
 * @param enabled - Ob die WebSocket-Verbindung aktiv sein soll
 */
export function useIntegrationWebSocket(enabled = true) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const invalidateOverview = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.integrations.overview() });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = getBaseUrl();
    if (!wsUrl) {
      logger.warn('Integration WebSocket: Keine Base-URL verfuegbar, Verbindung wird nicht hergestellt');
      return;
    }
    const socket = io(`${wsUrl}${WS_NAMESPACE}`, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      logger.info('Integration WebSocket verbunden');
      socket.emit('join:monitoring');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // AC2: Bei Health-Aenderung sofort Cache invalidieren (<1s)
    socket.on('system.health_changed', invalidateOverview);

    // AC2: Bei Circuit Breaker Warnung sofort Cache invalidieren
    socket.on('system.warnung', (payload: { warnungTyp: string }) => {
      if (payload.warnungTyp === 'CIRCUIT_BREAKER') {
        invalidateOverview();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('system.health_changed');
      socket.off('system.warnung');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, invalidateOverview]);

  return { isConnected };
}
