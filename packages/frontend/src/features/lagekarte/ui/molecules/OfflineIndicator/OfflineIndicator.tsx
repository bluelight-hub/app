import { useState, useEffect } from 'react';
import { cn } from '@/shared/ui/cn';
import { PiWifiHigh, PiWifiSlash } from 'react-icons/pi';

/**
 * Offline-Indicator-Komponente zur Anzeige des Online/Offline-Status.
 *
 * Diese Komponente überwacht den `navigator.onLine` Status und zeigt ein visuelles Badge
 * an, das den aktuellen Verbindungsstatus anzeigt.
 *
 * Features:
 * - Echtzeit-Überwachung des Online/Offline-Status
 * - Automatische Farbanpassung (grün für online, rot für offline)
 * - Accessibility-Support (ARIA-Live-Region)
 * - Dark-Mode-Support
 *
 * @component
 * @example
 * ```tsx
 * <MapContainer>
 *   <OfflineIndicator />
 * </MapContainer>
 * ```
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Handler für Online-Event
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[OfflineIndicator] Status: Online');
    };

    // Handler für Offline-Event
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[OfflineIndicator] Status: Offline');
    };

    // Event-Listener registrieren
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status loggen (navigator.onLine statt state für Mount-Log)
    console.log(`[OfflineIndicator] Initial status: ${navigator.onLine ? 'Online' : 'Offline'}`);

    // Cleanup: Event-Listener entfernen
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <output
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2',
        'text-sm font-medium shadow-lg',
        'transition-all duration-300',
        'backdrop-blur-md', // Glassmorphism-Effekt
        isOnline ? 'bg-status-success-surface text-status-success-text ring-1 ring-status-success-border' : 'bg-status-danger-surface text-status-danger-text ring-1 ring-status-danger-border',
      )}
      aria-live="polite"
      aria-label={isOnline ? 'Online-Modus' : 'Offline-Modus'}
    >
      {isOnline ? (
        <>
          <PiWifiHigh className="h-5 w-5" aria-hidden="true" />
          <span>Online</span>
        </>
      ) : (
        <>
          <PiWifiSlash className="h-5 w-5" aria-hidden="true" />
          <span>Offline-Modus</span>
        </>
      )}
    </output>
  );
};
