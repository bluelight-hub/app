import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Mock Zustand to prevent infinite loops in tests
vi.mock('zustand', async () => {
  const actualZustand = await vi.importActual('zustand');
  const { create: actualCreate } = actualZustand as any;

  // Wrap create to handle subscriptions better in tests
  const create = (stateCreator: any) => {
    const store = actualCreate(stateCreator);

    // Override subscribe to prevent infinite loops
    const originalSubscribe = store.subscribe;
    store.subscribe = (listener: any, selector?: any) => {
      // Debounce listener calls to prevent loops
      let timeoutId: NodeJS.Timeout;
      const debouncedListener = (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => listener(...args), 0);
      };

      return originalSubscribe(debouncedListener, selector);
    };

    return store;
  };

  return {
    ...actualZustand,
    create,
  };
});

// Cleanup nach jedem Test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for tests
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, // Default to light mode
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

// Mock für window.getComputedStyle, um JSDOM-Warnungen zu vermeiden
beforeEach(() => {
  // Speichere die originale Implementierung
  const originalGetComputedStyle = window.getComputedStyle;

  // Überschreibe getComputedStyle mit einem Mock
  window.getComputedStyle = vi.fn().mockImplementation(() => {
    return {
      getPropertyValue: (prop: string) => {
        // Standardwerte für die am häufigsten verwendeten Eigenschaften
        if (prop === 'box-sizing') return 'border-box';
        if (prop === 'padding-right' || prop === 'padding-left') return '0px';
        if (prop === 'border-right-width' || prop === 'border-left-width') return '0px';
        return '';
      },
      // Weitere Eigenschaften, die von Ant Design verwendet werden könnten
      paddingRight: '0px',
      paddingLeft: '0px',
      borderRightWidth: '0px',
      borderLeftWidth: '0px',
      boxSizing: 'border-box',
    };
  });

  // Cleanup nach dem Test
  return () => {
    window.getComputedStyle = originalGetComputedStyle;
  };
});
