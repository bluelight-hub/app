import { describe, expect, it } from 'vitest';

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
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    expect(mediaQuery).toBeDefined();
    expect(mediaQuery.matches).toBe(false);
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

  it('should expose browser storage globals from jsdom', () => {
    expect(localStorage).toBeDefined();
    expect(sessionStorage).toBeDefined();
    expect(typeof localStorage.getItem).toBe('function');
    expect(typeof localStorage.setItem).toBe('function');
    expect(typeof localStorage.clear).toBe('function');
    expect(typeof sessionStorage.getItem).toBe('function');
    expect(typeof sessionStorage.setItem).toBe('function');
    expect(typeof sessionStorage.clear).toBe('function');
  });
});
