import { Controller, Get, Inject, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Registry } from 'prom-client';
import type { Response } from 'express';
import { SkipServerAccess } from '@/infrastructure/decorators/skip-server-access.decorator';
import { SkipSetupCheck } from '@/infrastructure/decorators/skip-setup-check.decorator';
import { SkipTransform } from '@/modules/common/decorators/skip-transform.decorator';
import { METRICS } from '@/infrastructure/di-tokens';

/**
 * Controller fuer Prometheus Metrics Endpoint.
 *
 * Exponiert `/metrics` im OpenMetrics-Format fuer Prometheus Scraping.
 *
 * **Security:**
 * - NICHT durch JWT-Auth geschuetzt (Prometheus muss scrapen koennen)
 * - SkipServerAccess: Kein X-Server-Access-Token erforderlich
 * - SkipSetupCheck: Auch waehrend Setup erreichbar
 *
 * @see Story 5.6 AC1
 */
@SkipServerAccess()
@SkipSetupCheck()
@SkipTransform()
@ApiExcludeController()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(@Inject(METRICS.REGISTRY) private readonly registry: Registry) {}

  /**
   * Gibt Prometheus-kompatible Metriken im OpenMetrics-Format zurueck.
   *
   * Enthaelt:
   * - Default Node.js Metriken (CPU, Memory, Event Loop, GC)
   * - HTTP Request Duration Histogram (p50/p95/p99) pro Route/Method/Status
   * - WebSocket Active Connections Gauge pro Namespace
   * - Outbox Queue Depth Gauge
   * - Befehl Domain Counters (erstellt, quittiert, korrigiert)
   */
  @Get()
  @SkipTransform()
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.registry.metrics();
    res.set('Content-Type', this.registry.contentType);
    res.end(metrics);
  }
}
