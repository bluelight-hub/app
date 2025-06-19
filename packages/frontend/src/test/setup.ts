import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, vi } from 'vitest';

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
