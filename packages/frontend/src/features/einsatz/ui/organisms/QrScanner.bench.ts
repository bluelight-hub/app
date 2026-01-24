import { bench, describe } from 'vitest';

function sanitizeForLog(input: string): string {
  if (input.length > 100) {
    return `${input.substring(0, 100)}... [truncated, ${input.length} chars total]`;
  }
  return input.replace(/[\x00-\x1F\x7F]/g, '?');
}

describe('QR Scanner Logging Performance', () => {
  const qrContent = 'drk://person?v=1&p=123456789&n=Mustermann&f=Max&k=12-34-56';

  bench('With Logging', () => {
    // Simulate the logic in processQrCode
    const sanitized = sanitizeForLog(qrContent);
    // We construct the string as would happen in the console.log call
    // We don't actually call console.log because it would spam output and is hard to measure accurately in microbench
    // But constructing the string and sanitizing is the CPU cost we want to measure.
    const _msg = `[QR Scanner] processQrCode aufgerufen: ${sanitized}`;
  });

  bench('Without Logging', () => {
    // Do nothing (simulating removal)
  });
});
