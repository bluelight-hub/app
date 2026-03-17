/**
 * Hook für Tray-Click Navigation - Story 1.9 AC3
 *
 * Lauscht auf tray-click Events von Tauri und navigiert zur ersten
 * ausgelösten Erinnerung wenn vorhanden.
 *
 * AC3: Tray-Click öffnet App mit Fokus auf fällige Erinnerung
 */

import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { useNavigate } from '@tanstack/react-router';
import { logger } from '@/shared/lib/logger';
import { useTriggeredTimerIds } from '../stores/timer.store';

let trayClickListenerReady = false;
let trayClickListenerRegistration: Promise<void> | null = null;
const trayClickHandlers = new Map<symbol, () => void>();
let activeTrayClickHandler: (() => void) | null = null;

function updateActiveTrayClickHandler() {
  const latestHandler = Array.from(trayClickHandlers.values()).at(-1);
  activeTrayClickHandler = latestHandler ?? null;
}

function ensureTrayClickListenerRegistered() {
  if (trayClickListenerReady || trayClickListenerRegistration) {
    return;
  }

  trayClickListenerRegistration = listen('tray-click', () => {
    activeTrayClickHandler?.();
  })
    .then(() => {
      trayClickListenerReady = true;
      logger.info('[TrayClickNavigation] Event Listener registriert');
    })
    .catch((error) => {
      logger.error('[TrayClickNavigation] Fehler beim Registrieren des Event Listeners:', error);
    })
    .finally(() => {
      trayClickListenerRegistration = null;
    });
}

/**
 * Hook der auf Tray-Clicks reagiert und zur ersten ausgelösten Erinnerung navigiert.
 *
 * Wird in der App-Root oder ErinnerungenProvider eingebunden.
 *
 * @param einsatzId - Aktuelle Einsatz-ID für Navigation
 */
export function useTrayClickNavigation(einsatzId: string | undefined) {
  const navigate = useNavigate();
  const triggeredIds = useTriggeredTimerIds();
  const instanceIdRef = useRef(Symbol('tray-click-navigation'));
  const latestStateRef = useRef({
    navigate,
    triggeredIds,
    einsatzId,
  });

  latestStateRef.current = {
    navigate,
    triggeredIds,
    einsatzId,
  };

  useEffect(() => {
    // Web-Fallback: Kein Tray-Event im Browser
    if (!isTauri()) {
      return;
    }

    const instanceId = instanceIdRef.current;
    trayClickHandlers.set(instanceId, () => {
      const { navigate: currentNavigate, triggeredIds: currentTriggeredIds, einsatzId: currentEinsatzId } = latestStateRef.current;

      logger.info('[TrayClickNavigation] Tray-click event empfangen');

      // AC3: Navigiere zur ersten ausgelösten Erinnerung
      if (currentTriggeredIds.length > 0 && currentEinsatzId) {
        const firstTriggeredId = currentTriggeredIds[0];
        logger.info(`[TrayClickNavigation] Navigiere zu Erinnerung: ${firstTriggeredId}`);

        currentNavigate({
          to: '/einsatz/$einsatzId/erinnerungen',
          params: { einsatzId: currentEinsatzId },
          search: { highlight: firstTriggeredId },
        });
      } else {
        logger.debug('[TrayClickNavigation] Keine ausgelösten Erinnerungen - keine Navigation');
      }
    });
    updateActiveTrayClickHandler();
    ensureTrayClickListenerRegistered();

    return () => {
      trayClickHandlers.delete(instanceId);
      updateActiveTrayClickHandler();
    };
  }, []);
}
