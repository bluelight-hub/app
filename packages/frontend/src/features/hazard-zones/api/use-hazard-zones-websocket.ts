import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { logger } from '@/shared/lib/logger';
import { HAZARD_ZONES_QUERY_KEYS } from './queries';

/**
 * WebSocket-Subscription-Hook für HazardZones (Issue #627, AC5).
 *
 * Horcht auf die folgenden Events im Lagekarte-Namespace:
 * - `hazardzone:erstellt`
 * - `hazardzone:aktualisiert`
 * - `hazardzone:geloescht`
 * - `hazardzone:warnstufe-aktualisiert`
 *
 * Bei jedem Event wird der Query-Cache invalidiert, sodass die TanStack-Query-
 * basierte Darstellung (Map-Layer + Popup) unmittelbar neu lädt.
 *
 * Der zu übergebende Socket ist die bestehende Lagekarte-WebSocket-Verbindung
 * (`useLagekarteWebSocket`) — wir reuse diese, um einen eigenen Namespace zu
 * vermeiden.
 */
export function useHazardZonesWebsocket(socket: Socket | null | undefined, einsatzId: string | null | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !einsatzId) {
      return;
    }

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: HAZARD_ZONES_QUERY_KEYS.byEinsatz(einsatzId) });
    };

    const handleCreated = (payload: unknown) => {
      logger.debug('[hazard-zones] ws: hazardzone:erstellt', payload);
      invalidate();
    };
    const handleUpdated = (payload: unknown) => {
      logger.debug('[hazard-zones] ws: hazardzone:aktualisiert', payload);
      invalidate();
    };
    const handleDeleted = (payload: unknown) => {
      logger.debug('[hazard-zones] ws: hazardzone:geloescht', payload);
      invalidate();
    };
    const handleWarnstufeChanged = (payload: unknown) => {
      logger.debug('[hazard-zones] ws: hazardzone:warnstufe-aktualisiert', payload);
      invalidate();
    };

    socket.on('hazardzone:erstellt', handleCreated);
    socket.on('hazardzone:aktualisiert', handleUpdated);
    socket.on('hazardzone:geloescht', handleDeleted);
    socket.on('hazardzone:warnstufe-aktualisiert', handleWarnstufeChanged);

    return () => {
      socket.off('hazardzone:erstellt', handleCreated);
      socket.off('hazardzone:aktualisiert', handleUpdated);
      socket.off('hazardzone:geloescht', handleDeleted);
      socket.off('hazardzone:warnstufe-aktualisiert', handleWarnstufeChanged);
    };
  }, [socket, einsatzId, queryClient]);
}
