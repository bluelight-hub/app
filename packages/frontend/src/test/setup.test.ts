import { resetTestViewport, setTestViewport } from './viewport';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(() => {
  resetTestViewport();
});

describe('Test Setup', () => {
  it('should run basic assertions', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should have jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('should have mocked matchMedia', () => {
    setTestViewport({ width: 1280 });

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const mobileQuery = window.matchMedia('(max-width: 639px)');

    expect(desktopQuery).toBeDefined();
    expect(desktopQuery.matches).toBe(true);
    expect(mobileQuery.matches).toBe(false);

    setTestViewport({ width: 390 });

    expect(desktopQuery.matches).toBe(false);
    expect(mobileQuery.matches).toBe(true);
  });

  it('should have mocked IntersectionObserver', () => {
    expect(IntersectionObserver).toBeDefined();
    const observer = new IntersectionObserver(() => {});
    expect(observer).toBeDefined();
    expect(typeof observer.observe).toBe('function');
  });

  it('should have mocked ResizeObserver', () => {
    expect(ResizeObserver).toBeDefined();
    const observer = new ResizeObserver(() => {});
    expect(observer).toBeDefined();
    expect(typeof observer.observe).toBe('function');
  });
});
