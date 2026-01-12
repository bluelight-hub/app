/**
 * ServerVisualBadge Atom
 *
 * Zeigt ein visuelles Badge für einen Server mit Icon und Farbe an.
 * Kombiniert die Utilities für Server-Icons und Server-Farben für
 * eine konsistente visuelle Darstellung.
 *
 * **Features:**
 * - Zeigt Server-Icon zentriert im farbigen Badge
 * - Unterstützt alle definierten Farb-Presets
 * - Fallback auf Standard-Icon und -Farbe
 * - Dark Mode kompatibel (Farben funktionieren in beiden Modi)
 * - Drei Größen-Varianten (sm, md, lg)
 *
 * @module features/server/ui/atoms/ServerVisualBadge
 */

import { cn } from '@/shared/ui/cn';
import type { ServerConfig } from '../../types/server-config';
import { getDefaultServerColor, getServerColorClass } from '../../utils/server-color.utils';
import { getDefaultServerIcon, getServerIconComponent } from '../../utils/server-icon.utils';

/**
 * Props für die ServerVisualBadge Komponente.
 */
export interface ServerVisualBadgeProps {
  /**
   * Server-Konfiguration mit optionalen icon und color Werten.
   */
  server: ServerConfig;
  /**
   * Größe des Badges.
   * - sm: size-6 (24px)
   * - md: size-8 (32px) - Standard
   * - lg: size-10 (40px)
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * Größen-Klassen für das Badge-Container.
 */
const badgeSizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
} as const;

/**
 * Größen-Klassen für das Icon innerhalb des Badges.
 */
const iconSizeClasses = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-6',
} as const;

/**
 * ServerVisualBadge Komponente
 *
 * Visualisiert einen Server mit Icon und Farbe als rundes Badge.
 * Verwendet die vordefinierten Icon- und Farb-Presets für Konsistenz.
 *
 * @example
 * ```tsx
 * // Server mit Icon und Farbe
 * <ServerVisualBadge server={server} />
 *
 * // Größere Variante
 * <ServerVisualBadge server={server} size="lg" />
 *
 * // Mit zusätzlichem Ring
 * <ServerVisualBadge server={server} className="ring-2 ring-white" />
 * ```
 */
export function ServerVisualBadge({ server, size = 'md', className }: ServerVisualBadgeProps) {
  // L2 Fix: Vereinfachter Null-Check - getServerIconComponent gibt undefined für ungültige Icons
  const IconComponent = getServerIconComponent(server.icon ?? '') ?? getDefaultServerIcon();

  // M7 Fix: Nutze getDefaultServerColor() für konsistenten Fallback statt lokaler Konstante
  const colorValue = server.color ?? getDefaultServerColor();
  const colorClass = getServerColorClass(colorValue, 'bg');

  return (
    <div role="img" aria-label={`Server: ${server.name}`} className={cn('flex items-center justify-center rounded-full', badgeSizeClasses[size], colorClass, className)}>
      <IconComponent className={cn('text-white', iconSizeClasses[size])} aria-hidden="true" />
    </div>
  );
}
