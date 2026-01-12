/**
 * ServerListEmptyState Molecule
 *
 * Zeigt einen leeren Zustand an, wenn keine Server konfiguriert sind.
 * Beinhaltet ein illustratives Icon, eine Nachricht und einen CTA-Button.
 *
 * **Features:**
 * - Server-Icon als visuelle Illustration
 * - Klarer Hinweistext "Keine Server konfiguriert"
 * - Unterstützender Hilfstext für nächsten Schritt
 * - CTA-Button "Server hinzufügen" (optional via onAddServer callback)
 * - Dark Mode Support
 *
 * @module features/server/ui/molecules/ServerListEmptyState
 */

import { forwardRef } from 'react';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';

/**
 * Server-Icon Komponente
 *
 * Zeigt ein stilisiertes Server-Icon als visuelle Illustration.
 * Nutzt Heroicons-Stil mit angepassten Größen und Farben.
 */
const ServerIcon = () => (
  <svg className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

/**
 * Props für die ServerListEmptyState Komponente.
 */
export interface ServerListEmptyStateProps {
  /**
   * Callback wenn der "Server hinzufügen" Button geklickt wird.
   * Wenn nicht angegeben, wird der Button nicht angezeigt.
   */
  onAddServer?: () => void;
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * ServerListEmptyState Komponente
 *
 * Stellt einen leeren Zustand dar, wenn keine Server konfiguriert sind.
 * Motiviert den Nutzer durch visuelles Feedback und einen klaren Call-to-Action.
 *
 * @example
 * ```tsx
 * // Mit CTA-Button
 * <ServerListEmptyState
 *   onAddServer={() => navigate('/setup')}
 * />
 *
 * // Ohne CTA-Button (nur Anzeige)
 * <ServerListEmptyState />
 *
 * // Mit custom className
 * <ServerListEmptyState
 *   onAddServer={handleAddServer}
 *   className="bg-gray-50 rounded-xl"
 * />
 * ```
 */
export const ServerListEmptyState = forwardRef<HTMLDivElement, ServerListEmptyStateProps>(({ onAddServer, className }, ref) => {
  return (
    <div ref={ref} data-testid="server-list-empty-state" className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      {/* Icon */}
      <ServerIcon />

      {/* Überschrift */}
      <h3 className="mt-4 font-medium text-gray-900 text-lg dark:text-white">Keine Server konfiguriert</h3>

      {/* Hilfstext */}
      <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">Füge einen Server hinzu, um loszulegen.</p>

      {/* CTA-Button */}
      {onAddServer && (
        <Button intent="primary" appearance="filled" className="mt-6" onClick={onAddServer}>
          Server hinzufügen
        </Button>
      )}
    </div>
  );
});

ServerListEmptyState.displayName = 'ServerListEmptyState';
