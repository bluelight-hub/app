import { vi } from 'vitest';

// ResizeObserver polyfill for tests
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// IntersectionObserver polyfill for tests
class IntersectionObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

global.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserverEntry = {
  prototype: {},
};

// Additional DOM APIs that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
