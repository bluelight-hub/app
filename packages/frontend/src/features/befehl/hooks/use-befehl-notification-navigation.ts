/**
 * Befehl Notification Navigation Hook
 *
 * Registriert den Navigate-Callback fuer Deep Link Navigation
 * bei Klick auf Befehl-Notifications (Tauri native).
 *
 * Analog zu `useNotificationNavigation` fuer Erinnerungen.
 *
 * **Wichtig:** Muss in einer Root-Komponente verwendet werden,
 * die Zugriff auf den TanStack Router hat.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { setNotificationNavigateBefehlCallback } from '@/features/reminders/services';
import { logger } from '@/shared/lib/logger';

/**
 * Hook fuer Befehl Notification Deep Link Navigation
 *
 * Registriert einen Callback der bei Klick auf eine Befehl-Notification
 * zur Befehle-Seite mit befehlId Search-Param navigiert.
 */
export function useBefehlNotificationNavigation(): void {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    setNotificationNavigateBefehlCallback((einsatzId: string, befehlId: string) => {
      if (!isMountedRef.current) {
        logger.warn('[BefehlNotificationNavigation] Ignoring navigation - component unmounted', {
          einsatzId,
          befehlId,
        });
        return;
      }

      logger.info('[BefehlNotificationNavigation] Navigating to befehl', {
        einsatzId,
        befehlId,
      });

      try {
        navigate({
          to: '/app/einsatz/$einsatzId/führung/befehle',
          params: { einsatzId },
          search: { befehlId },
        });
      } catch (error) {
        logger.error('[BefehlNotificationNavigation] Navigation failed', {
          einsatzId,
          befehlId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    logger.debug('[BefehlNotificationNavigation] Navigate callback registered');

    return () => {
      isMountedRef.current = false;
      setNotificationNavigateBefehlCallback(() => {
        logger.debug('[BefehlNotificationNavigation] No-op callback (component unmounted)');
      });
      logger.debug('[BefehlNotificationNavigation] Cleanup complete');
    };
  }, [navigate]);
}
