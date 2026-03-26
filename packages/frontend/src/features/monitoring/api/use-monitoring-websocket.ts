/**
 * useMonitoringWebSocket Hook
 *
 * WebSocket-Integration fuer Echtzeit-System-Monitoring.
 * Verbindet zum Backend-WebSocket Gateway /ws/v-alpha/monitoring
 * und invalidiert Query-Cache bei system.warnung Events.
 *
 * @remarks Story 5.6 AC3, AC4
 */

import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { MONITORING_QUERY_KEYS } from './queries';

/** WebSocket Namespace fuer Monitoring (versioniert) */
const WS_NAMESPACE = '/ws/v-alpha/monitoring';

/** Reconnection Konfiguration */
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10000;

/** Warnung-Typen ins Deutsche übersetzt */
const WARNUNG_TYP_LABELS: Record<string, string> = {
  ZUSTELLRATE: 'Zustellrate zu niedrig',
  OUTBOX_STAU: 'Outbox-Stau',
  LATENZ: 'Hohe Latenz',
  CIRCUIT_BREAKER: 'Circuit Breaker offen',
};

/** WebSocket Event Payload */
export interface SystemWarnungPayload {
  warnungTyp: string;
  schwellwert: number;
  aktuellerWert: number;
  timestamp: string;
}

/**
 * Hook fuer Monitoring-WebSocket-Verbindung
 *
 * @param enabled - Ob die WebSocket-Verbindung aufgebaut werden soll
 */
export function useMonitoringWebSocket(enabled = true) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [warnungen, setWarnungen] = useState<SystemWarnungPayload[]>([]);

  const handleSystemWarnung = useCallback(
    (payload: SystemWarnungPayload) => {
      logger.info('System-Warnung empfangen', payload);

      // Toast-Notification
      const label = WARNUNG_TYP_LABELS[payload.warnungTyp] || payload.warnungTyp;
      toast.warning(`System-Warnung: ${label}`, {
        description: `Aktuell: ${payload.aktuellerWert}, Schwelle: ${payload.schwellwert}`,
        duration: 10000,
      });

      // Warnung zum State hinzufuegen (max 50)
      setWarnungen((prev) => [payload, ...prev].slice(0, 50));

      // Query-Cache invalidieren fuer frische Daten
      queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.systemHealth() });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = getBaseUrl() || 'http://localhost:3091';
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
      logger.info('Monitoring WebSocket verbunden');
      socket.emit('join:monitoring');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      logger.info('Monitoring WebSocket getrennt');
    });

    socket.on('system.warnung', handleSystemWarnung);

    socket.on('system.health_changed', () => {
      queryClient.invalidateQueries({ queryKey: MONITORING_QUERY_KEYS.systemHealth() });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('system.warnung');
      socket.off('system.health_changed');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, handleSystemWarnung, queryClient]);

  return { isConnected, warnungen };
}
