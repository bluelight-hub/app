import { useEffect, useMemo, useState } from 'react';
import { PiRadio, PiWarning, PiWifiSlash } from 'react-icons/pi';
import type { WorkspaceStatusItem } from '../types';

interface UseEinsatzWorkspaceShellOptions {
  isLoading: boolean;
  requiresAssignment: boolean;
  isRemindersDegraded: boolean;
  isReadonly?: boolean;
}

function useDelayedFlag(isActive: boolean, delayMs: number): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isActive]);

  return isVisible;
}

function useOnlineState(): boolean {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useEinsatzWorkspaceShell({ isLoading, requiresAssignment, isRemindersDegraded, isReadonly = false }: UseEinsatzWorkspaceShellOptions): {
  statusItems: WorkspaceStatusItem[];
} {
  const delayedLoading = useDelayedFlag(isLoading, 300);
  const isOnline = useOnlineState();

  const statusItems = useMemo<WorkspaceStatusItem[]>(() => {
    const items: WorkspaceStatusItem[] = [];
    if (delayedLoading) {
      items.push({
        id: 'workspace-continuity',
        label: 'Arbeitsraum wird vorbereitet',
        description: 'Teilnahme, Konto und Einsatzkontext werden geladen und bleiben währenddessen transparent sichtbar.',
        tone: 'loading',
        icon: PiRadio,
        nextActionLabel: 'Nächster Schritt',
        nextActionDescription: 'Bitte kurz warten. Navigation und Arbeitskontext bleiben erhalten.',
      });
      return items;
    }

    if (requiresAssignment) {
      items.push({
        id: 'workspace-continuity',
        label: 'Arbeitszugriff blockiert',
        description: 'Wählen Sie jetzt eine Person aus, damit Navigation und Kernflächen aktiv bleiben.',
        tone: 'blocked',
        icon: PiWarning,
        role: 'alert',
        nextActionLabel: 'Nächster Schritt',
        nextActionDescription: 'Jetzt eine Person auswählen, damit die Kernflächen entsperrt werden.',
      });
      return items;
    }

    if (!isOnline) {
      items.push({
        id: 'workspace-continuity',
        label: 'Verbindung unterbrochen',
        description: 'Der Arbeitsraum ist offline. Prüfen Sie Netzwerk und Serverkontext, bevor Sie fortfahren.',
        tone: 'warning',
        icon: PiWifiSlash,
        role: 'alert',
        nextActionLabel: 'Nächster Schritt',
        nextActionDescription: 'Netzwerk oder Serververbindung prüfen und danach erneut synchronisieren.',
      });
      return items;
    }

    if (isRemindersDegraded) {
      items.push({
        id: 'workspace-continuity',
        label: 'Hinweise eingeschränkt',
        description: 'Ein Teil der einsatzweiten Hinweise konnte nicht geladen werden. Arbeiten Sie weiter, prüfen Sie den Kontext aber erneut.',
        tone: 'warning',
        icon: PiWarning,
        role: 'alert',
        nextActionLabel: 'Nächster Schritt',
        nextActionDescription: 'Kontext erneut prüfen und eingeschränkte Hinweise später noch einmal laden.',
      });
      return items;
    }

    if (isReadonly) {
      items.push({
        id: 'workspace-continuity',
        label: 'Arbeitsraum schreibgeschützt',
        description: 'Sie können den Einsatzkontext sehen, aber aktuell keine Änderungen speichern.',
        tone: 'readonly',
        icon: PiWarning,
        nextActionLabel: 'Nächster Schritt',
        nextActionDescription: 'Schreibrechte oder Sperrzustand prüfen, bevor Sie weiterarbeiten.',
      });
      return items;
    }

    items.push({
      id: 'workspace-continuity',
      label: 'Arbeitsraum bereit',
      description: 'Navigation, Statusführung und Einsatzkontext sind synchron verfügbar.',
      tone: 'active',
      icon: PiRadio,
      nextActionLabel: 'Nächster Schritt',
      nextActionDescription: 'Mit Sidebar, Shortcuts oder Befehle & Navigation in den nächsten Bereich wechseln.',
    });

    return items;
  }, [delayedLoading, isOnline, isReadonly, isRemindersDegraded, requiresAssignment]);

  return {
    statusItems,
  };
}
