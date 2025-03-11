---
description: ENFORCE standardisierte Testpraktiken für alle Custom React Hooks
globs: packages/frontend/src/hooks/*.test.ts,packages/frontend/src/hooks/*.test.tsx
alwaysApply: false
---

# React Hook Tests

## Context
- Gilt für alle Custom React Hooks im Frontend
- Tests für Hooks müssen im gleichen Verzeichnis wie der Hook platziert werden
- Es wird Vitest und React Testing Library verwendet

## Requirements

1. **Testdateinamenskonvention**
   - Namensschema: `useHookName.test.ts(x)`
   - Platzierung im gleichen Verzeichnis wie der Hook (`src/hooks/`)
   - Importiere die notwendigen Testing-Tools:
     ```typescript
     import { renderHook, act } from '@testing-library/react';
     import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
     ```

2. **Hook-Test-Struktur**
   - **Mocking Setup**: Mock aller externen Abhängigkeiten vor den Tests
   - **Cleanup**: Stellen Sie sicher, dass alle Mocks nach jedem Test zurückgesetzt werden
   - **Isolierung**: Tests sollten keine Seiteneffekte auf andere Tests haben

3. **Test-Kategorien**
   - **Initialisierungstests**: Überprüfe den initialen Zustand des Hooks
   - **Aktualisierungstests**: Teste, wie der Hook auf Zustandsänderungen reagiert
   - **Argumenttests**: Überprüfe, wie der Hook auf verschiedene Eingabeargumente reagiert
   - **Umgebungstests**: Teste, wie der Hook auf Änderungen in der Umgebung reagiert (z.B. Fenstergrößenänderungen)
   - **Cleanup-Tests**: Stelle sicher, dass der Hook korrekt aufräumt (z.B. Event-Listener entfernt)

4. **Spezielle Testanforderungen**
   - **Browser-APIs**: Mocke Browser-APIs wie `window`, `document`, `localStorage` etc.
   - **Asynchrone Hooks**: Verwende `waitFor` oder `act` für asynchrone Aktualisierungen
   - **Hook-Rerender**: Teste, wie der Hook auf Neurendering reagiert

5. **Best Practices**
   - Verwende `renderHook` für das Testen von Hooks
   - Nutze `act` für Zustandsänderungen
   - Implementiere `beforeEach` und `afterEach` für Setup und Teardown
   - Teste Edge Cases (z.B. leere Eingaben, Fehlerfälle)
   - Teste die Hook-Rückgabewerte und nicht nur die internen Funktionen

## Examples

<example>
// useMediaQuery.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useMediaQuery from './useMediaQuery';

describe('useMediaQuery', () => {
  // Mock für matchMedia
  const mockMatchMedia = vi.fn();
  let originalMatchMedia: typeof window.matchMedia;
  let mockMediaQueryList: {
    matches: boolean;
    addEventListener: vi.Mock;
    removeEventListener: vi.Mock;
  };

  beforeEach(() => {
    // Speichere das Original matchMedia
    originalMatchMedia = window.matchMedia;

    // Mock für MediaQueryList
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Erstelle den matchMedia Mock
    mockMatchMedia.mockReturnValue(mockMediaQueryList);
    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    // Stelle das Original matchMedia wieder her
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  it('should initialize with the current media query state', () => {
    // Setze den initial match value
    mockMediaQueryList.matches = true;

    const { result } = renderHook(() => useMediaQuery('(max-width: 480px)'));

    // Der Hook sollte mit dem aktuellen Zustand initialisiert werden
    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 480px)');
  });

  it('should update when the media query changes', () => {
    // Initialer Zustand: matches = false
    mockMediaQueryList.matches = false;

    const { result } = renderHook(() => useMediaQuery('(max-width: 480px)'));
    expect(result.current).toBe(false);

    // Simuliere eine Änderung der Medienabfrage
    act(() => {
      // Rufe den registrierten Event-Listener auf
      const callback = mockMediaQueryList.addEventListener.mock.calls[0][1];
      callback({ matches: true } as MediaQueryListEvent);
    });

    // Der Wert sollte aktualisiert sein
    expect(result.current).toBe(true);
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 480px)'));

    // Führe den Unmount durch
    unmount();

    // Der Event-Listener sollte entfernt worden sein
    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
    expect(mockMediaQueryList.removeEventListener.mock.calls[0][0]).toBe('change');
  });
});
</example>

<example>
// useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useLocalStorage from './useLocalStorage';

describe('useLocalStorage', () => {
  // Mock für localStorage
  const mockStorage: Record<string, string> = {};
  
  // Setup mocks
  beforeEach(() => {
    // Mock localStorage methods
    Storage.prototype.getItem = vi.fn((key) => mockStorage[key] || null);
    Storage.prototype.setItem = vi.fn((key, value) => {
      mockStorage[key] = String(value);
    });
    Storage.prototype.removeItem = vi.fn((key) => {
      delete mockStorage[key];
    });
    Storage.prototype.clear = vi.fn(() => {
      Object.keys(mockStorage).forEach(key => {
        delete mockStorage[key];
      });
    });
  });

  afterEach(() => {
    // Clear storage and mocks after each test
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach(key => {
      delete mockStorage[key];
    });
  });

  it('should initialize with the saved value', () => {
    // Setup initial localStorage state
    mockStorage['myKey'] = JSON.stringify('saved value');
    
    // Render hook with the same key
    const { result } = renderHook(() => useLocalStorage('myKey', 'default value'));
    
    // Should return the saved value
    expect(result.current[0]).toBe('saved value');
  });

  it('should initialize with default value if no saved value exists', () => {
    // Render hook with a key that doesn't exist in localStorage
    const { result } = renderHook(() => useLocalStorage('newKey', 'default value'));
    
    // Should return the default value
    expect(result.current[0]).toBe('default value');
  });

  it('should update the stored value when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('myKey', 'initial'));
    
    // Update the value
    act(() => {
      result.current[1](mdc:'updated value');
    });
    
    // The hook value should be updated
    expect(result.current[0]).toBe('updated value');
    
    // The localStorage value should be updated
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'myKey', 
      JSON.stringify('updated value')
    );
  });

  it('should handle complex objects correctly', () => {
    const complexObj = { nested: { value: 42 }, array: [1, 2, 3] };
    
    const { result } = renderHook(() => useLocalStorage('complexKey', complexObj));
    
    // Check initial state
    expect(result.current[0]).toEqual(complexObj);
    
    // Update with a new complex object
    const newObj = { updated: true, list: ['a', 'b'] };
    
    act(() => {
      result.current[1](mdc:newObj);
    });
    
    // Check updated state
    expect(result.current[0]).toEqual(newObj);
  });
});
</example> 