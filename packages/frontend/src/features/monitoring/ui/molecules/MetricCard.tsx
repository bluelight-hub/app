/**
 * MetricCard - Einzelne Metrik-Anzeige im Monitoring-Dashboard
 *
 * Zeigt einen Metrik-Wert mit Label, Einheit und Status-Farbe.
 *
 * @remarks Story 5.6 AC4
 */

interface MetricCardProps {
  label: string;
  value: string | number;
  einheit?: string;
  status?: 'ok' | 'warnung' | 'kritisch';
  description?: string;
}

const STATUS_COLORS = {
  ok: 'border-status-success-border bg-status-success-surface',
  warnung: 'border-status-warning-border bg-status-warning-surface',
  kritisch: 'border-status-danger-border bg-status-danger-surface',
} as const;

const STATUS_DOT_COLORS = {
  ok: 'bg-status-success-text',
  warnung: 'bg-status-warning-text',
  kritisch: 'bg-status-danger-text',
} as const;

export function MetricCard({ label, value, einheit, status = 'ok', description }: MetricCardProps) {
  return (
    <div className={`rounded-panel border p-4 ${STATUS_COLORS[status]}`}>
      <div className="mb-1 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status]}`} role="img" aria-label={`Status: ${status === 'ok' ? 'OK' : status === 'warnung' ? 'Warnung' : 'Kritisch'}`} />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-text-primary">{value}</span>
        {einheit && <span className="text-sm text-text-muted">{einheit}</span>}
      </div>
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
    </div>
  );
}
