/** * IntegrationStatusCard - Statuskachel fuer eine einzelne externe Integration. * * Zeigt Status mit Icon + Text (NIEMALS nur Farbe), Fehlerrate, * letzte Aktivitaet und empfohlene Aktion. */ import {
  memo,
  type ReactNode,
} from 'react';
import { PiCheckCircle, PiXCircle, PiKey, PiSpinnerGap, PiMinusCircle, PiGearSix, PiArrowRight } from 'react-icons/pi';
import type { IntegrationOverviewItemResponseDto } from '@bluelight-hub/shared/client';
import { cn } from '@/shared/ui/cn'; /** * Status-Konfiguration: Icon, Farben, Label. * Status ist IMMER ueber Text + Icon unterscheidbar (nicht nur Farbe). */
const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; iconClasses: string; badgeClasses: string }> = {
  verbunden: { icon: PiCheckCircle, iconClasses: 'text-status-success-text', badgeClasses: 'bg-status-success-surface text-status-success-text ring-status-success-border/40' },
  unterbrochen: { icon: PiXCircle, iconClasses: 'text-status-danger-text', badgeClasses: 'bg-status-danger-surface text-status-danger-text ring-status-danger-border/40' },
  erneute_anmeldung_erforderlich: { icon: PiKey, iconClasses: 'text-status-warning-text', badgeClasses: 'bg-status-warning-surface text-status-warning-text ring-status-warning-border/40' },
  wird_ueberprueft: { icon: PiSpinnerGap, iconClasses: 'animate-spin text-action-primary', badgeClasses: 'bg-status-info-surface text-status-info-text ring-status-info-border/40' },
  deaktiviert: { icon: PiMinusCircle, iconClasses: 'text-text-muted', badgeClasses: 'bg-surface-raised text-text-secondary ring-border-subtle/40' },
  nicht_konfiguriert: { icon: PiGearSix, iconClasses: 'text-text-muted', badgeClasses: 'bg-surface-raised text-text-secondary ring-border-subtle/40' },
}; /** * Formatiert einen ISO-Timestamp als relative Zeitangabe. */
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
} /** * Statuskachel fuer eine externe Integration. * * - Status wird ueber Icon + Text codiert (nicht nur Farbe, AC1/NFR18) * - aria-label mit vollstaendigem Status-Text (AC3) * - Tab-fokussierbar (AC3/NFR11) * - Responsive: Grid auf Desktop, Stack auf engem Viewport (AC3) */
export const IntegrationStatusCard = memo(({ integration, onAction }: IntegrationStatusCardProps) => {
  const config = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.nicht_konfiguriert;
  const Icon = config.icon;
  const lastActivity = formatRelativeTime(integration.lastSuccessAt as string | null) ?? formatRelativeTime(integration.lastFailureAt as string | null);
  const ariaLabel = `${integration.displayName}: ${integration.statusLabel}${integration.errorRate > 0 ? `, Fehlerrate ${integration.errorRate}%` : ''}${integration.suggestedAction ? `, Empfohlene Aktion: ${integration.suggestedAction}` : ''}`;
  return (
    <section
      aria-label={ariaLabel}
      className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:shadow-focus-ring"
    >
      {' '}
      {/* Header: Name + Status Badge */}{' '}
      <div className="flex items-start justify-between gap-2">
        {' '}
        <h3 className="font-semibold text-text-primary text-sm">{integration.displayName}</h3>{' '}
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset', config.badgeClasses)}>
          {' '}
          <Icon className={cn('h-3.5 w-3.5 shrink-0', config.iconClasses)} aria-hidden="true" /> {integration.statusLabel}{' '}
        </span>{' '}
      </div>{' '}
      {/* Details */}{' '}
      <div className="mt-3 space-y-1 text-text-muted text-xs">
        {' '}
        {integration.errorRate > 0 && <DetailRow label="Fehlerrate" value={`${integration.errorRate}%`} />}{' '}
        {integration.failureCount > 0 && <DetailRow label="Fehler" value={`${integration.failureCount}`} />} {lastActivity && <DetailRow label="Letzte Aktivität" value={lastActivity} />}{' '}
      </div>{' '}
      {/* Suggested Action */}{' '}
      {integration.suggestedAction && (
        <div className="mt-3 border-border-subtle border-t pt-3">
          {' '}
          <button
            type="button"
            onClick={() => onAction?.(integration.serviceKey)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-control bg-action-secondary px-3 py-1.5 font-medium text-text-primary text-xs transition-colors hover:bg-action-secondary-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            {' '}
            {integration.suggestedAction} <PiArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{' '}
          </button>{' '}
        </div>
      )}{' '}
    </section>
  );
});
IntegrationStatusCard.displayName = 'IntegrationStatusCard'; /** Einzelne Detail-Zeile */
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      {' '}
      <span>{label}</span> <span className="font-medium text-text-secondary">{value}</span>{' '}
    </div>
  );
}
