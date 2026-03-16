import { describe, expect, it } from 'vitest';
import {
  RING_2_BREAKPOINT_MATRIX,
  RING_2_BROWSER_MATRIX,
  RING_2_PERFORMANCE_SCENARIOS,
  RING_2_PERFORMANCE_THRESHOLDS,
  buildEtbEntries,
  buildOpenBefehle,
  buildOverviewStatusObjects,
} from './ring-2-performance-fixtures';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, runIterations } from './ring-2-performance-metrics';

describe('Ring-2-Performance-Grundlage', () => {
  it('stellt die kanonische Browser- und Breakpoint-Matrix aus Story 1.2a bereit', () => {
    expect(RING_2_BROWSER_MATRIX).toEqual(['Chrome 146', 'Edge 146', 'Safari 26.2', 'Firefox 140.7 ESR']);
    expect(RING_2_BREAKPOINT_MATRIX).toEqual(['Mobile < 640px', 'Tablet 640-1023px', 'Desktop >= 1024px', 'Wide Desktop >= 1536px']);
    expect(RING_2_PERFORMANCE_THRESHOLDS.iterations).toBe(30);
  });

  it('liefert reproduzierbare Referenzlasten für Überblick, ETB und Befehle', () => {
    expect(buildOverviewStatusObjects()).toHaveLength(100);
    expect(buildEtbEntries()).toHaveLength(200);
    expect(buildOpenBefehle()).toHaveLength(20);
    expect(RING_2_PERFORMANCE_SCENARIOS.overview.anchor).toContain('SingleEinsatzDashboard');
    expect(RING_2_PERFORMANCE_SCENARIOS.etb.anchor).toContain('EtbEntryList');
    expect(RING_2_PERFORMANCE_SCENARIOS.befehle.anchor).toContain('BefehlsListeMitEingabe');
  });

  it('erstellt maschinenlesbare Performance-Reports mit P95 und Passrate', async () => {
    const samples = await runIterations({
      iterations: 5,
      measure: (iteration) => 90 + iteration * 10,
    });

    const report = createStructuredPerformanceReport({
      scenario: 'overview',
      metric: 'usable-state',
      thresholdMs: 200,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: 0.8,
    });

    const parsed = JSON.parse(formatStructuredPerformanceReport(report)) as Record<string, unknown>;

    expect(parsed.scenario).toBe('overview');
    expect(parsed.metric).toBe('usable-state');
    expect(parsed.threshold).toBe(200);
    expect(parsed.measured).toBe(130);
    expect(parsed.iterations).toBe(5);
    expect(parsed.device).toBe('Desktop >= 1024px');
    expect(parsed.browser).toBe('Chrome 146');
    expect(parsed.pass).toBe(true);
  });

  it('entscheidet Pass/Fail gegen Rohwerte statt gegen gerundete Anzeigewerte', () => {
    const report = createStructuredPerformanceReport({
      scenario: 'etb',
      metric: 'interaction-feedback',
      thresholdMs: 200,
      samples: [199.99, 200.004, 200.004, 200.004, 200.004],
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: 0.8,
    });

    expect(report.measured).toBe(200);
    expect(report.pass).toBe(false);
  });
});
