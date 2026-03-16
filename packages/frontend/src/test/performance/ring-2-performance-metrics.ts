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

interface MeasureMountedInteractionCycleInput {
  render: () => RenderResult;
  action: (result: RenderResult) => Promise<void> | void;
  ready?: (result: RenderResult) => Promise<void> | void;
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
  const roundedSamples = samples.map((sample) => roundForDisplay(sample));
  const rawP95 = calculatePercentile(samples, 95);
  const rawPassRate = calculatePassRate(samples, thresholdMs);
  const p95 = roundForDisplay(rawP95);
  const passRate = roundForDisplay(rawPassRate, 4);
  const min = samples.length > 0 ? roundForDisplay(Math.min(...samples)) : 0;
  const max = samples.length > 0 ? roundForDisplay(Math.max(...samples)) : 0;

  return {
    scenario,
    metric,
    threshold: thresholdMs,
    measured: p95,
    iterations: roundedSamples.length,
    device,
    browser,
    pass: rawP95 <= thresholdMs && rawPassRate >= requiredPassRate,
    passRate,
    p95,
    min,
    max,
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
    return roundForDisplay(performance.now() - start);
  } finally {
    result.unmount();
  }
}

export async function measureInteractionCycle(action: () => Promise<void> | void, ready?: () => Promise<void> | void): Promise<number> {
  const start = performance.now();
  await action();
  await ready?.();
  return roundForDisplay(performance.now() - start);
}

export async function measureMountedInteractionCycle({ render, action, ready }: MeasureMountedInteractionCycleInput): Promise<number> {
  const result = render();

  try {
    return await measureInteractionCycle(
      () => action(result),
      () => ready?.(result),
    );
  } finally {
    result.unmount();
  }
}

function roundForDisplay(value: number, fractionDigits = 2): number {
  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}
