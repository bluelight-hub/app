/**
 * IntegrationStatusCard - Statuskachel fuer eine einzelne externe Integration.
 *
 * Zeigt Status mit Icon + Text (NIEMALS nur Farbe), Fehlerrate,
 * letzte Aktivitaet und empfohlene Aktion.
 */

import { memo, type ReactNode } from 'react';
import { PiCheckCircle, PiXCircle, PiKey, PiSpinnerGap, PiMinusCircle, PiGearSix, PiArrowRight } from 'react-icons/pi';
import type { IntegrationOverviewItemResponseDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn';

/**
 * Status-Konfiguration: Icon, Farben, Label.
 * Status ist IMMER ueber Text + Icon unterscheidbar (nicht nur Farbe).
 */
const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClasses: string;
    badgeClasses: string;
  }
> = {
  verbunden: {
    icon: PiCheckCircle,
    iconClasses: 'text-green-600 dark:text-green-400',
    badgeClasses: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-500/30',
  },
  unterbrochen: {
    icon: PiXCircle,
    iconClasses: 'text-red-600 dark:text-red-400',
    badgeClasses: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30',
  },
  erneute_anmeldung_erforderlich: {
    icon: PiKey,
    iconClasses: 'text-orange-600 dark:text-orange-400',
    badgeClasses: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-500/30',
  },
  wird_ueberprueft: {
    icon: PiSpinnerGap,
    iconClasses: 'animate-spin text-blue-600 dark:text-blue-400',
    badgeClasses: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30',
  },
  deaktiviert: {
    icon: PiMinusCircle,
    iconClasses: 'text-gray-400 dark:text-gray-500',
    badgeClasses: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-500/30',
  },
  nicht_konfiguriert: {
    icon: PiGearSix,
    iconClasses: 'text-gray-400 dark:text-gray-500',
    badgeClasses: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-500/30',
  },
};

/**
 * Formatiert einen ISO-Timestamp als relative Zeitangabe.
 */
function formatRelativeTime(isoString: string | null | undefined): string | null {
  if (!isoString || typeof isoString !== 'string') return null;
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  } catch {
    return null;
  }
}

interface IntegrationStatusCardProps {
  integration: IntegrationOverviewItemResponseDto;
  onAction?: (serviceKey: string) => void;
}

/**
 * Statuskachel fuer eine externe Integration.
 *
 * - Status wird ueber Icon + Text codiert (nicht nur Farbe, AC1/NFR18)
 * - aria-label mit vollstaendigem Status-Text (AC3)
 * - Tab-fokussierbar (AC3/NFR11)
 * - Responsive: Grid auf Desktop, Stack auf engem Viewport (AC3)
 */
export const IntegrationStatusCard = memo(({ integration, onAction }: IntegrationStatusCardProps) => {
  const config = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.nicht_konfiguriert;
  const Icon = config.icon;
  const lastActivity = formatRelativeTime(integration.lastSuccessAt as string | null) ?? formatRelativeTime(integration.lastFailureAt as string | null);

  const ariaLabel = `${integration.displayName}: ${integration.statusLabel}${integration.errorRate > 0 ? `, Fehlerrate ${integration.errorRate}%` : ''}${integration.suggestedAction ? `, Empfohlene Aktion: ${integration.suggestedAction}` : ''}`;

  return (
    <section
      aria-label={ariaLabel}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header: Name + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-gray-100">{integration.displayName}</h3>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset', config.badgeClasses)}>
          <Icon className={cn('h-3.5 w-3.5 shrink-0', config.iconClasses)} aria-hidden="true" />
          {integration.statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1 text-gray-500 text-xs dark:text-gray-400">
        {integration.errorRate > 0 && <DetailRow label="Fehlerrate" value={`${integration.errorRate}%`} />}
        {integration.failureCount > 0 && <DetailRow label="Fehler" value={`${integration.failureCount}`} />}
        {lastActivity && <DetailRow label="Letzte Aktivität" value={lastActivity} />}
      </div>

      {/* Suggested Action */}
      {integration.suggestedAction && (
        <div className="mt-3 border-gray-100 border-t pt-3 dark:border-gray-700">
          <button
            type="button"
            onClick={() => onAction?.(integration.serviceKey)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-gray-50 px-3 py-1.5 font-medium text-gray-700 text-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {integration.suggestedAction}
            <PiArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
});

IntegrationStatusCard.displayName = 'IntegrationStatusCard';

/** Einzelne Detail-Zeile */
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}
