import type { RenderResult } from '@testing-library/react';

export interface StructuredPerformanceReport {
  scenario: string;
  metric: string;
  threshold: number;
  measured: number;
  iterations: number;
  device: string;
  browser: string;
  pass: boolean;
  passRate: number;
  p95: number;
  min: number;
  max: number;
  samples: number[];
}

interface CreateStructuredPerformanceReportInput {
  scenario: string;
  metric: string;
  thresholdMs: number;
  samples: number[];
  device: string;
  browser: string;
  requiredPassRate?: number;
}

interface RunIterationsInput {
  iterations: number;
  measure: (iteration: number) => Promise<number> | number;
}

export function calculatePercentile(samples: number[], percentile: number): number {
  if (samples.length === 0) {
    return 0;
  }

  if (percentile < 0 || percentile > 100) {
    throw new RangeError(`Percentile must be between 0 and 100, received ${percentile}.`);
  }

  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? sorted[sorted.length - 1] ?? 0;
}

export function calculatePassRate(samples: number[], thresholdMs: number): number {
  if (samples.length === 0) {
    return 0;
  }

  const passedSamples = samples.filter((sample) => sample <= thresholdMs).length;
  return passedSamples / samples.length;
}

export function createStructuredPerformanceReport({
  scenario,
  metric,
  thresholdMs,
  samples,
  device,
  browser,
  requiredPassRate = 0.95,
}: CreateStructuredPerformanceReportInput): StructuredPerformanceReport {
  const roundedSamples = samples.map((sample) => round(sample));
  const p95 = round(calculatePercentile(roundedSamples, 95));
  const passRate = round(calculatePassRate(roundedSamples, thresholdMs), 4);

  return {
    scenario,
    metric,
    threshold: thresholdMs,
    measured: p95,
    iterations: roundedSamples.length,
    device,
    browser,
    pass: p95 <= thresholdMs && passRate >= requiredPassRate,
    passRate,
    p95,
    min: round(Math.min(...roundedSamples)),
    max: round(Math.max(...roundedSamples)),
    samples: roundedSamples,
  };
}

export function formatStructuredPerformanceReport(report: StructuredPerformanceReport): string {
  return JSON.stringify(report);
}

export async function runIterations({ iterations, measure }: RunIterationsInput): Promise<number[]> {
  const samples: number[] = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    samples.push(await measure(iteration));
  }

  return samples;
}

export async function measureRenderCycle(render: () => RenderResult, ready?: (result: RenderResult) => Promise<void> | void): Promise<number> {
  const start = performance.now();
  const result = render();

  try {
    await ready?.(result);
    return round(performance.now() - start);
  } finally {
    result.unmount();
  }
}

export async function measureInteractionCycle(action: () => Promise<void> | void, ready?: () => Promise<void> | void): Promise<number> {
  const start = performance.now();
  await action();
  await ready?.();
  return round(performance.now() - start);
}

function round(value: number, fractionDigits = 2): number {
  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}
