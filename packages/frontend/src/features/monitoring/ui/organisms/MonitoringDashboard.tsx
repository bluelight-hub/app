/**
 * MonitoringDashboard - System-Monitoring Hauptansicht
 *
 * Zeigt aggregierte System-Metriken, Circuit Breaker Status,
 * und Echtzeit-Warnungen via WebSocket.
 *
 * **Metriken:**
 * - Zustellrate (Ziel: >99%)
 * - WebSocket-Verbindungen
 * - Outbox Queue Depth
 * - API Response Times (p50/p95/p99)
 * - Circuit Breaker Status
 * - DB Connection Pool
 * - Server Uptime
 *
 * @remarks Story 5.6 AC4
 */

import { useSystemHealth, useMonitoringWebSocket } from '../../api';
import { MetricCard } from '../molecules/MetricCard';
import { WarnungList } from '../molecules/WarnungList';

/** Warnung-Typ Labels fuer Banner-Anzeige */
const WARNUNG_TYP_LABELS: Record<string, string> = {
  ZUSTELLRATE: 'Zustellrate zu niedrig',
  OUTBOX_STAU: 'Event-Stau in der Outbox',
  LATENZ: 'Hohe API-Latenz',
  CIRCUIT_BREAKER: 'Circuit Breaker offen',
};

function getWarnungKeyBase(warnung: { timestamp: string; warnungTyp: string; aktuellerWert: unknown; schwellwert: unknown }): string {
  return [warnung.timestamp, warnung.warnungTyp, String(warnung.aktuellerWert), String(warnung.schwellwert)].join('|');
}

/** Formatiert Uptime (Sekunden) in lesbare Form */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Bestimmt Status basierend auf Zustellrate */
function getZustellrateStatus(rate: number): 'ok' | 'warnung' | 'kritisch' {
  if (rate >= 99) return 'ok';
  if (rate >= 95) return 'warnung';
  return 'kritisch';
}

/** Bestimmt Status basierend auf Outbox Queue Depth */
function getOutboxStatus(depth: number): 'ok' | 'warnung' | 'kritisch' {
  if (depth <= 10) return 'ok';
  if (depth <= 100) return 'warnung';
  return 'kritisch';
}

/** Bestimmt Status basierend auf Latenz p95 */
function getLatenzStatus(p95: number): 'ok' | 'warnung' | 'kritisch' {
  if (p95 <= 500) return 'ok';
  if (p95 <= 2000) return 'warnung';
  return 'kritisch';
}

/** Bestimmt Status basierend auf DB Pool Usage */
function getDbPoolStatus(usage: number): 'ok' | 'warnung' | 'kritisch' {
  if (usage <= 50) return 'ok';
  if (usage <= 80) return 'warnung';
  return 'kritisch';
}

export function MonitoringDashboard() {
  const { data: health, isLoading, error } = useSystemHealth();
  const { isConnected, warnungen } = useMonitoringWebSocket(true);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-text-primary text-xl">System-Monitoring</h1>
          <p className="text-text-secondary text-sm">Echtzeit-Systemzustand und Schwellwert-Warnungen</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-status-success-text' : 'bg-status-danger-text'}`}
            role="img"
            aria-label={isConnected ? 'WebSocket verbunden' : 'WebSocket getrennt'}
          />
          <span className="text-text-secondary text-sm">{isConnected ? 'Live' : 'Getrennt'}</span>
        </div>
      </div>

      {/* Aktive Warnungs-Banner (AC4) */}
      {warnungen.length > 0 && (
        <div className="space-y-2" role="alert" aria-live="assertive">
          {(() => {
            const warnungKeyCounts = new Map<string, number>();

            return warnungen.slice(0, 3).map((w) => {
              const isKritisch = w.warnungTyp === 'ZUSTELLRATE' || w.warnungTyp === 'CIRCUIT_BREAKER';
              const warnungKeyBase = getWarnungKeyBase(w);
              const occurrence = (warnungKeyCounts.get(warnungKeyBase) ?? 0) + 1;
              warnungKeyCounts.set(warnungKeyBase, occurrence);

              return (
                <div
                  key={`banner-${warnungKeyBase}|${occurrence}`}
                  className={`flex items-center justify-between rounded-panel border p-3 text-sm ${
                    isKritisch ? 'border-status-danger-border bg-status-danger-surface text-status-danger-text' : 'border-status-warning-border bg-status-warning-surface text-status-warning-text'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{isKritisch ? 'Kritisch' : 'Warnung'}:</span>
                    <span>{WARNUNG_TYP_LABELS[w.warnungTyp] || w.warnungTyp}</span>
                  </div>
                  <span className="text-xs opacity-75">
                    Aktuell: {w.aktuellerWert} / Schwelle: {w.schwellwert}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Loading / Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-action-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-panel border border-status-danger-border bg-status-danger-surface p-4 text-status-danger-text text-sm">Fehler beim Laden der System-Metriken: {error.message}</div>
      )}

      {/* Metrics Grid */}
      {health && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Zustellrate" value={health.zustellrate.toFixed(1)} einheit="%" status={getZustellrateStatus(health.zustellrate)} description="Ziel: >99%" />
            <MetricCard label="WebSocket-Verbindungen" value={health.websocketConnections} status="ok" />
            <MetricCard label="Outbox Queue" value={health.outboxQueueDepth} einheit="Events" status={getOutboxStatus(health.outboxQueueDepth)} />
            <MetricCard label="Server Uptime" value={formatUptime(health.uptime)} status="ok" />
          </div>

          {/* API Response Times */}
          <div>
            <h2 className="mb-3 font-medium text-text-secondary text-sm">API Response Times</h2>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="p50 (Median)" value={Math.round(health.apiResponseTime.p50)} einheit="ms" status="ok" />
              <MetricCard label="p95" value={Math.round(health.apiResponseTime.p95)} einheit="ms" status={getLatenzStatus(health.apiResponseTime.p95)} />
              <MetricCard label="p99" value={Math.round(health.apiResponseTime.p99)} einheit="ms" status={getLatenzStatus(health.apiResponseTime.p99)} />
            </div>
          </div>

          {/* Circuit Breaker Status */}
          {health.circuitBreakerStatus.length > 0 && (
            <div>
              <h2 className="mb-3 font-medium text-text-secondary text-sm">Circuit Breaker Status</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {health.circuitBreakerStatus.map((cb) => (
                  <MetricCard key={cb.serviceName} label={cb.serviceName} value={cb.state} status={cb.state === 'CLOSED' ? 'ok' : cb.state === 'HALF_OPEN' ? 'warnung' : 'kritisch'} />
                ))}
              </div>
            </div>
          )}

          {/* DB Pool */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="DB Connection Pool" value={health.dbConnectionPoolUsage} einheit="%" status={getDbPoolStatus(health.dbConnectionPoolUsage)} />
          </div>
        </>
      )}

      {/* Warnungen */}
      <WarnungList warnungen={warnungen} />
    </div>
  );
}
