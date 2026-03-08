// @ts-nocheck
import type { Response } from 'express';
import { MetricsController } from '../metrics.controller';

/**
 * Unit Tests fuer MetricsController (Story 5.6 AC1).
 *
 * Validiert den Prometheus Metrics Endpoint:
 * - Metriken als String im OpenMetrics-Format zurueckgeben
 * - Content-Type aus der Registry setzen
 * - Leere Registry liefert leeren String
 *
 * **Mocking Strategy:**
 * - Registry: Vollstaendig gemockt (metrics(), contentType)
 * - Response: Gemockt (set(), end())
 */
describe('MetricsController', () => {
  let controller: MetricsController;
  let mockRegistry: { metrics: jest.Mock; contentType: string };
  let mockResponse: { set: jest.Mock; end: jest.Mock };

  beforeEach(() => {
    mockRegistry = {
      metrics: jest.fn(),
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
    };

    mockResponse = {
      set: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    controller = new MetricsController(mockRegistry as any);
  });

  describe('getMetrics()', () => {
    it('sollte Prometheus-Metriken als String zurueckgeben', async () => {
      // Given: Registry liefert Metriken-String
      const metricsOutput =
        '# HELP http_request_duration_seconds HTTP request duration\n' + '# TYPE http_request_duration_seconds histogram\n' + 'http_request_duration_seconds_bucket{le="0.05"} 24\n';
      mockRegistry.metrics.mockResolvedValue(metricsOutput);

      // When: getMetrics() aufgerufen wird
      await controller.getMetrics(mockResponse as unknown as Response);

      // Then: Metriken-String wird an Response gesendet
      expect(mockRegistry.metrics).toHaveBeenCalledTimes(1);
      expect(mockResponse.end).toHaveBeenCalledWith(metricsOutput);
    });

    it('sollte den Content-Type aus der Registry setzen', async () => {
      // Given: Registry hat spezifischen Content-Type
      mockRegistry.metrics.mockResolvedValue('some_metric 1');
      mockRegistry.contentType = 'text/plain; version=0.0.4; charset=utf-8';

      // When: getMetrics() aufgerufen wird
      await controller.getMetrics(mockResponse as unknown as Response);

      // Then: Content-Type Header wird aus Registry gesetzt
      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    });

    it('sollte bei leerer Registry einen leeren String zurueckgeben', async () => {
      // Given: Registry liefert leeren String (keine Metriken registriert)
      mockRegistry.metrics.mockResolvedValue('');

      // When: getMetrics() aufgerufen wird
      await controller.getMetrics(mockResponse as unknown as Response);

      // Then: Leerer String wird an Response gesendet
      expect(mockResponse.end).toHaveBeenCalledWith('');
      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    });
  });
});
