import { Global, Module } from '@nestjs/common';
import * as client from 'prom-client';
import { METRICS } from '@/infrastructure/di-tokens';
import { MetricsController } from './metrics.controller';

/**
 * Metriken-Modul fuer Prometheus-kompatibles Monitoring.
 *
 * Registriert Default Node.js Metriken und stellt Custom Metrics
 * per Dependency Injection bereit.
 *
 * **Bereitgestellte Metriken:**
 * - Default Node.js Metriken (CPU, Memory, Event Loop, GC) via collectDefaultMetrics()
 * - HTTP Request Duration Histogram (via MetricsInterceptor)
 * - WebSocket Active Connections Gauge
 * - Outbox Queue Depth Gauge
 *
 * **Endpoint:**
 * GET /metrics - Prometheus Scraping Endpoint (ohne Auth)
 *
 * @see Story 5.6 AC1
 * @module MetricsModule
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    {
      provide: METRICS.REGISTRY,
      useFactory: () => {
        // Default Metriken sammeln (CPU, Memory, Event Loop, GC)
        client.collectDefaultMetrics();
        return client.register;
      },
    },
    {
      provide: METRICS.HTTP_REQUEST_DURATION,
      useFactory: () =>
        new client.Histogram({
          name: 'http_request_duration_seconds',
          help: 'Duration of HTTP requests in seconds',
          labelNames: ['method', 'route', 'status_code'] as const,
          buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
    },
    {
      provide: METRICS.WS_CONNECTIONS,
      useFactory: () =>
        new client.Gauge({
          name: 'websocket_active_connections',
          help: 'Number of active WebSocket connections',
          labelNames: ['namespace'] as const,
        }),
    },
    {
      provide: METRICS.OUTBOX_QUEUE_DEPTH,
      useFactory: () =>
        new client.Gauge({
          name: 'outbox_queue_depth',
          help: 'Number of pending events in the outbox',
        }),
    },
  ],
  exports: [METRICS.REGISTRY, METRICS.HTTP_REQUEST_DURATION, METRICS.WS_CONNECTIONS, METRICS.OUTBOX_QUEUE_DEPTH],
})
export class MetricsModule {}
