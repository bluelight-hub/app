import { useCallback, useRef, useState } from 'react';

/**
 * Hook für debounced Funktionsaufrufe
 * Verzögert die Ausführung bis keine weiteren Aufrufe für die angegebene Zeit erfolgen
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(callback: T, delay: number): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );

  return debouncedCallback;
}

/**
 * Hook für debounced State-Updates
 * Nützlich für Suchfelder und andere Eingaben die API-Calls auslösen
 */
export function useDebouncedState<T>(initialValue: T, delay: number = 300): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValueWithDebounce = useCallback(
    (newValue: T) => {
      setValue(newValue);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(newValue);
      }, delay);
    },
    [delay],
  );

  return [value, debouncedValue, setValueWithDebounce];
}
