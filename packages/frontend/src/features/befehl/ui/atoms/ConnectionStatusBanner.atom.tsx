import { cn } from '@/shared/ui/cn';
import { useEffect, useRef, useState } from 'react';

interface ConnectionStatusBannerProps {
  /** Gibt an, ob eine aktive Verbindung zum Server besteht */
  isConnected: boolean;
}

/**
 * Zeigt einen Warnbanner bei fehlender Serververbindung.
 *
 * Verhindert Flash beim Initial Load (zeigt Banner nur nach Verbindungsabbruch).
 * Fade-Out Animation beim Reconnect, danach Unmount.
 *
 * @example
 * ```tsx
 * <ConnectionStatusBanner isConnected={false} />
 * ```
 */
export function ConnectionStatusBanner({ isConnected }: ConnectionStatusBannerProps) {
  const wasConnectedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
      // Fade-out dann unmount
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
    // Nur Banner zeigen wenn schon mal verbunden war (kein Flash beim Initial Load)
    if (wasConnectedRef.current) {
      setVisible(true);
    }
  }, [isConnected]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-center gap-2 rounded-md border px-4 py-2 font-medium text-sm transition-opacity duration-300',
        'border-status-warning-border bg-status-warning-surface text-status-warning-text',
        isConnected ? 'opacity-0' : 'opacity-100',
      )}
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      Keine Verbindung – Befehle werden gesendet sobald online
    </div>
  );
}
