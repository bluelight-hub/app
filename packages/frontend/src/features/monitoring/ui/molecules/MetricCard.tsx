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
  ok: 'border-green-500/30 bg-green-500/5',
  warnung: 'border-yellow-500/30 bg-yellow-500/5',
  kritisch: 'border-red-500/30 bg-red-500/5',
} as const;

const STATUS_DOT_COLORS = {
  ok: 'bg-green-500',
  warnung: 'bg-yellow-500',
  kritisch: 'bg-red-500',
} as const;

export function MetricCard({ label, value, einheit, status = 'ok', description }: MetricCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${STATUS_COLORS[status]}`}>
      <div className="mb-1 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status]}`} role="img" aria-label={`Status: ${status === 'ok' ? 'OK' : status === 'warnung' ? 'Warnung' : 'Kritisch'}`} />
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-semibold text-2xl text-white">{value}</span>
        {einheit && <span className="text-gray-500 text-sm">{einheit}</span>}
      </div>
      {description && <p className="mt-1 text-gray-500 text-xs">{description}</p>}
    </div>
  );
}
