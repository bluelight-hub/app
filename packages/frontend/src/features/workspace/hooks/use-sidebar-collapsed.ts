import { useCallback, useState } from 'react';

/**
 * LocalStorage-Key für den eingeklappten Zustand der Workspace-Sidebar.
 * Persistiert pro Browser/User und überlebt Reloads (im Gegensatz zu
 * sessionStorage-basierten Flags).
 */
const STORAGE_KEY = 'bluelight:workspace:sidebar-collapsed';

/**
 * Module-scope Memory-Fallback für Private Browsing Modus.
 *
 * In Safari/Firefox Private Browsing kann localStorage SecurityError oder
 * QuotaExceededError werfen. Der Fallback verhindert, dass der Zustand bei
 * jeder Navigation zurückspringt.
 */
let memoryFallback = false;

/**
 * Reset-Funktion für Tests - setzt den Memory-Fallback zurück.
 * NUR für Test-Zwecke exportiert.
 * @internal
 */
export function _resetMemoryFallbackForTesting(): void {
  memoryFallback = false;
}

/**
 * Rückgabewert des useSidebarCollapsed Hooks.
 */
export interface UseSidebarCollapsedResult {
  /** true, wenn die Sidebar aktuell eingeklappt (Icon-only) dargestellt wird. */
  isCollapsed: boolean;
  /** Schaltet zwischen ein- und ausgeklappt um. */
  toggle: () => void;
  /** Setzt den Zustand explizit. */
  setCollapsed: (value: boolean) => void;
}

/**
 * React-Hook zur Verwaltung des Einklapp-Zustands der Workspace-Sidebar.
 *
 * Der Zustand wird pro Browser/User in localStorage persistiert und bleibt
 * auch nach einem Reload erhalten. SSR-Umgebungen (window undefined) und
 * Storage-Fehler werden graceful behandelt.
 *
 * @returns Objekt mit `isCollapsed`, `toggle()` und `setCollapsed()`
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { isCollapsed, toggle } = useSidebarCollapsed();
 *   return (
 *     <aside data-collapsed={isCollapsed}>
 *       <button onClick={toggle}>{isCollapsed ? 'Ausklappen' : 'Einklappen'}</button>
 *     </aside>
 *   );
 * }
 * ```
 */
export function useSidebarCollapsed(): UseSidebarCollapsedResult {
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return memoryFallback;
    }
  });

  const setCollapsed = useCallback((value: boolean) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
      }
    } catch {
      memoryFallback = value;
    }
    setIsCollapsedState(value);
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsedState((previous) => {
      const next = !previous;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
        }
      } catch {
        memoryFallback = next;
      }
      return next;
    });
  }, []);

  return { isCollapsed, toggle, setCollapsed };
}
