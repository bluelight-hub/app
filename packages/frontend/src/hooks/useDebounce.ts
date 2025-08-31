import { useEffect, useState } from 'react';

/**
 * Hook für das Debouncing von Werten
 *
 * Verzögert die Aktualisierung eines Wertes, um häufige API-Aufrufe zu vermeiden.
 * Besonders nützlich für Such-Eingaben.
 *
 * @param value - Der zu debouncende Wert
 * @param delay - Verzögerung in Millisekunden (Standard: 300ms)
 * @returns Der debouncte Wert
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
